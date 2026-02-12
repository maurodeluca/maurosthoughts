import { typeText } from '../core/typing.js';

async function initManifestoPage() {
  const manifestoEl = document.getElementById('manifesto');
  if (!manifestoEl) return;

  const introTarget = document.getElementById('intro');
  if (!introTarget) return;

  const introText = "I wrote this to remember what mattered before metrics.";
  const filePath = "../../content/writings/manifesto.md";

  try {
    const response = await fetch(filePath);
    const contentText = await response.text();
    typeText(introText, introTarget, 45, () => {
      setTimeout(() => {
        typeText(contentText, manifestoEl, 20);
      }, 400);
    });
  } catch (err) {
    console.error(`Failed to load ${filePath}:`, err);
  }
}

export { initManifestoPage };
