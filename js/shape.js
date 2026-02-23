import * as THREE from 'https://unpkg.com/three@0.161.0/build/three.module.js';

function initShape() {
  const container = document.getElementById('shape-container');
  if (!container) return;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    45,
    container.clientWidth / container.clientHeight,
    0.1,
    100
  );
  camera.position.z = 5;

  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setSize(container.clientWidth, container.clientHeight);

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

  const sizeFactor = isSafari ? 0.7 : 1;
  const geometry = new THREE.IcosahedronGeometry(1.2 * sizeFactor, 0);
  const material = new THREE.MeshStandardMaterial({
    color: 0xff5555,
    wireframe: true,
    metalness: 0.4,
    roughness: 0.3,
    emissive: 0x330000,
    emissiveIntensity: 100
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.scale.set(1.5, 1.5, 1.5); // doubles the size
  scene.add(mesh); 

  const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
  dirLight.position.set(3, 3, 3);
  scene.add(dirLight);

  const ambLight = new THREE.AmbientLight(0xffffff, 0.8);
  scene.add(ambLight);

  let t = 0;
  let lastTimestamp = 0;
  let lastMoveTime = 0;
  let lastMoveDelta = { x: 0, y: 0 };
  // spin speeds are in radians/second now (approximation of previous defaults)
  let spinSpeedX = 0.18;
  let spinSpeedY = 0.24;
  let isDragging = false;
  let lastPointer = { x: 0, y: 0 };
  let pointerDelta = { x: 0, y: 0 };

  // Tunable constants
  const rotationScale = 1.5; // multiplies normalized delta to rotation units
  const spinMultiplier = 0.05;
  const minSpin = 0.02; // minimum spin in radians/second on release

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

    const now = performance.now();
    const dt = lastMoveTime ? Math.max((now - lastMoveTime) / 1000, 1 / 120) : (1 / 60);

    // Normalize movement to container size so touch and mouse match
    const deltaX = (x - lastPointer.x) / container.clientWidth;
    const deltaY = (y - lastPointer.y) / container.clientHeight;

    pointerDelta.x = deltaX * rotationScale;
    pointerDelta.y = deltaY * rotationScale;

    // Immediate rotation during drag (keeps feeling responsive)
    mesh.rotation.y += pointerDelta.x;
    mesh.rotation.x += pointerDelta.y;

    // Convert the last movement into a velocity (radians/second)
    lastMoveDelta.x = pointerDelta.x / dt;
    lastMoveDelta.y = pointerDelta.y / dt;
    lastMoveTime = now;

    lastPointer.x = x;
    lastPointer.y = y;
  };

  const onPointerUp = (e) => {
    isDragging = false;
    renderer.domElement.style.cursor = 'grab';

    // Use the last measured velocity (radians/second) as initial spin speed,
    // scaled down by `spinMultiplier` to slow flicks
    spinSpeedX = (lastMoveDelta.y || 0) * spinMultiplier;
    spinSpeedY = (lastMoveDelta.x || 0) * spinMultiplier;

    // Ensure minimum spin momentum
    if (Math.abs(spinSpeedX) < minSpin) spinSpeedX = minSpin * Math.sign(spinSpeedX || 1);
    if (Math.abs(spinSpeedY) < minSpin) spinSpeedY = minSpin * Math.sign(spinSpeedY || 1);
  };

  renderer.domElement.addEventListener('pointerdown', onPointerDown);
  document.addEventListener('pointermove', onPointerMove);
  document.addEventListener('pointerup', onPointerUp);

  // Use pointer events only to avoid duplicate touch+pointer handling
  // (modern browsers support pointer events on both desktop and mobile)

  function animate(timestamp = 0) {
    const deltaTime = Math.min((timestamp - lastTimestamp) / 1000, 0.016); // Cap at ~60fps
    lastTimestamp = timestamp;
    
    t += deltaTime;

    if (!isDragging) {
      mesh.rotation.x += spinSpeedX;
      mesh.rotation.y += spinSpeedY;

      const decay = 0.95;

      spinSpeedX *= decay;
      spinSpeedY *= decay;

      if (Math.abs(spinSpeedX) < 0.001) spinSpeedX = 0.003;
      if (Math.abs(spinSpeedY) < 0.001) spinSpeedY = 0.004;
    }

    mesh.position.y = Math.sin(t) * 0.15;
    renderer.render(scene, camera);

    requestAnimationFrame(animate);
  }

  animate();

  window.addEventListener('resize', () => {
    const w = container.clientWidth;
    const h = container.clientHeight;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  });
}

export { initShape };