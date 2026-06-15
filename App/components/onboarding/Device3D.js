import React, { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber/native';
import { ContactShadows } from '@react-three/drei/native';
import * as THREE from 'three';
import colors from '../../constants/colors';

// LED colors used across the timelines
const COL = {
  red:    new THREE.Color(colors.danger),
  green:  new THREE.Color(colors.protected),
  yellow: new THREE.Color(colors.warning),
  orange: new THREE.Color(colors.orange),
  blue:   new THREE.Color(colors.bluetooth),
  gray:   new THREE.Color('#9AA0A6'),
};

// A single press: triangular dip 0→1→0 over `dur` starting at `start`.
function dip(lt, start, dur) {
  if (lt < start || lt > start + dur) return 0;
  return Math.sin(((lt - start) / dur) * Math.PI);
}

// N quick flashes starting at 0; returns 0..1 then 0 after they finish.
function flashes(x, count, each = 0.34) {
  if (x < 0) return 0;
  for (let i = 0; i < count; i++) {
    const s = i * each;
    if (x >= s && x < s + 0.2) return Math.sin(((x - s) / 0.2) * Math.PI);
  }
  return 0;
}

const PRESS = 0.2;        // dip duration
const START_DELAY = 1.0;  // wait for the spin-in before performing the sequence

// Evaluates a gesture's one-shot timeline at gesture-local time `lt`.
// Returns { col, glow, press, shake } — plays through once and holds the
// final resting state (no looping). `out` is mutated in place to avoid allocs.
function evalGesture(lt, gesture, out) {
  out.glow = 0.5; out.press = 0; out.shake = 0; out.col = COL.orange;

  switch (gesture) {
    case 'single': {
      // alert: red blink + vibrate → one press → turns green and rests
      if (lt < 1.4) {
        out.col = COL.red;
        out.glow = 0.35 + 0.65 * Math.abs(Math.sin(lt * 9));
        out.shake = 1;
        return out;
      }
      out.press = dip(lt, 1.45, PRESS);
      out.col = lt < 1.58 ? COL.red : COL.green;       // flips green at the press
      out.glow = lt < 1.58 ? 0.5 : 0.5 + 0.28 * Math.sin((lt - 1.58) * 1.6);
      return out;
    }

    case 'double': {
      // two presses → turns green and rests
      out.press = Math.max(dip(lt, 0.4, PRESS), dip(lt, 0.85, PRESS));
      const done = lt >= 1.0;
      out.col = done ? COL.green : COL.gray;
      out.glow = done ? 0.5 + 0.28 * Math.sin((lt - 1.0) * 1.6) : 0.3;
      return out;
    }

    case 'triple': {
      // three taps (yellow) → three subtle green flashes → rests green
      const taps = Math.max(dip(lt, 0.35, 0.18), dip(lt, 0.68, 0.18), dip(lt, 1.01, 0.18));
      if (lt < 1.3) {
        out.col = COL.yellow;
        out.glow = 0.4 + taps * 0.6;
        out.press = taps;
        return out;
      }
      if (lt < 2.45) {
        out.col = COL.green;
        out.glow = 0.25 + 0.55 * flashes(lt - 1.3, 3, 0.38); // subtle
        return out;
      }
      out.col = COL.green;
      out.glow = 0.5 + 0.25 * Math.sin((lt - 2.45) * 1.5);
      return out;
    }

    case 'hold': {
      // gray, press & hold ~3s → flashes blue → rests blue
      const HOLD_END = 3.3;
      if (lt < 0.3)        { out.col = COL.gray; out.glow = 0.4; out.press = 0.85 * (lt / 0.3); return out; }
      if (lt < HOLD_END)   { out.col = COL.gray; out.glow = 0.4; out.press = 0.85; return out; }
      if (lt < HOLD_END + 0.3) {
        out.col = COL.gray; out.glow = 0.4;
        out.press = 0.85 * (1 - (lt - HOLD_END) / 0.3);
        return out;
      }
      const fl = lt - (HOLD_END + 0.3);
      if (fl < 1.15) { out.col = COL.blue; out.glow = 0.3 + 0.9 * flashes(fl, 3, 0.38); return out; }
      out.col = COL.blue; out.glow = 0.5 + 0.3 * Math.sin((fl - 1.15) * 1.6);
      return out;
    }

    case 'connected': {
      // green "connected" heartbeat — a slow blink: brief bright pulse, long rest
      const PERIOD = 3.4;                 // seconds between blinks (very slow)
      const phase = lt % PERIOD;
      const blink = phase < 0.45 ? Math.sin((phase / 0.45) * Math.PI) : 0;
      out.col = COL.green;
      out.glow = 0.18 + 0.82 * blink;
      return out;
    }

    default: // intro / outro — gentle orange breathing
      out.col = COL.orange;
      out.glow = 0.45 + 0.35 * Math.sin((lt / 2.6) * Math.PI * 2);
      return out;
  }
}

function DeviceMesh({ gesture, spinTrigger }) {
  const group = useRef();
  const led   = useRef();
  const btn   = useRef();
  const puck  = useRef();

  const btnBase    = useMemo(() => new THREE.Color('#FFA873'), []);
  const btnPressed = useMemo(() => new THREE.Color('#D17E45'), []);
  const btnTmp     = useMemo(() => new THREE.Color(), []);
  const out        = useMemo(() => ({ col: COL.orange, glow: 0.5, press: 0, shake: 0 }), []);

  const lastTrigger = useRef(spinTrigger);

  // Spin is an offset layered on top of the idle sway and eased toward a
  // multiple of 2π, so it lands exactly on the resting orientation with no snap.
  const spinOffset = useRef(0);
  const spinTarget = useRef(0);

  // Gesture-local clock so each page's animation starts from zero on entry.
  const lastGesture = useRef(gesture);
  const gestureT0 = useRef(null);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    const g = group.current;
    if (!g) return;

    let snap = false;
    if (gestureT0.current === null) { gestureT0.current = t; snap = true; }
    if (gesture !== lastGesture.current) {
      lastGesture.current = gesture;
      gestureT0.current = t;
      snap = true;
    }
    const lt = t - gestureT0.current;

    if (spinTrigger !== lastTrigger.current) {
      lastTrigger.current = spinTrigger;
      spinTarget.current += Math.PI * 2; // queue one more full turn
    }

    // Hold each page's sequence until the spin-in has settled, so every press
    // is performed while the device is facing the viewer.
    const delayed = gesture === 'single' || gesture === 'double' || gesture === 'triple' || gesture === 'hold';
    const et = lt - (delayed ? START_DELAY : 0);
    if (delayed && et < 0) {
      // calm "powered, waiting" state during the turn-in
      out.col = COL.gray; out.glow = 0.3; out.press = 0; out.shake = 0;
    } else {
      evalGesture(et, gesture, out);
    }

    // idle float + gentle sway, plus a high-freq vibration when shaking
    const shake = out.shake;
    g.position.y = Math.sin(t * 1.3) * 0.06;
    g.position.x = shake * Math.sin(t * 42) * 0.007;
    g.rotation.x = -0.18 + Math.sin(t * 0.9) * 0.03;
    g.rotation.z = shake * Math.sin(t * 38) * 0.009;
    const idleY = Math.sin(t * 0.6) * 0.32;

    // frame-rate independent ease toward the queued rotation
    const k = 1 - Math.exp(-delta * 4.5);
    spinOffset.current += (spinTarget.current - spinOffset.current) * k;
    g.rotation.y = idleY + spinOffset.current;

    if (led.current) {
      const m = led.current.material;
      if (snap) m.emissive.copy(out.col);
      else m.emissive.lerp(out.col, 0.18);
      m.color.copy(m.emissive);
      m.emissiveIntensity = 0.3 + out.glow * 3.0;
    }

    // physically depress the button into its socket to match the press pattern
    if (btn.current) {
      btn.current.position.z = -out.press * 0.11;
      if (puck.current) {
        // darken as it travels down so the press reads even in flat light
        btnTmp.copy(btnBase).lerp(btnPressed, out.press);
        puck.current.material.color.copy(btnTmp);
      }
    }
  });

  return (
    <group ref={group} rotation={[-0.18, 0, 0]}>
      {/* body — glossy light-orange plastic fob */}
      <mesh castShadow scale={[1, 1, 0.46]}>
        <capsuleGeometry args={[0.6, 1.45, 24, 64]} />
        <meshPhysicalMaterial
          color="#FFB385"
          roughness={0.32}
          metalness={0.05}
          clearcoat={1}
          clearcoatRoughness={0.2}
          reflectivity={0.5}
          sheen={0.4}
          sheenColor="#FFD9C2"
        />
      </mesh>

      {/* LED — recessed bezel + glowing dot */}
      <mesh position={[0, 0.92, 0.265]}>
        <ringGeometry args={[0.1, 0.14, 48]} />
        <meshStandardMaterial color="#C9743C" roughness={0.5} />
      </mesh>
      <mesh ref={led} position={[0, 0.92, 0.3]}>
        <sphereGeometry args={[0.09, 36, 36]} />
        <meshStandardMaterial emissive={colors.orange} emissiveIntensity={1.8} color={colors.orange} toneMapped={false} />
      </mesh>

      {/* soft recessed well the button sits in — a gentle inner shadow ring */}
      <mesh position={[0, -0.52, 0.235]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.39, 0.39, 0.1, 64]} />
        <meshPhysicalMaterial color="#D98A57" roughness={0.55} metalness={0.04} />
      </mesh>
      {/* thin lit rim around the well — a clean, subtle reference edge */}
      <mesh position={[0, -0.52, 0.285]}>
        <torusGeometry args={[0.385, 0.018, 20, 64]} />
        <meshPhysicalMaterial color="#FFC8A3" roughness={0.28} metalness={0.04} clearcoat={1} clearcoatRoughness={0.18} />
      </mesh>

      {/* button — smooth glossy pillowed puck */}
      <group ref={btn}>
        <mesh position={[0, -0.52, 0.3]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.33, 0.345, 0.16, 64]} />
          <meshPhysicalMaterial color="#FF9E68" roughness={0.26} metalness={0.05} clearcoat={1} clearcoatRoughness={0.16} reflectivity={0.6} />
        </mesh>
        {/* gently domed top for a tactile, premium feel */}
        <mesh ref={puck} position={[0, -0.52, 0.38]} scale={[1, 1, 0.28]} castShadow>
          <sphereGeometry args={[0.33, 48, 48]} />
          <meshPhysicalMaterial color="#FFA873" roughness={0.22} metalness={0.05} clearcoat={1} clearcoatRoughness={0.14} reflectivity={0.7} />
        </mesh>
      </group>
    </group>
  );
}

function Device3D({ gesture = 'intro', spinTrigger = 0, background = colors.canvas }) {
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [0, 0.3, 4.4], fov: 38 }}
      gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.1 }}
      style={{ flex: 1 }}
    >
      <color attach="background" args={[background]} />

      <ambientLight intensity={0.45} />
      <directionalLight
        position={[4, 7, 5]}
        intensity={2.4}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-near={1}
        shadow-camera-far={20}
        shadow-camera-left={-4}
        shadow-camera-right={4}
        shadow-camera-top={4}
        shadow-camera-bottom={-4}
        shadow-bias={-0.0005}
      />
      <directionalLight position={[-5, 2, 2]} intensity={0.7} color="#FFD9C2" />
      <pointLight position={[-2, -1, 3]} color={colors.orange} intensity={1.1} />
      <spotLight position={[0, 6, 2]} angle={0.5} penumbra={1} intensity={1.2} color="#FFFFFF" />

      <DeviceMesh gesture={gesture} spinTrigger={spinTrigger} />

      {/* Offset to the lower-right so it reads as a directional cast, not a
          centered horizontal band that looks like a divider above the text. */}
      <group rotation={[0, 0, -0.32]} position={[0.45, -1.28, 0]}>
        <ContactShadows
          scale={1.9}
          blur={4.5}
          opacity={0.2}
          far={1.8}
          resolution={512}
          color="#7A4A1E"
        />
      </group>
    </Canvas>
  );
}

export default React.memo(Device3D);
