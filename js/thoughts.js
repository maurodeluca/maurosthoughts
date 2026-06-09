/**
 * thoughts.js — ephemeral floating thoughts playground (homepage)
 *
 * Users leave a thought with a TTL (1h / 6h / 24h / 7d).
 * Thoughts float as bubbles within the #thoughts section,
 * fade out when expired, and are cleaned up from Firestore on read.
 */

import firebaseConfig from './firebase-config.js';

// ── Firebase SDK (compat CDN loaded in HTML) ──
const app  = firebase.initializeApp(firebaseConfig);
const db   = firebase.firestore();

const PAGE = 'playground';
const COLLECTION = 'thoughts';

// TTL presets in milliseconds
const TTL_OPTIONS = {
  '1h':  1 * 60 * 60 * 1000,
  '6h':  6 * 60 * 60 * 1000,
  '24h': 24 * 60 * 60 * 1000,
  '7d':  7 * 24 * 60 * 60 * 1000,
};

// ── DOM refs ──
const container   = document.getElementById('thoughts-container');
const input       = document.getElementById('thoughts-input');
const ttlSelect   = document.getElementById('thoughts-ttl');
const palette     = document.getElementById('thoughts-palette');
const submitBtn   = document.getElementById('thoughts-submit');

// ── Color palette selection ──
let selectedColor = 'red';
palette?.querySelectorAll('.color-swatch').forEach(swatch => {
  swatch.addEventListener('click', () => {
    palette.querySelector('.active')?.classList.remove('active');
    swatch.classList.add('active');
    selectedColor = swatch.dataset.color;
  });
});

// ── Fullscreen toggle ──
const fsBtn     = document.getElementById('thoughts-fullscreen');
const section   = document.getElementById('thoughts');

function exitFullscreen() {
  if (!section?.classList.contains('fullscreen')) return;
  section.classList.remove('fullscreen');
  section.scrollIntoView({ behavior: 'instant' });
}

fsBtn?.addEventListener('click', () => {
  if (section?.classList.contains('fullscreen')) {
    exitFullscreen();
  } else {
    section?.classList.add('fullscreen');
  }
});

// ESC to exit fullscreen
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') exitFullscreen();
});

if (!container) {
  console.warn('[thoughts] container not found — not on homepage?');
}

// ── State ──
let thoughts = [];

// ── Submit a thought ──
submitBtn?.addEventListener('click', submit);
input?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); }
});

async function submit() {
  const text = input?.value.trim();
  if (!text || text.length > 200) return;

  const ttlKey  = ttlSelect?.value || '1h';
  const color   = selectedColor;
  const ttlMs   = TTL_OPTIONS[ttlKey];
  const now     = Date.now();

  const left = Math.round(3 + Math.random() * 84);  // 3-87%
  const top  = Math.round(5 + Math.random() * 75);   // 5-80%

  const doc = {
    page: PAGE,
    text,
    color,
    createdAt: now,
    expiresAt: now + ttlMs,
    left,
    top,
  };

  try {
    await db.collection(COLLECTION).add(doc);
    input.value = '';
  } catch (err) {
    console.error('[thoughts] write failed:', err);
  }
}

// ── Listen for real-time thoughts ──
function listenThoughts() {
  db.collection(COLLECTION)
    .where('page', '==', PAGE)
    .orderBy('createdAt', 'desc')
    .limit(50)
    .onSnapshot((snapshot) => {
      const now = Date.now();
      thoughts = [];

      snapshot.forEach((doc) => {
        const d = doc.data();
        if (d.expiresAt > now) {
          thoughts.push({ id: doc.id, ...d });
        } else {
          doc.ref.delete().catch(() => {});
        }
      });

      renderBubbles();
    }, (err) => {
      console.error('[thoughts] listen error:', err);
    });
}

// ── Render floating bubbles ──
function renderBubbles() {
  if (!container) return;

  const currentIds = new Set(thoughts.map(t => t.id));

  container.querySelectorAll('.thought-bubble').forEach((el) => {
    if (!currentIds.has(el.dataset.id)) {
      el.classList.add('fading');
      setTimeout(() => el.remove(), 600);
    }
  });

  const existingIds = new Set(
    [...container.querySelectorAll('.thought-bubble')].map(e => e.dataset.id)
  );

  thoughts.forEach((t) => {
    if (existingIds.has(t.id)) return;

    const bubble = document.createElement('div');
    bubble.className = 'thought-bubble';
    bubble.dataset.id = t.id;
    bubble.dataset.color = t.color || 'red';
    bubble.style.left = `${t.left}%`;
    bubble.style.top  = `${t.top}%`;

    const remaining = formatTimeLeft(t.expiresAt - Date.now());

    bubble.innerHTML = `
      <span class="thought-text">${escapeHtml(t.text)}</span>
      <span class="thought-ttl">${remaining}</span>
    `;

    // After appear animation ends, lock opacity so drag/release doesn't flash
    bubble.addEventListener('animationend', () => {
      bubble.style.opacity = '1';
    }, { once: true });

    container.appendChild(bubble);
  });
}

// ── Brownian motion + collision ──
const brownianState = new Map();  // el -> { vx, vy }

function brownianStep() {
  if (!container) return;
  const w = container.offsetWidth;
  const h = container.offsetHeight;
  const jitter   = 0.35;
  const maxSpeed = 0.6;
  const damping  = 0.98;

  const bubbles = [...container.querySelectorAll('.thought-bubble:not(.dragging):not(.fading)')];

  // Init state for new bubbles
  bubbles.forEach(el => {
    if (!brownianState.has(el)) {
      brownianState.set(el, { vx: (Math.random() - 0.5) * 0.4, vy: (Math.random() - 0.5) * 0.4 });
    }
  });

  // Collision detection — push overlapping bubbles apart
  for (let i = 0; i < bubbles.length; i++) {
    const a  = bubbles[i];
    const sa = brownianState.get(a);
    const ax = a.offsetLeft + a.offsetWidth  * 0.5;
    const ay = a.offsetTop  + a.offsetHeight * 0.5;

    for (let j = i + 1; j < bubbles.length; j++) {
      const b  = bubbles[j];
      const sb = brownianState.get(b);
      const bx = b.offsetLeft + b.offsetWidth  * 0.5;
      const by = b.offsetTop  + b.offsetHeight * 0.5;

      const dx = bx - ax;
      const dy = by - ay;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const minDist = (a.offsetWidth + b.offsetWidth) * 0.45;

      if (dist < minDist) {
        const push = (minDist - dist) * 0.05;
        const nx = dx / dist;
        const ny = dy / dist;
        sa.vx -= nx * push;
        sa.vy -= ny * push;
        sb.vx += nx * push;
        sb.vy += ny * push;
      }
    }
  }

  // Apply Brownian motion
  bubbles.forEach(el => {
    const s = brownianState.get(el);

    // Random nudge
    s.vx += (Math.random() - 0.5) * jitter;
    s.vy += (Math.random() - 0.5) * jitter;

    // Dampen
    s.vx *= damping;
    s.vy *= damping;

    // Clamp speed
    s.vx = Math.max(-maxSpeed, Math.min(maxSpeed, s.vx));
    s.vy = Math.max(-maxSpeed, Math.min(maxSpeed, s.vy));

    let x = el.offsetLeft + s.vx;
    let y = el.offsetTop  + s.vy;

    // Wrap edges
    const bw = el.offsetWidth;
    const bh = el.offsetHeight;
    if (x + bw < 0) x = w;
    else if (x > w) x = -bw;
    if (y + bh < 0) y = h;
    else if (y > h) y = -bh;

    el.style.left = `${x}px`;
    el.style.top  = `${y}px`;
  });

  // Clean removed elements from the map
  for (const el of brownianState.keys()) {
    if (!el.isConnected) brownianState.delete(el);
  }

  requestAnimationFrame(brownianStep);
}
requestAnimationFrame(brownianStep);

// ── Drag & throw physics ──
(function initDragThrow() {
  if (!container) return;

  let dragEl     = null;
  let offsetX    = 0;
  let offsetY    = 0;
  let velX       = 0;
  let velY       = 0;
  let lastX      = 0;
  let lastY      = 0;
  let lastTime   = 0;
  let animFrame  = null;

  function getPointer(e) {
    return e.touches ? e.touches[0] : e;
  }

  function onDown(e) {
    const bubble = e.target.closest('.thought-bubble');
    if (!bubble) return;
    e.preventDefault();

    dragEl = bubble;
    dragEl.classList.add('dragging');

    const rect = container.getBoundingClientRect();
    const p    = getPointer(e);
    offsetX = p.clientX - bubble.offsetLeft;
    offsetY = p.clientY - (bubble.offsetTop - rect.top) - rect.top;

    // Reset for fresh offset-based positioning
    offsetX = p.clientX - bubble.offsetLeft;
    offsetY = p.clientY - bubble.offsetTop;

    lastX    = p.clientX;
    lastY    = p.clientY;
    lastTime = performance.now();
    velX     = 0;
    velY     = 0;

    if (animFrame) { cancelAnimationFrame(animFrame); animFrame = null; }
  }

  function onMove(e) {
    if (!dragEl) return;
    e.preventDefault();

    const p   = getPointer(e);
    const now = performance.now();
    const dt  = now - lastTime || 1;

    velX = (p.clientX - lastX) / dt * 6;    // damped velocity
    velY = (p.clientY - lastY) / dt * 6;

    lastX    = p.clientX;
    lastY    = p.clientY;
    lastTime = now;

    dragEl.style.left = `${p.clientX - offsetX}px`;
    dragEl.style.top  = `${p.clientY - offsetY}px`;
  }

  function onUp() {
    if (!dragEl) return;
    dragEl.classList.remove('dragging');
    // Cap throw speed
    const maxV = 12;
    velX = Math.max(-maxV, Math.min(maxV, velX));
    velY = Math.max(-maxV, Math.min(maxV, velY));
    fling(dragEl, velX, velY);
    dragEl = null;
  }

  function fling(el, vx, vy) {
    const friction = 0.96;
    const minSpeed = 0.2;
    const bounds   = container.getBoundingClientRect();
    const w = bounds.width;
    const h = bounds.height;

    function step() {
      vx *= friction;
      vy *= friction;

      let x = el.offsetLeft + vx;
      let y = el.offsetTop  + vy;

      // Wrap through edges
      const bw = el.offsetWidth;
      const bh = el.offsetHeight;
      if (x + bw < 0) x = w;
      else if (x > w) x = -bw;
      if (y + bh < 0) y = h;
      else if (y > h) y = -bh;

      el.style.left = `${x}px`;
      el.style.top  = `${y}px`;

      if (Math.abs(vx) > minSpeed || Math.abs(vy) > minSpeed) {
        animFrame = requestAnimationFrame(step);
      } else {
        animFrame = null;
      }
    }
    animFrame = requestAnimationFrame(step);
  }

  // Pointer events (mouse + touch)
  container.addEventListener('pointerdown', onDown);
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onUp);
})();

// ── Helpers ──
function formatTimeLeft(ms) {
  if (ms <= 0) return 'expired';
  const mins  = Math.floor(ms / 60000);
  const hours = Math.floor(mins / 60);
  const days  = Math.floor(hours / 24);
  if (days > 0)  return `${days}d left`;
  if (hours > 0) return `${hours}h left`;
  if (mins > 0)  return `${mins}m left`;
  return '<1m left';
}

function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

// ── Refresh TTL labels every minute ──
setInterval(() => {
  if (!container) return;
  const now = Date.now();

  container.querySelectorAll('.thought-bubble').forEach((el) => {
    const t = thoughts.find(th => th.id === el.dataset.id);
    if (!t) return;
    const ttlEl = el.querySelector('.thought-ttl');
    if (ttlEl) ttlEl.textContent = formatTimeLeft(t.expiresAt - now);

    if (t.expiresAt <= now) {
      el.classList.add('fading');
      setTimeout(() => el.remove(), 600);
    }
  });
}, 60000);

// ── Init ──
listenThoughts();
