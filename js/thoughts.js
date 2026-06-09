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

    // Generous drift range
    const driftX = (Math.random() - 0.5) * 80;
    const driftY = (Math.random() - 0.5) * 60;
    bubble.style.setProperty('--drift-x', `${driftX}px`);
    bubble.style.setProperty('--drift-y', `${driftY}px`);

    const dur = 5 + Math.random() * 10;
    bubble.style.animationDuration = `0.6s, ${dur}s`;

    const remaining = formatTimeLeft(t.expiresAt - Date.now());

    bubble.innerHTML = `
      <span class="thought-text">${escapeHtml(t.text)}</span>
      <span class="thought-ttl">${remaining}</span>
    `;

    container.appendChild(bubble);
  });
}

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
