function initServices(container) {
  container = container || document;

  const items = container.querySelectorAll('[data-services-item]');
  if (!items.length) return;

  const wrapper = items[0].parentElement;
  if (!wrapper) return;

  const tabs = wrapper.querySelectorAll('.services_list-header-item');
  if (!tabs.length) return;

  const ACTIVE_CLASS = 'is-active';
  const header = tabs[0]?.parentElement;
  const offsetFromAttribute = parseFloat(wrapper.getAttribute('data-services-sticky-offset'));
  const stickyOffset = Number.isFinite(offsetFromAttribute)
    ? offsetFromAttribute
    : parseFloat(window.getComputedStyle(header).top) || 0;
  const threshold = parseFloat(wrapper.getAttribute('data-services-threshold')) || 0.35;

  function setActiveTab(index) {
    tabs.forEach((tab, i) => {
      tab.classList.toggle(ACTIVE_CLASS, i === index);
    });
  }

  items.forEach((item) => {
    const index = parseInt(item.getAttribute('data-services-item'), 10);
    if (Number.isNaN(index)) return;

    window.gsap.timeline({
      scrollTrigger: {
        trigger: item,
        start: `top ${threshold * 100}%`,
        end: `bottom ${threshold * 100}%`,
        onToggle: ({ isActive }) => {
          if (isActive) setActiveTab(index);
        },
      },
    });
  });

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const index = Array.from(tabs).indexOf(tab);
      const target = items[index];
      if (!target) return;

      const headerHeight = header?.offsetHeight || 0;
      const y = target.getBoundingClientRect().top + window.scrollY - headerHeight - stickyOffset;

      window.gsap.to(window, {
        scrollTo: { y, autoKill: true },
        duration: 0.8,
        ease: 'power2.inOut',
      });
    });
  });

  setActiveTab(0);
}

function services() {
  document.addEventListener('barba:afterEnter', (e) => {
    initServices(e.detail.container);
  });
}

export default services;
