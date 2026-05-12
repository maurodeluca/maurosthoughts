const track = document.querySelector('.writing-carousel-track');
const cards = document.querySelectorAll('.writing-card');
const dots  = document.querySelectorAll('.writing-dot');
const prevBtn = document.querySelector('.writing-carousel-btn.prev');
const nextBtn = document.querySelector('.writing-carousel-btn.next');

if (track && cards.length) {
  let current = 0;
  const total = cards.length;

  function goTo(index) {
    current = (index + total) % total;
    track.style.transform = `translateX(-${current * 100}%)`;
    dots.forEach((d, i) => d.classList.toggle('active', i === current));
  }

  prevBtn?.addEventListener('click', () => goTo(current - 1));
  nextBtn?.addEventListener('click', () => goTo(current + 1));
  dots.forEach(d => d.addEventListener('click', () => goTo(+d.dataset.index)));

  // Swipe support
  let startX = 0;
  track.addEventListener('touchstart', e => { startX = e.touches[0].clientX; }, { passive: true });
  track.addEventListener('touchend', e => {
    const delta = startX - e.changedTouches[0].clientX;
    if (Math.abs(delta) > 40) goTo(current + (delta > 0 ? 1 : -1));
  });

  // Prevent carousel arrow clicks from navigating when clicking buttons
  [prevBtn, nextBtn].forEach(btn => btn?.addEventListener('click', e => e.preventDefault()));
}
