/*
 * Radial Marquee
 *
 * Loops div items along a circular arc with each item rotated to the
 * path tangent. Items are cloned and distributed uniformly so the
 * loop is seamless and never overlaps.
 *
 * Markup
 *   <div data-radial-marquee-init …>
 *     <div data-radial-marquee-track>
 *       <!-- CMS Collection List items, or static children -->
 *     </div>
 *   </div>
 *
 * Attributes (all optional, all on the init wrap)
 *   data-radial-marquee-speed              Number, default 2 (≈100 px/s per step)
 *   data-radial-marquee-gap                Number, default 16 (px between items, hint)
 *   data-radial-marquee-radius             0–10. Omit for auto-fit (items emerge
 *                                          from / disappear into the bottom corners
 *                                          cleanly). Set to force a curvature.
 *   data-radial-marquee-padding            Number, override top padding
 *   data-radial-marquee-pause-on-hover     Flag, slow to stop on hover
 *   data-radial-marquee-hover-ease-duration Seconds, default 0.5
 *   data-radial-marquee-hover-ease         GSAP ease, default "power2.out"
 *   data-radial-marquee-ellipse            Flag, draw arc as a decorative stroke
 *   data-radial-marquee-ellipse-color      CSS color, default "currentColor"
 *   data-radial-marquee-ellipse-width      Number, default 1
 *   data-radial-marquee-ellipse-opacity    0–1, default 1
 *   data-radial-marquee-ellipse-dash       SVG dasharray (e.g. "4 6")
 *
 * Items source
 *   If any child has `data-radial-marquee-item`, only those are used.
 *   Otherwise direct children of the track. Works with Webflow CMS
 *   Collection Lists (place the track on `.w-dyn-items`).
 *
 * Requirements
 *   - GSAP must be loaded (`window.gsap`). Without it the marquee
 *     renders statically, no animation.
 *   - The wrap needs `overflow: hidden` and a defined height.
 *   - Honors `prefers-reduced-motion: reduce`.
 */

function initRadialDivMarquee(container) {
  container = container || document;

  const wraps = container.querySelectorAll('[data-radial-marquee-init]');
  if (!wraps.length) return;

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const prm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const gsap = window.gsap;

  const clamp = (n, a, b) => Math.min(b, Math.max(a, Number(n) || 0));

  const speedMul = () => {
    const w = window.innerWidth || 2000;
    const t = clamp((w - 250) / (2000 - 250), 0, 1);
    return 0.5 + t * (1 - 0.5);
  };

  // Viewport play/pause is instant; hover transitions the tween's timeScale
  // for a smooth slow-down / accelerate-back effect.
  const setViewportPlaying = (st, isInView) => {
    st.inView = isInView;
    if (!st.tw) return;
    if (prm) return st.tw.pause();
    isInView ? st.tw.play() : st.tw.pause();
  };

  const setHoverState = (st, isHovered) => {
    st.isHovered = isHovered;
    if (!st.tw || prm || !gsap || !st.pauseOnHover) return;
    if (st.tsTw) st.tsTw.kill();
    st.tsTw = gsap.to(st.tw, {
      timeScale: isHovered ? 0 : 1,
      duration: st.hoverEaseDuration,
      ease: st.hoverEase,
      overwrite: true,
    });
  };

  wraps.forEach((wrap) => {
    const track = wrap.querySelector('[data-radial-marquee-track]');
    if (!track) return;

    const explicitItems = track.querySelectorAll('[data-radial-marquee-item]');
    const sourceItems = explicitItems.length
      ? Array.from(explicitItems)
      : Array.from(track.children).filter((el) => el.nodeType === 1);

    if (!sourceItems.length) return;

    track.style.position = 'absolute';
    track.style.inset = '0';
    track.style.pointerEvents = 'none';
    sourceItems.forEach((el) => { el.style.display = 'none'; });

    if (getComputedStyle(wrap).position === 'static') {
      wrap.style.position = 'relative';
    }

    // SVG holds the measurement path and the optional decorative ellipse stroke.
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    Object.assign(svg.style, {
      position: 'absolute',
      top: '0',
      left: '0',
      overflow: 'visible',
      pointerEvents: 'none',
      display: 'block',
    });
    const measurePath = document.createElementNS(SVG_NS, 'path');
    measurePath.setAttribute('fill', 'none');
    measurePath.setAttribute('stroke', 'none');
    svg.appendChild(measurePath);

    const ellipsePath = document.createElementNS(SVG_NS, 'path');
    ellipsePath.setAttribute('fill', 'none');
    ellipsePath.setAttribute('stroke-linecap', 'round');
    svg.appendChild(ellipsePath);

    wrap.insertBefore(svg, wrap.firstChild);

    // Stage holds the positioned clones.
    const stage = document.createElement('div');
    Object.assign(stage.style, {
      position: 'absolute',
      inset: '0',
      pointerEvents: 'none',
      transformOrigin: '0 0',
    });
    wrap.appendChild(stage);

    const hoverEaseDurAttr = wrap.getAttribute('data-radial-marquee-hover-ease-duration');
    const hoverEaseAttr = wrap.getAttribute('data-radial-marquee-hover-ease');

    const st = {
      svg,
      measurePath,
      ellipsePath,
      stage,
      items: [],
      itemMeta: [],
      tw: null,
      tsTw: null,
      px: { x: 0 },
      raf: 0,
      inView: true,
      isHovered: false,
      pauseOnHover: wrap.hasAttribute('data-radial-marquee-pause-on-hover'),
      hoverEaseDuration: hoverEaseDurAttr != null ? clamp(hoverEaseDurAttr, 0, 10) : 0.5,
      hoverEase: hoverEaseAttr || 'power2.out',
    };

    new IntersectionObserver((entries) => {
      const isIn = !!(entries[0] && entries[0].isIntersecting);
      setViewportPlaying(st, isIn);
    }, { threshold: 0 }).observe(wrap);

    if (st.pauseOnHover) {
      wrap.addEventListener('mouseenter', () => setHoverState(st, true));
      wrap.addEventListener('mouseleave', () => setHoverState(st, false));
    }

    const measureItem = (el) => {
      const w = el.offsetWidth || el.getBoundingClientRect().width || 0;
      const h = el.offsetHeight || el.getBoundingClientRect().height || 0;
      return { w, h };
    };

    // Originals are display:none after init, so measure via off-screen clones.
    const measureSourceSizes = () => {
      const measureBox = document.createElement('div');
      measureBox.style.cssText = 'position:absolute;left:-99999px;top:-99999px;visibility:hidden;pointer-events:none;';
      sourceItems.forEach((src) => {
        const clone = src.cloneNode(true);
        clone.style.display = '';
        measureBox.appendChild(clone);
      });
      wrap.appendChild(measureBox);
      const sizes = Array.from(measureBox.children).map(measureItem);
      wrap.removeChild(measureBox);
      return sizes;
    };

    // Builds N clones cycling through source items, distributed evenly at
    // `pathLen / N` spacing so the loop is seamless and items never overlap.
    const buildItems = (sizes, nTotal) => {
      st.stage.textContent = '';
      st.items = [];
      st.itemMeta = [];

      const nMasters = sourceItems.length;
      const seq = [];
      for (let i = 0; i < nTotal; i++) {
        const idx = i % nMasters;
        const clone = sourceItems[idx].cloneNode(true);
        clone.style.display = '';
        clone.style.position = 'absolute';
        clone.style.top = '0';
        clone.style.left = '0';
        clone.style.transformOrigin = '50% 50%';
        clone.style.willChange = 'transform';
        clone.style.pointerEvents = 'auto';
        st.stage.appendChild(clone);
        seq.push({ el: clone, w: sizes[idx].w, h: sizes[idx].h });
      }
      st.items = seq.map((s) => s.el);
      st.itemMeta = seq;
    };

    const placeItems = (offsetPx, pathLen, spacing) => {
      if (!pathLen || !st.itemMeta.length) return;
      st.itemMeta.forEach((meta, i) => {
        const center = i * spacing - offsetPx;
        const wrapped = ((center % pathLen) + pathLen) % pathLen;

        const p1 = st.measurePath.getPointAtLength(wrapped);
        const ahead = Math.min(wrapped + 1, pathLen);
        const p2 = st.measurePath.getPointAtLength(ahead);
        const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x) * (180 / Math.PI);

        meta.el.style.transform =
          `translate(${p1.x - meta.w / 2}px, ${p1.y - meta.h / 2}px) rotate(${angle}deg)`;
      });
    };

    const rebuild = () => {
      const speed = clamp(wrap.getAttribute('data-radial-marquee-speed') || 2, 0.1, 200);
      const speedPx = Math.max(speed * 100 * speedMul(), 1);

      const gap = clamp(wrap.getAttribute('data-radial-marquee-gap') || 16, 0, 9999);

      const wrapW = Math.max(wrap.clientWidth || 1, 1);
      const wrapH = Math.max(wrap.clientHeight || 1, 1);

      const sizes = measureSourceSizes();
      const itemH = sizes.reduce((m, s) => Math.max(m, s.h), 0) || 0;
      const itemW = sizes.reduce((m, s) => Math.max(m, s.w), 0) || 0;
      const avgW = sizes.length
        ? sizes.reduce((sum, s) => sum + s.w, 0) / sizes.length
        : 0;

      const padAttr = wrap.getAttribute('data-radial-marquee-padding');
      const topPad = padAttr != null
        ? clamp(padAttr, 0, 9999)
        : itemH / 2 + 4;

      // Auto-fit when no radius attribute: arc dips so items have just
      // disappeared below the wrap at the horizontal edges. Explicit
      // radius forces the curvature (10 = tightest, 0 = flat).
      const halfWrap = wrapW / 2;
      const radiusAttr = wrap.getAttribute('data-radial-marquee-radius');
      const hasRadius = radiusAttr != null && radiusAttr !== '';

      let r = Infinity;
      if (!hasRadius) {
        const targetSag = Math.max(wrapH - topPad + itemH / 2, 1);
        r = (targetSag * targetSag + halfWrap * halfWrap) / (2 * targetSag);
      } else {
        const level01 = clamp(radiusAttr, 0, 10) / 10;
        if (level01 > 0.0001) {
          const inv = 1 - level01;
          r = halfWrap * (1.01 + inv * inv * 16.99);
        }
      }

      // Bleed extends the path past the wrap edges so items enter/exit
      // smoothly. Capped so the arc still spans the full path width.
      const requestedBleed = Math.max(wrapW * 0.15, Math.max(itemW, 80));
      let bleed = requestedBleed;
      if (r !== Infinity) {
        const maxBleed = Math.max(0, r - halfWrap - 1);
        bleed = Math.min(requestedBleed, maxBleed);
      }

      const w = wrapW + bleed * 2;
      const h = wrapH;
      const halfPath = w / 2;

      Object.assign(st.svg.style, { width: `${w}px`, height: `${h}px`, left: `${-bleed}px` });
      st.svg.setAttribute('width', w);
      st.svg.setAttribute('height', h);
      st.svg.setAttribute('viewBox', `0 0 ${w} ${h}`);

      Object.assign(st.stage.style, { width: `${w}px`, height: `${h}px`, left: `${-bleed}px` });

      let d;
      if (r === Infinity) {
        d = `M 0 ${topPad} L ${w} ${topPad}`;
      } else {
        const cy = topPad + r;
        const inside = Math.max(r * r - halfPath * halfPath, 0);
        const yEnd = cy - Math.sqrt(inside);
        d = `M 0 ${yEnd} A ${r} ${r} 0 0 1 ${w} ${yEnd}`;
      }
      st.measurePath.setAttribute('d', d);

      if (wrap.hasAttribute('data-radial-marquee-ellipse')) {
        const stroke = wrap.getAttribute('data-radial-marquee-ellipse-color') || 'currentColor';
        const strokeW = wrap.getAttribute('data-radial-marquee-ellipse-width') || '1';
        const dash = wrap.getAttribute('data-radial-marquee-ellipse-dash') || '';
        const opacity = wrap.getAttribute('data-radial-marquee-ellipse-opacity') || '1';

        st.ellipsePath.setAttribute('d', d);
        st.ellipsePath.setAttribute('stroke', stroke);
        st.ellipsePath.setAttribute('stroke-width', strokeW);
        st.ellipsePath.setAttribute('stroke-opacity', opacity);
        if (dash) st.ellipsePath.setAttribute('stroke-dasharray', dash);
        else st.ellipsePath.removeAttribute('stroke-dasharray');
      } else {
        st.ellipsePath.removeAttribute('d');
      }

      cancelAnimationFrame(st.raf);
      st.raf = requestAnimationFrame(() => {
        const pathLen = st.measurePath.getTotalLength
          ? st.measurePath.getTotalLength()
          : w;

        // Distribute items uniformly along the arc; ensure at least one
        // full master cycle so every CMS item appears.
        const naturalSpacing = Math.max(avgW + gap, 1);
        const nNatural = Math.max(1, Math.round(pathLen / naturalSpacing));
        const nTotal = Math.max(sourceItems.length, nNatural);
        const spacing = pathLen / nTotal;

        // Preserve fractional loop progress across rebuilds so a parent
        // resize (e.g. the mega-nav's `footer-bg` height animation when
        // switching panels) doesn't snap items back to offset 0 against the
        // new spacing — which reads as a visible "jump" of the marquee.
        // Drive this through the tween's start/end values (not `.progress()`
        // — that's unreliable on `repeat: -1` tweens because GSAP computes
        // `totalDuration * progress` with `totalDuration = Infinity`).
        const prevPathLen = st.pathLen || 0;
        const ratio = prevPathLen > 0
          ? (((st.px.x % prevPathLen) + prevPathLen) % prevPathLen) / prevPathLen
          : 0;
        const startX = ratio * pathLen;
        st.pathLen = pathLen;

        buildItems(sizes, nTotal);
        placeItems(startX, pathLen, spacing);

        if (st.tsTw) { st.tsTw.kill(); st.tsTw = null; }
        if (st.tw) st.tw.kill();
        st.tw = null;
        if (prm || !gsap) return;

        st.px.x = startX;
        st.tw = gsap.to(st.px, {
          x: startX + pathLen,
          duration: pathLen / speedPx,
          ease: 'none',
          repeat: -1,
          onUpdate: () => {
            const x = ((st.px.x % pathLen) + pathLen) % pathLen;
            placeItems(x, pathLen, spacing);
          },
        });

        // Avoid a full-speed flash if a rebuild happens mid-hover.
        if (st.pauseOnHover && st.isHovered) {
          st.tw.timeScale(0);
        }

        setViewportPlaying(st, st.inView);
      });
    };

    const schedule = (() => {
      let raf = 0;
      return () => {
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(rebuild);
      };
    })();

    rebuild();

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(schedule).catch(() => { });
    } else {
      setTimeout(schedule, 150);
    }

    if (window.ResizeObserver) {
      const ro = new ResizeObserver(schedule);
      ro.observe(wrap);
      sourceItems.forEach((el) => ro.observe(el));
    } else {
      window.addEventListener('resize', schedule);
    }
  });
}

function radialDivMarquee() {
  document.addEventListener('barba:afterEnter', (e) => {
    initRadialDivMarquee(e.detail.container);
  });
}

export default radialDivMarquee;
