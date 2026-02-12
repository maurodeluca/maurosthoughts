function initRevealOnScroll() {
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
}

export { initRevealOnScroll };
