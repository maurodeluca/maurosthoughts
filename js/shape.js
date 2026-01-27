// shape.js
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
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(renderer.domElement);

  // Ensure canvas can detect clicks
  renderer.domElement.style.width = '100%';
  renderer.domElement.style.height = '100%';
  renderer.domElement.style.display = 'block';
  renderer.domElement.style.position = 'relative';
  renderer.domElement.style.zIndex = '10';
  renderer.domElement.style.cursor = 'grab';
  renderer.domElement.style.touchAction = 'none';
  renderer.domElement.style.pointerEvents = 'auto';

  // --- Geometry ---
  const geometry = new THREE.IcosahedronGeometry(1.2, 0);
  const material = new THREE.MeshStandardMaterial({
    color: 0xb11212,
    wireframe: true,
    metalness: 0.4,
    roughness: 0.3,
  });
  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);

  // --- Lights ---
  const dirLight = new THREE.DirectionalLight(0xffffff, 1);
  dirLight.position.set(3, 3, 3);
  scene.add(dirLight);

  const ambLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambLight);

  // --- Animation / Spin ---
  let t = 0;
  let spinSpeedX = 0.003;
  let spinSpeedY = 0.004;
  let isDragging = false;
  let lastPointer = { x: 0, y: 0 };
  let pointerDelta = { x: 0, y: 0 };

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
    pointerDelta.x = (x - lastPointer.x) * 0.01;
    pointerDelta.y = (y - lastPointer.y) * 0.01;

    mesh.rotation.y += pointerDelta.x;
    mesh.rotation.x += pointerDelta.y;

    lastPointer.x = x;
    lastPointer.y = y;
  };

  const onPointerUp = () => {
    isDragging = false;
    renderer.domElement.style.cursor = 'grab';
    spinSpeedX = pointerDelta.y * 2;
    spinSpeedY = pointerDelta.x * 2;
  };

  // --- Event listeners ---
  renderer.domElement.addEventListener('pointerdown', onPointerDown);
  renderer.domElement.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);

  renderer.domElement.addEventListener('touchstart', onPointerDown, { passive: false });
  renderer.domElement.addEventListener('touchmove', onPointerMove, { passive: false });
  window.addEventListener('touchend', onPointerUp);

  // --- Animate loop ---
  function animate() {
    t += 0.01;

    if (!isDragging) {
      mesh.rotation.x += spinSpeedX;
      mesh.rotation.y += spinSpeedY;

      spinSpeedX *= 0.95;
      spinSpeedY *= 0.95;

      if (Math.abs(spinSpeedX) < 0.001) spinSpeedX = 0.003;
      if (Math.abs(spinSpeedY) < 0.001) spinSpeedY = 0.004;
    }

    mesh.position.y = Math.sin(t) * 0.15;

    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }

  animate();

  // --- Resize ---
  window.addEventListener('resize', () => {
    const w = container.clientWidth;
    const h = container.clientHeight;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  });
}
