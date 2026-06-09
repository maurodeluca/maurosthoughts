let typingSkipped = false;
let currentTimeoutId = null;

// Parse Markdown to HTML
function markdownToHtml(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/_(.+?)_/g, '<em>$1</em>')
    .replace(/\n/g, '<br>');
}

function typeText(text, element, speed = 40, callback) {
  if (!element) return;

  // Cancel any previous typing session
  if (currentTimeoutId !== null) {
    clearTimeout(currentTimeoutId);
    currentTimeoutId = null;
  }

  typingSkipped = false; // reset when starting a new session

  const htmlText = markdownToHtml(text);
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${htmlText}</div>`, 'text/html');
  const nodes = Array.from(doc.body.firstChild.childNodes);

  let nodeIndex = 0;
  let charIndex = 0;
  let activeTextNode = null;
  element.innerHTML = '';

  function type() {
    if (typingSkipped) {
      element.innerHTML = htmlText; // show full content
      currentTimeoutId = null;
      if (callback) callback();
      return;
    }

    if (nodeIndex < nodes.length) {
      const currentNode = nodes[nodeIndex];

      if (currentNode.nodeType === 3) {
        // Create one text node per parsed text segment, then append chars to it
        if (charIndex === 0) {
          activeTextNode = document.createTextNode('');
          element.appendChild(activeTextNode);
        }
        if (charIndex < currentNode.length) {
          activeTextNode.data += currentNode.data[charIndex];
          charIndex++;
        } else {
          nodeIndex++;
          charIndex = 0;
          activeTextNode = null;
        }
      } else {
        element.appendChild(currentNode.cloneNode(true));
        nodeIndex++;
        charIndex = 0;
        activeTextNode = null;
      }
      currentTimeoutId = setTimeout(type, speed);
    } else {
      currentTimeoutId = null;
      if (callback) callback();
    }
  }

  type();
}

// Skip typing but keep HTML formatting
function skipTyping(target, text) {
  target.innerHTML = markdownToHtml(text);
  typingSkipped = true;
}

function setTypingSkipped(value) {
  typingSkipped = value;
}

function isTypingSkipped() {
  return typingSkipped;
}

export { typeText, markdownToHtml, skipTyping, setTypingSkipped, isTypingSkipped };
