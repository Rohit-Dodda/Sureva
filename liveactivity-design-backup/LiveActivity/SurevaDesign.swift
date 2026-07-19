import SwiftUI

#if canImport(UIKit)
  import UIKit
#endif

// Sureva brand + protection design system for the Live Activity target.
// Everything here is derived LIVE from `progress` (0.0...1.0) so the protection
// color (green / amber / red) is recomputed on every render, independent of the
// static `progressViewTint` config that cannot be updated after activity start.

enum SurevaColors {
  static let brandOrange = Color(hex: "#FF5A1F")
  static let charcoal = Color(hex: "#1A1712")
  static let protectedGreen = Color(hex: "#2ECC71")
  static let warningAmber = Color(hex: "#F39C12")
  static let dangerRed = Color(hex: "#E74C3C")
}

extension Color {
  /// Returns a darker/deeper variant of this color by scaling its RGB toward
  /// black by `amount` (0 = unchanged, 1 = black). Used to derive the deep
  /// corner-glow shade from the live status color. Falls back to `self` if the
  /// components can't be read (non-RGB color spaces).
  func darkened(by amount: Double) -> Color {
    #if canImport(UIKit)
      var r: CGFloat = 0
      var g: CGFloat = 0
      var b: CGFloat = 0
      var a: CGFloat = 0
      guard UIColor(self).getRed(&r, green: &g, blue: &b, alpha: &a) else { return self }
      let f = 1 - min(max(amount, 0), 1)
      return Color(.sRGB, red: Double(r) * f, green: Double(g) * f, blue: Double(b) * f, opacity: Double(a))
    #else
      return self
    #endif
  }
}

/// Protection state computed from the live `progress` value.
/// Bands mirror the app's `sessionMath.statusFor()`:
///   > 60%  -> Protected (green)
///   20-60% -> Reapply Soon (amber)
///   < 20%  -> Reapply Now (red)
struct ProtectionLevel {
  let progress: Double

  init(progress: Double?) {
    self.progress = min(max(progress ?? 0, 0), 1)
  }

  var percent: Int { Int((progress * 100).rounded()) }

  var color: Color {
    if progress > 0.60 { return SurevaColors.protectedGreen }
    if progress >= 0.20 { return SurevaColors.warningAmber }
    return SurevaColors.dangerRed
  }

  var statusWord: String {
    if progress > 0.60 { return "Protected" }
    if progress >= 0.20 { return "Reapply Soon" }
    return "Reapply Now"
  }
}

/// Continuous protection wash used behind the expanded Dynamic Island card.
///
/// Unlike `ProtectionLevel.color` (a hard 3-band accent), this interpolates a
/// single color *smoothly* across the whole 0...1 range so the background can
/// "slowly change" green -> amber -> red as protection depletes. Anchors are
/// muted / desaturated on purpose: this is a soft wash sitting behind white
/// text, not a neon poster fill.
enum SurevaWash {
  private typealias RGB = (r: Double, g: Double, b: Double)

  // Muted anchors: fresh-but-not-neon green at full protection, warm amber at
  // the midpoint, a deep brick red at empty.
  private static let green: RGB = (0.22, 0.58, 0.37)
  private static let amber: RGB = (0.78, 0.55, 0.20)
  private static let red: RGB = (0.74, 0.28, 0.24)

  private static func lerp(_ a: RGB, _ b: RGB, _ t: Double) -> RGB {
    (a.r + (b.r - a.r) * t, a.g + (b.g - a.g) * t, a.b + (b.b - a.b) * t)
  }

  /// Continuous base color for a given protection progress (0 = empty/red,
  /// 1 = full/green), blending through amber at the midpoint.
  static func baseColor(for progress: Double) -> Color {
    let p = min(max(progress, 0), 1)
    let rgb: RGB
    if p >= 0.5 {
      rgb = lerp(amber, green, (p - 0.5) / 0.5)  // amber -> green
    } else {
      rgb = lerp(red, amber, p / 0.5)  // red -> amber
    }
    return Color(.sRGB, red: rgb.r, green: rgb.g, blue: rgb.b, opacity: 1)
  }

  /// Vertical gradient wash for the expanded card's bottom section: the base
  /// protection color up top fading into a deeper, charcoal-anchored bottom so
  /// white text stays legible at every protection level.
  static func gradient(for progress: Double) -> LinearGradient {
    let base = baseColor(for: progress)
    return LinearGradient(
      colors: [
        base.opacity(0.92),
        base.opacity(0.42),
      ],
      startPoint: .top,
      endPoint: .bottom
    )
  }
}

/// Glassy "See details" pill, now shown in the expanded card's bottom row
/// next to the giant countdown — sized a touch bigger than its old top-right
/// corner slot so it doesn't look lost next to the timer. Tapping it opens
/// the app via the `.applyWidgetURL` modifier applied by the caller.
struct SeeDetailsPill: View {
  var body: some View {
    HStack(spacing: 5) {
      Text("See details")
        .font(.system(size: 13, weight: .semibold, design: .rounded))
        .foregroundStyle(.white.opacity(0.9))
        .lineLimit(1)
        .fixedSize()
      Image(systemName: "chevron.right")
        .font(.system(size: 10, weight: .bold))
        .foregroundStyle(.white.opacity(0.6))
    }
    .padding(.horizontal, 13)
    .padding(.vertical, 9)
    .background(
      Capsule(style: .continuous)
        .fill(.white.opacity(0.14))
    )
    .overlay(
      Capsule(style: .continuous)
        .stroke(.white.opacity(0.10), lineWidth: 1)
    )
    .fixedSize()
  }
}

/// The single "Reapply" action, now shown in the expanded card's top-right
/// corner — shrunk down to a compact capsule pill to fit that tight slot
/// (it used to be a roomier rounded-rect sized for the bottom row). Tapping
/// opens the app; the actual reapply is confirmed there.
struct ReapplyButton: View {
  var body: some View {
    HStack(spacing: 5) {
      Image(systemName: "drop.fill")
        .font(.system(size: 10, weight: .semibold))
      Text("Reapply")
        .font(.system(size: 12, weight: .bold, design: .rounded))
        .lineLimit(1)
        .fixedSize()
    }
    .foregroundStyle(.white)
    .padding(.horizontal, 11)
    .padding(.vertical, 7)
    .background(
      Capsule(style: .continuous)
        .fill(
          LinearGradient(
            colors: [
              SurevaColors.brandOrange,
              SurevaColors.brandOrange.opacity(0.82),
            ],
            startPoint: .top,
            endPoint: .bottom
          )
        )
    )
    .shadow(color: SurevaColors.brandOrange.opacity(0.4), radius: 5, y: 2)
    .fixedSize()
  }
}

/// Glassmorphic panel behind the expanded status card. Mirrors the layering
/// discipline of the app's own `SessionHero` glass card: a frosted
/// (`.ultraThinMaterial`) base, deep status-colored radial glows anchored at
/// the corners, a couple of subtle central accents, a low-opacity overall
/// status tint wash (a *tint*, never a flat fill), and a top-edge sheen line
/// for a genuine "glass edge" feel.
///
/// Sizing discipline (this is the load-bearing fix): the entire decoration is
/// laid out inside a `GeometryReader`, so every element is sized *relative to
/// the container's real proposed size* (`geo.size`). Nothing here has a fixed
/// `.frame()` larger than the card, so when this view is used in
/// `.background()` it can never render larger than the card it decorates, and
/// the `.clipShape` clips to the card's true size rather than an oversized
/// decorative footprint.
struct SurevaGlassPanel: View {
  var tint: Color
  var cornerRadius: CGFloat = 24

  var body: some View {
    let shape = RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
    // Deep, desaturated variant of the live status color for the corner glows.
    let deep = tint.darkened(by: 0.58)

    return GeometryReader { geo in
      let w = geo.size.width
      let h = geo.size.height

      ZStack {
        // 1. Frosted glass base.
        shape.fill(.ultraThinMaterial)

        // 2. Deep status-colored corner glows — blurred SOLID circles, not a
        // RadialGradient. A RadialGradient layered directly over
        // .ultraThinMaterial produced a persistent blotchy/banded patch in
        // this exact corner (confirmed: simplifying from 6 down to 2
        // gradients, and removing their middle stop, made no visible
        // difference — so the issue was the gradient+Material combination
        // itself, not overlap between multiple gradients). Blurred solid
        // color is the same technique the app's own SessionHero glass card
        // uses and doesn't rely on that compositing path.
        ZStack {
          Circle()
            .fill(deep)
            .frame(width: max(w, h) * 0.95, height: max(w, h) * 0.95)
            .offset(x: -w * 0.32, y: -h * 0.55)
            .opacity(0.55)
          Circle()
            .fill(deep)
            .frame(width: max(w, h) * 0.85, height: max(w, h) * 0.85)
            .offset(x: w * 0.34, y: h * 0.5)
            .opacity(0.45)
        }
        .blur(radius: 26)

        // 3. Low-opacity overall status tint wash — a tint, not a fill.
        shape.fill(tint.opacity(0.16))

        // 4. Translucent white overlay to deepen the frosted-glass feel.
        shape.fill(.white.opacity(0.05))
      }
    }
    .clipShape(shape)
    .overlay(
      // Glass edge: a hairline stroke that's bright along the top and fades
      // toward the bottom, mirroring SessionHero's white top-border sheen.
      shape.stroke(
        LinearGradient(
          colors: [.white.opacity(0.5), .white.opacity(0.08)],
          startPoint: .top,
          endPoint: .bottom
        ),
        lineWidth: 1
      )
    )
  }
}

/// The bundled Sureva "U" mark (baked into the widget target's asset catalog),
/// clipped into a small rounded square. Used in the compact pill and as a small
/// brand stamp in the expanded / lock-screen layouts.
struct SurevaMark: View {
  var size: CGFloat = 20
  var cornerRadius: CGFloat = 6

  var body: some View {
    Image("SurevaMark")
      .resizable()
      .interpolation(.high)
      .scaledToFill()
      .frame(width: size, height: size)
      .clipShape(RoundedRectangle(cornerRadius: cornerRadius, style: .continuous))
  }
}

/// Soft orange radial glow used as a tasteful accent behind the gauge.
struct SurevaGlow: View {
  var radius: CGFloat = 90
  var opacity: Double = 0.38

  var body: some View {
    RadialGradient(
      // A middle stop makes the falloff read as a soft glow rather than a
      // hard-edged circle — two-color radial gradients (start -> transparent)
      // can show a visible ring where opacity hits zero if that point falls
      // inside the visible bounds rather than safely past them.
      gradient: Gradient(stops: [
        .init(color: SurevaColors.brandOrange.opacity(opacity), location: 0),
        .init(color: SurevaColors.brandOrange.opacity(opacity * 0.35), location: 0.6),
        .init(color: SurevaColors.brandOrange.opacity(0), location: 1),
      ]),
      center: .center,
      startRadius: 0,
      endRadius: radius
    )
  }
}

/// Circular protection gauge. The ring fills to `progress` and is colored by the
/// live protection band. Optionally shows the protection percentage in the center.
struct SurevaGauge: View {
  let level: ProtectionLevel
  var lineWidth: CGFloat = 8
  var showsPercent: Bool = true

  var body: some View {
    ZStack {
      Circle()
        .stroke(Color.white.opacity(0.12), lineWidth: lineWidth)

      Circle()
        .trim(from: 0, to: CGFloat(level.progress))
        .stroke(
          AngularGradient(
            gradient: Gradient(colors: [
              level.color.opacity(0.75),
              level.color,
            ]),
            center: .center,
            // startAngle/endAngle both default to .zero if omitted, which
            // produces a degenerate (non-sweeping, effectively flat-color)
            // gradient — a full 0-360 sweep is what actually renders as a
            // gradient arc around the ring.
            startAngle: .degrees(0),
            endAngle: .degrees(360)
          ),
          style: StrokeStyle(lineWidth: lineWidth, lineCap: .round)
        )
        .rotationEffect(.degrees(-90))

      if showsPercent {
        VStack(spacing: -1) {
          Text("\(level.percent)")
            .font(.system(size: 20, weight: .bold, design: .rounded))
            .foregroundStyle(.white)
            .monospacedDigit()
          Text("%")
            .font(.system(size: 9, weight: .semibold, design: .rounded))
            .foregroundStyle(.white.opacity(0.55))
        }
      }
    }
  }
}
