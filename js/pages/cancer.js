import { typeText } from '../core/typing.js';

async function initCancerPage() {
  const cancerEl = document.getElementById('writing');
  if (!cancerEl) return;

  const introTarget = document.getElementById('intro');
  if (!introTarget) return;

  const introText = "Exploring why cancer is an inevitable feature of multicellular life.";
  const filePath = "../../content/writings/cancer.md";

  try {
    const response = await fetch(filePath);
    const contentText = await response.text();
    typeText(introText, introTarget, 45, () => {
      setTimeout(() => {
        typeText(contentText, cancerEl, 20);
      }, 400);
    });
  } catch (err) {
    console.error(`Failed to load ${filePath}:`, err);
  }
}

initCancerPage();
