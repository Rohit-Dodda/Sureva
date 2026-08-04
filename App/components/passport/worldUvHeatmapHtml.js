// Self-contained HTML/JS for the World Map's WebView (WorldUvMap.js).
// This exists because the requested look — a soft, organic, blurred
// color field with no visible shapes — is not achievable with native
// react-native-maps overlays (Marker/Circle/Polygon are always
// geometrically crisp; that was v2's Circle attempt and v3's Polygon-
// tile attempt, both of which read as "shapes" no matter how they were
// tuned). Getting an actual blurred gradient means actual pixel/canvas
// rendering, which native map overlays don't provide — this page does
// it with a plain HTML canvas layer inside a Leaflet map, using
// inverse-distance-weighted interpolation rasterized at low internal
// resolution and upscaled with image smoothing (the same "small blurry
// image enlarged looks smooth, not blocky" trick real heatmap tools use).
//
// Base map tiles come from the public OpenStreetMap tile server — free,
// no API key, consistent with this app's existing weather backend
// (Open-Meteo) being free/keyless too. Worth knowing: OSM's tile usage
// policy asks non-trivial-traffic apps to self-host or use a paid tile
// provider rather than hammering the shared public server indefinitely —
// fine for now, but a real thing to revisit if this feature sees real
// production traffic, not something to silently ignore.
export const WORLD_UV_HEATMAP_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html, body, #map { height: 100%; margin: 0; padding: 0; background: #F7F4EF; }
    .heatmap-canvas { pointer-events: none; }
    .leaflet-popup-content { font-family: -apple-system, Helvetica, sans-serif; font-size: 13px; margin: 10px 12px; }
    .leaflet-popup-content b { font-size: 14px; }
    .leaflet-control-attribution { display: none; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    // Same continuous UV color scale as the RN side (WorldUvMap.js) —
    // duplicated, not imported, since this runs in a separate JS
    // context (the WebView) with no module bridge to React Native code.
    var UV_COLOR_STOPS = [
      { uv: 0, rgb: [46, 204, 113] },
      { uv: 3, rgb: [255, 221, 51] },
      { uv: 6, rgb: [243, 156, 18] },
      { uv: 8, rgb: [231, 76, 60] },
      { uv: 11, rgb: [155, 66, 214] }
    ];
    function lerp(a, b, t) { return a + (b - a) * t; }
    function uvToRgb(uv) {
      var top = UV_COLOR_STOPS[UV_COLOR_STOPS.length - 1].uv;
      var clamped = Math.max(0, Math.min(top, uv));
      for (var i = 0; i < UV_COLOR_STOPS.length - 1; i++) {
        var a = UV_COLOR_STOPS[i], b = UV_COLOR_STOPS[i + 1];
        if (clamped <= b.uv) {
          var t = (clamped - a.uv) / (b.uv - a.uv);
          return [
            Math.round(lerp(a.rgb[0], b.rgb[0], t)),
            Math.round(lerp(a.rgb[1], b.rgb[1], t)),
            Math.round(lerp(a.rgb[2], b.rgb[2], t))
          ];
        }
      }
      return UV_COLOR_STOPS[UV_COLOR_STOPS.length - 1].rgb;
    }

    var map = L.map('map', { zoomControl: false, attributionControl: false }).setView([20, 10], 2);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 12, minZoom: 2 }).addTo(map);
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Inverse-distance-weighted heatmap, rendered at low internal
    // resolution (one canvas pixel per CELL screen px) then scaled up
    // with image smoothing on — that upscale is what produces the soft
    // blur, not a filter applied after the fact.
    var CELL = 14;
    var HeatmapLayer = L.Layer.extend({
      onAdd: function (map) {
        this._map = map;
        this._canvas = L.DomUtil.create('canvas', 'heatmap-canvas');
        this._ctx = this._canvas.getContext('2d');
        map.getPanes().overlayPane.appendChild(this._canvas);
        map.on('move zoom viewreset', this._reposition, this);
        this._reposition();
      },
      onRemove: function (map) {
        L.DomUtil.remove(this._canvas);
        map.off('move zoom viewreset', this._reposition, this);
      },
      setPoints: function (points) {
        this._points = points;
        this._redraw();
      },
      _reposition: function () {
        var size = this._map.getSize();
        var topLeft = this._map.containerPointToLayerPoint([0, 0]);
        L.DomUtil.setPosition(this._canvas, topLeft);
        this._canvas.width = size.x;
        this._canvas.height = size.y;
        this._redraw();
      },
      _redraw: function () {
        if (!this._map) return;
        var w = this._canvas.width, h = this._canvas.height;
        if (!w || !h) return;
        this._ctx.clearRect(0, 0, w, h);
        if (!this._points || !this._points.length) return;

        var lw = Math.max(1, Math.ceil(w / CELL));
        var lh = Math.max(1, Math.ceil(h / CELL));

        var pts = [];
        for (var i = 0; i < this._points.length; i++) {
          var p = this._points[i];
          if (p.uv == null) continue;
          var cp = this._map.latLngToContainerPoint([p.lat, p.lng]);
          pts.push({ x: cp.x / CELL, y: cp.y / CELL, uv: p.uv });
        }
        if (!pts.length) return;

        var off = document.createElement('canvas');
        off.width = lw; off.height = lh;
        var octx = off.getContext('2d');
        var img = octx.createImageData(lw, lh);

        for (var y = 0; y < lh; y++) {
          for (var x = 0; x < lw; x++) {
            var wSum = 0, vSum = 0, exact = null;
            for (var j = 0; j < pts.length; j++) {
              var dx = pts[j].x - x, dy = pts[j].y - y;
              var d2 = dx * dx + dy * dy;
              if (d2 < 0.25) { exact = pts[j].uv; break; }
              var wt = 1 / (d2 + 3);
              wSum += wt; vSum += wt * pts[j].uv;
            }
            var uv = exact !== null ? exact : (wSum > 0 ? vSum / wSum : 0);
            var rgb = uvToRgb(uv);
            var idx = (y * lw + x) * 4;
            img.data[idx] = rgb[0];
            img.data[idx + 1] = rgb[1];
            img.data[idx + 2] = rgb[2];
            img.data[idx + 3] = Math.round(255 * 0.55);
          }
        }
        octx.putImageData(img, 0, 0);

        this._ctx.imageSmoothingEnabled = true;
        this._ctx.imageSmoothingQuality = 'high';
        this._ctx.drawImage(off, 0, 0, lw, lh, 0, 0, w, h);
      }
    });

    var heatmap = new HeatmapLayer();
    heatmap.addTo(map);

    // Curated named destinations from v1, kept as a "what place is this"
    // reference layer on top of the continuous field.
    var pinLayer = L.layerGroup().addTo(map);
    function renderDestinations(destinations) {
      pinLayer.clearLayers();
      for (var i = 0; i < destinations.length; i++) {
        var d = destinations[i];
        if (d.uvIndex == null) continue;
        var rgb = uvToRgb(d.uvIndex);
        var color = 'rgb(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ')';
        var marker = L.circleMarker([d.lat, d.lng], {
          radius: 6, color: '#fff', weight: 2, fillColor: color, fillOpacity: 1
        });
        marker.bindPopup('<b>' + d.name + '</b><br/>' + d.country + '<br/>UV ' + d.uvIndex);
        marker.addTo(pinLayer);
      }
    }

    // Bridge to React Native — RN pushes fresh data in via these globals
    // (WorldUvMap.js calls them through the WebView's injectJavaScript).
    window.setGridPoints = function (points) { heatmap.setPoints(points); };
    window.setDestinations = function (destinations) { renderDestinations(destinations); };

    // Leaflet already only fires 'moveend' once a gesture settles (not
    // continuously while dragging), but this debounce still guards
    // against a fast flick producing several closely-spaced settle
    // points — same purpose the RN-side debounce served in the native-
    // map version.
    var debounceTimer = null;
    function postRegion(type) {
      var b = map.getBounds();
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: type,
          south: b.getSouth(), north: b.getNorth(),
          west: b.getWest(), east: b.getEast()
        }));
      }
    }
    map.on('moveend', function () {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(function () { postRegion('regionChange'); }, 500);
    });

    // Tells RN the starting viewport once Leaflet has actually laid out
    // (immediately on load, the map container can still be mid-measure).
    setTimeout(function () { postRegion('ready'); }, 300);
  </script>
</body>
</html>
`;
