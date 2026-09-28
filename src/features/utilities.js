function initDynamicCurrentYear(container) {
  container = container || document;

  const currentYear = new Date().getFullYear();
  const currentYearElements = container.querySelectorAll('[data-current-year]');
  currentYearElements.forEach(currentYearElement => {
    currentYearElement.textContent = currentYear;
  });
}


function initCappedListStagger(container) {
  container = container || document;

  const DEFAULT_MAX_ITEMS = 9;

  container.querySelectorAll('[fs-list-stagger]').forEach(wrapper => {
    const staggerMs = parseInt(wrapper.getAttribute('fs-list-stagger'), 10) || 100;
    const maxItems = parseInt(wrapper.getAttribute('fs-list-stagger-max'), 10) || DEFAULT_MAX_ITEMS;
    const maxDelayMs = maxItems * staggerMs;

    const list = wrapper.querySelector('[fs-list-element="list"]') || wrapper;

    function capItemDelay(el) {
      const raw = el.style.transitionDelay;
      if (!raw) return;
      const ms = raw.includes('ms') ? parseFloat(raw) : parseFloat(raw) * 1000;
      if (ms > maxDelayMs) {
        el.style.transitionDelay = maxDelayMs + 'ms';
      }
    }

    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type === 'attributes' && m.attributeName === 'style') {
          capItemDelay(m.target);
        }
        if (m.type === 'childList') {
          m.addedNodes.forEach(node => {
            if (node.nodeType === 1) capItemDelay(node);
          });
        }
      }
    });

    observer.observe(list, {
      subtree: true,
      attributes: true,
      attributeFilter: ['style'],
      childList: true,
    });
  });
}


function initFilterDropdowns(container) {
  container = container || document;

  const wrapper = container.querySelector('.filter_filters-dropdown-wrapper');
  if (!wrapper) return;

  wrapper.querySelectorAll('.w-dropdown').forEach(dropdown => {
    const toggle = dropdown.querySelector('.w-dropdown-toggle');
    const list = dropdown.querySelector('.w-dropdown-list');
    if (!toggle || !list) return;

    function setOpen(open) {
      toggle.classList.toggle('w--open', open);
      list.classList.toggle('w--open', open);
      toggle.setAttribute('aria-expanded', String(open));
    }

    toggle.addEventListener('click', (e) => {
      e.stopImmediatePropagation();
      e.preventDefault();
      setOpen(!toggle.classList.contains('w--open'));
    }, true);

    document.addEventListener('click', (e) => {
      if (toggle.classList.contains('w--open') && !dropdown.contains(e.target)) setOpen(false);
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && toggle.classList.contains('w--open')) setOpen(false);
    });

    const displayEl = dropdown.querySelector('[data-display-active-filter]');
    const defaultLabel = displayEl?.textContent || '';

    function updateDisplayLabel() {
      if (!displayEl) return;
      const radios = list.querySelectorAll('input[type="radio"]:checked');
      const checkboxes = list.querySelectorAll('input[type="checkbox"]:checked');
      const total = radios.length + checkboxes.length;
      if (total === 0) {
        displayEl.textContent = defaultLabel;
      } else if (total === 1) {
        const input = radios[0] || checkboxes[0];
        const span = input.closest('label')?.querySelector('.w-form-label');
        displayEl.textContent = span?.textContent || defaultLabel;
      } else {
        displayEl.textContent = total + ' selected';
      }
    }

    dropdown.addEventListener('click', (e) => {
      if (e.target.closest('.w-dropdown-toggle')) return;

      const label = e.target.closest('label');
      if (label?.querySelector('input[type="radio"]')) {
        updateDisplayLabel();
        setOpen(false);
        return;
      }
      const closer = e.target.closest('[data-close-dropdown]');
      if (closer && closer !== dropdown) setOpen(false);
    });

    list.addEventListener('change', updateDisplayLabel);
  });
}


const QUOTE_PAIRS = {
  '"': ['\u201C', '\u201D'], // " "
  "'": ['\u2018', '\u2019'], // ' '
  '<<': ['\u00AB', '\u00BB'], // « »
  '`': ['\u0060', '\u0060'], // ` `
};

function initQuoteText(container) {
  container = container || document;

  const elements = container.querySelectorAll('[data-quote-text]:not([data-quote-applied])');
  elements.forEach(el => {
    el.setAttribute('data-quote-applied', '');
    const value = el.getAttribute('data-quote-text') || '"';
    let open, close;

    if (QUOTE_PAIRS[value]) {
      [open, close] = QUOTE_PAIRS[value];
    } else if (value.length === 4) {
      open = value.slice(0, 2);
      close = value.slice(2, 4);
    } else if (value.length === 2) {
      open = value[0];
      close = value[1];
    } else {
      open = value;
      close = value;
    }

    el.textContent = open + el.textContent + close;
  });
}


function initListCombine(container) {
  container = container || document;

  container.querySelectorAll('[data-combine-target]').forEach(target => {
    const max = parseInt(target.getAttribute('data-combine-target'), 10) || Infinity;
    const list = target.querySelector('.w-dyn-items') || target;
    const currentCount = list.children.length;

    if (currentCount >= max) return;

    const sourceId = target.getAttribute('data-combine-source');
    if (!sourceId) return;

    const root = container === document ? document : container.ownerDocument;
    const source = root.querySelector('[data-combine-id="' + sourceId + '"]');
    if (!source) return;

    const sourceList = source.querySelector('.w-dyn-items') || source;
    const needed = max - currentCount;

    for (let i = 0; i < needed && sourceList.children.length > 0; i++) {
      list.appendChild(sourceList.children[0]);
    }

    source.remove();
  });
}


// Generic list injection: stamp clones of an item into a list at 1-based
// positions defined by one or more CMS-bound text values.
//
//   <div data-inject-list>                     (or: data-inject-list="myKey")
//     …existing items…
//   </div>
//
//   <div data-inject-item                      (or: data-inject-item="myKey")
//        data-inject-value-sources="3 https://…/a.m3u8
//                                   5 https://…/b.m3u8"
//        data-inject-attribute-sources="data-player-src">
//     …stamp contents. May contain a descendant that already carries the
//     target attribute (e.g. <div data-bunny-background-init data-player-src>).
//   </div>
//
// For each `data-inject-value-KEY` attribute on the item, the paired
// `data-inject-attribute-KEY` names the attribute to write the value to on
// the clone — or on any descendant that already carries that attribute.
//
// Values are parsed line-by-line as `<position> <value>`. Positions across
// keys are unioned; one clone is inserted per position. `3` becomes the third
// child of the list; the item that was there shifts forward.
//
// The stamp is detached before insertion, so it never occupies a `:nth-child`
// slot and never boots child components (e.g. a hidden bunny player). It may
// live inside the list in the Designer.
const INJECT_VALUE_PREFIX = 'data-inject-value-';
const INJECT_ATTR_PREFIX = 'data-inject-attribute-';

function parsePositionedLines(raw) {
  const map = new Map();
  raw.split(/\r?\n/).forEach(line => {
    const match = line.trim().match(/^(\d+)\s+(.+)$/);
    if (!match) return;
    const position = parseInt(match[1], 10);
    if (position < 1 || map.has(position)) return;
    map.set(position, match[2].trim());
  });
  return map;
}

function readInjectSpecs(item) {
  const specs = new Map();
  Array.from(item.attributes).forEach(attr => {
    if (!attr.name.startsWith(INJECT_VALUE_PREFIX)) return;
    const key = attr.name.slice(INJECT_VALUE_PREFIX.length);
    const attribute = item.getAttribute(INJECT_ATTR_PREFIX + key);
    if (!attribute) return;
    const values = parsePositionedLines(attr.value || '');
    if (values.size === 0) return;
    specs.set(key, { attribute, values });
  });
  return specs;
}

function findInjectList(item) {
  const name = item.getAttribute('data-inject-item') || '';
  const doc = item.ownerDocument || document;

  if (name) {
    const list = doc.querySelector(
      '[data-inject-list="' + CSS.escape(name) + '"]',
    );
    if (list) return list;
  }

  // Walk up ancestors; at each level check the ancestor itself and its
  // descendants (but not the stamp's own subtree). First match wins so the
  // nearest common wrapper is preferred. This handles both stamp-inside-list
  // and stamp-as-sibling-of-a-wrapper (e.g. Webflow's `.w-dyn-list` around
  // the actual `[data-inject-list]` on `.w-dyn-items`).
  let anc = item.parentElement;
  while (anc) {
    if (anc.matches && anc.matches('[data-inject-list]')) return anc;
    const nested = [...anc.querySelectorAll('[data-inject-list]')].find(
      (el) => !item.contains(el),
    );
    if (nested) return nested;
    anc = anc.parentElement;
  }

  return null;
}

function writeInjectedValue(clone, attribute, value) {
  const selector = '[' + attribute + ']';
  const targets = clone.querySelectorAll(selector);
  if (targets.length) {
    targets.forEach(el => el.setAttribute(attribute, value));
    return;
  }
  clone.setAttribute(attribute, value);
}

function prepareInjectedClone(clone) {
  clone.removeAttribute('data-inject-item');
  clone.removeAttribute('data-inject-done');
  clone.removeAttribute('id');
  clone.removeAttribute('hidden');
  clone.removeAttribute('aria-hidden');
  clone.classList.remove('w-condition-invisible');
  if (clone.style.display === 'none') clone.style.removeProperty('display');

  clone.querySelectorAll('[id]').forEach(el => el.removeAttribute('id'));

  // Strip inject metadata so the clone is a clean stamped instance.
  Array.from(clone.attributes).forEach(attr => {
    if (
      attr.name.startsWith(INJECT_VALUE_PREFIX) ||
      attr.name.startsWith(INJECT_ATTR_PREFIX)
    ) {
      clone.removeAttribute(attr.name);
    }
  });
}

function initInject(container) {
  container = container || document;

  container.querySelectorAll('[data-inject-item]').forEach(item => {
    if (item.hasAttribute('data-inject-done')) return;

    const list = findInjectList(item);
    if (!list) return;

    const specs = readInjectSpecs(item);

    // Commit only once we know we can process this stamp. Otherwise a run that
    // ran too early (list not yet in the DOM) would poison the retry.
    item.setAttribute('data-inject-done', '');

    // Detach the stamp so it never occupies a :nth-child slot and never boots
    // child components (e.g. a hidden bunny video).
    item.remove();

    if (!specs.size) return;

    const positions = new Set();
    specs.forEach(spec => spec.values.forEach((_, pos) => positions.add(pos)));

    [...positions].sort((a, b) => a - b).forEach(position => {
      const clone = item.cloneNode(true);
      prepareInjectedClone(clone);
      specs.forEach(spec => {
        const value = spec.values.get(position);
        if (value == null) return;
        writeInjectedValue(clone, spec.attribute, value);
      });
      list.insertBefore(clone, list.children[position - 1] || null);
    });
  });
}


function initSearchBar(container) {
  container = container || document;

  const input = container.querySelector('[init-search-bar]');
  if (!input) return;

  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      input.focus();
    }

    if (e.key === 'Escape' && document.activeElement === input) {
      input.value = '';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.blur();
    }
  });
}


function utilities() {
  // Before the enter animation, so injected clones are already in place when
  // the page is shown. First load misses this (barba.init runs earlier) and
  // is handled on pageVisible, while the preloader cover is still up.
  if (typeof barba !== 'undefined') {
    barba.hooks.beforeEnter((data) => {
      initInject(data.next?.container || document);
    });
  }

  document.addEventListener('barba:pageVisible', (e) => {
    initDynamicCurrentYear(e.detail.container);
    initQuoteText(e.detail.container);
    initFilterDropdowns(e.detail.container);
    initCappedListStagger(e.detail.container);
    initListCombine(e.detail.container);
    initInject(e.detail.container);
    initSearchBar(e.detail.container);
  });
}

export default utilities;