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

// Logo hero ↔ compact sizing.
//
// Two scroll modes (choose per-site):
//   'instant'     → the logo snaps between two widths. The `.is-large` combo
//                   class holds the width values in Webflow; JS just toggles it
//                   with hysteresis (shrink past SHRINK_AFTER, grow back below
//                   GROW_BELOW — the gap prevents single-pixel flicker).
//   'progressive' → the scroll position scrubs the width between the two
//                   extremes (largest at scrollY 0, smallest at DISTANCE). JS
//                   writes a 0→1 `--logo-progress` var; the calc width lives in
//                   `_navbar.scss`. No `.is-large` in this mode.
//
// Pick the default here, or override per page via `data-logo-scroll="progressive"`
// (or `"instant"`) on the `[data-nav]` element in Webflow. Page-change sizing is
// identical in both modes (animated grow into / shrink out of the homepage).
const LOGO_SCROLL_MODE = 'progressive';
// Progressive only: scroll distance (px) from largest → smallest. ~100vh.
const LOGO_PROGRESS_DISTANCE = () => window.innerHeight;

const LOGO_LARGE_CLASS = 'is-large';
// Added only when navigating TO the homepage, so the grow can wait out the page
// transition (the actual `transition-delay` lives on `.has-delay` in Webflow).
// Stripped on scroll-driven resizes so those stay immediate.
const LOGO_DELAY_CLASS = 'has-delay';
// Progressive only: enables the width tween for a page-change resize (default in
// that mode is no transition so scroll scrubbing tracks 1:1). Stripped on scroll.
const LOGO_ANIMATING_CLASS = 'is-animating';
// Progressive only: fallback release for the page-change scroll lock, in case no
// width `transitionend` fires (e.g. the size didn't actually change). Should
// comfortably exceed the tween duration + any `.has-delay`.
const LOGO_PAGECHANGE_MAX_MS = 1500;
const LOGO_SHRINK_AFTER = 16 * 10;
const LOGO_GROW_BELOW = 16 * 8;

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
  const logo = nav.querySelector(SELECTORS.logo);
  if (!menu || !indicator || !links.length) return;

  // Resolve the logo scroll mode (Webflow attribute wins over the JS default),
  // then reflect it back onto the nav so the SCSS selectors can hook onto it.
  const logoScrollMode = nav.getAttribute('data-logo-scroll') || LOGO_SCROLL_MODE;
  const logoProgressive = logoScrollMode === 'progressive';
  nav.setAttribute('data-logo-scroll', logoScrollMode);

  const reduceMotionMQ = window.matchMedia('(prefers-reduced-motion: reduce)');
  const hoverableMQ = window.matchMedia('(hover: hover) and (pointer: fine)');

  let reduceMotion = reduceMotionMQ.matches;
  let supportsHover = hoverableMQ.matches;

  // Live state
  let currentLink = null;
  let hoveredLink = null;
  let isMenuActive = false;
  let leaveTween = null;
  let logoAtTop = window.scrollY <= LOGO_SHRINK_AFTER;
  // Progressive: while a page-change tween runs, ignore scroll-driven updates so
  // Barba's scroll-to-top reset can't strip `.is-animating` and snap the width.
  let logoLocked = false;
  let logoLockTimer = 0;

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

  // ---- Logo size (homepage hero ↔ compact) -------------------------------

  function isHomePath(path) {
    return normalizePath(path) === '/';
  }

  // Progressive: 0 (largest, scrollY 0) → 1 (smallest, at DISTANCE).
  function progressFromScroll() {
    const range = LOGO_PROGRESS_DISTANCE();
    if (!range || range <= 0) return 0;
    return Math.min(1, Math.max(0, window.scrollY / range));
  }

  function setLogoProgress(p) {
    if (logo) logo.style.setProperty('--logo-progress', String(p));
  }

  // Lock scroll-driven updates while a page-change tween plays (progressive),
  // so Barba's scroll reset can't interrupt it. Released on the width
  // `transitionend`, with a timeout fallback for no-op resizes.
  function lockLogoScroll() {
    logoLocked = true;
    clearTimeout(logoLockTimer);
    logoLockTimer = setTimeout(releaseLogoScroll, LOGO_PAGECHANGE_MAX_MS);
  }

  function releaseLogoScroll() {
    if (!logoLocked) return;
    logoLocked = false;
    clearTimeout(logoLockTimer);
    if (logo) logo.classList.remove(LOGO_ANIMATING_CLASS, LOGO_DELAY_CLASS);
    // Resume scrubbing from the real scroll position.
    if (logoProgressive && isHomePath(window.location.pathname)) {
      setLogoProgress(progressFromScroll());
    }
  }

  // Recompute the logo size from the current scroll position + path. Used on
  // initial load and every barba:afterEnter.
  function applyLogoSize() {
    if (!logo) return;
    const home = isHomePath(window.location.pathname);
    if (logoProgressive) {
      // Mid page-change: leave the destination target the click already set.
      if (logoLocked) return;
      // Non-home → pinned to smallest; home → scrubbed by scroll.
      setLogoProgress(home ? progressFromScroll() : 1);
      return;
    }
    logoAtTop = window.scrollY <= LOGO_SHRINK_AFTER;
    logo.classList.toggle(LOGO_LARGE_CLASS, home && logoAtTop);
  }

  // Optimistic size for a click that's about to navigate: decide from the
  // destination path (the URL hasn't changed yet) so the logo animates the
  // instant you click, in parallel with the page transition. Navigation always
  // lands at the top, so reset `logoAtTop` too.
  function setLogoForDestination(destPath) {
    if (!logo) return;
    const home = isHomePath(destPath);
    logoAtTop = true;
    // Delay only the grow into the homepage; shrinking away from it is immediate.
    logo.classList.toggle(LOGO_DELAY_CLASS, home);
    if (logoProgressive) {
      // Enable the tween for this discrete (non-scroll) change, then scrub.
      // Lock so the impending scroll-to-top reset can't snap it mid-tween.
      logo.classList.add(LOGO_ANIMATING_CLASS);
      setLogoProgress(home ? 0 : 1);
      lockLogoScroll();
    } else {
      logo.classList.toggle(LOGO_LARGE_CLASS, home);
    }
  }

  function onLogoScroll() {
    if (logoLocked) return; // page-change tween in progress
    if (logoProgressive) {
      // Scroll resizes track 1:1 with no tween — drop the page-change classes.
      if (logo) logo.classList.remove(LOGO_ANIMATING_CLASS, LOGO_DELAY_CLASS);
      // Only the homepage scrubs; other pages stay pinned to smallest.
      if (isHomePath(window.location.pathname)) setLogoProgress(progressFromScroll());
      return;
    }
    const y = window.scrollY;
    let changed = false;
    if (logoAtTop && y > LOGO_SHRINK_AFTER) { logoAtTop = false; changed = true; }
    else if (!logoAtTop && y < LOGO_GROW_BELOW) { logoAtTop = true; changed = true; }
    if (changed) {
      if (logo) logo.classList.remove(LOGO_DELAY_CLASS); // scroll resizes are immediate
      logo.classList.toggle(LOGO_LARGE_CLASS, isHomePath(window.location.pathname) && logoAtTop);
    }
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

    // Recompute logo size for the new page (scroll resets to top on navigation).
    applyLogoSize();

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
      setLogoForDestination(new URL(link.href, window.location.origin).pathname);
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
    // The logo navigates to "/", so grow it immediately (it lands at the top).
    if (trigger.href) setLogoForDestination(new URL(trigger.href, window.location.origin).pathname);
  });

  // Logo size on scroll (hysteresis lives in `onLogoScroll`), rAF-throttled.
  let logoScrollRaf = 0;
  window.addEventListener('scroll', () => {
    cancelAnimationFrame(logoScrollRaf);
    logoScrollRaf = requestAnimationFrame(onLogoScroll);
  }, { passive: true });

  // Release the page-change scroll lock once the width tween finishes.
  if (logo) {
    logo.addEventListener('transitionend', (e) => {
      if (e.propertyName === 'width' && logoLocked) releaseLogoScroll();
    });
  }

  // Recompute on resize (debounced via rAF)
  let resizeRaf = 0;
  window.addEventListener('resize', () => {
    cancelAnimationFrame(resizeRaf);
    resizeRaf = requestAnimationFrame(() => {
      const target = isMenuActive ? (hoveredLink || currentLink) : currentLink;
      moveIndicatorTo(target, { animate: false });
      // Progressive logo scrub depends on viewport height → re-derive progress.
      if (logoProgressive && isHomePath(window.location.pathname)) {
        setLogoProgress(progressFromScroll());
      }
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
