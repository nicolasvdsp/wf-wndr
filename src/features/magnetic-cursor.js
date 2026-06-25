/*
Markup contract — place ONCE, OUTSIDE [data-barba="container"]:
  <div class="cursor"><div class="cursor-bg"></div></div>
  <div data-label>
    <div data-label-bg></div>
    <p data-label-text-target></p>
  </div>

Targets — INSIDE the container:
  [data-magnetic-cursor-target] containing a [data-magnetic-cursor-bg] slot
    (+ optional [data-magnetic-cursor-nav] for a softer ease)
  [data-magnetic-cursor-disappear]            → hides the dot while hovered
  [data-label-text-source="text"]             → shows the growing text label
    (+ optional [data-label-target-edge] to flip off the element's own edges)
*/

const LABEL_X_OFFSET = 10;
const LABEL_Y_OFFSET = -35;
// Slight head start so the pill grows before the text staggers in.
const LABEL_TEXT_DELAY = 0.15;

let isCursorSetup = false;
let cursorEl = null;
let cursorBgEl = null;

let isLabelSetup = false;
let labelEl = null;
let labelTextEl = null;
let labelBgEl = null;
let labelCurrentTarget = null;
let labelLastText = '';
let labelSplit = null;
let labelLeaveTween = null;

function isTouchDevice() {
  return 'ontouchstart' in window
    || navigator.maxTouchPoints > 0
    || (navigator.msMaxTouchPoints && navigator.msMaxTouchPoints > 0)
    || matchMedia('(pointer: coarse)').matches;
}

// Shared pointer tracker (mirrors navbar.js). Guarded via a window flag so only
// one listener is attached regardless of which feature initialises it first.
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

// True when cursor-bg is docked inside a magnetic target's holder AND the
// pointer is still physically over that target — i.e. a Barba swap happened
// while hovering a persistent magnetic zone (e.g. the nav). In that case we
// must NOT yank the square back onto the dot, or it would start following the
// mouse again under a stationary cursor (Option B).
function pointerStillOverDock() {
  if (!cursorBgEl || cursorBgEl.parentElement === cursorEl) return false;
  const p = window.__wndrPointer;
  if (!p || p.x < 0) return false;
  const target = cursorBgEl.parentElement?.closest('[data-magnetic-cursor-target]');
  if (!target || !target.isConnected) return false;
  const hit = document.elementFromPoint(p.x, p.y);
  return !!(hit && target.contains(hit));
}

function ensureCursorSetup() {
  if (isCursorSetup) return true;

  cursorEl = document.querySelector('.cursor');
  if (!cursorEl) return false;

  cursorBgEl = cursorEl.querySelector('.cursor_bg');
  if (!cursorBgEl) return false;

  gsap.registerPlugin(Flip);

  gsap.set(cursorEl, { xPercent: -150, yPercent: -125 });

  const xTo = gsap.quickTo(cursorEl, 'x', { duration: 0.6, ease: 'power4' });
  const yTo = gsap.quickTo(cursorEl, 'y', { duration: 0.6, ease: 'power4' });

  window.addEventListener('mousemove', (e) => {
    xTo(e.clientX);
    yTo(e.clientY);
  });

  isCursorSetup = true;
  return true;
}

// If a target captured cursor-bg and was then removed (e.g. its container left
// during a barba transition while still hovered, so mouseleave never fired),
// cursor-bg ends up detached. Snap it back home before binding new targets.
function restoreCursorBg() {
  if (!cursorEl || !cursorBgEl) return;
  if (cursorBgEl.parentElement === cursorEl) return;
  cursorEl.appendChild(cursorBgEl);
}

function bindMagneticTargets(scope) {
  if (!cursorEl || !cursorBgEl) return;

  const targets = (scope || document).querySelectorAll('[data-magnetic-cursor-target]');
  if (!targets.length) return;

  targets.forEach((target) => {
    if ('magneticCursorBound' in target.dataset) return;
    target.dataset.magneticCursorBound = '';

    const bgHolder = target.querySelector('[data-magnetic-cursor-bg]');
    if (!bgHolder) return;

    target.addEventListener('mouseenter', () => {
      const ease = target.hasAttribute('data-magnetic-cursor-nav') ? 'power3.out' : 'back.out(1)';
      const state = Flip.getState(cursorBgEl);
      bgHolder.appendChild(cursorBgEl);
      Flip.from(state, { ease, duration: 0.3 });
    });

    target.addEventListener('mouseleave', () => {
      if (cursorBgEl.parentElement !== bgHolder) return;
      const state = Flip.getState(cursorBgEl, { props: 'opacity' });
      cursorEl.appendChild(cursorBgEl);
      Flip.from(state, { ease: 'power4.out', duration: 0.5 });
    });
  });
}

function bindDisappearZones(scope) {
  if (!cursorEl) return;

  const zones = (scope || document).querySelectorAll('[data-magnetic-cursor-disappear]');
  if (!zones.length) return;

  zones.forEach((zone) => {
    if ('magneticCursorDisappearBound' in zone.dataset) return;
    zone.dataset.magneticCursorDisappearBound = '';

    zone.addEventListener('mouseenter', () => {
      gsap.to(cursorEl, { autoAlpha: 0, duration: 0.3, ease: 'power2.out', overwrite: 'auto' });
    });

    zone.addEventListener('mouseleave', () => {
      gsap.to(cursorEl, { autoAlpha: 1, duration: 0.3, ease: 'power2.out', overwrite: 'auto' });
    });
  });
}

// The text label is its own pointer follower so it never fights `.cursor`'s
// transform. Set up ONCE. Returns false (and bails) on touch devices or when
// the markup isn't present.
function ensureLabelSetup() {
  if (isLabelSetup) return true;

  labelEl = document.querySelector('[data-label]');
  if (!labelEl) return false;

  if (isTouchDevice()) {
    labelEl.style.display = 'none';
    return false;
  }

  labelTextEl = labelEl.querySelector('[data-label-text-target]');
  if (!labelTextEl) return false;

  labelBgEl = labelEl.querySelector('[data-label-bg]');
  if (!labelBgEl) return false;

  // Keep the label container itself visible. The dot's `.cursor-bg` is what
  // Flips in to provide the visible pill background, and `visibility:hidden`
  // on the container would be inherited by that flipped square mid-animation.
  // We toggle only the text's visibility instead.
  gsap.set(labelEl, { xPercent: LABEL_X_OFFSET, yPercent: LABEL_Y_OFFSET });
  gsap.set(labelTextEl, { autoAlpha: 0 });

  const xTo = gsap.quickTo(labelEl, 'x', { ease: 'power3' });
  const yTo = gsap.quickTo(labelEl, 'y', { ease: 'power3' });

  window.addEventListener('mousemove', (e) => {
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    const scrollY = window.scrollY;
    const cursorX = e.clientX;
    const cursorY = e.clientY + scrollY;

    let xPercent = LABEL_X_OFFSET;
    let yPercent = LABEL_Y_OFFSET;

    const edgeThreshold = labelEl.offsetWidth + 16;
    const useElementBounds = labelCurrentTarget && labelCurrentTarget.hasAttribute('data-label-target-edge');

    if (useElementBounds) {
      const rect = labelCurrentTarget.getBoundingClientRect();
      if (cursorX > rect.right - edgeThreshold) xPercent = -100;
      if (cursorY > rect.bottom + scrollY - rect.height * 0.1) yPercent = -120;
    } else {
      if (cursorX > windowWidth - edgeThreshold) xPercent = -100;
      if (cursorY > scrollY + windowHeight * 0.9) yPercent = -120;
    }

    if (labelCurrentTarget) {
      const newText = labelCurrentTarget.getAttribute('data-label-text-source');
      if (newText !== labelLastText) {
        labelTextEl.innerHTML = newText;
        labelLastText = newText;
      }
    }

    gsap.to(labelEl, { xPercent, yPercent, duration: 0.9, ease: 'power3', overwrite: 'auto' });
    xTo(cursorX);
    yTo(cursorY - scrollY);
  });

  isLabelSetup = true;
  return true;
}

function clearLabelSplit() {
  if (labelSplit) {
    labelSplit.revert();
    labelSplit = null;
  }
}

// Split the label text into masked lines and stagger them up, slightly delayed
// so the pill grows in first. Falls back to a plain fade if SplitText isn't
// loaded. Assumes labelTextEl.innerHTML already holds the plain text.
function staggerLabelTextIn() {
  if (typeof SplitText === 'undefined') {
    gsap.to(labelTextEl, {
      autoAlpha: 1, duration: 0.4, delay: LABEL_TEXT_DELAY, ease: 'power2.out', overwrite: 'auto',
    });
    return;
  }

  labelSplit = SplitText.create(labelTextEl, {
    type: 'lines',
    mask: 'lines',
    linesClass: 'line',
  });

  gsap.set(labelSplit.lines, { paddingBottom: '0.15em', marginBottom: '-0.15em' });
  gsap.set(labelTextEl, { autoAlpha: 1 });
  gsap.from(labelSplit.lines, {
    yPercent: 110,
    duration: 0.6,
    stagger: 0.06,
    ease: 'expo.out',
    delay: LABEL_TEXT_DELAY,
    overwrite: 'auto',
  });
}

function bindCursorLabelTargets(scope) {
  if (!labelEl || !labelTextEl || !labelBgEl) return;

  const targets = (scope || document).querySelectorAll('[data-label-text-source]');
  if (!targets.length) return;

  targets.forEach((target) => {
    if ('labelTargetBound' in target.dataset) return;
    target.dataset.labelTargetBound = '';

    target.addEventListener('mouseenter', () => {
      labelCurrentTarget = target;

      // Kill any in-flight leave fade so its onComplete can't revert the split
      // we're about to create (fast hops between targets would otherwise leave
      // the new text un-animated/static). Killing does NOT fire onComplete.
      if (labelLeaveTween) {
        labelLeaveTween.kill();
        labelLeaveTween = null;
      }

      // Set the plain text BEFORE capturing Flip state so the pill measures to
      // its final width and the square grows straight into it. Hide it until
      // the stagger runs (kept synchronous, so there's no flash of plain text).
      const newText = target.getAttribute('data-label-text-source');
      labelLastText = newText;
      clearLabelSplit();
      labelTextEl.innerHTML = newText;
      gsap.set(labelTextEl, { autoAlpha: 0 });

      // Grow the dot into the label's pill background.
      const state = Flip.getState(cursorBgEl);
      labelBgEl.appendChild(cursorBgEl);
      Flip.from(state, { ease: 'power3.out', duration: 0.4 });

      // Line-stagger the text in, delayed so the square leads.
      staggerLabelTextIn();
    });

    target.addEventListener('mouseleave', () => {
      labelCurrentTarget = null;
      labelLastText = '';

      labelLeaveTween = gsap.to(labelTextEl, {
        autoAlpha: 0,
        duration: 0.05,
        ease: 'power2.out',
        overwrite: 'auto',
        onComplete: () => {
          clearLabelSplit();
          labelLeaveTween = null;
        },
      });

      // Shrink the pill back into the dot.
      if (cursorBgEl.parentElement !== labelBgEl) return;
      const state = Flip.getState(cursorBgEl, { props: 'opacity' });
      cursorEl.appendChild(cursorBgEl);
      Flip.from(state, { ease: 'power4.out', duration: 0.5 });
    });
  });
}

function magneticCursor() {
  if (!ensureCursorSetup()) return;

  trackPointer();

  bindMagneticTargets(document);
  bindDisappearZones(document);

  const hasLabel = ensureLabelSetup();
  if (hasLabel) bindCursorLabelTargets(document);

  document.addEventListener('barba:afterEnter', (e) => {
    // Option B: if the pointer is still over a persistent magnetic target after
    // the swap, leave the square docked there. Otherwise snap it home.
    if (!pointerStillOverDock()) {
      restoreCursorBg();
      // The old page's disappear zone may have left `.cursor` faded out and is
      // now gone with its container — its mouseleave will never fire. Force
      // visible so the cursor doesn't get stuck invisible after navigation.
      gsap.set(cursorEl, { autoAlpha: 1 });
    }

    const container = e.detail?.container || document;
    bindMagneticTargets(container);
    bindDisappearZones(container);

    if (hasLabel) {
      // Mid-hover navigation: the old [data-cursor] target's mouseleave never
      // fired, so reset the label state before re-binding. `restoreCursorBg()`
      // above already moved `.cursor-bg` out of the label slot and back into
      // the dot; here we just clear and hide the text.
      labelCurrentTarget = null;
      labelLastText = '';
      if (labelLeaveTween) {
        labelLeaveTween.kill();
        labelLeaveTween = null;
      }
      clearLabelSplit();
      labelTextEl.innerHTML = '';
      gsap.set(labelTextEl, { autoAlpha: 0 });
      bindCursorLabelTargets(container);
    }
  });
}

export default magneticCursor;
