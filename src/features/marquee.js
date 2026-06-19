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
    const speed = marquee.querySelector('[data-css-marquee-speed]');
    const pixelsPerSecond = Number(speed?.dataset.cssMarqueeSpeed) || 35;

    // duplicate lists
    marquee.querySelectorAll('[data-css-marquee-list]').forEach(list => {
      marquee.appendChild(list.cloneNode(true));
    });

    // set duration on all lists (originals + duplicates)
    marquee.querySelectorAll('[data-css-marquee-list]').forEach(list => {
      list.style.animationDuration = `${list.offsetWidth / pixelsPerSecond}s`;
      list.style.animationPlayState = 'paused';
    });

    observer.observe(marquee);
  });
}

function marquee() {
  document.addEventListener('barba:pageVisible', (e) => {
    initCSSMarquee(e.detail.container);
  });
}

export default marquee;