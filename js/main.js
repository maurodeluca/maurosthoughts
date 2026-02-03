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

function skipTyping(target, text) {
  target.textContent = text;
  // optionally set a finished flag if needed
}

skipBtn.addEventListener('click', () => {
  skipTyping(introTarget, introText);
  skipTyping(contentTarget, text);
  skipTyping(quoteTarget, quoteText); // if you want quote too
});

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
   Generic typing loader
============================ */

async function loadTypedText({
  introText,
  introElementId,
  contentElementId,
  filePath,
  introSpeed = 45,
  contentSpeed = 20,
  delay = 400
}) {
  const introTarget = document.getElementById(introElementId);
  const contentTarget = document.getElementById(contentElementId);

  if (!introTarget || !contentTarget) return;

  try {
    const response = await fetch(filePath);
    const text = await response.text();

    typeText(introText, introTarget, introSpeed, () => {
      setTimeout(() => {
        typeText(text, contentTarget, contentSpeed);
      }, delay);
    });
  } catch (err) {
    console.error(`Failed to load ${filePath}:`, err);
  }
}

loadTypedText({
  introText: "I wrote this to remember what mattered before metrics.",
  introElementId: "intro",
  contentElementId: "manifesto",
  filePath: "../../content/writings/manifesto.txt"
});

loadTypedText({
  introText: "On being here, briefly.",
  introElementId: "intro",
  contentElementId: "existence",
  filePath: "../../content/writings/existence.txt"
});

/* ============================
   Homepage arrow + scroll navigation
============================ */
const homePage = document.querySelector('.home-page');
const sections = homePage ? Array.from(homePage.querySelectorAll('section')) : [];
let currentSectionIndex = 0;

// Track which section is currently in view
const sectionObserver = new IntersectionObserver(
  entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        currentSectionIndex = sections.indexOf(entry.target);
      }
    });
  },
  { threshold: 0.5 }
);

sections.forEach(section => sectionObserver.observe(section));

// Scroll to a section helper
function scrollToSection(index) {
  if (!homePage || index < 0 || index >= sections.length) return;
  sections[index].scrollIntoView({ behavior: 'auto', block: 'start' });
  currentSectionIndex = index;
}

// Arrow navigation
document.addEventListener('click', e => {
  const arrow = e.target.closest('.section-arrow');
  if (!arrow) return;

  if (arrow.classList.contains('last-section')) {
    scrollToSection(currentSectionIndex - 1);
  } else {
    scrollToSection(currentSectionIndex + 1);
  }
});

/* Optional: wheel navigation for one-section-at-a-time scrolling */
if (homePage) {
  let isScrolling = false;

  homePage.addEventListener(
    'wheel',
    e => {
      e.preventDefault();
      if (isScrolling) return;

      isScrolling = true;

      if (e.deltaY > 0 && currentSectionIndex < sections.length - 1) {
        scrollToSection(currentSectionIndex + 1);
      } else if (e.deltaY < 0 && currentSectionIndex > 0) {
        scrollToSection(currentSectionIndex - 1);
      }

      setTimeout(() => {
        isScrolling = false;
      }, 700);
    },
    { passive: false }
  );

  window.addEventListener('keydown', (e) => {
    // Ignore if user is typing in an input/textarea
    const tag = document.activeElement.tagName.toLowerCase();
    if (tag === 'input' || tag === 'textarea') return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      scrollToSection(currentSectionIndex + 1);
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      scrollToSection(currentSectionIndex - 1);
    }
  });
}


/* ============================
   Nav link handling
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