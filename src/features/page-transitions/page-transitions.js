import { PRELOADER_ENABLED } from '../../config';

function initPageTransitions() {
  // ------------------------------------------
  // BARBA PAGE TRANSITION BOILERPLATE, by osmo
  // ------------------------------------------


  history.scrollRestoration = "manual";

  let lenis = null;
  let nextPage = document;
  let onceFunctionsInitialized = false;
  let isFirstEnter = true;

  let flipState = null;
  let flippedThumbnail = null;
  let savedBodyColor = null;

  const hasLenis = typeof window.Lenis !== "undefined";
  const hasScrollTrigger = typeof window.ScrollTrigger !== "undefined";

  const rmMQ = window.matchMedia("(prefers-reduced-motion: reduce)");
  let reducedMotion = rmMQ.matches;
  rmMQ.addEventListener?.("change", e => (reducedMotion = e.matches));
  rmMQ.addListener?.(e => (reducedMotion = e.matches));

  const has = (s) => !!nextPage.querySelector(s);

  let staggerDefault = 0.05;
  let durationDefault = 0.64;

  // Duration of the "exit" phase (text stagger out + wipe out) that plays
  // on the leaving page before the crossfade. The entering page delays its
  // fade-in by this amount so the order is: exit out → crossfade → reveal in.
  const EXIT_PHASE = .7;

  CustomEase.create("osmo", "0.625, 0.05, 0, 1");
  CustomEase.create("loader", "0.65, 0.01, 0.05, 0.99");
  CustomEase.create("spring_stiff", "M0,0 L0.025,0.026 L0.05,0.093 L0.075,0.185 L0.1,0.292 L0.125,0.403 L0.15,0.513 L0.175,0.615 L0.2,0.707 L0.225,0.788 L0.25,0.856 L0.275,0.912 L0.3,0.957 L0.325,0.991 L0.35,1.015 L0.375,1.032 L0.4,1.043 L0.425,1.048 L0.45,1.05 L0.475,1.049 L0.5,1.045 L0.525,1.041 L0.55,1.035 L0.575,1.03 L0.6,1.024 L0.625,1.019 L0.65,1.015 L0.675,1.011 L0.7,1.007 L0.725,1.004 L0.75,1.002 L0.775,1 L0.8,0.999 L0.825,0.998 L0.85,0.998 L0.875,0.998 L0.9,0.997 L0.925,0.998 L0.95,0.998 L0.975,0.998 L1,1")
  CustomEase.create("spring_slow", "M0,0 L0.013,0.005 L0.025,0.02 L0.037,0.042 L0.05,0.071 L0.063,0.105 L0.075,0.143 L0.087,0.183 L0.1,0.226 L0.113,0.27 L0.125,0.315 L0.138,0.36 L0.15,0.405 L0.163,0.449 L0.175,0.491 L0.188,0.533 L0.2,0.573 L0.212,0.611 L0.225,0.647 L0.237,0.681 L0.25,0.713 L0.263,0.744 L0.275,0.772 L0.287,0.798 L0.3,0.822 L0.313,0.845 L0.325,0.865 L0.338,0.884 L0.35,0.901 L0.362,0.916 L0.375,0.93 L0.388,0.943 L0.4,0.954 L0.412,0.964 L0.425,0.973 L0.438,0.98 L0.45,0.987 L0.463,0.993 L0.475,0.998 L0.487,1.002 L0.5,1.006 L0.512,1.009 L0.525,1.011 L0.537,1.013 L0.55,1.015 L0.563,1.016 L0.575,1.017 L0.588,1.017 L0.6,1.017 L0.613,1.017 L0.625,1.017 L0.637,1.017 L0.65,1.016 L0.662,1.016 L0.675,1.015 L0.688,1.015 L0.7,1.014 L0.713,1.013 L0.725,1.012 L0.738,1.012 L0.75,1.011 L0.762,1.01 L0.775,1.009 L0.787,1.009 L0.8,1.008 L0.813,1.007 L0.825,1.007 L0.838,1.006 L0.85,1.005 L0.863,1.005 L0.875,1.004 L0.887,1.004 L0.9,1.003 L0.912,1.003 L0.925,1.003 L0.938,1.002 L0.95,1.002 L0.963,1.002 L0.975,1.001 L0.988,1.001 L1,1")
  CustomEase.create("spring_molasses", "M0,0 L0.011,0.034 L0.023,0.092 L0.034,0.152 L0.045,0.209 L0.057,0.262 L0.068,0.311 L0.08,0.358 L0.091,0.401 L0.102,0.441 L0.114,0.479 L0.125,0.514 L0.136,0.546 L0.148,0.577 L0.159,0.605 L0.17,0.632 L0.182,0.657 L0.193,0.68 L0.205,0.701 L0.216,0.721 L0.227,0.74 L0.239,0.757 L0.25,0.774 L0.261,0.789 L0.273,0.803 L0.284,0.816 L0.295,0.829 L0.307,0.84 L0.318,0.851 L0.33,0.861 L0.341,0.87 L0.352,0.879 L0.364,0.887 L0.375,0.895 L0.386,0.902 L0.398,0.908 L0.409,0.915 L0.42,0.92 L0.432,0.926 L0.443,0.931 L0.455,0.935 L0.466,0.94 L0.477,0.944 L0.489,0.948 L0.5,0.951 L0.511,0.954 L0.523,0.957 L0.534,0.96 L0.545,0.963 L0.557,0.965 L0.568,0.968 L0.58,0.97 L0.591,0.972 L0.602,0.974 L0.614,0.976 L0.625,0.977 L0.636,0.979 L0.648,0.98 L0.659,0.982 L0.67,0.983 L0.682,0.984 L0.693,0.985 L0.705,0.986 L0.716,0.987 L0.727,0.988 L0.739,0.989 L0.75,0.989 L0.761,0.99 L0.773,0.991 L0.784,0.991 L0.795,0.992 L0.807,0.993 L0.818,0.993 L0.83,0.993 L0.841,0.994 L0.852,0.994 L0.864,0.995 L0.875,0.995 L0.886,0.995 L0.898,0.996 L0.909,0.996 L0.92,0.996 L0.932,0.997 L0.943,0.997 L0.955,0.997 L0.966,0.997 L0.977,0.997 L0.989,0.998 L1,1")
  gsap.defaults({ ease: "osmo", duration: durationDefault });



  // -----------------------------------------
  // FUNCTION REGISTRY
  // -----------------------------------------

  function initOnceFunctions() {
    initLenis();
    if (onceFunctionsInitialized) return;
    onceFunctionsInitialized = true;

    // Runs once on first load
    // if (has('[data-something]')) initSomething();
  }
  function initBeforeEnterFunctions(next) {
    nextPage = next || document;

    // Runs before the enter animation
    // if (has('[data-something]')) initSomething();
  }
  function dispatchPageVisible(container) {
    document.dispatchEvent(new CustomEvent('barba:pageVisible', { detail: { container } }));
  }

  function initAfterEnterFunctions(next) {
    nextPage = next || document;
    const scope = isFirstEnter ? document : nextPage;
    const skipFsReinit = isFirstEnter;
    isFirstEnter = false;

    dispatchPageVisible(scope);
    document.dispatchEvent(new CustomEvent('barba:afterEnter', { detail: { container: scope } }));

    // Runs after enter animation completes
    // if (has('[data-something]')) initSomething();
    // if (has('[data-overlap-slider-init]')) initOverlappingSlider();

    if (!skipFsReinit) reinitFsAttributes();

    if (lenis) {
      lenis.resize();
    }

    if (hasScrollTrigger) {
      ScrollTrigger.refresh();
    }
  }


  // -----------------------------------------
  // SECTION & ELEMENT REVEALS
  // -----------------------------------------

  const radialStops = Array.from({ length: 17 }, (_, i) => {
    const t = i / 16;
    return { a: (t * t * (3 - 2 * t)).toFixed(3), d: t * 50 };
  });
  const textRevealConfig = {
    lines: { duration: 0.8, stagger: 0.08 },
    words: { duration: 0.6, stagger: 0.06 },
    chars: { duration: 0.4, stagger: 0.01 }
  };
  const textRevealTypeMap = {
    'stagger-lines': 'lines',
    'stagger-words': 'words',
    'stagger-chars': 'chars'
  };

  function addSectionReveal(tl, next, position) {
    const overlay = next.querySelector('[data-reveal-section]');
    if (!overlay) return;

    const type = overlay.getAttribute('data-reveal-section');

    if (type === "radial") {
      const siblings = [...overlay.parentElement.children].filter(el => el !== overlay);
      const setMask = (v) => { overlay.style.maskImage = overlay.style.webkitMaskImage = v; };

      tl.set(overlay, { autoAlpha: 1 }, position);
      tl.fromTo(siblings, { filter: "blur(12px)" }, { filter: "blur(0px)", duration: 1.2, ease: "power2.out" }, position + "+=0.2");
      tl.to({ size: 0 }, {
        size: 150, duration: 1.8, ease: "easeOut",
        onUpdate() {
          const s = this.targets()[0].size;
          setMask(`radial-gradient(ellipse, transparent ${s}%, ${radialStops.map(({ a, d }) => `rgba(0,0,0,${a}) ${(s + d).toFixed(1)}%`).join(",")})`);
        },
        onComplete() {
          gsap.set(overlay, { autoAlpha: 0 });
          setMask("");
        }
      }, position);
    }
  }

  function addTextReveals(tl, next, position) {
    const elements = next.querySelectorAll('[data-reveal-text]');
    if (!elements.length) return;

    elements.forEach((el, i) => {
      const type = textRevealTypeMap[el.getAttribute('data-reveal-text')] || 'lines';
      const typesToSplit =
        type === 'lines' ? 'lines' :
          type === 'words' ? 'lines, words' :
            'lines, words, chars';
      const config = textRevealConfig[type];

      const split = SplitText.create(el, {
        type: typesToSplit,
        mask: 'lines',
        linesClass: 'line',
        wordsClass: 'word',
        charsClass: 'char'
      });

      gsap.set(split.lines, { paddingBottom: '0.15em', marginBottom: '-0.15em' });
      gsap.set(el, { autoAlpha: 1 });
      tl.from(split[type], {
        yPercent: 110,
        duration: config.duration,
        stagger: config.stagger,
        ease: 'expo.out',
        delay: i * 0.05
      }, position);
    });
  }

  function addElementReveals(tl, next, position) {
    const elements = next.querySelectorAll('[data-reveal-element]');
    if (!elements.length) return;

    gsap.set(elements, { autoAlpha: 0, yPercent: 12.5 });
    tl.to(elements, {
      autoAlpha: 1,
      yPercent: 0,
      stagger: 0.15,
      duration: 1.5,
      ease: 'loader'
    }, position);
  }

  // Wipe IN — graphic elements grow from 0% width to their natural width.
  function addFadeReveals(tl, next, position) {
    const elements = next.querySelectorAll('[data-reveal-fade]');
    if (!elements.length) return;

    tl.from(elements, {
      // xPercent: -100,
      opacity: 0,
      duration: 0.9,
      stagger: 0.1,
      ease: 'osmo',
      clearProps: 'width'
    }, position);
  }
  // Wipe IN — graphic elements grow from 0% width to their natural width.
  function addWipeReveals(tl, next, position) {
    const elements = next.querySelectorAll('[data-reveal-wipe]');
    if (!elements.length) return;

    tl.from(elements, {
      // xPercent: -100,
      width: 0,
      duration: 0.9,
      stagger: 0.1,
      ease: 'osmo',
      clearProps: 'width'
    }, position);
  }

  // -----------------------------------------
  // ELEMENT EXITS (leaving page, before crossfade)
  // -----------------------------------------

  // Text staggers OUT downward, masked per line.
  function addTextExits(tl, current, position) {
    const elements = current.querySelectorAll('[data-exit-text]');
    if (!elements.length) return;

    elements.forEach((el, i) => {
      const type = textRevealTypeMap[el.getAttribute('data-exit-text')] || 'lines';
      const typesToSplit =
        type === 'lines' ? 'lines' :
          type === 'words' ? 'lines, words' :
            'lines, words, chars';
      const config = textRevealConfig[type];

      const split = SplitText.create(el, {
        type: typesToSplit,
        mask: 'lines',
        linesClass: 'line',
        wordsClass: 'word',
        charsClass: 'char'
      });

      gsap.set(split.lines, { paddingBottom: '0.15em', marginBottom: '-0.15em' });
      tl.to(split[type], {
        yPercent: 110,
        duration: config.duration,
        stagger: config.stagger,
        ease: 'expo.in'
      }, position + "+=" + (i * 0.05));
    });
  }

  // Wipe OUT — element width collapses to 0%.
  function addWipeExits(tl, current, position) {
    const elements = current.querySelectorAll('[data-exit-wipe]');
    if (!elements.length) return;

    gsap.set(elements, { clipPath: "inset(0 0 0 0)" });

    tl.to(elements, {
      clipPath: "inset(0 0 0 100%)",
      xPercent: 50,
      duration: 1.4,
      stagger: 0.1,
      ease: 'osmo'
    }, position);
  }

  // -----------------------------------------
  // PAGE TRANSITIONS
  // -----------------------------------------

  function preloaderWndr(next) {
    const wrap = document.querySelector("[data-load-wrap]");
    const nav = document.querySelector("[data-nav]");
    const navLogo = document.querySelector("[data-nav-logo]");
    const navItems = nav ? Array.from(nav.querySelectorAll("[data-nav-link]")) : [];

    // The four logo letters (W N D R) live inside the nav logo.
    const W = navLogo && navLogo.querySelector('[data-letter="w"]');
    const N = navLogo && navLogo.querySelector('[data-letter="n"]');
    const D = navLogo && navLogo.querySelector('[data-letter="d"]');
    const R = navLogo && navLogo.querySelector('[data-letter="r"]');

    // No loader / no letters / reduced motion → just reveal the page.
    if (!wrap || !nav || reducedMotion || !(W && N && D && R)) return skipPreloader(next);

    const bg = wrap.querySelector("[data-load-bg]");

    // Starting corner for each letter (offset from its assembled home). Tunable.
    const corner_hidden = {
      w: { x: "-5vw", y: "-23vh" }, // top-left
      n: { x: "83vw", y: "0vh" }, // top-right 73vw voor eerste reveal
      d: { x: "-39vw", y: "77vh" }, // bottom-left -27vw voor eerste reveal
      r: { x: "51vw", y: "100vh" }, // bottom-right  77vh voor eerste reveal
    };
    const corner_revealed = {
      w: { x: "0vw", y: "0vh" }, // top-left
      n: { x: "73vw", y: "0vh" }, // top-right 73vw voor eerste reveal
      d: { x: "-27vw", y: "77vh" }, // bottom-left -27vw voor eerste reveal
      r: { x: "51vw", y: "77vh" }, // bottom-right  77vh voor eerste reveal
    };

    const tl = gsap.timeline({ defaults: { ease: "spring_slow", duration: 1 } });

    tl.set(wrap, { display: "block" })
      .set(bg, { autoAlpha: 1, yPercent: 0 })
      // Lift the nav above the loader so the (in-nav) logo letters show over the
      // white loader bg. Blend stays on → white letters read black.
      .set(nav, { zIndex: 150 });

    if (navItems.length) tl.set(navItems, { autoAlpha: 0 }); // hide links during

    // Reveal order (drives the stagger).
    const seq = [
      { el: W, key: "w" },
      { el: N, key: "n" },
      { el: R, key: "r" },
      { el: D, key: "d" },
    ];
    const els = seq.map((s) => s.el);

    tl // Each letter waits just outside the viewport…
      .set(els, {
        x: (i) => corner_hidden[seq[i].key].x,
        y: (i) => corner_hidden[seq[i].key].y,
      })
      // …the white FOUC cover fades away before the letters fly in.
      .to(bg, { autoAlpha: 0, duration: 0.6 })
      // …then each letter slides to its revealed spot with a tight stagger.
      .to(els, {
        x: (i) => corner_revealed[seq[i].key].x,
        y: (i) => corner_revealed[seq[i].key].y,
        duration: 0.6,
        stagger: 0.06,
        ease: "spring_stiff"
      })
      // Assemble into the wordmark:
      // 1) N slides left to join W
      .to(N, { x: 0, duration: 0.7 })
      // 2) D slides left, R rises — together
      .to(D, { x: 0, duration: 0.7 }, "<0.25")
      .to(R, { y: 0, duration: 0.8 }, "<")
      // 3) D rises, R slides left — together → all home
      .to(D, { y: 0, duration: 0.8, ease: "spring_molasses" }, "<.7")
      .to(R, { x: 0, duration: 0.7, ease: "spring_molasses" }, "<.7")
      // Hold, then reveal the page.
      .addLabel("reveal", "+=.3")
      // Restore the nav to its normal (blended, un-indexed) state.
      .set(nav, { clearProps: "zIndex" }, "reveal")
      .set([W, N, D, R], { clearProps: "transform" }, "reveal")
      .call(() => dispatchPageVisible(next), null, "reveal")
      .set(wrap, { display: "none" });

    // Once the preloader is done, run the page reveals.
    addWipeReveals(tl, next, "reveal");

    // …and stagger the nav links in.
    if (navItems.length) {
      tl.fromTo(
        navItems,
        { autoAlpha: 0, yPercent: 40 },
        { autoAlpha: 1, yPercent: 0, duration: 0.6, stagger: 0.08, ease: "expo.out", clearProps: "all" },
        "reveal"
      );
    }

    tl.call(() => resetPage(next), null, 0);

    return tl;
  }
  function runLogoPreloaderFast(next) {
    // -----------VARIABLES--------------
    const wrap = document.querySelector("[data-load-wrap]");

    const container = wrap.querySelector("[data-load-container]");
    const bg = wrap.querySelector("[data-load-bg]");
    const progressBar = wrap.querySelector("[data-load-progress]");
    const progressBars = Array.from(wrap.querySelectorAll("[data-load-progress]"));
    const logo = wrap.querySelector("[data-load-logo]");
    const textElements = Array.from(wrap.querySelectorAll("[data-load-text]"));

    // Reset targets that are * not * split text targets
    const resetTargets = Array.from(
      wrap.querySelectorAll('[data-load-reset]:not([data-load-text])')
    );
    // ------------var_end---------------
    // -----------TIMELINE---------------

    // Main loader timeline
    const loadTimeline = gsap.timeline({
      defaults: {
        ease: "loader",
        duration: .5
      }
    })
      .set(wrap, { display: "block" })
      // .to(progressBars, { scaleX: 1 })
      .to(logo, { clipPath: "inset(0% 0% 0% 0%)" }, "<")
      .to(container, { autoAlpha: 0, duration: .5 })
      // .to(progressBars, { scaleX: 0, transformOrigin: "right center", duration: 0.5 }, "<")
      .add("hideContent", "<")
      // .to(bg, { yPercent: -101, duration: 1 }, "hideContent")
      .to(bg, { autoAlpha: 0, duration: .5 }, "hideContent")
      .set(wrap, { display: "none" });

    // If there are items to hide FOUC for, reset them at the start
    if (resetTargets.length) {
      loadTimeline.set(resetTargets, { autoAlpha: 1 }, 0);
    }

    // If there's text items, split them, and add to load timeline
    if (textElements.length >= 2) {
      const firstWord = new SplitText(textElements[0], { type: "lines,chars", mask: "lines" });
      const secondWord = new SplitText(textElements[1], { type: "lines,chars", mask: "lines" });

      gsap.set([firstWord.chars, secondWord.chars], { autoAlpha: 0, yPercent: 125 });
      gsap.set(textElements, { autoAlpha: 1 });

      // "( 0% )" stagger in
      loadTimeline.to(firstWord.chars, {
        autoAlpha: 1,
        yPercent: 0,
        duration: 0.6,
        stagger: { each: 0.02 }
      }, 0);

      // revert split, count, then re-split and transition to second text
      loadTimeline.call(() => {
        firstWord.revert();
        gsap.to({ val: 0 }, {
          val: 100,
          duration: 1,
          snap: { val: 100 / 6 },
          ease: "none",
          onUpdate() {
            textElements[0].textContent = "( " + Math.round(this.targets()[0].val) + "% )";
          },
          onComplete() {
            const exitSplit = new SplitText(textElements[0], { type: "lines,chars", mask: "lines" });
            gsap.timeline({ delay: 0.4 })
              .to(exitSplit.chars, {
                autoAlpha: 0,
                yPercent: -125,
                duration: 0.4,
                stagger: { each: 0.02 }
              }, 0)
              .to(secondWord.chars, {
                autoAlpha: 1,
                yPercent: 0,
                duration: 0.6,
                stagger: { each: 0.02 }
              }, 0);
          }
        });
      }, null, ">");

      // second text out
      loadTimeline.to(secondWord.chars, {
        autoAlpha: 0,
        yPercent: -125,
        duration: 0.4,
        stagger: { each: 0.02 }
      }, "hideContent-=0.5");
    }

    loadTimeline.call(() => dispatchPageVisible(next), null, "hideContent");
    addSectionReveal(loadTimeline, next, "hideContent-=.05");
    addTextReveals(loadTimeline, next, "hideContent+=0.3");
    addElementReveals(loadTimeline, next, "hideContent+=0.6");


    // ------------tl_end----------------

    loadTimeline.call(() => {
      resetPage(next)
    }, null, 0);

    return loadTimeline;
  }

  function skipPreloader(next) {
    const wrap = document.querySelector("[data-load-wrap]");
    if (wrap) {
      const resetTargets = Array.from(
        wrap.querySelectorAll('[data-load-reset]:not([data-load-text])')
      );
      if (resetTargets.length) {
        gsap.set(resetTargets, { autoAlpha: 1 });
      }
      gsap.set(wrap, { display: "none" });
    }

    dispatchPageVisible(next);
    resetPage(next);
    return Promise.resolve();
  }

  function runPreloader(next) {
    if (!PRELOADER_ENABLED) return skipPreloader(next);
    return preloaderWndr(next);
  }

  function runPageEnterSelf(next) {
    // -----------VARIABLES--------------

    // ------------var_end---------------

    const tl = gsap.timeline();

    if (reducedMotion) {
      // Immediate swap behavior if user prefers reduced motion
      tl.set(next, { autoAlpha: 1 });
      tl.add("pageReady")
      tl.call(resetPage, [next], "pageReady");
      return new Promise(resolve => tl.call(resolve, null, "pageReady"));
    }

    // -----------TIMELINE---------------
    // Keep the entering page hidden while the leaving page plays its exit.
    tl.set(next, { autoAlpha: 0 }, 0);

    //gsap marker: marks the start of the animation (after the exit phase)
    tl.add("startEnter", EXIT_PHASE);

    tl.fromTo(next, {
      autoAlpha: 0,
    }, {
      autoAlpha: 1,
    }, "startEnter");

    tl.call(() => dispatchPageVisible(next), null, "startEnter");

    //gsap marker: marks the end of the animation
    tl.add("pageReady");

    addSectionReveal(tl, next, "pageReady-=0.6");
    addTextReveals(tl, next, "pageReady+=0.2");
    addElementReveals(tl, next, "pageReady+=0.2");
    addWipeReveals(tl, next, "pageReady+=0.2");
    // ------------tl_end----------------

    tl.call(resetPage, [next], "pageReady=+.2");

    return new Promise(resolve => {
      tl.call(resolve, null, "pageReady");
    });
  }


  function pageLeaveCrossFade(current, next) {
    // -----------VARIABLES--------------

    // ------------var_end---------------

    document.dispatchEvent(new CustomEvent("navbar:close"));

    const tl = gsap.timeline({
      onComplete: () => { current.remove() }
    });

    if (reducedMotion) {
      // Immediate swap behavior if user prefers reduced motion
      return tl.set(current, { autoAlpha: 0 });
    }

    // -----------TIMELINE---------------

    // Exit phase: text staggers out + graphics wipe away, then fade out.
    addTextExits(tl, current, 0);
    addWipeExits(tl, current, 0);

    tl.to(current, {
      autoAlpha: 0,
      duration: .6
    }, EXIT_PHASE);

    // ------------tl_end----------------
    return tl;
  }

  function pageEnterCrossFade(next) {
    // -----------VARIABLES--------------

    // ------------var_end---------------

    const tl = gsap.timeline();

    if (reducedMotion) {
      // Immediate swap behavior if user prefers reduced motion
      tl.set(next, { autoAlpha: 1 });
      tl.add("pageReady")
      tl.call(resetPage, [next], "pageReady");
      return new Promise(resolve => tl.call(resolve, null, "pageReady"));
    }

    // -----------TIMELINE---------------
    // Keep the entering page hidden while the leaving page plays its exit.
    tl.set(next, { autoAlpha: 0 }, 0);

    //gsap marker: marks the start of the animation (after the exit phase)
    tl.add("startEnter", EXIT_PHASE);

    tl.fromTo(next, {
      autoAlpha: 0,
    }, {
      autoAlpha: 1,
    }, "startEnter");

    tl.call(() => dispatchPageVisible(next), null, "startEnter");

    //gsap marker: marks the end of the animation
    tl.add("pageReady");

    addSectionReveal(tl, next, "pageReady+=0.05");
    addTextReveals(tl, next, "pageReady+=0.2");
    addElementReveals(tl, next, "pageReady+=0.2");
    addWipeReveals(tl, next, "pageReady+=0.2");
    addFadeReveals(tl, next, "pageReady+=0.2");
    // ------------tl_end----------------

    tl.call(resetPage, [next], "pageReady=+0.2");

    return new Promise(resolve => {
      tl.call(resolve, null, "pageReady");
    });
  }

  function pageLeaveParallaxOver(current, next) {
    // -----------VARIABLES--------------
    const transitionWrap = document.querySelector("[data-transition-wrap]");
    const transitionDark = transitionWrap.querySelector("[data-transition-dark]");
    CustomEase.create("parallax", "0.7, 0.05, 0.13, 1");
    // ------------var_end---------------

    const tl = gsap.timeline({
      onComplete: () => { current.remove() }
    });

    if (reducedMotion) {
      // Immediate swap behavior if user prefers reduced motion
      return tl.set(current, { autoAlpha: 0 });
    }

    // -----------TIMELINE---------------

    tl.set(transitionWrap, {
      zIndex: 2
    })

    tl.fromTo(transitionDark, {
      autoAlpha: 0,
    }, {
      autoAlpha: .8,
      duration: 1.2,
      ease: "parallax"
    }, 0)

    tl.fromTo(current, {
      y: "0vh",
    },
      {
        y: "-25vh",
        duration: 1.2,
        ease: "parallax"
      }, 0);

    tl.set(transitionDark, {
      autoAlpha: 0,
    })
    // ------------tl_end----------------
    return tl;
  }

  function pageEnterParallaxOver(next) {
    // -----------VARIABLES--------------

    // ------------var_end---------------

    const tl = gsap.timeline();

    if (reducedMotion) {
      // Immediate swap behavior if user prefers reduced motion
      tl.set(next, { autoAlpha: 1 });
      tl.add("pageReady")
      tl.call(resetPage, [next], "pageReady");
      return new Promise(resolve => tl.call(resolve, null, "pageReady"));
    }

    // -----------TIMELINE---------------
    //gsap marker: marks the start of the animation
    tl.add("startEnter", 0);

    tl.set(next, {
      zIndex: 3,
    });

    tl.fromTo(next, {
      y: "100vh",
    }, {
      y: "0vh",
      duration: 1.2,
      clearProps: "all",
      ease: "parallax"
    }, "startEnter");

    tl.call(() => dispatchPageVisible(next), null, "startEnter");

    //gsap marker: marks the end of the animation
    tl.add("pageReady");

    addSectionReveal(tl, next, "startEnter-=-5");
    addTextReveals(tl, next, "pageReady-=0");
    addElementReveals(tl, next, "pageReady-=0");
    // ------------tl_end----------------

    tl.call(resetPage, [next], "pageReady");

    return new Promise(resolve => {
      tl.call(resolve, null, "pageReady");
    });
  }

  function leaveItemToDetailTransition(current, next, trigger) {
    const clicked = trigger.closest("[data-pagetransition-trigger]");
    if (!clicked) return pageLeaveCrossFade(current, next);

    // -----------VARIABLES--------------
    const thumbnail = clicked.querySelector("[data-pagetransition-target]");
    const nextBody = next.ownerDocument.body;

    flipState = Flip.getState(thumbnail);
    flippedThumbnail = thumbnail;

    // ------------var_end---------------

    const tl = gsap.timeline({
      onComplete: () => { current.remove() }
    });

    if (reducedMotion) {
      // Immediate swap behavior if user prefers reduced motion
      return tl.set(current, { autoAlpha: 0 });
    }

    // -----------TIMELINE---------------
    tl.to(current, {
      autoAlpha: 0,
      duration: .6
    }, 0);

    // ------------tl_end----------------

    return tl;
  }

  function enterDetailFromItemTransition(next) {
    if (!flipState || !flippedThumbnail) return pageEnterCrossFade(next);

    console.log(next);

    // -----------VARIABLES--------------
    const nextHero = next.querySelector("section"); // or nextBody, nextMain,... depending on what you want to target
    const nextBody = next.ownerDocument.body;
    nextBody.style.removeProperty('background-color');
    const nextBodyColor = getComputedStyle(nextBody).backgroundColor;
    nextBody.style.backgroundColor = savedBodyColor;

    // ------------var_end---------------

    next.style.backgroundColor = 'transparent';

    const tl = gsap.timeline();

    if (reducedMotion) {
      // Immediate swap behavior if user prefers reduced motion
      tl.set(next, { autoAlpha: 1 });
      tl.add("pageReady")
      tl.call(resetPage, [next], "pageReady");
      return new Promise(resolve => tl.call(resolve, null, "pageReady"));
    }

    const placeholder = next.querySelector("[data-pagetransition-target]");
    placeholder.parentNode.insertBefore(flippedThumbnail, placeholder);
    placeholder.remove();

    // -----------TIMELINE---------------
    //gsap marker: marks the start of the animation
    tl.add("startEnter", .6);

    tl.add(Flip.from(flipState, {
    }), "startEnter");

    tl.fromTo(nextBody, {
      backgroundColor: savedBodyColor,
    }, {
      backgroundColor: nextBodyColor,
    }, "startEnter");


    //gsap marker: marks the end of the animation
    tl.add("pageReady");

    addSectionReveal(tl, next, "pageReady+=0.05");
    addTextReveals(tl, next, "pageReady+=0.1.5");
    addElementReveals(tl, next, "pageReady+=0.2");
    // ------------tl_end----------------


    tl.call(resetPage, [next], "pageReady");
    tl.call(() => {
      flippedThumbnail = null;
      flipState = null;
      savedBodyColor = null;
      gsap.set(nextBody, { clearProps: "backgroundColor" });
      next.style.removeProperty('background-color');
    })

    return new Promise(resolve => {
      tl.call(resolve, null, "pageReady");
    });
  }
  // -----------------------------------------
  // BARBA HOOKS + INIT
  // -----------------------------------------

  let leavingContainer = null;
  let savedScrollY = 0;

  barba.hooks.beforeEnter(data => {
    if (lenis) lenis.stop();
    savedScrollY = window.scrollY || 0;

    leavingContainer = data.current?.container !== data.next?.container
      ? data.current?.container
      : null;

    // Freeze scroll-driven (scrubbed) animations on the leaving page BEFORE we
    // reset the scroll position below.
    if (hasScrollTrigger && leavingContainer) {
      ScrollTrigger.getAll().forEach(st => {
        if (st.trigger && leavingContainer.contains(st.trigger)) {
          st.disable(false);
        }
      });
    }

    // Pin old container at its current visual position
    if (leavingContainer) {
      const oldTop = leavingContainer.getBoundingClientRect().top;
      gsap.set(leavingContainer, {
        position: "fixed",
        top: oldTop,
        left: 0,
        right: 0,
      });
    }

    // Scroll to 0 — invisible because old container is now pinned
    window.scrollTo(0, 0);

    // Shift banner/nav up so they stay in their "scrolled-away" position visually
    const banner = document.querySelector('.banner_component');
    const nav = document.querySelector('.mega-nav');
    const bannerH = banner?.offsetHeight || 0;
    const shift = Math.min(savedScrollY, bannerH);
    if (shift > 0) {
      gsap.set([banner, nav].filter(Boolean), { y: -shift });
    }

    // navBottom now reflects the visual position (with banner/nav shifted)
    const navBottom = nav?.getBoundingClientRect().bottom || 0;

    gsap.set(data.next.container, {
      position: "fixed",
      top: navBottom,
      left: 0,
      right: 0,
    });

    initBeforeEnterFunctions(data.next.container);
    applyThemeFrom(data.next.container);
  });

  barba.hooks.afterLeave(() => {
    if (hasScrollTrigger) {
      ScrollTrigger.getAll().forEach(trigger => trigger.kill());
    }
  });

  barba.hooks.enter(data => {
    initBarbaNavUpdate(data);
  })

  barba.hooks.afterEnter(data => {
    // Run page functions
    initAfterEnterFunctions(data.next.container);

    // Settle
    if (lenis) {
      lenis.resize();
      lenis.start();
    }

    if (hasScrollTrigger) {
      ScrollTrigger.refresh();
    }
  });

  barba.init({
    debug: false, // Set to 'false' in production
    timeout: 7000,
    preventRunning: true,
    prevent: ({ el }) => {
      if (el?.hash && el.pathname.replace(/\/$/, '') === window.location.pathname.replace(/\/$/, '')) return true;
      return !!el?.closest('[fs-cmsfilter-clear], [fs-cmsfilter-element], [fs-cmssort-element], [fs-cmsfilter-field], [fs-list-element], [fs-list-field], [fs-list-value], .w-pagination-next, .w-pagination-previous, .w-pagination-wrapper, [fs-consent-element]');
    },
    transitions: [
      { //item to detail page
        name: "item to detail page",
        sync: true,
        from: { namespace: ["page-b"] },
        to: { namespace: ["page-c"] },
        custom: ({ trigger }) => trigger.hasAttribute("data-pagetransition-trigger"),

        beforeLeave(data) {
          savedBodyColor = getComputedStyle(data.current.container).backgroundColor;
          document.body.style.backgroundColor = savedBodyColor;
        },

        // Current page leaves
        async leave(data) {
          return leaveItemToDetailTransition(data.current.container, data.next.container, data.trigger);
        },

        // New page enters
        async enter(data) {
          return enterDetailFromItemTransition(data.next.container);
        }
      },
      { //crossfade
        name: "crossfade",
        custom: () => true,
        sync: true,

        // First load
        async once(data) {
          initOnceFunctions();

          return runPreloader(data.next.container);
        },

        // Current page leaves
        async leave(data) {
          return pageLeaveCrossFade(data.current.container, data.next.container);
        },

        // New page enters
        async enter(data) {
          return pageEnterCrossFade(data.next.container);
        }
      },
      { //self
        name: "self",
        custom: () => true,
        sync: true,

        // First load
        async once(data) {
          initOnceFunctions();

          return runPreloader(data.next.container);
        },

        // Current page leaves
        async leave(data) {
          return pageLeaveCrossFade(data.current.container, data.next.container);
        },

        // New page enters
        async enter(data) {
          return runPageEnterSelf(data.next.container);
        }
      },
      { //parallax over
        name: "parallax over",
        custom: () => false,
        sync: true,

        // First load
        async once(data) {
          initOnceFunctions();

          return runPreloader(data.next.container);
        },

        // Current page leaves
        async leave(data) {
          return pageLeaveParallaxOver(data.current.container, data.next.container);
        },

        // New page enters
        async enter(data) {
          return pageEnterParallaxOver(data.next.container);
        }
      },

    ],
  });



  // -----------------------------------------
  // GENERIC + HELPERS
  // -----------------------------------------

  const themeConfig = {
    light: {
      nav: "dark",
      transition: "light"
    },
    dark: {
      nav: "light",
      transition: "dark"
    },
    red: {
      nav: "dark",
      transition: "light"
    }
  };

  function applyThemeFrom(container) {
    const pageTheme = container?.dataset?.pageTheme || "light";
    const config = themeConfig[pageTheme] || themeConfig.light;

    document.body.dataset.pageTheme = pageTheme;
    const transitionEl = document.querySelector('[data-theme-transition]');
    if (transitionEl) {
      transitionEl.dataset.themeTransition = config.transition;
    }

    const nav = document.querySelector('[data-theme-nav]');
    if (nav) {
      nav.dataset.themeNav = config.nav;
    }
  }

  function initLenis() {
    if (lenis) return; // already created
    if (!hasLenis) return;

    lenis = new Lenis({
      lerp: 0.165,
      wheelMultiplier: 1.25,
    });
    window.lenis = lenis;

    if (hasScrollTrigger) {
      lenis.on("scroll", ScrollTrigger.update);
    }

    gsap.ticker.add((time) => {
      lenis.raf(time * 1000);
    });

    gsap.ticker.lagSmoothing(0);
  }

  function resetPage(container) {
    const banner = document.querySelector('.banner_component');
    const nav = document.querySelector('.mega-nav');
    const bannerH = banner?.offsetHeight || 0;
    const navH = nav?.offsetHeight || 0;
    const shift = Math.min(savedScrollY, bannerH);

    function settle() {
      gsap.set(container, { clearProps: "position,top,left,right" });
      if (hasScrollTrigger) ScrollTrigger.refresh();
      if (lenis) {
        lenis.resize();
        lenis.start();
      }
    }

    if (shift > 1) {
      const targets = [banner, nav].filter(Boolean);
      const finalTop = bannerH + navH;

      gsap.to(targets, { y: 0, duration: 0.3 });
      gsap.to(container, {
        top: finalTop,
        duration: 0.3,
        onComplete() {
          gsap.set(targets, { clearProps: "transform" });
          settle();
        }
      });
    } else {
      settle();
    }
  }

  function debounceOnWidthChange(fn, ms) {
    let last = innerWidth,
      timer;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (innerWidth !== last) {
          last = innerWidth;
          fn.apply(this, args);
        }
      }, ms);
    };
  }

  function initBarbaNavUpdate(data) {
    var tpl = document.createElement('template');
    tpl.innerHTML = data.next.html.trim();
    var nextNodes = tpl.content.querySelectorAll('[data-barba-update]');
    var currentNodes = document.querySelectorAll('nav [data-barba-update]');

    currentNodes.forEach(function (curr, index) {
      var next = nextNodes[index];
      if (!next) return;

      // Aria-current sync
      var newStatus = next.getAttribute('aria-current');
      if (newStatus !== null) {
        curr.setAttribute('aria-current', newStatus);
      } else {
        curr.removeAttribute('aria-current');
      }

      // Class list sync
      var newClassList = next.getAttribute('class') || '';
      curr.setAttribute('class', newClassList);
    });
  }


  // -----------------------------------------
  // YOUR FUNCTIONS GO BELOW HERE
  // -----------------------------------------

  function reinitFsAttributes() {
    const FA = window.FinsweetAttributes;

    // Attributes v2
    if (FA?.modules) {
      Object.values(FA.modules).forEach(m => {
        try { m.restart?.(); } catch (_) { }
      });
      return;
    }

    // Attributes v1 fallback
    if (!window.fsAttributes) return;
    ['cmsfilter', 'cmssort', 'cmsload', 'cmsnest', 'cmsprevnext', 'cmsselect', 'toc'].forEach(attr => {
      window.fsAttributes.push([attr, () => window.fsAttributes[attr]?.init?.()]);
    });
  }

}

function pageTransitions() {
  initPageTransitions();
}

export default pageTransitions;