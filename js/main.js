import { initRevealOnScroll } from './core/reveal.js';
import { initSectionNavigation } from './core/scroll.js';
import { setTypingSkipped } from './core/typing.js';
import { initHomePage } from './pages/home.js';
import { initShape } from './shape.js';

// Nav dropdown
const navDropdown = document.querySelector('.nav-dropdown');
const navToggle   = document.querySelector('.nav-toggle');
if (navDropdown && navToggle) {
  navToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    const open = navDropdown.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', open);
  });
  // Close when clicking a menu link
  navDropdown.querySelectorAll('.nav-menu a').forEach(link => {
    link.addEventListener('click', () => {
      navDropdown.classList.remove('open');
      navToggle.setAttribute('aria-expanded', 'false');
    });
  });
  // Close on outside click
  document.addEventListener('click', (e) => {
    if (!navDropdown.contains(e.target)) {
      navDropdown.classList.remove('open');
      navToggle.setAttribute('aria-expanded', 'false');
    }
  });
}

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
let nebulaModule, blackholeModule, supernovaModule;

const observer = new IntersectionObserver((entries) => {
  const entry = entries[0];

  if (entry.isIntersecting && !simulationsLoaded) {
    simulationsLoaded = true;

    // dynamically load modules
    nebulaModule = import('./nebula-card.js');
    blackholeModule = import('./blackhole-card.js');
    supernovaModule = import('./supernova-card.js');
  }
  if (!entry.isIntersecting && simulationsLoaded) {
    nebulaModule.then(m => m.stop());
    blackholeModule.then(m => m.stop());
    supernovaModule.then(m => m.stop());
    simulationsLoaded = false;
  }
}, {
  threshold: 0.2
});

observer.observe(simulationsSection);