function initCSSMarquee(container = document) {
  const marquees = container.querySelectorAll('[data-css-marquee]');
  if (!marquees.length) return;

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      entry.target.querySelectorAll('[data-css-marquee-list]').forEach(list => {
        list.style.animationPlayState = entry.isIntersecting ? 'running' : 'paused';
      });
    });
  }, { threshold: 0 });

  marquees.forEach(marquee => {
    if ('cssMarqueeReady' in marquee.dataset) return;
    marquee.dataset.cssMarqueeReady = '';

    const speed = marquee.querySelector('[data-css-marquee-speed]');
    const pixelsPerSecond = Number(speed?.dataset.cssMarqueeSpeed) || 35;

    marquee.querySelectorAll('[data-css-marquee-list]').forEach(list => {
      marquee.appendChild(list.cloneNode(true));
    });

    marquee.querySelectorAll('[data-css-marquee-list]').forEach(list => {
      list.style.animationDuration = `${list.offsetWidth / pixelsPerSecond}s`;
      list.style.animationPlayState = 'paused';
    });

    observer.observe(marquee);
  });
}

function initMarqueeScrollDirection(container = document) {
  const marquees = container.querySelectorAll('[data-marquee-scroll-direction-target]');
  if (!marquees.length) return;

  marquees.forEach((marquee) => {
    if ('marqueeReady' in marquee.dataset) return;
    marquee.dataset.marqueeReady = '';

    const marqueeContent = marquee.querySelector('[data-marquee-collection-target]');
    const marqueeScroll = marquee.querySelector('[data-marquee-scroll-target]');
    if (!marqueeContent || !marqueeScroll) return;

    const { marqueeSpeed: speed, marqueeDirection: direction, marqueeDuplicate: duplicate, marqueeScrollSpeed: scrollSpeed, marqueeIconRotationSpeed: rotationSpeedRaw } = marquee.dataset;

    const marqueeSpeedAttr = parseFloat(speed);
    const marqueeDirectionAttr = direction === 'right' ? 1 : -1;
    const duplicateAmount = parseInt(duplicate || 0);
    const scrollSpeedAttr = parseFloat(scrollSpeed);
    const rotationSpeedAttr = parseFloat(rotationSpeedRaw) || 8;
    const speedMultiplier = window.innerWidth < 479 ? 0.25 : window.innerWidth < 991 ? 0.5 : 1;

    let marqueeSpeed = marqueeSpeedAttr * (marqueeContent.offsetWidth / window.innerWidth) * speedMultiplier;
    let rotationSpeed = rotationSpeedAttr * (marqueeContent.offsetWidth / window.innerWidth) * speedMultiplier;

    marqueeScroll.style.marginLeft = `${scrollSpeedAttr * -1}%`;
    marqueeScroll.style.width = `${(scrollSpeedAttr * 2) + 100}%`;

    if (duplicateAmount > 0) {
      const fragment = document.createDocumentFragment();
      for (let i = 0; i < duplicateAmount; i++) {
        fragment.appendChild(marqueeContent.cloneNode(true));
      }
      marqueeScroll.appendChild(fragment);
    }

    const marqueeItems = marquee.querySelectorAll('[data-marquee-collection-target]');
    const blocks = marquee.querySelectorAll('[data-marquee-icon-target]');

    const animation = gsap.to(marqueeItems, {
      xPercent: -100,
      repeat: -1,
      duration: marqueeSpeed,
      ease: 'linear'
    }).totalProgress(0.5);

    if (blocks.length) {
      blocks.forEach(b => gsap.set(b, { rotation: Math.random() * 360 }));
    }
    const blockSpin = blocks.length ? gsap.to(blocks, {
      rotation: '+=360',
      repeat: -1,
      duration: rotationSpeed,
      ease: 'linear'
    }) : null;

    gsap.set(marqueeItems, { xPercent: marqueeDirectionAttr === 1 ? 100 : -100 });
    animation.timeScale(marqueeDirectionAttr);
    animation.play();
    if (blockSpin) blockSpin.timeScale(marqueeDirectionAttr);

    marquee.setAttribute('data-marquee-status', 'normal');

    ScrollTrigger.create({
      trigger: marquee,
      start: 'top bottom',
      end: 'bottom top',
      onUpdate: (self) => {
        const isInverted = self.direction === 1;
        const currentDirection = isInverted ? -marqueeDirectionAttr : marqueeDirectionAttr;

        animation.timeScale(currentDirection);
        if (blockSpin) blockSpin.timeScale(currentDirection);
        marquee.setAttribute('data-marquee-status', isInverted ? 'normal' : 'inverted');
      }
    });

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: marquee,
        start: '0% 100%',
        end: '100% 0%',
        scrub: 0
      }
    });

    const scrollStart = marqueeDirectionAttr === -1 ? scrollSpeedAttr : -scrollSpeedAttr;
    const scrollEnd = -scrollStart;

    tl.fromTo(marqueeScroll, { x: `${scrollStart}vw` }, { x: `${scrollEnd}vw`, ease: 'none' });
  });
}

function marquee() {
  document.addEventListener('barba:pageVisible', (e) => {
    initMarqueeScrollDirection(e.detail.container);
    initCSSMarquee(e.detail.container);
  });
}

export default marquee;
