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
  document.addEventListener('barba:pageVisible', (e) => {
    initDynamicCurrentYear(e.detail.container);
    initQuoteText(e.detail.container);
    initFilterDropdowns(e.detail.container);
    initCappedListStagger(e.detail.container);
    initListCombine(e.detail.container);
    initSearchBar(e.detail.container);
  });
}

export default utilities;