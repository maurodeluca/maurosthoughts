import { typeText, markdownToHtml } from '../core/typing.js';

async function showLocked(writingEl, filePath) {
  const wrapper = document.querySelector('.writing-wrapper');
  if (!wrapper) return;

  // Change terminal text to identity detected
  const cursorLine = document.querySelector('.cursor-line');
  if (cursorLine) {
    cursorLine.innerHTML = 'identity detected.<span class="cursor"></span>';
  }

  // Hide narration button
  const readBtn = document.getElementById('read-text');
  if (readBtn) readBtn.style.display = 'none';

  // Fetch and fill the text box with blurred content
  try {
    const response = await fetch(filePath);
    const contentText = await response.text();
    writingEl.innerHTML = markdownToHtml(contentText);
  } catch (_) {}

  wrapper.classList.add('locked');

  // Fade in the icon
  const svg = document.querySelector('.incognito-overlay svg');
  if (svg) {
    requestAnimationFrame(() => svg.classList.add('visible'));
  }
}

async function initAnonymityPage() {
  const writingEl = document.getElementById('writing');
  if (!writingEl) return;

  const introTarget = document.getElementById('intro');
  if (!introTarget) return;

  const isIncognito = await detectIncognito();
  const isPrivate = isIncognito.isPrivate;

  const introText = "the most powerful thing you can be is no one.";
  const filePath = "../../content/writings/anonymity.md";

  if (!isPrivate) {
    showLocked(writingEl, filePath);
    return;
  }

  try {
    const response = await fetch(filePath);
    const contentText = await response.text();

    typeText(introText, introTarget, 45, () => {
      setTimeout(() => {
        typeText(contentText, writingEl, 20);
      }, 400);
    });
  } catch (err) {
    console.error(`Failed to load ${filePath}:`, err);
  }
}

initAnonymityPage();