import * as THREE from 'https://unpkg.com/three@0.182.0/build/three.module.js';
import { GLTFLoader } from 'https://unpkg.com/three@0.182.0/examples/jsm/loaders/GLTFLoader.js?module';

const container = document.getElementById('lightbulb-container');
const section = document.getElementById('lightbulb');

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
const ambient = new THREE.AmbientLight(0xffffff, 50);
scene.add(ambient);

// Point light for the bulb, with decay
const bulbLight = new THREE.PointLight(0xffa500, 0, 1, 10);
bulbLight.position.set(0, 0, 0);
scene.add(bulbLight);

// --- Load bulb ---
const loader = new GLTFLoader();
let bulb = null;

loader.load(
    'models/lightbulb.glb',
    (gltf) => {
        bulb = gltf.scene;
        bulb.scale.set(5, 5, 5);
        ambient.position.x = bulb.position.x;
        ambient.position.y = bulb.position.y;
        ambient.position.z = bulb.position.z;
        scene.add(bulb);
        bulb.traverse((child) => {
            if (child.isMesh && child.material) {
                child.material.emissive = new THREE.Color(0xffa500);
                child.material.emissiveIntensity = 0;
            }
        });
    },
    undefined,
    (err) => console.error(err)
);

// --- Animation state ---
let t = 0;
let baseIntensity = 0.5;
const warmColor = new THREE.Color(0xff9b2f); // dim filament
const hotColor  = new THREE.Color(0xfff1c1); // hot white-orange

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
    const glow = Math.pow(intensity, 1.4); // non-linear = glow feeling

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

        bulb.traverse((child) => {
            if (child.isMesh && child.material?.emissive) {

                // Color shift: warm → hot
                child.material.emissive
                    .copy(warmColor)
                    .lerp(hotColor, Math.min(glow, 1));

                // Intensity ramps non-linearly
                child.material.emissiveIntensity = glow * 0.8;
            }
        });
    }

    renderer.render(scene, camera);
    requestAnimationFrame(animate);
}

animate();
