// lightbulb.js
import * as THREE from 'https://unpkg.com/three@0.182.0/build/three.module.js';
import { GLTFLoader } from 'https://unpkg.com/three@0.182.0/examples/jsm/loaders/GLTFLoader.js?module';

const container = document.getElementById('lightbulb-container');
const section = document.getElementById('lightbulb-section');

if (!container || !section) throw new Error('Container or section missing');

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
    45,
    container.clientWidth / container.clientHeight,
    0.1,
    100
);
camera.position.z = 3;

const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
renderer.setSize(container.clientWidth, container.clientHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.domElement.style.position = 'absolute';
renderer.domElement.style.top = 0;
renderer.domElement.style.left = 0;
renderer.domElement.style.zIndex = '1';
renderer.domElement.style.pointerEvents = 'none';
container.appendChild(renderer.domElement);

// --- Lights ---
const ambient = new THREE.AmbientLight(0xffa500, 100); // soft orange background
scene.add(ambient);

// Point light for the bulb
const bulbLight = new THREE.PointLight(0xffa500, 0, 1, 2); // color, intensity, distance, decay
bulbLight.position.set(0, 0.5, 0);
scene.add(bulbLight);

// Load GLB lightbulb
const loader = new GLTFLoader();
loader.load(
    'models/lightbulb.glb', // replace with your file
    (gltf) => {
        const bulb = gltf.scene;
        bulb.scale.set(5, 5, 5);
        scene.add(bulb);
        ambient.position = bulb.position;
    },
    undefined,
    (err) => console.error('Failed to load bulb', err)
);

let t = 0;
let baseIntensity = 0.5;
section.style.transition = 'box-shadow 0.3s ease';

function animate() {
    t += 0.01;

    // Fade in once
    if (baseIntensity < 1.5) baseIntensity += 0.002;

    // Slow, subtle pulse
    const pulse = Math.sin(t * 1.5) * 0.08; // speed & strength
    const bulbIntensity = baseIntensity + pulse;
    const shadowStrength = bulbIntensity * 60;

    section.style.boxShadow = `
    inset 0 0 ${shadowStrength}px rgba(255, 170, 60, 0.15)
    `;

    // Apply light
    //bulbLight.intensity = bulbIntensity;
    const intensity = bulbIntensity * 0.6;

    section.style.background = `
    radial-gradient(
        circle at 50% 25%,
        rgba(255, 170, 60, ${0.15 * intensity}),
        rgba(13, 13, 13, 1) 70%
    )
  `;

    // Float the bulb slightly
    scene.children.forEach(c => {
        if (c.type === 'Group') c.position.y = 0.4 + Math.sin(t) * 0.03;

    });

    renderer.render(scene, camera);
    requestAnimationFrame(animate);
}

animate();

// Handle resize
window.addEventListener('resize', () => {
    const w = container.clientWidth;
    const h = container.clientHeight;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
});
