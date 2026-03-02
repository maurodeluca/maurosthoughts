import { initRevealOnScroll } from './core/reveal.js';
import { initSectionNavigation } from './core/scroll.js';
import { setTypingSkipped } from './core/typing.js';
import { initHomePage } from './pages/home.js';
import { initShape } from './shape.js';

// Initialize core functionality
initRevealOnScroll();
initSectionNavigation();

// Initialize pages
initHomePage();
initShape();

// Skip typing button handler
const skipBtn = document.getElementById('skipTyping');
if (skipBtn) {
  skipBtn.addEventListener('click', () => {
    setTypingSkipped(true);
  });
}

const simulationsSection = document.querySelector('#simulations');

let simulationsLoaded = false;

const observer = new IntersectionObserver(async (entries) => {
  const entry = entries[0];

  if (entry.isIntersecting && !simulationsLoaded) {
    simulationsLoaded = true;

    // dynamically load modules
    await import('./nebula-card.js');
    await import('./blackhole-card.js');
    await import('./supernova-card.js');

    console.log('Simulations loaded');
  }
}, {
  threshold: 0.2
});

observer.observe(simulationsSection);