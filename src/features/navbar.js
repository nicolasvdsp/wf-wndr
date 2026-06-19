function initMegaNavDirectionalHover() {
  const DUR = {
    bgMorph: 0.4,
    contentIn: 0.3,
    contentOut: 0.3,
    contentOutFast: 0.08,
    stagger: 0.25,
    backdropIn: 0.3,
    backdropOut: 0.3,
    openScale: 0.35,
    closeScale: 0.35,
  };

  const HOVER_ENTER = 120;
  const HOVER_LEAVE = 150;

  // DOM references
  const menuWrap = document.querySelector("[data-menu-wrap]");
  const navBar = menuWrap?.querySelector(".mega-nav__bar");
  const navList = document.querySelector("[data-nav-list]");
  const dropWrapper = document.querySelector("[data-dropdown-wrapper]");
  const dropContainer = document.querySelector("[data-dropdown-container]");
  const dropBg = document.querySelector("[data-dropdown-bg]");
  const footerBg = document.querySelector("[data-footer-bg]");
  const backdrop = document.querySelector("[data-menu-backdrop]");
  const toggles = [...document.querySelectorAll("[data-dropdown-toggle]")];
  const panels = [...document.querySelectorAll("[data-nav-content]")];
  const footers = [...document.querySelectorAll("[data-dropdown-footer]")];
  const burger = document.querySelector("[data-burger-toggle]");
  const backBtn = document.querySelector("[data-mobile-back]");
  const logo = document.querySelector("[data-menu-logo]");
  const [lineTop, lineMid, lineBot] = ["top", "mid", "bot"].map(
    (id) => document.querySelector(`[data-burger-line='${id}']`)
  );

  // Lenis attaches a `passive: false` wheel listener on `window` and calls
  // `preventDefault()` by default — even with `lenis.stop()` it can swallow
  // wheel/touch events before they reach the drawer's native scroll.
  // `data-lenis-prevent` is Lenis's documented opt-out: when set on the event
  // target's ancestor chain, Lenis lets the browser scroll the element
  // natively. Harmless on desktop (these aren't scroll containers there).
  [navList, dropWrapper, dropContainer, ...panels].forEach((el) => {
    if (el) el.setAttribute("data-lenis-prevent", "");
  });

  // State
  const state = {
    isOpen: false,
    activePanel: null,
    activePanelIndex: -1,
    isMobile: window.innerWidth <= 991,
    mobileMenuOpen: false,
    mobilePanelActive: null,
    hoverTimer: null,
    leaveTimer: null,
    tl: null,
    mobileTl: null,
    mobilePanelTl: null,
  };

  // Helpers
  const getPanel = (name) => document.querySelector(`[data-nav-content="${name}"]`);
  const getToggle = (name) => document.querySelector(`[data-dropdown-toggle="${name}"]`);
  const getFooter = (name) =>
    name ? document.querySelector(`[data-dropdown-footer="${name}"]`) : null;
  // Footers stack on top of each other inside `mega-nav__footer-bg`. The CSS
  // default is `pointer-events: none` so the inactive footer can't swallow
  // hovers/clicks. We promote only the active panel's footer to `auto` so
  // links inside it work and hovering it doesn't fall through to the layer
  // beneath (which can trigger an unintended close).
  const setActiveFooter = (name) => {
    footers.forEach((f) => {
      const active = name && f.getAttribute("data-dropdown-footer") === name;
      f.style.pointerEvents = active ? "auto" : "none";
    });
  };
  // Returns both the panel's own fade items AND the matching footer's items, so
  // every animation (open / close / switch) treats footer pieces exactly like
  // col items — same stagger, same directional slide.
  const getFade = (el) => {
    const name = el?.getAttribute?.("data-nav-content");
    const footer = getFooter(name);
    const panelItems = el ? [...el.querySelectorAll("[data-menu-fade]")] : [];
    const footerItems = footer ? [...footer.querySelectorAll("[data-menu-fade]")] : [];
    return [...panelItems, ...footerItems];
  };
  // Splits fade items by fade-OUT mode (the value of `data-menu-fade`):
  //   ""        / unset → "normal": existing autoAlpha + x/y tween.
  //   "instant"          → short, accelerated autoAlpha tween (DUR.contentOutFast).
  //   "down"             → slide down via yPercent, autoAlpha untouched.
  // The motion modes are useful for content that flickers when its opacity is
  // animated through intermediate values across rapid kill/reset cycles —
  // e.g. the radial marquee's images. `"instant"` shortens the fade window
  // enough that the kill/reset/retween glitch doesn't have time to register
  // visually, while `"down"` keeps the item fully opaque and lets the
  // `footer-bg`'s shrinking/morphing height clip it from the bottom —
  // giving exit motion without any opacity animation at all.
  // Fade-IN is unchanged for all modes: items still fade in normally.
  const splitFade = (items) => {
    const instant = [], down = [], normal = [];
    items.forEach((el) => {
      const mode = el.getAttribute("data-menu-fade");
      if (mode === "instant") instant.push(el);
      else if (mode === "down") down.push(el);
      else normal.push(el);
    });
    return { instant, down, normal };
  };
  const getNavItems = () => navList.querySelectorAll("[data-nav-list-item]");
  const getIndex = (name) => toggles.indexOf(getToggle(name));
  const stagger = (n) => (n <= 1 ? 0 : { amount: DUR.stagger });
  // Natural content height of a panel's footer. Returns 0 if the panel has no
  // footer (Resources).
  //
  // The footer is `position: absolute; inset: 0` inside a `footer-bg` that we
  // collapse to `height: 0`. Setting `footer-bg` to `height: auto` alone is
  // not enough: absolutely-positioned children don't contribute to a parent's
  // content size, so auto would resolve to 0. We also have to temporarily
  // promote the footer itself to `position: relative` so its content (e.g.
  // the radial marquee with aspect-ratio sizing) drives the layout.
  const measureFooter = (name) => {
    const f = getFooter(name);
    if (!f) return 0;
    if (!footerBg) return f.scrollHeight;

    const prevBgH = footerBg.style.height;
    const prevBgOverflow = footerBg.style.overflow;
    const prevPos = f.style.position;
    const prevTop = f.style.top;
    const prevRight = f.style.right;
    const prevBottom = f.style.bottom;
    const prevLeft = f.style.left;

    footerBg.style.height = "auto";
    footerBg.style.overflow = "visible";
    f.style.position = "relative";
    f.style.top = "auto";
    f.style.right = "auto";
    f.style.bottom = "auto";
    f.style.left = "auto";

    const h = f.offsetHeight;

    footerBg.style.height = prevBgH;
    footerBg.style.overflow = prevBgOverflow;
    f.style.position = prevPos;
    f.style.top = prevTop;
    f.style.right = prevRight;
    f.style.bottom = prevBottom;
    f.style.left = prevLeft;

    return h;
  };

  function clearTimers() {
    clearTimeout(state.hoverTimer);
    clearTimeout(state.leaveTimer);
    state.hoverTimer = state.leaveTimer = null;
  }

  function killTl(key) {
    if (state[key]) { state[key].kill(); state[key] = null; }
  }

  function killDropdown() {
    killTl("tl");
    gsap.killTweensOf(dropContainer);
    if (footerBg) gsap.killTweensOf(footerBg);
    gsap.killTweensOf(backdrop);
    panels.forEach((p) => { gsap.killTweensOf(p); gsap.killTweensOf(getFade(p)); });
  }

  function killMobile() {
    killTl("mobileTl");
    gsap.killTweensOf([navList, lineTop, lineMid, lineBot]);
  }

  function killMobilePanel() {
    killTl("mobilePanelTl");
    gsap.killTweensOf(getNavItems());
    gsap.killTweensOf([backBtn, logo]);
    panels.forEach((p) => { gsap.killTweensOf(p); gsap.killTweensOf(getFade(p)); });
  }

  function resetToggles() {
    toggles.forEach((t) => t.setAttribute("aria-expanded", "false"));
  }

  function resetDesktop() {
    panels.forEach((p) => {
      gsap.set(p, { visibility: "hidden", opacity: 0, pointerEvents: "none", xPercent: 0 });
      gsap.set(getFade(p), { autoAlpha: 0, x: 0, y: 0, xPercent: 0, yPercent: 0 });
    });
    setActiveFooter(null);
    gsap.set(dropContainer, { height: 0 });
    if (footerBg) gsap.set(footerBg, { height: 0 });
    gsap.set(backdrop, { autoAlpha: 0 });
    menuWrap.setAttribute("data-menu-open", "false");
    resetToggles();
  }

  function setupMobile() {
    panels.forEach((p) => {
      gsap.set(p, { autoAlpha: 0, xPercent: 0, visibility: "visible", pointerEvents: "none" });
      gsap.set(getFade(p), { xPercent: 20, autoAlpha: 0 });
    });
    gsap.set(getNavItems(), { xPercent: 0, y: 0, autoAlpha: 1 });
    gsap.set(navList, { autoAlpha: 0, x: 0 });
    gsap.set(backBtn, { autoAlpha: 0 });
    gsap.set(logo, { autoAlpha: 1 });
    gsap.set(dropContainer, { clearProps: "height" });
    if (footerBg) gsap.set(footerBg, { clearProps: "height" });
    gsap.set(backdrop, { autoAlpha: 0 });
  }

  // Pin the mobile menu / dropdown wrapper to the bottom edge of the actual nav
  // bar, so a sticky banner above the nav doesn't push content below the fold.
  function applyMobileTopOffset() {
    const ref = navBar || menuWrap;
    if (!ref) return;
    const top = Math.max(0, ref.getBoundingClientRect().bottom);
    if (navList) navList.style.top = `${top}px`;
    if (dropWrapper) dropWrapper.style.top = `${top}px`;
  }

  function clearMobileTopOffset() {
    if (navList) navList.style.top = "";
    if (dropWrapper) dropWrapper.style.top = "";
  }

  // Lock/unlock page scroll while the mobile menu is open.
  //
  // We can't simply set `body { overflow: hidden }`: that makes <body>
  // non-scrollable, which breaks the `position: sticky` containing block of
  // the nav (it would snap to its natural document position and scroll off-
  // screen). And we can't switch the nav to `position: fixed` either —
  // sticky reserves layout space, fixed does not, so the page below would
  // jump up by the nav's height.
  //
  // Instead, we leave the layout untouched and block scroll via event
  // listeners + Lenis. Events that originate inside the menu/dropdown still
  // get through, so the menu remains scrollable internally if its content
  // overflows.
  const SCROLLABLE_INSIDE_MENU =
    "[data-nav-list], [data-dropdown-wrapper], [data-dropdown-container], [data-nav-content]";

  function preventOutsideScroll(e) {
    if (e.target.closest && e.target.closest(SCROLLABLE_INSIDE_MENU)) return;
    e.preventDefault();
  }

  const SCROLL_KEYS = new Set([
    "ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " ", "Spacebar",
  ]);

  function preventScrollKeys(e) {
    if (!SCROLL_KEYS.has(e.key)) return;
    if (e.target.closest && e.target.closest(SCROLLABLE_INSIDE_MENU)) return;
    const tag = (e.target.tagName || "").toLowerCase();
    if (tag === "input" || tag === "textarea" || e.target.isContentEditable) return;
    e.preventDefault();
  }

  let scrollLocked = false;

  function lockScroll() {
    if (scrollLocked) return;
    scrollLocked = true;
    window.addEventListener("wheel", preventOutsideScroll, { passive: false });
    window.addEventListener("touchmove", preventOutsideScroll, { passive: false });
    window.addEventListener("keydown", preventScrollKeys, false);
    if (window.lenis && typeof window.lenis.stop === "function") {
      window.lenis.stop();
    }
  }

  function unlockScroll() {
    if (!scrollLocked) return;
    scrollLocked = false;
    window.removeEventListener("wheel", preventOutsideScroll);
    window.removeEventListener("touchmove", preventOutsideScroll);
    window.removeEventListener("keydown", preventScrollKeys);
    if (window.lenis && typeof window.lenis.start === "function") {
      window.lenis.start();
    }
  }

  // Cols-only height of a panel. The footer lives outside the panel now (inside
  // .mega-nav__footer-bg), so its height is added separately when computing the
  // dropdown-container morph target.
  function measurePanel(name) {
    const el = getPanel(name);
    if (!el) return 0;
    const s = el.style;
    const prev = [s.visibility, s.opacity, s.pointerEvents];
    Object.assign(s, { visibility: "visible", opacity: "0", pointerEvents: "none" });
    const h = el.getBoundingClientRect().height;
    [s.visibility, s.opacity, s.pointerEvents] = prev;
    return h;
  }

  // DESKTOP — open dropdown (first open)
  function openDropdown(panelName) {
    if (state.isOpen && state.activePanel === panelName) return;
    if (state.isOpen) return switchPanel(state.activePanel, panelName);

    const colsHeight = measurePanel(panelName);
    const footerHeight = measureFooter(panelName);
    const totalHeight = colsHeight + footerHeight;
    if (!totalHeight) return;

    killDropdown();
    resetDesktop();

    const el = getPanel(panelName);
    const fade = getFade(el);
    const toggle = getToggle(panelName);

    state.isOpen = true;
    state.activePanel = panelName;
    state.activePanelIndex = getIndex(panelName);
    menuWrap.setAttribute("data-menu-open", "true");
    if (toggle) toggle.setAttribute("aria-expanded", "true");
    setActiveFooter(panelName);

    gsap.set(dropContainer, { height: 0 });
    if (footerBg) gsap.set(footerBg, { height: 0 });

    const tl = gsap.timeline();
    state.tl = tl;
    tl.to(backdrop, { autoAlpha: 1, duration: DUR.backdropIn, ease: "power2.out" }, 0);
    tl.to(dropContainer, { height: totalHeight, duration: DUR.openScale, ease: "power3.out" }, 0);
    if (footerBg) {
      tl.to(footerBg, { height: footerHeight, duration: DUR.openScale, ease: "power3.out" }, 0);
    }
    tl.set(el, { visibility: "visible", opacity: 1, pointerEvents: "auto" }, 0.05);
    if (fade.length) {
      tl.fromTo(fade,
        { autoAlpha: 0, y: 8 },
        { autoAlpha: 1, y: 0, duration: DUR.contentIn, stagger: stagger(fade.length), ease: "power3.out" },
        0.1
      );
    }
  }

  // DESKTOP — close dropdown
  function closeDropdown() {
    if (!state.isOpen) return;
    const el = getPanel(state.activePanel);
    const fade = el ? getFade(el) : [];

    killDropdown();

    const tl = gsap.timeline({
      onComplete() {
        state.isOpen = false;
        state.activePanel = null;
        state.activePanelIndex = -1;
        state.tl = null;
        resetDesktop();
      },
    });
    state.tl = tl;
    if (fade.length) {
      const { instant, down, normal } = splitFade(fade);
      if (instant.length) tl.to(instant, { autoAlpha: 0, duration: DUR.contentOutFast, ease: "power2.in" }, 0);
      if (down.length) tl.to(down, { yPercent: 100, duration: DUR.contentOut * 0.7, ease: "power2.in" }, 0);
      if (normal.length) tl.to(normal, { autoAlpha: 0, y: -4, duration: DUR.contentOut * 0.7, ease: "power2.in" }, 0);
    }
    tl.to(dropContainer, { height: 0, duration: DUR.closeScale, ease: "power2.in" }, 0.05);
    if (footerBg) {
      tl.to(footerBg, { height: 0, duration: DUR.closeScale, ease: "power2.in" }, 0.05);
    }
    tl.to(backdrop, { autoAlpha: 0, duration: DUR.backdropOut, ease: "power2.out" }, 0);
    if (el) tl.set(el, { visibility: "hidden", opacity: 0, pointerEvents: "none" });
  }

  // DESKTOP — switch panel (directional)
  function switchPanel(fromName, toName) {
    const dir = getIndex(toName) > getIndex(fromName) ? 1 : -1;
    const fromEl = getPanel(fromName), toEl = getPanel(toName);
    if (!fromEl || !toEl) return;

    const fromFade = getFade(fromEl), toFade = getFade(toEl);
    const toColsHeight = measurePanel(toName);
    const toFooterHeight = measureFooter(toName);
    const toHeight = toColsHeight + toFooterHeight;
    if (!toHeight) return;

    killDropdown();

    // Reset every panel EXCEPT fromEl. fromEl is about to fade out, and
    // snapping its fade items back to `autoAlpha: 1 / x: 0` here would
    // flicker the footer's contents (e.g. the radial marquee's images)
    // whenever a previous switchPanel was killed mid-flight by this one —
    // the killed tween leaves the wrapper at an intermediate value, this
    // code would slam it back to 1, and the next tween fades it to 0 again.
    // Letting the new fade-out tween pick up from the current value keeps
    // the transition smooth.
    panels.forEach((p) => {
      if (p === fromEl) return;
      gsap.set(p, { visibility: "hidden", opacity: 0, pointerEvents: "none", xPercent: 0 });
      gsap.set(getFade(p), { autoAlpha: 0, x: 0, y: 0, xPercent: 0, yPercent: 0 });
    });
    gsap.set(fromEl, { visibility: "visible", opacity: 1, pointerEvents: "auto", x: 0 });
    gsap.set(backdrop, { autoAlpha: 1 });

    const toToggle = getToggle(toName);
    state.activePanel = toName;
    state.activePanelIndex = getIndex(toName);
    resetToggles();
    if (toToggle) toToggle.setAttribute("aria-expanded", "true");
    setActiveFooter(toName);

    const xOut = dir * -30, xIn = dir * 30;
    const tl = gsap.timeline();
    state.tl = tl;

    if (fromFade.length) {
      const { instant, down, normal } = splitFade(fromFade);
      if (instant.length) tl.to(instant, { autoAlpha: 0, duration: DUR.contentOutFast, ease: "power2.in" }, 0);
      if (down.length) tl.to(down, { yPercent: 100, duration: DUR.contentOut, ease: "power2.in" }, 0);
      if (normal.length) tl.to(normal, { autoAlpha: 0, x: xOut, duration: DUR.contentOut, ease: "power2.in" }, 0);
    }
    tl.set(fromEl, { visibility: "hidden", opacity: 0, pointerEvents: "none", xPercent: 0 }, DUR.contentOut);
    if (fromFade.length) tl.set(fromFade, { x: 0, yPercent: 0 }, DUR.contentOut);
    tl.to(dropContainer, { height: toHeight, duration: DUR.bgMorph, ease: "power3.out" }, 0.05);
    if (footerBg) {
      tl.to(footerBg, { height: toFooterHeight, duration: DUR.bgMorph, ease: "power3.out" }, 0.05);
    }
    tl.set(toEl, { visibility: "visible", opacity: 1, pointerEvents: "auto", xPercent: 0 }, DUR.contentOut * 0.5);
    if (toFade.length) {
      tl.fromTo(toFade,
        { autoAlpha: 0, x: xIn },
        { autoAlpha: 1, x: 0, duration: DUR.contentIn, stagger: stagger(toFade.length), ease: "power3.out" },
        DUR.contentOut * 0.6
      );
    }
  }

  // DESKTOP — hover intent
  function handleToggleEnter(e) {
    if (state.isMobile) return;
    const name = e.currentTarget.getAttribute("data-dropdown-toggle");
    if (!name) return;
    clearTimeout(state.leaveTimer); state.leaveTimer = null;
    clearTimeout(state.hoverTimer);
    state.hoverTimer = setTimeout(() => openDropdown(name), state.isOpen ? 0 : HOVER_ENTER);
  }

  function handleToggleLeave() {
    if (state.isMobile) return;
    clearTimeout(state.hoverTimer); state.hoverTimer = null;
    state.leaveTimer = setTimeout(closeDropdown, HOVER_LEAVE);
  }

  function handleWrapperEnter() {
    if (state.isMobile) return;
    clearTimeout(state.leaveTimer); state.leaveTimer = null;
  }

  function handleWrapperLeave() {
    if (state.isMobile) return;
    state.leaveTimer = setTimeout(closeDropdown, HOVER_LEAVE);
  }

  // DESKTOP — close behaviors
  function handleEscape(e) {
    if (e.key !== "Escape") return;
    if (state.isMobile) {
      state.mobilePanelActive ? closeMobilePanel() : state.mobileMenuOpen && closeMobileMenu();
      return;
    }
    if (state.isOpen) {
      const t = getToggle(state.activePanel);
      closeDropdown();
      if (t) t.focus();
    }
  }

  function handleDocClick(e) {
    if (state.isMobile || !state.isOpen) return;
    if (!e.target.closest("[data-menu-wrap]")) closeDropdown();
  }

  // DESKTOP — keyboard navigation
  function focusFirstLink(panelName) {
    setTimeout(() => {
      const el = getPanel(panelName);
      if (!el) return;
      const link = el.querySelector("a");
      if (!link) return;
      gsap.set(link, { visibility: "visible" });
      link.focus();
    }, 80);
  }

  function handleKeydownOnToggle(e) {
    if (state.isMobile) return;
    const name = e.currentTarget.getAttribute("data-dropdown-toggle");

    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (state.isOpen && state.activePanel === name) closeDropdown();
      else { openDropdown(name); focusFirstLink(name); }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!state.isOpen || state.activePanel !== name) openDropdown(name);
      focusFirstLink(name);
    }
    if (e.key === "Tab" && !e.shiftKey && state.isOpen && state.activePanel === name) {
      e.preventDefault();
      const link = getPanel(name)?.querySelector("a");
      if (link) link.focus();
    }
  }

  function handleKeydownInPanel(e) {
    if (state.isMobile || !state.isOpen) return;
    const el = getPanel(state.activePanel);
    if (!el) return;

    const links = [...el.querySelectorAll("a")];
    const idx = links.indexOf(document.activeElement);

    if (e.key === "ArrowDown") {
      e.preventDefault();
      links[(idx + 1) % links.length].focus();
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (idx <= 0) { const t = getToggle(state.activePanel); if (t) t.focus(); }
      else links[idx - 1].focus();
    }
    if (e.key === "Tab" && !e.shiftKey && idx === links.length - 1) {
      e.preventDefault();
      const curIdx = toggles.indexOf(getToggle(state.activePanel));
      const next = curIdx < toggles.length - 1 ? toggles[curIdx + 1] : null;
      closeDropdown();
      if (next) next.focus();
    }
    if (e.key === "Tab" && e.shiftKey && idx === 0) {
      e.preventDefault();
      const t = getToggle(state.activePanel);
      if (t) t.focus();
    }
  }

  // MOBILE — burger animation
  function animateBurger(toX) {
    const tl = gsap.timeline({ defaults: { ease: "power2.inOut" } });
    if (toX) {
      tl.to(lineTop, { y: "0.3125em", duration: 0.15 }, 0);
      tl.to(lineBot, { y: "-0.3125em", duration: 0.15 }, 0);
      tl.to(lineMid, { autoAlpha: 0, duration: 0.1 }, 0.1);
      tl.to(lineTop, { rotation: 45, duration: 0.2 }, 0.15);
      tl.to(lineBot, { rotation: -45, duration: 0.2 }, 0.15);
    } else {
      tl.to(lineTop, { rotation: 0, duration: 0.2 }, 0);
      tl.to(lineBot, { rotation: 0, duration: 0.2 }, 0);
      tl.to(lineTop, { y: 0, duration: 0.15 }, 0.15);
      tl.to(lineBot, { y: 0, duration: 0.15 }, 0.15);
      tl.to(lineMid, { autoAlpha: 1, duration: 0.1 }, 0.15);
    }
    return tl;
  }

  // MOBILE — open/close menu
  function openMobileMenu() {
    killMobile();
    state.mobileMenuOpen = true;
    menuWrap.setAttribute("data-menu-open", "true");
    burger.setAttribute("aria-expanded", "true");
    applyMobileTopOffset();
    lockScroll();

    const items = getNavItems();
    const tl = gsap.timeline();
    state.mobileTl = tl;
    tl.add(animateBurger(true), 0);
    tl.to(navList, { autoAlpha: 1, duration: 0.3, ease: "power2.out" }, 0);
    if (items.length) {
      tl.fromTo(items,
        { autoAlpha: 0, y: 12 },
        { autoAlpha: 1, y: 0, duration: 0.3, stagger: 0.04, ease: "power3.out" },
        0.15
      );
    }
  }

  function closeMobileMenu() {
    const hadPanel = state.mobilePanelActive;
    const panelEl = hadPanel ? getPanel(hadPanel) : null;

    killMobile();
    killMobilePanel();

    // Don't flip `data-menu-open` to "false" synchronously — the CSS rule
    // (`[data-menu-open='true'] [data-nav-list]…`) gives the drawer its full
    // height + scroll on mobile, and removing it mid-animation snaps the
    // drawer back to its smaller natural size while it's still fading out.
    state.mobileMenuOpen = false;
    state.mobilePanelActive = null;
    burger.setAttribute("aria-expanded", "false");

    const tl = gsap.timeline({
      onComplete() {
        menuWrap.setAttribute("data-menu-open", "false");
        unlockScroll();
        clearMobileTopOffset();
        state.mobileTl = null;
        setupMobile();
      },
    });
    state.mobileTl = tl;

    tl.add(animateBurger(false), 0);

    // If a panel was open, fade it out with the close — no snap reset
    if (hadPanel && panelEl) {
      tl.to(panelEl, { autoAlpha: 0, duration: 0.3, ease: "power2.inOut" }, 0.05);
      tl.to(backBtn, { autoAlpha: 0, duration: 0.2, ease: "power2.in" }, 0.05);
    }

    // Fade out the nav list container
    tl.to(navList, { autoAlpha: 0, duration: 0.3, ease: "power2.inOut" }, 0.05);
  }

  // MOBILE — slide-over panels 
  function openMobilePanel(panelName) {
    const el = getPanel(panelName);
    if (!el) return;
    killMobilePanel();
    state.mobilePanelActive = panelName;

    const navItems = getNavItems();
    const panelFade = getFade(el);

    const tl = gsap.timeline();
    state.mobilePanelTl = tl;

    // Fade out each nav item to the left
    if (navItems.length) {
      tl.to(navItems, {
        xPercent: -10, autoAlpha: 0,
        duration: 0.35, stagger: 0.03, ease: "power2.in",
      }, 0);
    }

    // Logo → back button swap
    tl.to(logo, { autoAlpha: 0, duration: 0.2, ease: "power2.in" }, 0);
    tl.to(backBtn, { autoAlpha: 1, duration: 0.25, ease: "power2.inOut" }, 0.15);

    // Show panel container, then fade in its items from the right
    tl.set(el, { autoAlpha: 1, xPercent: 0, pointerEvents: "auto" }, 0.2);
    if (panelFade.length) {
      tl.fromTo(panelFade,
        { xPercent: 8, autoAlpha: 0 },
        { xPercent: 0, autoAlpha: 1, duration: 0.3, stagger: stagger(panelFade.length), ease: "power3.out" },
        0.25
      );
    }
  }

  function closeMobilePanel() {
    if (!state.mobilePanelActive) return;
    const el = getPanel(state.mobilePanelActive);
    if (!el) return;
    killMobilePanel();

    const navItems = getNavItems();
    const panelFade = getFade(el);

    const tl = gsap.timeline({
      onComplete() { state.mobilePanelActive = null; state.mobilePanelTl = null; },
    });
    state.mobilePanelTl = tl;

    // Fade out panel items to the right
    if (panelFade.length) {
      tl.to(el, {
        xPercent: 20, autoAlpha: 0,
        duration: 0.3, stagger: 0.02, ease: "power2.in",
      }, 0);
    }

    // Hide panel
    tl.set(el, { autoAlpha: 0, pointerEvents: "none" }, 0.25);

    // Back → logo swap
    tl.to(backBtn, { autoAlpha: 0, duration: 0.2, ease: "power2.in" }, 0);
    tl.to(logo, { autoAlpha: 1, duration: 0.25, ease: "power2.out" }, 0.15);

    // Fade nav items back in from center
    if (navItems.length) {
      tl.fromTo(navItems,
        { xPercent: -20, autoAlpha: 0 },
        { xPercent: 0, autoAlpha: 1, duration: 0.35, stagger: 0.03, ease: "power3.out" },
        0.25
      );
    }
  }

  function handleToggleClick(e) {
    if (!state.isMobile || !state.mobileMenuOpen) return;
    const name = e.currentTarget.getAttribute("data-dropdown-toggle");
    if (name) { e.preventDefault(); openMobilePanel(name); }
  }

  // RESIZE
  let resizeTimer = null;
  let lastWidth = window.innerWidth;
  function handleResize() {
    const w = window.innerWidth;
    if (w === lastWidth) return;
    lastWidth = w;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      const was = state.isMobile;
      state.isMobile = window.innerWidth <= 991;

      if (was && !state.isMobile) {
        killMobile(); killMobilePanel();
        gsap.set(navList, { clearProps: "all" });
        gsap.set(getNavItems(), { clearProps: "all" });
        gsap.set(backBtn, { autoAlpha: 0 });
        gsap.set(logo, { clearProps: "all" });
        gsap.set([lineTop, lineMid, lineBot], { rotation: 0, y: 0, autoAlpha: 1 });
        burger.setAttribute("aria-expanded", "false");
        state.mobileMenuOpen = false;
        state.mobilePanelActive = null;
        unlockScroll();
        clearMobileTopOffset();
        resetDesktop();
      }
      if (!was && state.isMobile) {
        killDropdown();
        state.isOpen = false; state.activePanel = null; state.activePanelIndex = -1;
        clearTimers();
        menuWrap.setAttribute("data-menu-open", "false");
        resetToggles();
        setupMobile();
      }
    }, 150);
  }

  // EVENT BINDING
  toggles.forEach((btn) => {
    btn.addEventListener("mouseenter", handleToggleEnter);
    btn.addEventListener("mouseleave", handleToggleLeave);
    btn.addEventListener("keydown", handleKeydownOnToggle);
    btn.addEventListener("click", handleToggleClick);
  });
  dropWrapper.addEventListener("mouseenter", handleWrapperEnter);
  dropWrapper.addEventListener("mouseleave", handleWrapperLeave);
  panels.forEach((p) => p.addEventListener("keydown", handleKeydownInPanel));
  backdrop.addEventListener("click", closeDropdown);
  document.addEventListener("keydown", handleEscape);
  document.addEventListener("click", handleDocClick);
  burger.addEventListener("click", () => state.mobileMenuOpen ? closeMobileMenu() : openMobileMenu());
  backBtn.addEventListener("click", closeMobilePanel);
  window.addEventListener("resize", handleResize);

  document.addEventListener("navbar:close", () => {
    if (state.isMobile && state.mobileMenuOpen) closeMobileMenu();
    else if (state.isOpen) closeDropdown();
  });

  // INIT
  state.isMobile ? setupMobile() : resetDesktop();
}


// Initialize Mega Navigation (Directional Hover)
//
// The mega-nav DOM lives outside [data-barba="container"], so it's persistent
// across page transitions — re-initialising on every `barba:afterEnter` would
// stack duplicate event listeners on the same buttons, which causes competing
// GSAP timelines (each closure's `closeDropdown` racing the others) and
// breaks the close animation. Init once on first ready and let the existing
// `navbar:close` event handle dropdown state across navigations.
let megaNavInited = false;

function initOnce() {
  if (megaNavInited) return;
  megaNavInited = true;
  initMegaNavDirectionalHover();
}

function navbar() {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initOnce, { once: true });
  } else {
    initOnce();
  }
}
export default navbar;