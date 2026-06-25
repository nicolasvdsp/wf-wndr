/*
WNDR NAVBAR
---------------------------------------------
Custom navbar with a single sliding "current page" indicator.

Markup contract:
  <nav class="nav_component" aria-label="Primary" data-nav>
    <div class="nav_inner">
      <a class="nav_logo-link" href="/" aria-label="WNDR — Home"
         data-nav-logo data-nav-remove-indicator>...</a>
      <div class="nav_menu" data-nav-menu>
        <span class="nav_indicator" data-nav-indicator aria-hidden="true"></span>
        <ul class="nav_list" role="list">
          <li class="nav_item"><a class="nav_link" href="/work"    data-nav-link data-barba-update>Work</a></li>
          <li class="nav_item"><a class="nav_link" href="/about"   data-nav-link data-barba-update>About</a></li>
          <li class="nav_item"><a class="nav_link" href="/contact" data-nav-link data-barba-update>Contact</a></li>
        </ul>
      </div>
    </div>
  </nav>

Attributes:
  - `data-nav-remove-indicator` — put on any clickable element (logo, CTA,
    breadcrumb…) that navigates to a route without a current nav link. The
    indicator fades out at click time so the square is gone before the page
    transition strips `.w--current` and the link un-indents.

Geometry:
  The list is right-aligned. The indicator sits to the RIGHT of the link text,
  in a gap opened by `margin-right` on the link ("indent" = shift LEFT). Idle:
  only `.w--current` is indented, indicator parked in its right-hand gap. Hover:
  every link gets the same margin-right so they all sit in the same column;
  indicator slides vertically between them — never horizontally.

Behaviour:
  - On load: mirrors Webflow's `.w--current` → `aria-current="page"` and parks the
    indicator next to the current link.
  - Menu hover / focus-within: adds `.is-hover` on [data-nav-menu] (used by CSS to
    indent every link), and the indicator slides to whichever link is under the
    pointer / focus.
  - Menu leave / blur (current exists): indicator slides back to the current link
    first, THEN the `.is-hover` class is removed so items un-indent.
  - Menu leave / blur (no current): indicator fades out, then `.is-hover` is removed.
  - On `prefers-reduced-motion: reduce`: indicator snaps without animation.
  - On `(hover: none)` / `(pointer: coarse)`: no hover behaviour, indicator just
    sits at current link (focus still works for keyboard users).
  - Page transitions: `[data-barba-update]` is already synced by page-transitions.js
    so `.w--current` updates automatically — we just re-sync aria-current and the
    indicator position on `barba:afterEnter`.
*/

const SELECTORS = {
  nav: '[data-nav]',
  menu: '[data-nav-menu]',
  indicator: '[data-nav-indicator]',
  link: '[data-nav-link]',
  logo: '[data-nav-logo]',
};

const HOVER_CLASS = 'is-hover';
const INIT_FLAG = 'navInit';

const DURATION = 0.4;
const EASE = 'expo.out';

// Shared pointer tracker. After a Barba swap, no mouseenter/leave fires for the
// element already under the cursor, so features need a way to ask "is the mouse
// still over me?". Guarded via a window flag so only one listener is attached
// even when several features import this helper.
function trackPointer() {
  if (window.__wndrPointerInit) return;
  window.__wndrPointerInit = true;
  window.__wndrPointer = { x: -1, y: -1 };
  window.addEventListener(
    'mousemove',
    (e) => {
      window.__wndrPointer.x = e.clientX;
      window.__wndrPointer.y = e.clientY;
    },
    { passive: true }
  );
}

function initNavbar() {
  const nav = document.querySelector(SELECTORS.nav);
  if (!nav) return;

  trackPointer();

  // Idempotent re-runs (e.g. on barba:afterEnter) → just re-sync state
  if (nav.dataset[INIT_FLAG] !== undefined) {
    nav.__navSync?.();
    return;
  }
  nav.dataset[INIT_FLAG] = '';

  const menu = nav.querySelector(SELECTORS.menu);
  const indicator = nav.querySelector(SELECTORS.indicator);
  const links = Array.from(nav.querySelectorAll(SELECTORS.link));
  if (!menu || !indicator || !links.length) return;

  const reduceMotionMQ = window.matchMedia('(prefers-reduced-motion: reduce)');
  const hoverableMQ = window.matchMedia('(hover: hover) and (pointer: fine)');

  let reduceMotion = reduceMotionMQ.matches;
  let supportsHover = hoverableMQ.matches;

  // Live state
  let currentLink = null;
  let hoveredLink = null;
  let isMenuActive = false;
  let leaveTween = null;

  // ---- Active-state helpers ----------------------------------------------

  function findCurrentLink() {
    // Prefer Webflow's auto class; fall back to URL match
    const byClass = links.find((l) => l.classList.contains('w--current'));
    if (byClass) return byClass;

    const here = normalizePath(window.location.pathname);
    return links.find((l) => normalizePath(new URL(l.href, window.location.origin).pathname) === here) || null;
  }

  function normalizePath(path) {
    if (!path) return '/';
    const clean = path.replace(/\/+$/, '');
    return clean === '' ? '/' : clean;
  }

  function syncAriaCurrent(current) {
    links.forEach((link) => {
      if (link === current) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
  }

  // ---- Indicator placement ------------------------------------------------

  function moveIndicatorTo(link, { animate = true } = {}) {
    if (leaveTween) leaveTween.kill();

    if (!link) {
      // Nothing to track → hide
      gsap.to(indicator, {
        autoAlpha: 0,
        duration: animate && !reduceMotion ? 0.2 : 0,
        overwrite: 'auto',
      });
      return null;
    }

    const menuRect = menu.getBoundingClientRect();
    const linkRect = link.getBoundingClientRect();

    // X is handled entirely by CSS (`right: var(--nav-indicator-edge-offset)`),
    // so the indicator stays pinned to the menu's right edge regardless of
    // how nav_menu resizes when links indent. JS only animates Y.
    const y = linkRect.top - menuRect.top + (linkRect.height - indicator.offsetHeight) / 2;

    if (!animate || reduceMotion) {
      gsap.set(indicator, { y, autoAlpha: 1 });
      return null;
    }

    return gsap.to(indicator, {
      y,
      autoAlpha: 1,
      duration: DURATION,
      ease: EASE,
      overwrite: 'auto',
    });
  }

  // ---- Activation flow ----------------------------------------------------

  function activateMenu(triggerLink) {
    isMenuActive = true;
    menu.classList.add(HOVER_CLASS);

    hoveredLink = triggerLink || hoveredLink || currentLink;
    // X is anchored via CSS `right` on the indicator, so it follows the
    // menu's right edge automatically — no rAF wait needed.
    moveIndicatorTo(hoveredLink);
  }

  function deactivateMenu() {
    if (!isMenuActive) return;
    isMenuActive = false;

    const target = currentLink;
    const needsAnimatedReturn = hoveredLink && hoveredLink !== currentLink && target;
    const wasShowing = hoveredLink !== null;

    hoveredLink = null;

    if (needsAnimatedReturn) {
      // First slide indicator back to current, THEN release the indent
      leaveTween = moveIndicatorTo(target);
      if (leaveTween) {
        leaveTween.eventCallback('onComplete', () => {
          menu.classList.remove(HOVER_CLASS);
          leaveTween = null;
        });
      } else {
        menu.classList.remove(HOVER_CLASS);
      }
    } else if (!target && wasShowing) {
      // No current link to return to → hide indicator, then un-indent
      leaveTween = moveIndicatorTo(null);
      menu.classList.remove(HOVER_CLASS);
    } else {
      // Indicator already at current → un-indent immediately
      menu.classList.remove(HOVER_CLASS);
      if (target) moveIndicatorTo(target, { animate: false });
    }
  }

  // ---- Full re-sync (initial load + every barba:afterEnter) --------------

  function pointerOver(el) {
    const p = window.__wndrPointer;
    if (!p || p.x < 0) return false;
    const hit = document.elementFromPoint(p.x, p.y);
    return !!(hit && el.contains(hit));
  }

  function linkUnderPointer() {
    const p = window.__wndrPointer;
    if (!p || p.x < 0) return null;
    const hit = document.elementFromPoint(p.x, p.y);
    return hit ? hit.closest(SELECTORS.link) : null;
  }

  function sync() {
    currentLink = findCurrentLink();
    syncAriaCurrent(currentLink);

    // After a page change no mouseenter/leave fires for whatever is already
    // under the cursor. If the pointer is still physically inside the menu,
    // preserve the hovered/indented state instead of snapping back — otherwise
    // the links would un-indent under a stationary cursor (Option B). If the
    // user moved out of the zone during the transition, the persistent
    // mouseleave listener already fired and this branch is skipped.
    if (supportsHover && pointerOver(menu)) {
      hoveredLink = linkUnderPointer() || currentLink;
      isMenuActive = true;
      menu.classList.add(HOVER_CLASS);
      moveIndicatorTo(hoveredLink, { animate: false });
      return;
    }

    isMenuActive = false;
    hoveredLink = null;
    menu.classList.remove(HOVER_CLASS);
    moveIndicatorTo(currentLink, { animate: false });
  }
  nav.__navSync = sync;

  // ---- Event bindings -----------------------------------------------------

  if (supportsHover) {
    menu.addEventListener('mouseenter', () => activateMenu());
    menu.addEventListener('mouseleave', () => deactivateMenu());

    links.forEach((link) => {
      link.addEventListener('mouseenter', () => {
        if (!isMenuActive) activateMenu(link);
        else {
          hoveredLink = link;
          moveIndicatorTo(link);
        }
      });
    });
  }

  // Keyboard / focus parity — works regardless of hover support
  nav.addEventListener('focusin', (e) => {
    const link = e.target.closest(SELECTORS.link);
    if (!link) return;
    if (!isMenuActive) activateMenu(link);
    else {
      hoveredLink = link;
      moveIndicatorTo(link);
    }
  });

  nav.addEventListener('focusout', (e) => {
    // Only deactivate when focus truly leaves the nav
    if (e.relatedTarget && nav.contains(e.relatedTarget)) return;
    deactivateMenu();
  });

  // Optimistically treat a clicked link as the new current page right away.
  // Without this, leaving the menu mid-transition makes `deactivateMenu()`
  // slide the indicator back to the OUTGOING page's link (`.w--current` only
  // updates once Barba finishes). Barba's `afterEnter` re-syncs from the real
  // `.w--current` afterwards, so this is just a head start. Skip modified /
  // new-tab clicks, which don't navigate the current page.
  links.forEach((link) => {
    link.addEventListener('click', (e) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
      currentLink = link;
      hoveredLink = link;
      syncAriaCurrent(link);
    });
  });

  // Pre-emptive fade: when the user clicks any element marked with
  // `data-nav-remove-indicator` (e.g. the nav logo, since "/" isn't in the
  // menu), drop the indicator immediately. The fade then runs in parallel
  // with whatever page-transition animation follows, so the square is gone
  // well before barba's `enter` hook strips `.w--current` and the text
  // un-indents. Beats trying to retro-fit the timing in `barba:afterEnter`.
  document.addEventListener('click', (e) => {
    const trigger = e.target.closest('[data-nav-remove-indicator]');
    if (!trigger) return;
    moveIndicatorTo(null);
  });

  // Recompute on resize (debounced via rAF)
  let resizeRaf = 0;
  window.addEventListener('resize', () => {
    cancelAnimationFrame(resizeRaf);
    resizeRaf = requestAnimationFrame(() => {
      const target = isMenuActive ? (hoveredLink || currentLink) : currentLink;
      moveIndicatorTo(target, { animate: false });
    });
  });

  // React to media-query changes (e.g. user toggles reduced motion or plugs in a mouse)
  const onMotionChange = (e) => { reduceMotion = e.matches; };
  const onHoverChange = (e) => { supportsHover = e.matches; };
  reduceMotionMQ.addEventListener?.('change', onMotionChange);
  hoverableMQ.addEventListener?.('change', onHoverChange);

  // Initial paint
  sync();
}

function navbar() {
  initNavbar();
  // The nav lives outside the Barba container → it persists across page transitions.
  // page-transitions.js's `initBarbaNavUpdate` already syncs `w--current` on
  // `[data-barba-update]` elements before this fires; we just re-sync aria + indicator.
  document.addEventListener('barba:afterEnter', () => {
    initNavbar();
  });
}

export default navbar;
