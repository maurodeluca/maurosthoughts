import * as THREE from 'https://unpkg.com/three@0.182.0/build/three.module.js';
import { GLTFLoader } from 'https://unpkg.com/three@0.182.0/examples/jsm/loaders/GLTFLoader.js?module';
import { typeText } from '../core/typing.js';

function initHomePage() {
  const container = document.getElementById('lightbulb-container');
  const section = document.getElementById('lightbulb');
  const textElement = section?.querySelector('h2');

  if (!container || !section || !textElement) return;

  // --- Scene ---
  const scene = new THREE.Scene();

  // --- Camera ---
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.z = 3;

  // --- Renderer ---
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.domElement.style.position = 'absolute';
  renderer.domElement.style.top = 0;
  renderer.domElement.style.left = 0;
  renderer.domElement.style.pointerEvents = 'none';
  container.appendChild(renderer.domElement);

  // --- Lights ---
  const ambient = new THREE.AmbientLight(0xffffff, 50);
  scene.add(ambient);

  const bulbLight = new THREE.PointLight(0xffa500, 0, 1, 10);
  scene.add(bulbLight);

  // --- Load bulb ---
  const loader = new GLTFLoader();
  let bulb = null;

  loader.load(
    'models/lightbulb.glb',
    (gltf) => {
      bulb = gltf.scene;
      bulb.scale.set(5, 5, 5);
      ambient.position.copy(bulb.position);
      bulbLight.position.copy(bulb.position);
      scene.add(bulb);
      bulb.traverse((child) => {
        if (child.isMesh && child.material) {
          child.material.emissive = new THREE.Color(0xffa500);
          child.material.emissiveIntensity = 0;
        }
      });
      updateBulbY();
    },
    undefined,
    (err) => console.error(err)
  );

  // --- Animation state ---
  let t = 0;
  let baseIntensity = 0.5;
  const warmColor = new THREE.Color(0xff9b2f);
  const hotColor = new THREE.Color(0xfff1c1);

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

  // --- Camera responsiveness ---
  function updateCamera() {
    const w = container.clientWidth;
    const h = container.clientHeight;

    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.position.z = camera.aspect < 1 ? 3.6 : 3;
    camera.updateProjectionMatrix();
  }

  updateCamera();

  const resizeObserver = new ResizeObserver(updateCamera);
  resizeObserver.observe(container);

  // --- Animate ---
  function animate() {
    t += 0.01;

    if (baseIntensity < 1.4) baseIntensity += 0.002;

    const pulse = Math.sin(t * 1.5) * 0.08;
    const intensity = baseIntensity + pulse;
    const glow = Math.pow(intensity, 1.4);
    const glowStrength = intensity * 0.6;

    section.style.background = `
      radial-gradient(
        circle at 50% 25%,
        rgba(255, 170, 60, ${0.15 * glowStrength}),
        rgba(13, 13, 13, 1) 70%
      )
    `;

    section.style.boxShadow = `
      inset 0 0 ${intensity * 60}px rgba(255, 170, 60, 0.15)
    `;

    if (bulb) {
      bulb.position.y = updateBulbY() + Math.sin(t) * 0.03;

      bulb.traverse((child) => {
        if (child.isMesh && child.material?.emissive) {
          child.material.emissive
            .copy(warmColor)
            .lerp(hotColor, Math.min(glow, 1));

          child.material.emissiveIntensity = glow * 0.8;
        }
      });
    }

    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }

  animate();

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
