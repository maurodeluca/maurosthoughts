/* Reveal on scroll */
const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) entry.target.classList.add('visible');
  });
}, { threshold: 0.3 });

document.querySelectorAll('.content').forEach(el => observer.observe(el));

/* Typed quote / manifesto */
function typeText(text, element, speed = 40, callback) {
  if (!element) return;
  let i = 0;
  element.textContent = "";

  function type() {
    if (i < text.length) {
      element.textContent += text.charAt(i);
      i++;
      setTimeout(type, speed);
    } else if (callback) {
      callback();
    }
  }

  type();
}

const target = document.getElementById('typed');
const quote = `
I write to understand things better.
Sometimes that means disagreeing with the system.
`;

if (target) typeText(quote, target);

/* Manifesto typing */
const manifestoIntro =
  "I wrote this to remember what mattered before metrics.";
const manIntroTarget = document.getElementById('intro');
const manifestoTarget = document.getElementById('manifesto');

async function loadManifesto() {
  try {
    const response = await fetch('../../content/writings/manifesto.txt');
    const text = await response.text();

    if (manIntroTarget && manifestoTarget) {
      typeText(manifestoIntro, manIntroTarget, 45, () => {
        setTimeout(() => {
          typeText(text, manifestoTarget, 20);
        }, 400);
      });
    }
  } catch (err) {
    console.error('Failed to load manifesto:', err);
  }
}

loadManifesto();

/* Section scrolling logic */
const sections = document.querySelectorAll('section');
let currentSectionIndex = 0;
let isScrolling = false;

function scrollToSection(index) {
  if (index < 0 || index >= sections.length) return;
  isScrolling = true;
  sections[index].scrollIntoView({ behavior: "auto" });
  currentSectionIndex = index;
  setTimeout(() => { isScrolling = false; }, 500); // throttle wheel
}

/* Track which section is in view (for arrow nav) */
const sectionObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      currentSectionIndex = Array.from(sections).indexOf(entry.target);
    }
  });
}, { threshold: 0.5 });

sections.forEach(section => sectionObserver.observe(section));

/* Arrow click navigation */
document.addEventListener('click', (e) => {
  const arrow = e.target.closest('.section-arrow');
  if (!arrow) return;

  if (arrow.classList.contains('last-section')) {
    scrollToSection(currentSectionIndex - 1);
  } else {
    scrollToSection(currentSectionIndex + 1);
  }
});

/* Wheel scroll snapping */
window.addEventListener('wheel', (e) => {
  if (isScrolling) return;

  if (e.deltaY > 0) {
    scrollToSection(currentSectionIndex + 1);
  } else if (e.deltaY < 0) {
    scrollToSection(currentSectionIndex - 1);
  }
});

/* Optional: hijack in-page nav links for instant snapping */
document.querySelectorAll('nav a').forEach(link => {
  link.addEventListener('click', e => {
    const href = link.getAttribute('href');
    if (!href.startsWith('#')) return;
    e.preventDefault();
    const id = href.substring(1);
    const section = document.getElementById(id);
    if (section) scrollToSection(Array.from(sections).indexOf(section));
  });
});