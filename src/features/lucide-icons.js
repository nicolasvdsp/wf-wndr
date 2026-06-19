/*
  LUCIDE ICONS — CMS-friendly, gradient-ready

  Replaces [data-lucide="icon-name"] placeholders with inline Lucide SVGs.
  For wrappers with data-gradient-stroke="<name>", applies a gradient stroke
  via CSS (not inline styles). The gradient is cloned once into the document
  <defs> with userSpaceOnUse so it works on stroke-based Lucide paths, and
  a global CSS rule targets the wrapper — surviving any SVG re-render.
*/

const CDN = 'https://unpkg.com/lucide@latest/dist/umd/lucide.min.js';
const NS = 'http://www.w3.org/2000/svg';
const VIEWBOX = 24;
const SHAPES = 'path, circle, rect, line, polyline, polygon, ellipse';
const STRIP = new Set(['viewbox', 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'xmlns']);

let loadPromise = null;
let styleEl = null;
const gradientsEnsured = new Set();

function loadLucide() {
  if (window.lucide?.createIcons) return Promise.resolve(window.lucide);
  if (loadPromise) return loadPromise;
  loadPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = CDN;
    s.async = true;
    s.onload = () => (window.lucide?.createIcons ? resolve(window.lucide) : reject());
    s.onerror = reject;
    document.head.appendChild(s);
  });
  return loadPromise;
}

function ensureStrokeGradient(name) {
  const strokeId = `tab-icon-gradient-${name}-stroke`;
  if (gradientsEnsured.has(name)) return strokeId;

  const existing = document.getElementById(strokeId);
  if (existing) {
    gradientsEnsured.add(name);
    return strokeId;
  }

  const src = document.getElementById(`tab-icon-gradient-${name}`);
  if (!src) return null;

  const clone = src.cloneNode(true);
  clone.id = strokeId;
  clone.setAttribute('gradientUnits', 'userSpaceOnUse');
  ['x1', 'y1', 'x2', 'y2'].forEach((a) => {
    const v = parseFloat(clone.getAttribute(a));
    if (!Number.isNaN(v)) clone.setAttribute(a, v * VIEWBOX);
  });
  src.parentNode.appendChild(clone);

  // Append a CSS rule so the gradient is applied even after the SVG is
  // replaced by Lucide / Finsweet / etc. — no inline styles to lose.
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.setAttribute('data-lucide-icons-styles', '');
    document.head.appendChild(styleEl);
  }
  styleEl.sheet.insertRule(
    `[data-gradient-stroke="${name}"] :is(${SHAPES}) {
      stroke: url(#${strokeId}) !important;
      fill: none !important;
    }`,
    styleEl.sheet.cssRules.length
  );

  gradientsEnsured.add(name);
  return strokeId;
}

function prepareTargets(wrappers) {
  let count = 0;
  wrappers.forEach((w) => {
    if (w.hasAttribute('data-lucide-rendered')) return;
    const name = w.getAttribute('data-lucide');
    if (!name) return;
    const target = w.querySelector('svg') || w;
    if (target !== w) {
      [...target.attributes].forEach((a) => STRIP.has(a.name.toLowerCase()) && target.removeAttribute(a.name));
      target.replaceChildren();
    }
    target.setAttribute('data-lucide-render', name);
    w.setAttribute('data-lucide-rendered', '');
    count++;
  });
  return count;
}

function ensureGradientsFor(wrappers) {
  wrappers.forEach((w) => {
    const name = w.getAttribute('data-gradient-stroke');
    if (name) ensureStrokeGradient(name);
  });
}

function processWrappers(wrappers) {
  if (!wrappers.length) return;
  loadLucide()
    .then((lucide) => {
      const fresh = [...wrappers].filter((w) => w.isConnected && !w.hasAttribute('data-lucide-rendered'));
      if (!fresh.length) return;
      if (!prepareTargets(fresh)) return;
      lucide.createIcons({ nameAttr: 'data-lucide-render' });
      ensureGradientsFor(fresh);
    })
    .catch((err) => console.warn('[lucide-icons]', err));
}

function renderIconsIn(container) {
  const scope = container || document;
  processWrappers(scope.querySelectorAll('[data-lucide]:not([data-lucide-rendered])'));
}

let observer = null;
function startObserver() {
  if (observer) return;
  observer = new MutationObserver((mutations) => {
    const found = [];
    for (const m of mutations) {
      m.addedNodes.forEach((node) => {
        if (node.nodeType !== 1) return;
        if (node.matches?.('[data-lucide]:not([data-lucide-rendered])')) found.push(node);
        node.querySelectorAll?.('[data-lucide]:not([data-lucide-rendered])').forEach((el) => found.push(el));
      });
    }
    if (found.length) processWrappers(found);
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

function lucideIcons() {
  startObserver();
  document.addEventListener('barba:pageVisible', (e) => {
    renderIconsIn(e.detail.container);
  });
}

export default lucideIcons;
