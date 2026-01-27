/* ============================
   Reveal on scroll
============================ */

const revealObserver = new IntersectionObserver(
  entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  },
  { threshold: 0.3 }
);

document.querySelectorAll('.content').forEach(el => {
  revealObserver.observe(el);
});

/* ============================
   Typewriter utility
============================ */

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

/* ============================
   Typed quote (homepage)
============================ */

const quoteTarget = document.getElementById('typed');
const quoteText = `
I write to understand things better.
Sometimes that means disagreeing with the system.
`;

if (quoteTarget) {
  typeText(quoteText, quoteTarget, 40);
}

/* ============================
   Manifesto typing
============================ */

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

/* ============================
   Section tracking (arrows/nav)
============================ */

const homePage = document.querySelector('.home-page');
const sections = homePage
  ? Array.from(homePage.querySelectorAll('section'))
  : [];

let currentSectionIndex = 0;

const sectionObserver = new IntersectionObserver(
  entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        currentSectionIndex = sections.indexOf(entry.target);
      }
    });
  },
  { threshold: 0.3 }
);

sections.forEach(section => sectionObserver.observe(section));

function scrollToSection(index) {
  if (index < 0 || index >= sections.length) return;
  sections[index].scrollIntoView({ behavior: 'auto' });
  currentSectionIndex = index;
}

/* ============================
   Arrow navigation
============================ */

document.addEventListener('click', e => {
  const arrow = e.target.closest('.section-arrow');
  if (!arrow) return;

  if (arrow.classList.contains('last-section')) {
    scrollToSection(currentSectionIndex - 1);
  } else {
    scrollToSection(currentSectionIndex + 1);
  }
});

/* ============================
   In-page nav links (instant)
============================ */

document.querySelectorAll('nav a').forEach(link => {
  link.addEventListener('click', e => {
    const href = link.getAttribute('href');
    if (!href || !href.startsWith('#')) return;

    e.preventDefault();
    const id = href.slice(1);
    const targetSection = document.getElementById(id);

    if (!targetSection) return;
    const index = sections.indexOf(targetSection);
    if (index !== -1) scrollToSection(index);
  });
});