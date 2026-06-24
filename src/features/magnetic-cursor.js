/*
WNDR MAGNETIC CURSOR (Osmo, adapted for barba.js)
---------------------------------------------------
Original: https://osmo.supply (magnetic-cursor resource)

Markup contract (Webflow):
  Place ONCE, OUTSIDE the [data-barba="container"] (so it persists across pages):
    <div class="cursor">
      <div class="cursor-bg"></div>
    </div>

  Place per page, INSIDE the [data-barba="container"], on any hoverable element:
    <a data-magnetic-cursor-target href="..." class="magnetic-link">
      <div class="magnetic-link__inner">...</div>
      <div data-magnetic-cursor-bg class="magnetic-link__bg"></div>
    </a>

  Optional "no cursor" zones — when the pointer enters one, the cursor follower
  fades out (and fades back in on leave):
    <div data-magnetic-cursor-disappear>...</div>

Behaviour:
  - The cursor follower follows the pointer via gsap.quickTo. Set up ONCE.
  - On mouseenter of a target: Flip `.cursor-bg` into the target's
    [data-magnetic-cursor-bg]. On mouseleave: Flip it back into `.cursor`.
  - On mouseenter of a [data-magnetic-cursor-disappear] zone: fade `.cursor`
    out. On mouseleave: fade it back in.
  - On every barba page change: re-bind targets and disappear zones in the new
    container, force `.cursor` visible (in case the old page faded it out),
    and (safety net) snap `.cursor-bg` back into `.cursor` in case the user
    clicked a magnetic link mid-hover and the old container was removed before
    mouseleave could fire.
*/

let isCursorSetup = false;
let cursorEl = null;
let cursorBgEl = null;

function ensureCursorSetup() {
  if (isCursorSetup) return true;

  cursorEl = document.querySelector('.cursor');
  if (!cursorEl) return false;

  cursorBgEl = cursorEl.querySelector('.cursor-bg');
  if (!cursorBgEl) return false;

  gsap.registerPlugin(Flip);

  gsap.set(cursorEl, { xPercent: -150, yPercent: -5 });

  const xTo = gsap.quickTo(cursorEl, 'x', { duration: 0.6, ease: 'power3' });
  const yTo = gsap.quickTo(cursorEl, 'y', { duration: 0.6, ease: 'power3' });

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

function magneticCursor() {
  if (!ensureCursorSetup()) return;

  bindMagneticTargets(document);
  bindDisappearZones(document);

  document.addEventListener('barba:afterEnter', (e) => {
    restoreCursorBg();
    // The old page's disappear zone may have left `.cursor` faded out and is
    // now gone with its container — its mouseleave will never fire. Force
    // visible so the cursor doesn't get stuck invisible after navigation.
    gsap.set(cursorEl, { autoAlpha: 1 });

    const container = e.detail?.container || document;
    bindMagneticTargets(container);
    bindDisappearZones(container);
  });
}

export default magneticCursor;
