/* ============================================================
   PerformanceField — subtle constellation / data field
   A discreet Three.js backdrop: slow-drifting points connected
   by thin proximity lines, faint red accents, light mouse
   parallax. Supports off, cleanup, DPR cap and mobile density.

   initPerformanceField(canvas, {
     particleCount?: number,   // desktop target; auto-reduced on mobile
     intensity?: number,       // 0..1 line/opacity strength
   }) -> { destroy(): void }

   Returns null (no-op) when WebGL is unavailable or the user
   prefers reduced motion; the caller keeps its CSS fallback.
   ============================================================ */

import * as THREE from "three";

export function initPerformanceField(canvas, options = {}) {
  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;
  if (!canvas || reduceMotion) return null;

  const isMobile = window.matchMedia("(max-width: 900px)").matches;
  const intensity = clamp(options.intensity ?? 0.6, 0, 1);
  const baseCount = options.particleCount ?? 120;
  const count = Math.round(isMobile ? baseCount * 0.45 : baseCount);

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: "low-power",
    });
  } catch {
    return null; // no WebGL — CSS gradient remains
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
  camera.position.z = 18;

  const SPREAD_X = 46;
  const SPREAD_Y = 30;
  const SPREAD_Z = 16;
  const LINK_DIST = isMobile ? 6.5 : 5.8;

  // Point positions + velocities
  const positions = new Float32Array(count * 3);
  const velocities = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const cWhite = new THREE.Color(0xf4f3ef);
  const cRed = new THREE.Color(0xc1121f);

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    positions[i3] = (Math.random() - 0.5) * SPREAD_X;
    positions[i3 + 1] = (Math.random() - 0.5) * SPREAD_Y;
    positions[i3 + 2] = (Math.random() - 0.5) * SPREAD_Z;
    velocities[i3] = (Math.random() - 0.5) * 0.012;
    velocities[i3 + 1] = (Math.random() - 0.5) * 0.012;
    velocities[i3 + 2] = (Math.random() - 0.5) * 0.008;
    const c = Math.random() < 0.14 ? cRed : cWhite;
    colors[i3] = c.r;
    colors[i3 + 1] = c.g;
    colors[i3 + 2] = c.b;
  }

  const pointsGeo = new THREE.BufferGeometry();
  pointsGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  pointsGeo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  const pointsMat = new THREE.PointsMaterial({
    size: 0.13,
    vertexColors: true,
    transparent: true,
    opacity: 0.35 + intensity * 0.35,
    depthWrite: false,
    sizeAttenuation: true,
  });
  const points = new THREE.Points(pointsGeo, pointsMat);
  scene.add(points);

  // Proximity lines — capacity for a bounded number of segments
  const maxSegments = count * 6;
  const linePositions = new Float32Array(maxSegments * 6);
  const lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute(
    "position",
    new THREE.BufferAttribute(linePositions, 3).setUsage(THREE.DynamicDrawUsage)
  );
  const lineMat = new THREE.LineBasicMaterial({
    color: 0xc1121f,
    transparent: true,
    opacity: 0.12 * intensity,
    depthWrite: false,
  });
  const lines = new THREE.LineSegments(lineGeo, lineMat);
  scene.add(lines);

  // Pointer parallax
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  const onPointerMove = (e) => {
    pointer.tx = (e.clientX / window.innerWidth - 0.5) * 2;
    pointer.ty = (e.clientY / window.innerHeight - 0.5) * 2;
  };
  window.addEventListener("pointermove", onPointerMove, { passive: true });

  // Sizing
  function resize() {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  resize();

  // Animation loop with visibility + reduced work
  let raf = 0;
  let running = true;
  const linkDistSq = LINK_DIST * LINK_DIST;

  function updateLines() {
    let ptr = 0;
    const pos = positions;
    for (let i = 0; i < count; i++) {
      const ix = i * 3;
      for (let j = i + 1; j < count; j++) {
        const jx = j * 3;
        const dx = pos[ix] - pos[jx];
        const dy = pos[ix + 1] - pos[jx + 1];
        const dz = pos[ix + 2] - pos[jx + 2];
        const dsq = dx * dx + dy * dy + dz * dz;
        if (dsq < linkDistSq && ptr < maxSegments * 6 - 6) {
          linePositions[ptr++] = pos[ix];
          linePositions[ptr++] = pos[ix + 1];
          linePositions[ptr++] = pos[ix + 2];
          linePositions[ptr++] = pos[jx];
          linePositions[ptr++] = pos[jx + 1];
          linePositions[ptr++] = pos[jx + 2];
        }
      }
    }
    lineGeo.setDrawRange(0, ptr / 3);
    lineGeo.attributes.position.needsUpdate = true;
  }

  function tick() {
    raf = requestAnimationFrame(tick);
    if (!running) return;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      positions[i3] += velocities[i3];
      positions[i3 + 1] += velocities[i3 + 1];
      positions[i3 + 2] += velocities[i3 + 2];
      if (positions[i3] > SPREAD_X / 2 || positions[i3] < -SPREAD_X / 2)
        velocities[i3] *= -1;
      if (positions[i3 + 1] > SPREAD_Y / 2 || positions[i3 + 1] < -SPREAD_Y / 2)
        velocities[i3 + 1] *= -1;
      if (positions[i3 + 2] > SPREAD_Z / 2 || positions[i3 + 2] < -SPREAD_Z / 2)
        velocities[i3 + 2] *= -1;
    }
    pointsGeo.attributes.position.needsUpdate = true;
    updateLines();

    pointer.x += (pointer.tx - pointer.x) * 0.04;
    pointer.y += (pointer.ty - pointer.y) * 0.04;
    scene.rotation.y = pointer.x * 0.12;
    scene.rotation.x = pointer.y * 0.08;
    scene.rotation.z += 0.0004;

    renderer.render(scene, camera);
  }

  // Pausa quando a aba sai de foco e também quando o hero sai da tela: sem
  // isso o loop O(n²) de linhas continua rodando enquanto o visitante lê o
  // resto da página, gastando CPU e bateria à toa.
  let visivelNaAba = !document.hidden;
  let visivelNaTela = true;
  const sincronizar = () => {
    running = visivelNaAba && visivelNaTela;
  };
  const onVisibility = () => {
    visivelNaAba = !document.hidden;
    sincronizar();
  };
  document.addEventListener("visibilitychange", onVisibility);

  const io = new IntersectionObserver(
    ([entrada]) => {
      visivelNaTela = entrada.isIntersecting;
      sincronizar();
    },
    { rootMargin: "120px" }
  );
  io.observe(canvas);

  tick();

  return {
    destroy() {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("visibilitychange", onVisibility);
      io.disconnect();
      ro.disconnect();
      pointsGeo.dispose();
      pointsMat.dispose();
      lineGeo.dispose();
      lineMat.dispose();
      renderer.dispose();
    },
  };
}

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}
