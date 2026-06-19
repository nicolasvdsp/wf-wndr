/**
 * Pushmotion Marquee
 * --------------------------------------------------
 * A horizontal carousel of sentences with a stationary logo anchor.
 *
 * Behaviour:
 *  - The "logo + active sentence" pair is always centred horizontally as a unit.
 *  - When a new sentence becomes active, the logo shifts to re-centre the new pair.
 *  - Items are positioned individually via per-item translateX, chained from the
 *    logo's edges (active = logo.right + gap, then chain outward in both directions
 *    with a normal flex gap between items). The previously-active sentence sits
 *    cleanly to the LEFT of the logo with the same gap.
 *  - Items are cloned (3 copies) for a seamless infinite loop.
 *  - Snappy ease: cubic-bezier(0.2, 0.9, 0.15, 1) — fast accel, quick settle.
 *  - Faded items go to 0.3 via a CSS transition tied to the .is-active class.
 *
 * Markup (typical):
 *   <div data-pushmotion-marquee>
 *     <div class="pushmotion-marquee_track">
 *       <div class="pushmotion-marquee_item">Sentence 1</div>
 *       ...
 *     </div>
 *     <div class="pushmotion-marquee_logo"><svg>...</svg></div>
 *   </div>
 *
 * Optional data attributes on the component:
 *   data-pushmotion-marquee-interval="4200"   // ms between advances
 *   data-pushmotion-marquee-duration="0.3"    // seconds per push (overrides snap-style default)
 *   data-pushmotion-marquee-gap="24"          // px between items (overrides flex column-gap)
 *   data-pushmotion-marquee-logo-gap="8"      // px between the logo and its adjacent items
 *                                             // (defaults to the inter-item gap)
 *   data-pushmotion-marquee-snap-style="1"    // "1" (snappy, default) | "2" (magnetic drift)
 */

const ACTIVE_CLASS = 'is-active';
const INIT_ATTR = 'data-pushmotion-marquee-initialized';

// Snap style presets. Each is a pairing of duration (s) + cubic-bezier control
// points that share the same character across the push tween and the opacity
// fade so the two read as one motion.
//   1 — "snappy"   : fast start, quick settle. Almost instant, but the user can
//                    still see a flicker of motion. Default.
//   2 — "magnetic" : flat-then-snap. The motion drifts left for the first third,
//                    then the middle of the curve carries it sharply into place.
//                    Reads as if the new sentence pulls the carousel along.
const SNAP_STYLES = {
  '1': { duration: 0.35, bezier: [0.2, 0.9, 0.15, 1] },
  '2': { duration: 0.35, bezier: [0.7, 0.0, 0.10, 1] },
};
const DEFAULT_SNAP_STYLE = '1';

function initPushmotionMarquee(container) {
  container = container || document;

  const components = container.querySelectorAll('[data-pushmotion-marquee]');
  if (!components.length) return;

  components.forEach(setupComponent);
}

function setupComponent(component) {
  if (component.hasAttribute(INIT_ATTR)) return;
  const gsap = window.gsap;
  if (!gsap) return;

  const track =
    component.querySelector('[data-pushmotion-marquee-track]') ||
    component.querySelector('.pushmotion-marquee_track');

  const logo =
    component.querySelector('[data-pushmotion-marquee-logo]') ||
    component.querySelector('.pushmotion-marquee_logo');

  if (!track || !logo) return;

  const originalItems = [...track.children].filter((el) =>
    el.matches('[data-pushmotion-marquee-item], .pushmotion-marquee_item')
  );
  if (originalItems.length < 2) return;

  component.setAttribute(INIT_ATTR, '');

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const intervalMs = parseInt(component.getAttribute('data-pushmotion-marquee-interval'), 10) || 4200;
  const gapAttr = parseFloat(component.getAttribute('data-pushmotion-marquee-gap'));
  const logoGapAttr = parseFloat(component.getAttribute('data-pushmotion-marquee-logo-gap'));

  // Snap style preset (curve + default duration). Falls back gracefully if the
  // attribute references an unknown style.
  const snapStyleKey = component.getAttribute('data-pushmotion-marquee-snap-style') || DEFAULT_SNAP_STYLE;
  const snapStyle = SNAP_STYLES[snapStyleKey] || SNAP_STYLES[DEFAULT_SNAP_STYLE];
  const durationOverride = parseFloat(component.getAttribute('data-pushmotion-marquee-duration'));
  const duration = Number.isFinite(durationOverride) ? durationOverride : snapStyle.duration;
  const pushEase = makeCubicBezier(...snapStyle.bezier);

  // Expose the same curve to the opacity fade transition so the visual rhythm
  // of the push and the fade match.
  component.style.setProperty(
    '--pushmotion-marquee-fade-ease',
    `cubic-bezier(${snapStyle.bezier.join(', ')})`
  );

  // Optional inter-item gap override. Set both `gap` and `column-gap` — Safari
  // often exposes flex row spacing on `gap` while Webflow / our earlier code
  // only wrote `column-gap`, which can leave `getComputedStyle(...).gap` at
  // `normal` and break our width/offset math.
  if (Number.isFinite(gapAttr)) {
    track.style.gap = `${gapAttr}px`;
    track.style.columnGap = `${gapAttr}px`;
  }

  // Triple the items so we always have a safe buffer on both sides.
  const originalCount = originalItems.length;
  for (let copy = 0; copy < 2; copy++) {
    originalItems.forEach((item) => {
      const clone = item.cloneNode(true);
      clone.setAttribute('aria-hidden', 'true');
      clone.classList.remove(ACTIVE_CLASS);
      track.appendChild(clone);
    });
  }

  const allItems = [...track.children];

  let widths = [];
  let naturalLefts = [];
  let gap = 0;
  let logoGap = 0;
  let logoWidth = 0;
  let compWidth = 0;
  let trackOffsetX = 0;
  let activeIndex = originalCount; // start in the middle copy
  let isAnimating = false;
  let autoplayTimer = null;
  let isVisible = true;

  function measure() {
    // GSAP `x` transforms move items visually but flex still lays out as if
    // x = 0. Safari + wrong `gap` parsing then desyncs `naturalLefts` from
    // reality and the "centre logo + active" math drifts (logo looks centred
    // alone, gaps look wrong). Zero transforms, force reflow, then measure from
    // actual geometry.
    gsap.set([logo, ...allItems], { x: 0 });
    void track.offsetHeight;

    const trackStyles = window.getComputedStyle(track);
    const parsedGap =
      parseFloat(trackStyles.gap)
      || parseFloat(trackStyles.columnGap)
      || parseFloat(trackStyles.rowGap)
      || 0;

    const compRect = component.getBoundingClientRect();
    compWidth = compRect.width;

    const trackRect = track.getBoundingClientRect();
    trackOffsetX = compRect.left - trackRect.left;

    widths = allItems.map((el) => el.getBoundingClientRect().width);

    naturalLefts = allItems.map((el) => el.getBoundingClientRect().left - trackRect.left);

    // Prefer the real pixel gap between the first two siblings (matches flex
    // layout in Safari/WebKit regardless of which longhand Webflow emitted).
    if (allItems.length >= 2) {
      const a = allItems[0].getBoundingClientRect();
      const b = allItems[1].getBoundingClientRect();
      const measured = Math.max(0, b.left - a.right);
      gap = measured > 0.5 ? measured : parsedGap;
    } else {
      gap = parsedGap;
    }

    logoGap = Number.isFinite(logoGapAttr) ? logoGapAttr : gap;

    const logoRect = logo.getBoundingClientRect();
    logoWidth = logoRect.width;

    if (logoWidth < 1) {
      logoWidth = logo.offsetWidth || logo.clientWidth || 0;
    }
    const svg = logo.querySelector('svg');
    if (svg && logoWidth < 1) {
      logoWidth = svg.getBoundingClientRect().width || 0;
    }
  }

  function computeTargets(activeIdx) {
    // Centre the (logo + active item) pair within the component.
    // The pair uses logoGap between the logo and the active item.
    const pairWidth = logoWidth + logoGap + widths[activeIdx];
    const logoLeft = (compWidth - pairWidth) / 2;
    const logoRight = logoLeft + logoWidth;

    const targets = new Array(allItems.length);

    // Active item: one logoGap to the right of the logo's right edge.
    targets[activeIdx] = logoRight + logoGap;

    // Items to the right chain forward with the regular inter-item gap.
    for (let i = activeIdx + 1; i < allItems.length; i++) {
      targets[i] = targets[i - 1] + widths[i - 1] + gap;
    }

    // Items to the left: every step uses the regular inter-item gap, including
    // the slot directly left of the logo. The tight logoGap is reserved for
    // the active side only — that's what makes (logo + active) read as one entity
    // while the left-hand sentence sits at the same rhythm as the rest.
    let prevLeft = logoLeft;
    for (let i = activeIdx - 1; i >= 0; i--) {
      targets[i] = prevLeft - gap - widths[i];
      prevLeft = targets[i];
    }

    return { logoLeft, targets };
  }

  function applyTargets(layout, animate) {
    const { logoLeft, targets } = layout;
    if (animate) {
      gsap.to(logo, { x: logoLeft, duration, ease: pushEase });
      allItems.forEach((el, i) => {
        gsap.to(el, {
          x: targets[i] - naturalLefts[i] + trackOffsetX,
          duration,
          ease: pushEase,
        });
      });
    } else {
      gsap.set(logo, { x: logoLeft });
      allItems.forEach((el, i) => {
        gsap.set(el, { x: targets[i] - naturalLefts[i] + trackOffsetX });
      });
    }
  }

  function applyActiveClass(index) {
    allItems.forEach((el, i) => {
      el.classList.toggle(ACTIVE_CLASS, i === index);
    });
  }

  function snapToActive() {
    applyTargets(computeTargets(activeIndex), false);
    component.classList.add('is-ready');
  }

  function advance() {
    if (isAnimating) return;
    const nextIndex = activeIndex + 1;
    if (nextIndex >= allItems.length) return;

    isAnimating = true;
    applyActiveClass(nextIndex);

    const nextLayout = computeTargets(nextIndex);

    if (prefersReducedMotion) {
      applyTargets(nextLayout, false);
      activeIndex = nextIndex;
      maybeRecycle();
      isAnimating = false;
      return;
    }

    applyTargets(nextLayout, true);

    // A single delayedCall handles the post-transition bookkeeping, so we
    // don't pay onComplete N times across N tweens.
    gsap.delayedCall(duration, () => {
      activeIndex = nextIndex;
      maybeRecycle();
      isAnimating = false;
    });
  }

  function maybeRecycle() {
    // After we leave the second copy, jump back to the equivalent slot
    // in the second copy. Items 0..N, N..2N, 2N..3N are content-identical,
    // so the resulting visual is unchanged even though every item's translateX
    // is reassigned.
    if (activeIndex >= originalCount * 2) {
      activeIndex -= originalCount;
      applyActiveClass(activeIndex);
      applyTargets(computeTargets(activeIndex), false);
    }
  }

  function startAutoplay() {
    stopAutoplay();
    if (allItems.length <= 1) return;
    autoplayTimer = setInterval(() => {
      if (!component.isConnected) {
        stopAutoplay();
        return;
      }
      if (!isVisible) return;
      advance();
    }, intervalMs);
  }

  function stopAutoplay() {
    if (autoplayTimer) {
      clearInterval(autoplayTimer);
      autoplayTimer = null;
    }
  }

  applyActiveClass(activeIndex);
  measure();
  snapToActive();

  // Re-measure once fonts are ready (text widths depend on the font).
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => {
      if (!component.isConnected) return;
      measure();
      snapToActive();
    });
  }

  // Re-measure after full load (SVGs, images, etc.).
  window.addEventListener('load', () => {
    if (!component.isConnected) return;
    measure();
    snapToActive();
  }, { once: true });

  // Resize: re-measure widths and re-anchor.
  let resizeTimer = null;
  const onResize = () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (!component.isConnected) {
        window.removeEventListener('resize', onResize);
        return;
      }
      measure();
      snapToActive();
    }, 150);
  };
  window.addEventListener('resize', onResize);

  // Pause when component is off-screen (saves work + avoids out-of-sync state).
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        isVisible = entry.isIntersecting;
      });
    }, { threshold: 0.01 });
    io.observe(component);
  }

  // Pause on hover for accessibility / readability.
  component.addEventListener('mouseenter', stopAutoplay);
  component.addEventListener('mouseleave', startAutoplay);

  startAutoplay();
}

// --- Cubic-bezier ease factory ---------------------------------------------
// Returns a function compatible with GSAP's `ease: (t) => number` signature.
function makeCubicBezier(x1, y1, x2, y2) {
  const bezier = (t, c1, c2) => {
    const it = 1 - t;
    return 3 * it * it * t * c1 + 3 * it * t * t * c2 + t * t * t;
  };
  const bezierD = (t, c1, c2) => {
    const it = 1 - t;
    return 3 * it * it * c1 + 6 * it * t * (c2 - c1) + 3 * t * t * (1 - c2);
  };

  return function ease(x) {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    // Newton-Raphson to find t such that bezier(t, x1, x2) === x.
    let t = x;
    for (let i = 0; i < 8; i++) {
      const dx = bezier(t, x1, x2) - x;
      const slope = bezierD(t, x1, x2);
      if (Math.abs(slope) < 1e-6) break;
      t -= dx / slope;
      if (t < 0) t = 0;
      if (t > 1) t = 1;
    }
    return bezier(t, y1, y2);
  };
}

function pushmotionMarquee() {
  // The marquee sits above the fold. Initialise it as soon as the DOM is ready
  // so it is fully positioned and already cycling by the time the preloader
  // overlay fades out — instead of popping in once `barba:afterEnter` fires.
  // The DOM, styles and window.gsap are all available from DOMContentLoaded.
  // setupComponent() has an INIT_ATTR guard so the later barba:afterEnter
  // listener is a no-op for this same container.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initPushmotionMarquee(document), { once: true });
  } else {
    initPushmotionMarquee(document);
  }

  document.addEventListener('barba:afterEnter', (e) => {
    initPushmotionMarquee(e.detail.container);
  });
}

export default pushmotionMarquee;
