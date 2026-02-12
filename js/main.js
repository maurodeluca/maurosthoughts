import { initRevealOnScroll } from './core/reveal.js';
import { initSectionNavigation } from './core/scroll.js';
import { setTypingSkipped } from './core/typing.js';
import { initHomePage } from './pages/home.js';
import { initManifestoPage } from './pages/manifesto.js';
import { initExistencePage } from './pages/existence.js';
import { initShape } from './shape.js';

// Initialize core functionality
initRevealOnScroll();
initSectionNavigation();

// Initialize pages
initHomePage();
initShape();
initManifestoPage();
initExistencePage();

// Skip typing button handler
const skipBtn = document.getElementById('skipTyping');
if (skipBtn) {
  skipBtn.addEventListener('click', () => {
    setTypingSkipped(true);
  });
}