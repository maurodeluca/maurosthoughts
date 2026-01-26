/* Reveal on scroll */
const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) entry.target.classList.add('visible');
  });
}, { threshold: 0.3 });

document.querySelectorAll('.content').forEach(el => observer.observe(el));

/* Typed quote (once) */
const quote = "I wrote this to remember what mattered before metrics.";
const target = document.getElementById('typed');
let i = 0;
function typeOnce() {
  if (target && i < quote.length) {
    target.textContent += quote.charAt(i);
    i++;
    setTimeout(typeOnce, 50);
  }
}
if (target) typeOnce();

/* Show nav at end */
window.addEventListener('scroll', () => {
  const end = document.getElementById('end').getBoundingClientRect();
  if (end.top < window.innerHeight) {
    document.getElementById('nav').classList.add('visible');
  }
});

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
let idx = 0;

function typeManifesto() {
  if (!manifestoTarget || idx >= manifestoText.length) return;
  manifestoTarget.textContent += manifestoText.charAt(idx);
  idx++;
  setTimeout(typeManifesto, 25); // speed in ms per character
}

// Delay slightly so it doesn't clash with intro typing
if (manifestoTarget) setTimeout(typeManifesto, 800);
