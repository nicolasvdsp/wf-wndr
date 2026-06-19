// ============================================
// Feature Rows (data-feature-wrap)
// ============================================
function initFeatureWrap(container) {
  container = container || document;
  const richtexts = container.querySelectorAll('[data-feature-wrap]');
  if (!richtexts.length) return;

  richtexts.forEach(processFeatureWrap);
}

function processFeatureWrap(richtext) {
  if (richtext.dataset.processed) return;
  richtext.dataset.processed = 'true';

  const groups = groupByHeading(richtext);
  richtext.innerHTML = '';

  groups.forEach((group) => {
    const item = document.createElement('div');
    item.className = 'feature-rtb_item';

    const content = document.createElement('div');
    content.className = 'feature-rtb_content';

    group.forEach((child) => {
      if (child.tagName === 'FIGURE') {
        item.appendChild(child);
      } else {
        content.appendChild(child);
      }
    });

    item.insertBefore(content, item.firstChild);
    richtext.appendChild(item);
  });
}

// ============================================
// Feature Cards (data-feature-cards)
// ============================================
function initFeatureCards(container) {
  container = container || document;
  const cardRichtexts = container.querySelectorAll('[data-feature-cards]');
  if (!cardRichtexts.length) return;

  const iconEl = document.querySelector('[data-card-icon]');
  const iconSrc = iconEl?.src || iconEl?.querySelector('img')?.src || '';

  cardRichtexts.forEach((rt) => processFeatureCards(rt, iconSrc));
}

function processFeatureCards(richtext, iconSrc) {
  if (richtext.dataset.processed) return;
  richtext.dataset.processed = 'true';

  const groups = groupByHeading(richtext);
  richtext.classList.add('cards-list', '_2-col');
  richtext.innerHTML = '';

  groups.forEach((group) => {
    const card = document.createElement('div');
    card.className = 'cards-list_item type-2';

    // Row 1: Icon
    if (iconSrc) {
      const iconWrap = document.createElement('div');
      iconWrap.className = 'icon-badge-integration';
      const img = document.createElement('img');
      img.className = 'image';
      img.src = iconSrc;
      img.alt = '';
      img.loading = 'lazy';
      iconWrap.appendChild(img);
      card.appendChild(iconWrap);
    }

    // Row 2: Title + Description
    const textWrap = document.createElement('div');
    textWrap.className = 'margin-vertical margin-medium';
    const checkmarks = [];

    group.forEach((child) => {
      if (child.tagName === 'UL') {
        checkmarks.push(child);
      } else {
        textWrap.appendChild(child);
      }
    });
    card.appendChild(textWrap);

    // Row 3: Checkmarks
    checkmarks.forEach((ul) => card.appendChild(ul));

    richtext.appendChild(card);
  });
}

// ============================================
// Shared: group flat Rich Text children by H2
// ============================================
function groupByHeading(richtext) {
  const children = Array.from(richtext.children);
  const groups = [];
  let current = [];

  children.forEach((child) => {
    if (child.tagName === 'H2' && current.length > 0) {
      groups.push(current);
      current = [];
    }
    current.push(child);
  });
  if (current.length > 0) {
    groups.push(current);
  }

  return groups.filter((g) => {
    const text = g.map((el) => el.textContent).join('').trim();
    return text.length > 0;
  });
}

// ============================================
// Inject Elements into Rich Text
// ============================================
// Moves external DOM elements into a Rich Text at a configurable position.
//
// On the Rich Text (target):
//   data-inject-element="target"
//   data-inject-position="before-h2:last"              (where to place injected elements)
//   data-inject-position-fallback="bottom"              (optional fallback)
//
// On the element to inject:
//   data-inject-element="element"
//   data-inject-instance="IDENTIFIER"                   (optional, for {{IDENTIFIER}} matching)
//
// Position values: top | bottom | {n}% | before-{tag}:{nth} | after-{tag}:{nth}
//   Text match:    before-h2:'Why it matters' | after-p:'Some exact text'
//
// Matching: elements with data-inject-instance match {{IDENTIFIER}} placeholders
// in any target (priority). Remaining elements are injected into the nearest
// target (shares a parent wrapper) at that target's data-inject-position.

function initInjectElements() {
  const targets = Array.from(
    document.querySelectorAll('[data-inject-element="target"]')
  );
  const elements = Array.from(
    document.querySelectorAll('[data-inject-element="element"]')
  );
  if (!targets.length || !elements.length) return;

  const consumed = new Set();

  // Pass 1: placeholder matching — {{INSTANCE}} in target content
  targets.forEach((target) => {
    elements.forEach((el) => {
      if (consumed.has(el)) return;
      const instance = el.dataset.injectInstance;
      if (!instance) return;
      const placeholder = findPlaceholder(target, instance);
      if (placeholder) {
        placeholder.replaceWith(el);
        consumed.add(el);
      }
    });
  });

  // Pass 2: position-based injection for remaining elements
  elements.forEach((el) => {
    if (consumed.has(el)) return;
    const target = findClosestTarget(el, targets);
    if (!target) return;

    const position = target.dataset.injectPosition || 'bottom';
    const fallback = target.dataset.injectPositionFallback || 'bottom';
    if (!insertAtPosition(target, el, position)) {
      insertAtPosition(target, el, fallback);
    }
  });

  // Pass 3: reinitialize external solutions if requested
  targets.forEach((target) => {
    const reinit = target.dataset.injectReinit;
    if (!reinit) return;
    reinit.split(',').forEach((key) => {
      const handler = REINIT_HANDLERS[key.trim()];
      if (handler) handler(target);
    });
  });
}

// Reinit handlers keyed by data-inject-reinit value
const REINIT_HANDLERS = {
  'fs-toc': reinitFsToc,
};

function reinitFsToc() {
  const tocList = document.querySelector('[fs-toc-element="list"]');
  const tocContent = document.querySelector('[fs-toc-element="contents"]');
  if (!tocList || !tocContent) return;

  const firstItem = tocList.firstElementChild;
  if (!firstItem) return;

  // Detect whether the link is wrapped (e.g. inside a list-item div) or direct
  const isWrapped = firstItem.tagName !== 'A';
  const template = firstItem.cloneNode(true);
  const templateLink = isWrapped ? template.querySelector('a') : template;

  tocList.innerHTML = '';

  const headings = tocContent.querySelectorAll('h1, h2, h3, h4, h5, h6');
  headings.forEach((heading, i) => {
    if (!heading.id) {
      heading.id =
        heading.textContent
          .trim()
          .toLowerCase()
          .replace(/\s+/g, '-')
          .replace(/[^\w-]/g, '') || `heading-${i}`;
    }

    const item = template.cloneNode(true);
    const link = isWrapped ? item.querySelector('a') : item;
    link.href = `#${heading.id}`;
    link.textContent = heading.textContent.trim();
    link.classList.remove('w--current');
    tocList.appendChild(item);
  });
}

function findClosestTarget(element, targets) {
  if (targets.length === 1) return targets[0];
  let parent = element.parentElement;
  while (parent) {
    const match = targets.find((t) => parent.contains(t));
    if (match) return match;
    parent = parent.parentElement;
  }
  return targets[0];
}

function findPlaceholder(parent, instanceId) {
  const pattern = `{{${instanceId}}}`;
  const children = parent.querySelectorAll('p, span, div');
  for (const child of children) {
    if (child.textContent.trim() === pattern) return child;
  }
  return null;
}

function insertAtPosition(parent, element, position) {
  const children = Array.from(parent.children);

  if (position === 'top') {
    parent.prepend(element);
    return true;
  }

  if (position === 'bottom') {
    parent.appendChild(element);
    return true;
  }

  const pctMatch = position.match(/^(\d+)%$/);
  if (pctMatch) {
    const idx = Math.round(children.length * parseInt(pctMatch[1], 10) / 100);
    const ref = children[idx];
    if (ref) {
      parent.insertBefore(element, ref);
    } else {
      parent.appendChild(element);
    }
    return true;
  }

  // before-h2:'Why it matters' or after-p:'Some text'
  const textMatch = position.match(/^(before|after)-(\w+):'(.+)'$/);
  if (textMatch) {
    const [, method, tag, text] = textMatch;
    const matches = Array.from(parent.querySelectorAll(`:scope > ${tag}`));
    const ref = matches.find((el) => el.textContent.trim() === text);
    if (!ref) return false;
    if (method === 'before') {
      ref.parentNode.insertBefore(element, ref);
    } else {
      ref.parentNode.insertBefore(element, ref.nextSibling);
    }
    return true;
  }

  // before-h2:2, after-ul:last, before-p:first
  const selectorMatch = position.match(/^(before|after)-(\w+):(.+)$/);
  if (selectorMatch) {
    const [, method, tag, nth] = selectorMatch;
    const matches = Array.from(parent.querySelectorAll(`:scope > ${tag}`));
    if (!matches.length) return false;

    let ref;
    if (nth === 'first') ref = matches[0];
    else if (nth === 'last') ref = matches[matches.length - 1];
    else ref = matches[parseInt(nth, 10) - 1];

    if (!ref) return false;

    if (method === 'before') {
      ref.parentNode.insertBefore(element, ref);
    } else {
      ref.parentNode.insertBefore(element, ref.nextSibling);
    }
    return true;
  }

  return false;
}

// ============================================
// Export
// ============================================
export default function richtextFeatures() {
  initFeatureWrap();
  initFeatureCards();
  initInjectElements();
  document.addEventListener('barba:afterEnter', (e) => {
    initFeatureWrap(e.detail.container);
    initFeatureCards(e.detail.container);
    initInjectElements();
  });
}
