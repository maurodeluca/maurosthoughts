// shape.js
import * as THREE from 'https://unpkg.com/three@0.161.0/build/three.module.js';

const container = document.getElementById('shape-container');

if (container) {
  // --- Scene ---
  const scene = new THREE.Scene();

  // --- Camera ---
  const camera = new THREE.PerspectiveCamera(
    45,
    container.clientWidth / container.clientHeight,
    0.1,
    100
  );
  camera.position.z = 4;

  // --- Renderer ---
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setSize(container.clientWidth, container.clientHeight);

  // Safari/iOS detection
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  renderer.setPixelRatio(isSafari ? 1.5 : Math.min(window.devicePixelRatio, 2));

  container.appendChild(renderer.domElement);

  renderer.domElement.style.width = '100%';
  renderer.domElement.style.height = '100%';
  renderer.domElement.style.display = 'block';
  renderer.domElement.style.position = 'relative';
  renderer.domElement.style.zIndex = '10';
  renderer.domElement.style.cursor = 'grab';
  renderer.domElement.style.touchAction = 'none';
  renderer.domElement.style.pointerEvents = 'auto';

  // --- Geometry / Material (brighter) ---
  const sizeFactor = isSafari ? 0.7 : 1; // smaller on mobile Safari
  const geometry = new THREE.IcosahedronGeometry(1.2 * sizeFactor, 0);
  const material = new THREE.MeshStandardMaterial({
    color: 0xff5555,        // brighter red
    wireframe: true,
    metalness: 0.4,
    roughness: 0.3,
    emissive: 0x330000,
    emissiveIntensity: 0.5
  });
  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);

  // --- Lights (stronger) ---
  const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
  dirLight.position.set(3, 3, 3);
  scene.add(dirLight);

  const ambLight = new THREE.AmbientLight(0xffffff, 0.8);
  scene.add(ambLight);

  // --- Spin variables ---
  let t = 0;
  let spinSpeedX = 0.003;
  let spinSpeedY = 0.004;
  let isDragging = false;
  let lastPointer = { x: 0, y: 0 };
  let pointerDelta = { x: 0, y: 0 };

  // --- Pointer / touch handling ---
  const onPointerDown = (e) => {
    isDragging = true;
    renderer.domElement.style.cursor = 'grabbing';
    lastPointer.x = e.clientX || e.touches?.[0].clientX;
    lastPointer.y = e.clientY || e.touches?.[0].clientY;
  };

  const onPointerMove = (e) => {
    if (!isDragging) return;
    const x = e.clientX || e.touches?.[0].clientX;
    const y = e.clientY || e.touches?.[0].clientY;

    const factor = e.touches ? 0.05 : 0.01; // scale touch delta bigger
    pointerDelta.x = (x - lastPointer.x) * factor;
    pointerDelta.y = (y - lastPointer.y) * factor;

    mesh.rotation.y += pointerDelta.x;
    mesh.rotation.x += pointerDelta.y;

    lastPointer.x = x;
    lastPointer.y = y;
  };

  const onPointerUp = (e) => {
    isDragging = false;
    renderer.domElement.style.cursor = 'grab';

    // Minimum spin speed to keep momentum
    const minSpeed = e.type.includes('touch') ? 0.002 : 0.001;

    spinSpeedX = pointerDelta.y * 2;
    spinSpeedY = pointerDelta.x * 2;

    if (Math.abs(spinSpeedX) < minSpeed) spinSpeedX = minSpeed * Math.sign(spinSpeedX || 1);
    if (Math.abs(spinSpeedY) < minSpeed) spinSpeedY = minSpeed * Math.sign(spinSpeedY || 1);
  };

  renderer.domElement.addEventListener('pointerdown', onPointerDown);
  renderer.domElement.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);

  renderer.domElement.addEventListener('touchstart', onPointerDown, { passive: false });
  renderer.domElement.addEventListener('touchmove', onPointerMove, { passive: false });
  window.addEventListener('touchend', onPointerUp);

  // --- Animate loop with optional throttling for Safari ---
  let lastRender = 0;
  function animate(timestamp = 0) {
    if (!isSafari || timestamp - lastRender > 16) { // ~60fps
      t += 0.01;

      if (!isDragging) {
        mesh.rotation.x += spinSpeedX;
        mesh.rotation.y += spinSpeedY;

        // Decay differently for touch vs desktop
        const decay = isSafari ? 0.97 : 0.95;
        spinSpeedX *= decay;
        spinSpeedY *= decay;

        if (Math.abs(spinSpeedX) < 0.001) spinSpeedX = 0.003;
        if (Math.abs(spinSpeedY) < 0.001) spinSpeedY = 0.004;
      }

      mesh.position.y = Math.sin(t) * 0.15;
      renderer.render(scene, camera);

      lastRender = timestamp;
    }

    requestAnimationFrame(animate);
  }

  animate();

  // --- Responsive resize ---
  window.addEventListener('resize', () => {
    const w = container.clientWidth;
    const h = container.clientHeight;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  });
}