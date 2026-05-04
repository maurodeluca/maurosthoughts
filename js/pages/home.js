import { typeText } from '../core/typing.js';

const isMobile = /Mobi|Android/i.test(navigator.userAgent) || window.innerWidth < 768;

function initHomePage() {
  const container = document.getElementById('lightbulb-container');
  const section = document.getElementById('lightbulb');
  const textElement = section?.querySelector('h2');

  if (!container || !section || !textElement) return;

  let sceneReady = false;
  let isVisible = false;
  let animFrameId = null;

  // Three.js objects (lazy-initialized)
  let THREE, scene, camera, renderer, ambient, bulbLight, bulb;
  let emissiveMeshes = []; // cached mesh references — avoids per-frame traverse

  // --- Animation state ---
  let t = 0;
  let baseIntensity = 0.5;
  let warmColor, hotColor;
  let lastBg = '', lastShadow = ''; // throttle DOM style writes

  function getTextOffsetY() {
    const rect = textElement.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    return rect.top - containerRect.top;
  }

  function updateBulbY() {
    const textOffset = getTextOffsetY();
    const containerHeight = container.clientHeight;
    const normalized = 1 - textOffset / containerHeight;
    const BULB_OFFSET = -0.1;
    return normalized + BULB_OFFSET;
  }

  function updateCamera() {
    if (!renderer || !camera) return;
    const w = container.clientWidth;
    const h = container.clientHeight;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.position.z = camera.aspect < 1 ? 3.6 : 3;
    camera.updateProjectionMatrix();
  }

  // --- Animate (only runs when visible) ---
  function animate() {
    if (!isVisible) { animFrameId = null; return; }

    t += 0.01;
    if (baseIntensity < 1.4) baseIntensity += 0.002;

    const pulse = Math.sin(t * 1.5) * 0.08;
    const intensity = baseIntensity + pulse;
    const glow = Math.pow(intensity, 1.4);
    const glowStrength = intensity * 0.6;

    // Throttle DOM style writes — only update when value actually changes
    const bgAlpha = (0.15 * glowStrength).toFixed(3);
    const newBg = `radial-gradient(circle at 50% 25%,rgba(255,170,60,${bgAlpha}),rgba(13,13,13,1) 70%)`;
    if (newBg !== lastBg) { section.style.background = newBg; lastBg = newBg; }

    const shadowPx = (intensity * 60).toFixed(0);
    const newShadow = `inset 0 0 ${shadowPx}px rgba(255,170,60,0.15)`;
    if (newShadow !== lastShadow) { section.style.boxShadow = newShadow; lastShadow = newShadow; }

    if (bulb) {
      bulb.position.y = updateBulbY() + Math.sin(t) * 0.03;

      // Use cached mesh list instead of traverse()
      const clampedGlow = Math.min(glow, 1);
      for (let i = 0; i < emissiveMeshes.length; i++) {
        const mat = emissiveMeshes[i].material;
        mat.emissive.copy(warmColor).lerp(hotColor, clampedGlow);
        mat.emissiveIntensity = glow * 0.8;
      }
    }

    renderer.render(scene, camera);
    animFrameId = requestAnimationFrame(animate);
  }

  function startAnimation() {
    if (animFrameId) return;
    isVisible = true;
    animFrameId = requestAnimationFrame(animate);
  }

  function stopAnimation() {
    isVisible = false;
    if (animFrameId) { cancelAnimationFrame(animFrameId); animFrameId = null; }
  }

  // --- Lazy-load Three.js + model only when section nears viewport ---
  async function initScene() {
    if (sceneReady) return;
    sceneReady = true;

    const [threeModule, { GLTFLoader }, { DRACOLoader }] = await Promise.all([
      import('https://unpkg.com/three@0.182.0/build/three.module.js'),
      import('https://unpkg.com/three@0.182.0/examples/jsm/loaders/GLTFLoader.js?module'),
      import('https://unpkg.com/three@0.182.0/examples/jsm/loaders/DRACOLoader.js?module')
    ]);
    THREE = threeModule;

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.z = 3;

    // Disable antialiasing on mobile for perf; cap pixel ratio at 1 on mobile
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: !isMobile });
    renderer.setPixelRatio(isMobile ? 1 : Math.min(window.devicePixelRatio, 1.5));
    renderer.domElement.style.position = 'absolute';
    renderer.domElement.style.top = 0;
    renderer.domElement.style.left = 0;
    renderer.domElement.style.pointerEvents = 'none';
    container.appendChild(renderer.domElement);

    ambient = new THREE.AmbientLight(0xffffff, 50);
    scene.add(ambient);

    bulbLight = new THREE.PointLight(0xffa500, 0, 1, 10);
    scene.add(bulbLight);

    warmColor = new THREE.Color(0xff9b2f);
    hotColor = new THREE.Color(0xfff1c1);

    updateCamera();
    const resizeObserver = new ResizeObserver(updateCamera);
    resizeObserver.observe(container);

    // Load model (Draco-compressed)
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('https://unpkg.com/three@0.182.0/examples/jsm/libs/draco/');
    const loader = new GLTFLoader();
    loader.setDRACOLoader(dracoLoader);
    loader.load(
      'models/lightbulb.glb',
      (gltf) => {
        bulb = gltf.scene;
        bulb.scale.set(5, 5, 5);
        ambient.position.copy(bulb.position);
        bulbLight.position.copy(bulb.position);
        scene.add(bulb);

        // Cache emissive meshes once — never traverse again
        bulb.traverse((child) => {
          if (child.isMesh && child.material) {
            child.material.emissive = new THREE.Color(0xffa500);
            child.material.emissiveIntensity = 0;
            if (child.material.emissive) {
              emissiveMeshes.push(child);
            }
          }
        });

        updateBulbY();
        if (isVisible) startAnimation();
      },
      undefined,
      (err) => console.error(err)
    );

    startAnimation();
  }

  // --- IntersectionObserver: lazy-load scene + pause/resume animation ---
  const sectionObserver = new IntersectionObserver((entries) => {
    const entry = entries[0];
    if (entry.isIntersecting) {
      if (!sceneReady) initScene();
      else startAnimation();
    } else {
      stopAnimation();
    }
  }, { rootMargin: '200px 0px' }); // preload 200px before visible

  sectionObserver.observe(section);

  // --- Typed quote ---
  const quoteTarget = document.getElementById('typed');
  const quoteText = `
I write to understand things better.
Sometimes that means disagreeing with the system.
`;

  if (quoteTarget) {
    typeText(quoteText, quoteTarget, 40);
  }
}

export { initHomePage };
