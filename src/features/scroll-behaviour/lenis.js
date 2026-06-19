const SCROLL_OPTS = {
  easing: (x) => (x < 0.5 ? 8 * x * x * x * x : 1 - Math.pow(-2 * x + 2, 4) / 2),
  duration: 1.6,
};

function getOffset() {
  const nav = document.querySelector('.mega-nav') || document.querySelector('.navbar_component');
  return -(nav?.offsetHeight || 0);
}

function isSamePage(link) {
  return link.pathname.replace(/\/$/, '') === window.location.pathname.replace(/\/$/, '');
}

function lenisSetup() {
  document.addEventListener('barba:afterEnter', (e) => {
    if (!window.lenis) {
      window.lenis = new Lenis({ autoRaf: true });
    }
    initScrollToAnchorLenis(e.detail.container);
  });

  // Capture phase: fires BEFORE Barba's bubble-phase handler
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a');
    if (!link || !link.hash || !isSamePage(link)) return;

    const target = document.querySelector(link.hash);
    if (!target) return;

    e.preventDefault();
    e.stopPropagation();

    if (window.lenis) {
      window.lenis.scrollTo(target, { ...SCROLL_OPTS, offset: getOffset() });
    } else {
      target.scrollIntoView({ behavior: 'smooth' });
    }
  }, true);
}

function initScrollToAnchorLenis(container) {
  container = container || document;
  container.querySelectorAll('[data-anchor-target]').forEach(el => {
    el.addEventListener('click', function (e) {
      const target = this.getAttribute('data-anchor-target');
      if (!window.lenis) return;

      const extra = parseFloat(this.getAttribute('data-anchor-offset')) || 0;
      e.preventDefault();
      window.lenis.scrollTo(target, { ...SCROLL_OPTS, offset: getOffset() + extra });
    });
  });
}

export default lenisSetup;
