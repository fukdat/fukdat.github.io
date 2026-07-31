/* ------------------------------------------------------------
   split.js — text splitting into masked words / chars.
   Text nodes only: nested markup (<em>, <br>) survives intact.
   ------------------------------------------------------------ */

const SPACE = /([ \t\n\r]+)/; // a non-breaking space stays glued to its word
const PUNCT = /^[.,;:!?)\]}»"'…—–-]{1,3}$/;

function textNodesOf(root) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => (n.nodeValue.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT),
  });
  const out = [];
  while (walker.nextNode()) out.push(walker.currentNode);
  return out;
}

function makeMask() {
  const m = document.createElement('span');
  m.className = 'sp-mask';
  return m;
}

/**
 * Wrap every word of `el` in an overflow-hidden mask.
 * @returns {{masks:HTMLElement[], words:HTMLElement[]}}
 */
export function splitWords(el) {
  if (el.dataset.splitDone) {
    return { masks: [...el.querySelectorAll('.sp-mask')], words: [...el.querySelectorAll('.sp-word')] };
  }
  const masks = [];
  const words = [];
  let lastWord = null;

  textNodesOf(el).forEach((node) => {
    const frag = document.createDocumentFragment();
    // Punctuation trailing inline markup — the "," in "<em>FastAPI</em>," —
    // joins the previous word instead of becoming a mask that can wrap onto a
    // line of its own. Only pure punctuation qualifies, never a word.
    let glue = lastWord && !/^[ \t\n\r]/.test(node.nodeValue);

    node.nodeValue.split(SPACE).forEach((part) => {
      if (!part) return;
      if (/^[ \t\n\r]+$/.test(part)) {
        frag.appendChild(document.createTextNode(' '));
        return;
      }
      if (glue && PUNCT.test(part)) {
        glue = false;
        const punct = document.createElement('span');
        punct.className = 'sp-punct'; // neutral styling: not part of the <em>
        punct.textContent = part;
        lastWord.appendChild(punct);
        return;
      }
      glue = false;

      const mask = makeMask();
      const word = document.createElement('span');
      word.className = 'sp-word';
      word.textContent = part;
      mask.appendChild(word);
      frag.appendChild(mask);
      masks.push(mask);
      words.push(word);
      lastWord = word;
    });
    node.parentNode.replaceChild(frag, node);
  });

  el.dataset.splitDone = 'words';
  return { masks, words };
}

/**
 * Words + per-character spans inside each word mask.
 * @returns {{masks:HTMLElement[], chars:HTMLElement[]}}
 */
export function splitChars(el) {
  if (el.dataset.splitDone === 'chars') {
    return { masks: [...el.querySelectorAll('.sp-mask')], chars: [...el.querySelectorAll('.sp-char')] };
  }
  const { masks, words } = splitWords(el);
  const chars = [];

  words.forEach((word) => {
    const value = word.textContent;
    word.textContent = '';
    [...value].forEach((ch) => {
      const c = document.createElement('span');
      c.className = 'sp-char';
      c.textContent = ch === ' ' ? ' ' : ch;
      word.appendChild(c);
      chars.push(c);
    });
  });

  el.dataset.splitDone = 'chars';
  return { masks, chars };
}

/**
 * Group already-split masks into visual lines by their vertical offset, so a
 * line-by-line cascade survives resizes without re-splitting the DOM.
 * @returns {HTMLElement[][]}
 */
export function groupLines(masks) {
  const lines = [];
  let top = null;
  masks.forEach((m) => {
    const y = Math.round(m.offsetTop);
    if (top === null || Math.abs(y - top) > 4) {
      lines.push([]);
      top = y;
    }
    lines[lines.length - 1].push(m);
  });
  return lines;
}
