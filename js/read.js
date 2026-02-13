document.addEventListener('DOMContentLoaded', () => {
  const readBtn = document.getElementById('read-text');
  if (!readBtn) return;

  let voices = [];
  let isReading = false;
  let isPaused = false;
  let currentText = '';

  function loadVoices() {
    voices = window.speechSynthesis.getVoices();
  }

  window.speechSynthesis.onvoiceschanged = loadVoices;
  loadVoices();

  async function startReading() {
    const path = readBtn.getAttribute('data-target');
    if (!path) return console.warn('No data-target set on read button');

    try {
      const response = await fetch(path);
      if (!response.ok) throw new Error('Failed to load text: ' + response.statusText);
      const text = await response.text();
      if (!text.trim()) return console.warn('Text file is empty');

      currentText = text;

      if (!voices.length) {
        await new Promise(r => setTimeout(r, 200));
        loadVoices();
      }

      const googleVoice = voices.find(v => v.name.includes('Google UK English Male'))
      
      const chunks = text.split(/\n+/).filter(c => c.trim().length > 0);

      chunks.forEach((chunk, index) => {
        const utterance = new SpeechSynthesisUtterance(chunk);
        if (googleVoice) utterance.voice = googleVoice;
        utterance.rate = 0.95;
        utterance.pitch = 1;
        utterance.lang = 'en-GB';

        utterance.onend = () => {
          if (index === chunks.length - 1) {
            isReading = false;
            isPaused = false;
            readBtn.classList.remove('playing');
          }
        };

        setTimeout(() => {
          window.speechSynthesis.speak(utterance);
        }, 30);
      });

      isReading = true;
      isPaused = false;
      readBtn.classList.add('playing');

    } catch (err) {
      console.error('Error reading text:', err);
    }
  }

  readBtn.addEventListener('click', async () => {

    if (!isReading) {
      await startReading();
      return;
    }

    if (window.speechSynthesis.speaking && !isPaused) {
      window.speechSynthesis.pause();
      isPaused = true;
      readBtn.classList.remove('playing');
      return;
    }

    if (isPaused) {
      window.speechSynthesis.resume();
      isPaused = false;
      readBtn.classList.add('playing');
    }

  });
});

function resetSpeech() {
  window.speechSynthesis.cancel();
  isReading = false;
  isPaused = false;
  readBtn.classList.remove('playing');
}

/* Reset when page reloads or closes */
window.addEventListener('beforeunload', resetSpeech);

/* Reset when navigating with back/forward cache */
window.addEventListener('pagehide', resetSpeech);

/* Optional: stop when tab becomes hidden */
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    resetSpeech();
  }
});
