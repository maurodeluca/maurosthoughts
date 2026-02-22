import { typeText } from '../core/typing.js';

async function initExistencePage() {
  const existenceEl = document.getElementById('writing');
  if (!existenceEl) return;

  const introTarget = document.getElementById('intro');
  if (!introTarget) return;

  const introText = "On being here, briefly.";
  const filePath = "../../content/writings/existence.md";

  try {
    const response = await fetch(filePath);
    const contentText = await response.text();
    typeText(introText, introTarget, 45, () => {
      setTimeout(() => {
        typeText(contentText, existenceEl, 20);
      }, 400);
    });
  } catch (err) {
    console.error(`Failed to load ${filePath}:`, err);
  }
}

initExistencePage();
