/**
 * thoughts-button.js — floating "leave a thought" button for non-homepage pages.
 *
 * Opens a slide-up panel. On submit, writes to Firestore then
 * redirects to the homepage thoughts playground.
 */

import firebaseConfig from './firebase-config.js';

// ── Firebase ──
const app = firebase.initializeApp(firebaseConfig);
const db  = firebase.firestore();

const COLLECTION = 'thoughts';
const PAGE       = 'playground';

const TTL_OPTIONS = {
  '1h':  1 * 60 * 60 * 1000,
  '6h':  6 * 60 * 60 * 1000,
  '24h': 24 * 60 * 60 * 1000,
  '7d':  7 * 24 * 60 * 60 * 1000,
};

// ── DOM ──
const toggleBtn = document.getElementById('thoughts-toggle');
const panel     = document.getElementById('thoughts-panel');
const input     = document.getElementById('thoughts-input');
const ttlSelect = document.getElementById('thoughts-ttl');
const palette   = document.getElementById('thoughts-palette');
const submitBtn = document.getElementById('thoughts-submit');

let panelOpen     = false;
let selectedColor = 'red';

// ── Color palette ──
palette?.querySelectorAll('.color-swatch').forEach(swatch => {
  swatch.addEventListener('click', () => {
    palette.querySelector('.active')?.classList.remove('active');
    swatch.classList.add('active');
    selectedColor = swatch.dataset.color;
  });
});

// ── Toggle ──
toggleBtn?.addEventListener('click', () => {
  panelOpen = !panelOpen;
  panel?.classList.toggle('open', panelOpen);
  toggleBtn?.classList.toggle('active', panelOpen);
  if (panelOpen) input?.focus();
});

// ── Submit ──
submitBtn?.addEventListener('click', submit);
input?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); }
});

async function submit() {
  const text = input?.value.trim();
  if (!text || text.length > 200) return;

  const ttlKey = ttlSelect?.value || '1h';
  const ttlMs  = TTL_OPTIONS[ttlKey];
  const now    = Date.now();

  const doc = {
    page: PAGE,
    text,
    color: selectedColor,
    createdAt: now,
    expiresAt: now + ttlMs,
    left: Math.round(3 + Math.random() * 84),
    top:  Math.round(5 + Math.random() * 75),
  };

  try {
    await db.collection(COLLECTION).add(doc);
    input.value = '';
    // Redirect to homepage playground
    window.location.href = '/#thoughts';
  } catch (err) {
    console.error('[thoughts-button] write failed:', err);
  }
}
