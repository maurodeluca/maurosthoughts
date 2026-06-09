/**
 * thoughts.js — ephemeral floating thoughts for writing pages
 *
 * Users leave a thought with a TTL (1h / 6h / 24h / 7d).
 * Thoughts float as bubbles, fade out when expired, and are
 * cleaned up from Firestore via a TTL check on read.
 */

import firebaseConfig from './firebase-config.js';

// ── Firebase SDK (compat CDN loaded in HTML) ──
const app  = firebase.initializeApp(firebaseConfig);
const db   = firebase.firestore();

// ── Derive a page slug from the URL path ──
function getPageSlug() {
  const path = location.pathname.replace(/\/$/, '');
  const file = path.split('/').pop().replace('.html', '');
  return file || 'unknown';
}

const PAGE = getPageSlug();
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
const toggleBtn   = document.getElementById('thoughts-toggle');
const panel       = document.getElementById('thoughts-panel');
const input       = document.getElementById('thoughts-input');
const ttlSelect   = document.getElementById('thoughts-ttl');
const submitBtn   = document.getElementById('thoughts-submit');
const countEl     = document.getElementById('thoughts-count');

if (!container) {
  console.warn('[thoughts] container not found');
}

// ── State ──
let panelOpen = false;
let thoughts  = [];  // { id, text, expiresAt, left, top }

// ── Toggle panel ──
toggleBtn?.addEventListener('click', () => {
  panelOpen = !panelOpen;
  panel?.classList.toggle('open', panelOpen);
  toggleBtn?.classList.toggle('active', panelOpen);
  if (panelOpen) input?.focus();
});

// ── Submit a thought ──
submitBtn?.addEventListener('click', submit);
input?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); }
});

async function submit() {
  const text = input?.value.trim();
  if (!text || text.length > 200) return;

  const ttlKey  = ttlSelect?.value || '1h';
  const ttlMs   = TTL_OPTIONS[ttlKey];
  const now     = Date.now();

  const doc = {
    page: PAGE,
    text,
    createdAt: now,
    expiresAt: now + ttlMs,
    // Random position for floating (percentage-based)
    left: Math.round(5 + Math.random() * 80),  // 5-85%
    top:  Math.round(10 + Math.random() * 70),  // 10-80%
  };

  try {
    await db.collection(COLLECTION).add(doc);
    input.value = '';
    // Panel stays open so user sees result
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
          // Expired — delete silently
          doc.ref.delete().catch(() => {});
        }
      });

      renderBubbles();
      updateCount();
    }, (err) => {
      console.error('[thoughts] listen error:', err);
    });
}

// ── Render floating bubbles ──
function renderBubbles() {
  if (!container) return;

  // Build a set of current IDs
  const currentIds = new Set(thoughts.map(t => t.id));

  // Remove bubbles no longer in the data
  container.querySelectorAll('.thought-bubble').forEach((el) => {
    if (!currentIds.has(el.dataset.id)) {
      el.classList.add('fading');
      setTimeout(() => el.remove(), 600);
    }
  });

  // Add new bubbles
  const existingIds = new Set(
    [...container.querySelectorAll('.thought-bubble')].map(e => e.dataset.id)
  );

  thoughts.forEach((t) => {
    if (existingIds.has(t.id)) return;

    const bubble = document.createElement('div');
    bubble.className = 'thought-bubble';
    bubble.dataset.id = t.id;
    bubble.style.left = `${t.left}%`;
    bubble.style.top  = `${t.top}%`;

    // Random drift direction
    const driftX = (Math.random() - 0.5) * 30;  // -15 to 15px
    const driftY = -10 - Math.random() * 20;      // -10 to -30px (upward)
    bubble.style.setProperty('--drift-x', `${driftX}px`);
    bubble.style.setProperty('--drift-y', `${driftY}px`);

    // Random animation duration for variety
    const dur = 6 + Math.random() * 6;  // 6-12s
    bubble.style.animationDuration = `${dur}s`;

    // Time remaining label
    const remaining = formatTimeLeft(t.expiresAt - Date.now());

    bubble.innerHTML = `
      <span class="thought-text">${escapeHtml(t.text)}</span>
      <span class="thought-ttl">${remaining}</span>
    `;

    container.appendChild(bubble);
  });
}

// ── Update count badge ──
function updateCount() {
  if (!countEl) return;
  const n = thoughts.length;
  countEl.textContent = n;
  countEl.style.display = n > 0 ? 'inline-flex' : 'none';
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

    // Remove if expired
    if (t.expiresAt <= now) {
      el.classList.add('fading');
      setTimeout(() => el.remove(), 600);
    }
  });
}, 60000);

// ── Init ──
listenThoughts();
