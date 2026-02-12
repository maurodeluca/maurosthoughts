document.addEventListener('DOMContentLoaded', () => {
  const buttons = Array.from(document.querySelectorAll('.share-btn'));
  if (!buttons.length) return;

  const getMetaDescription = () => {
    const el = document.querySelector('meta[name="description"]');
    return el ? el.getAttribute('content') : '';
  };

  async function sharePage() {
    const shareData = {
      title: document.title || document.querySelector('h1')?.innerText || '',
      text: getMetaDescription(),
      url: location.href
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        showToast('Thanks for sharing!');
        return;
      } catch (err) {
        // User cancelled or share failed; fall through to copy fallback
      }
    }

    // Fallback: copy URL to clipboard
    const textToCopy = shareData.url;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(textToCopy);
      } else {
        const input = document.createElement('input');
        input.value = textToCopy;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
      }
      showToast('Link copied to clipboard');
    } catch (e) {
      showToast('Could not copy link');
    }
  }

  function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'share-toast';
    toast.textContent = message;
    Object.assign(toast.style, {
      position: 'fixed',
      left: '50%',
      bottom: '20px',
      transform: 'translateX(-50%)',
      background: 'rgba(0,0,0,0.8)',
      color: '#fff',
      padding: '8px 12px',
      borderRadius: '6px',
      zIndex: 9999,
      fontSize: '14px',
      opacity: '0',
      transition: 'opacity 200ms ease-in-out'
    });
    document.body.appendChild(toast);
    // Force reflow to enable transition
    void toast.offsetWidth;
    toast.style.opacity = '1';
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 2000);
  }

  buttons.forEach(btn => btn.addEventListener('click', sharePage));
});
