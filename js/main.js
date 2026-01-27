/* Reveal on scroll */
const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) entry.target.classList.add('visible');
  });
}, { threshold: 0.3 });

document.querySelectorAll('nav a').forEach(link => {
  link.addEventListener('click', e => {
    const href = link.getAttribute('href');

    // Only hijack in-page anchors
    if (!href.startsWith('#')) return;

    e.preventDefault();
    const id = href.substring(1);
    const section = document.getElementById(id);
    if (section) {
      section.scrollIntoView({ behavior: 'smooth' });
    }
  });
});


document.querySelectorAll('.content').forEach(el => observer.observe(el));

/* Typed quote (once) */
const quote = `
I write to understand things better.                               Sometimes that means disagreeing with the system.
`;
const target = document.getElementById('typed');
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

if (target) typeText(quote, target);

/* Section navigation with arrows */
const sections = document.querySelectorAll('section');
let currentSectionIndex = 0;

// Track which section is in view
const sectionObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      currentSectionIndex = Array.from(sections).indexOf(entry.target);
    }
  });
}, { threshold: 0.5 });

sections.forEach(section => sectionObserver.observe(section));

document.addEventListener('click', (e) => {
  const arrow = e.target.closest('.section-arrow');
  if (!arrow) return;

  if (arrow.classList.contains('last-section')) {
    // Scroll up one section when possible, otherwise go to top
    if (currentSectionIndex > 0) {
      sections[currentSectionIndex - 1].scrollIntoView({ behavior: 'smooth' });
    } else {
      sections[0].scrollIntoView({ behavior: 'smooth' });
    }
  } else {
    // Down arrow: Scroll to next section when possible
    if (currentSectionIndex < sections.length - 1) {
      sections[currentSectionIndex + 1].scrollIntoView({ behavior: 'smooth' });
    }
  }
});

const manifestoIntro = "I wrote this to remember what mattered before metrics.";
const manIntroTarget = document.getElementById('intro');

// Manifesto content
const manifestoText = `
I’m done pretending the hiring and recruitment industry isn’t deeply broken.

We’re living through a global job market collapse dressed up as “opportunity.” Mass layoffs, fake job postings, endless interview rounds, automated rejections, and a culture of suspicion so ingrained that interviewers now assume your CV is a work of fiction by default. Every interaction feels less like a conversation and more like an interrogation designed to catch you bluffing.

Somewhere along the way, curiosity, growth, and humanity became liabilities.

I took a gap year to broaden my horizons and explore other areas of my life. To recover. To live. Life has a way of throwing events at you that feel impossible to overcome. Decisions I made, paths I took, outcomes I couldn’t foresee. Those moments shape your mental health as much as your career.

I realized that instead of begging for acceptance, I needed to sing my own praises. Quietly, internally, to remind myself that my work, choices, learning, and growth mattered. Not for anyone else. Not for the approval of committees or directors.

Work matters, but it is not everything. People are not problems to be solved in forty-five minutes. Intelligence is not demonstrated by how efficiently someone jumps through hoops someone else decided mattered. Life and capability are far more complex than any test, and that is not your fault.

If this resonates, you are not broken.
The system is.
`; 

const manifestoTarget = document.getElementById('manifesto');

// Delay slightly so it doesn't clash with intro typing
if (manIntroTarget && manifestoTarget) {
  typeText(manifestoIntro, manIntroTarget, 45, () => {
    setTimeout(() => {
      typeText(manifestoText, manifestoTarget, 25);
    }, 400);
  });
}
 