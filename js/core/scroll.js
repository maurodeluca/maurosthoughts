let currentSectionIndex = 0;
let isScrolling = false;

function initSectionNavigation() {
  const homePage = document.querySelector('.home-page');
  const sections = homePage ? Array.from(homePage.querySelectorAll('section')) : [];

  if (sections.length === 0) return { scrollToSection: () => {} };

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

  // Wheel navigation
  if (homePage) {
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

  // Nav link handling
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

  return { scrollToSection };
}

export { initSectionNavigation };
