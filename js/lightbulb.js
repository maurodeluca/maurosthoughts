import * as THREE from 'https://unpkg.com/three@0.182.0/build/three.module.js';
import { GLTFLoader } from 'https://unpkg.com/three@0.182.0/examples/jsm/loaders/GLTFLoader.js?module';

const container = document.getElementById('lightbulb-container');
const section = document.getElementById('lightbulb-section');

if (!container || !section) throw new Error('Container or section missing');

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
const ambient = new THREE.AmbientLight(0xffa500, 0.05);
scene.add(ambient);

const bulbLight = new THREE.PointLight(0xffa500, 0, 6, 2);
bulbLight.position.set(0, 0.4, 0);
scene.add(bulbLight);

// --- Load bulb ---
const loader = new GLTFLoader();
let bulb = null;

loader.load(
  'models/lightbulb.glb',
  (gltf) => {
    bulb = gltf.scene;
    bulb.scale.set(5, 5, 5);
    bulb.position.y = 0.4;
    scene.add(bulb);
  },
  undefined,
  (err) => console.error(err)
);

// --- Animation state ---
let t = 0;
let baseIntensity = 0;

// --- Camera responsiveness ---
function updateCamera() {
  const w = container.clientWidth;
  const h = container.clientHeight;

  renderer.setSize(w, h);
  camera.aspect = w / h;

  // Pull camera back slightly on tall screens
  camera.position.z = camera.aspect < 1 ? 3.6 : 3;

  camera.updateProjectionMatrix();
}

updateCamera();

// ResizeObserver = mobile-safe
const resizeObserver = new ResizeObserver(updateCamera);
resizeObserver.observe(container);

// --- Animate ---
function animate() {
  t += 0.01;

  // Fade in
  if (baseIntensity < 1.4) baseIntensity += 0.002;

  // Pulse
  const pulse = Math.sin(t * 1.5) * 0.08;
  const intensity = baseIntensity + pulse;

  bulbLight.intensity = intensity;
  ambient.intensity = 0.04 + intensity * 0.2;

  // Background glow
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

  // Float bulb
  if (bulb) {
    bulb.position.y = 0.4 + Math.sin(t) * 0.03;
  }

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

animate();
