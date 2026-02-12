// Lightweight radio/player widget
// - simple playlist
// - play / pause / next / prev
// - progress bar and volume
document.addEventListener('DOMContentLoaded', () => {
    const root = document.getElementById('radio-player');
    if (!root) return;

    const btnPlay = root.querySelector('.radio-play');
    const progress = root.querySelector('.radio-progress');
    const progressFill = root.querySelector('.radio-progress-fill');
    const vol = root.querySelector('.radio-volume');

    // Playlist: replace or add stream URLs. Using provided live MP3 stream as default.
    const playlist = [
        {
            title: 'FluxFM Chillhop (live)',
            src: 'https://fluxfm.streamabc.net/flx-chillhop-mp3-128-8581707?sABC=698qsn20%230%23q73806s32r2p7rnpq812pos21q5680n9%23fgernzf.syhksz.qr&aw_0_1st.playerid=streams.fluxfm.de&amsparams=playerid:streams.fluxfm.de;skey:1770912288'
        }
    ];

    let index = 0;
    const audio = new Audio();
    audio.preload = 'metadata';
    audio.crossOrigin = 'anonymous';

    function load(i) {
        index = (i + playlist.length) % playlist.length;
        audio.src = playlist[index].src;
        progressFill.style.width = '0%';
        // reset live flag
        root.dataset.live = 'false';
        progress.classList.remove('live');
    }

    function formatTime(s) {
        if (!isFinite(s)) return '';
        const m = Math.floor(s / 60).toString().padStart(2, '0');
        const sec = Math.floor(s % 60).toString().padStart(2, '0');
        return `${m}:${sec}`;
    }

    if (btnPlay) {
        btnPlay.addEventListener('click', async () => {
            if (audio.paused) {
                try {
                    await audio.play();
                    btnPlay.dataset.playing = 'true';
                    btnPlay.textContent = '⏸';
                    root.classList.add('playing');
                } catch (e) {
                    btnPlay.dataset.playing = 'false';
                }
            } else {
                audio.pause();
                btnPlay.dataset.playing = 'false';
                btnPlay.textContent = '▶';
                root.classList.remove('playing');
            }
        });
    }

    audio.addEventListener('timeupdate', () => {
        // If stream has a known duration, show progress
        if (isFinite(audio.duration) && audio.duration > 0) {
            const pct = (audio.currentTime / audio.duration) * 100;
            progressFill.style.width = pct + '%';
        }
    });

    // Detect live streams (no known duration)
    audio.addEventListener('loadedmetadata', () => {
        const live = !isFinite(audio.duration) || audio.duration === 0;
        if (live) {
            root.dataset.live = 'true';
            progress.classList.add('live');
            progressFill.style.width = '100%';
            // disable seeking on live streams
            progress.style.pointerEvents = 'none';
        } else {
            root.dataset.live = 'false';
            progress.classList.remove('live');
            progress.style.pointerEvents = '';
        }
    });

    audio.addEventListener('ended', () => {
        // advance on playlists; single live stream typically doesn't fire ended
        load(index + 1);
        audio.play();
    });

    audio.addEventListener('pause', () => {
        root.classList.remove('playing');
    });

    audio.addEventListener('play', () => {
        root.classList.add('playing');
    });


    progress.addEventListener('click', (e) => {
        // allow seeking only when stream has duration
        if (!isFinite(audio.duration) || audio.duration === 0) return;
        const rect = progress.getBoundingClientRect();
        const pct = (e.clientX - rect.left) / rect.width;
        if (audio.duration) audio.currentTime = pct * audio.duration;
    });

    vol.addEventListener('input', (e) => {
        audio.volume = parseFloat(e.target.value);
    });

    // init
    load(0);
    audio.volume = parseFloat(vol.value || 0.7);
});
