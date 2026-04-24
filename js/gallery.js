/**
 * gallery.js — lightbox & reveal for the ancestor gallery page
 */

import { initRevealOnScroll } from './core/reveal.js';

/* ── Reveal on scroll ── */
initRevealOnScroll();

/* ── Lightbox ── */
const lightbox     = document.getElementById('lightbox');
const lbImg        = document.getElementById('lightbox-img');
const lbCaption    = document.getElementById('lightbox-caption');
const btnClose     = document.querySelector('.lightbox-close');
const btnPrev      = document.querySelector('.lightbox-prev');
const btnNext      = document.querySelector('.lightbox-next');
const items        = [...document.querySelectorAll('.gallery-item')];

let currentIndex = 0;

function hasImage(figure) {
  return !!figure.querySelector('img');
}

function open(index) {
  const item = items[index];
  if (!item) return;

  /* If the card has no real image yet (placeholder), don't open */
  if (!hasImage(item)) return;

  currentIndex = index;

  const img      = item.querySelector('img');
  const name     = item.dataset.name     || '';
  const year     = item.dataset.year     || '';
  const relation = item.dataset.relation || '';
  const caption  = item.dataset.caption  || '';

  lbImg.src = img.src;
  lbImg.alt = img.alt;

  let html = `<span class="lb-name">${name}</span>`;
  if (year || relation) {
    html += `<br><span class="lb-meta">${[year, relation].filter(Boolean).join(' · ')}</span>`;
  }
  if (caption) {
    html += `<br><span class="lb-extra">${caption}</span>`;
  }
  lbCaption.innerHTML = html;

  lightbox.classList.add('active');
  lightbox.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function close() {
  lightbox.classList.remove('active');
  lightbox.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

function navigate(dir) {
  let next = currentIndex + dir;
  /* wrap around */
  if (next < 0) next = items.length - 1;
  if (next >= items.length) next = 0;

  /* skip placeholders */
  const start = next;
  while (!hasImage(items[next])) {
    next += dir;
    if (next < 0) next = items.length - 1;
    if (next >= items.length) next = 0;
    if (next === start) { close(); return; }
  }

  open(next);
}

/* Click handlers */
items.forEach((item, i) => {
  item.addEventListener('click', () => open(i));
});

btnClose.addEventListener('click', close);
btnPrev.addEventListener('click', () => navigate(-1));
btnNext.addEventListener('click', () => navigate(1));

lightbox.addEventListener('click', e => {
  if (e.target === lightbox) close();
});

/* Keyboard */
document.addEventListener('keydown', e => {
  if (!lightbox.classList.contains('active')) return;
  if (e.key === 'Escape')                    close();
  if (e.key === 'ArrowLeft')                 navigate(-1);
  if (e.key === 'ArrowRight')                navigate(1);
});

/* Touch swipe support */
let touchStartX = 0;
lightbox.addEventListener('touchstart', e => {
  touchStartX = e.changedTouches[0].clientX;
}, { passive: true });

lightbox.addEventListener('touchend', e => {
  const dx = e.changedTouches[0].clientX - touchStartX;
  if (Math.abs(dx) > 50) {
    navigate(dx < 0 ? 1 : -1);
  }
});
