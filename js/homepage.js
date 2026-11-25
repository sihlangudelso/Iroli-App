/* Count once when the homepage statistics are visible; static totals remain
   available without JavaScript and for visitors who prefer reduced motion. */
(() => {
  const stats = document.querySelector('.hero-stats');
  if (!stats || window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
      !('IntersectionObserver' in window)) return;

  const counters = Array.from(stats.querySelectorAll('[data-count-to]'));
  const observer = new IntersectionObserver(entries => {
    if (!entries.some(entry => entry.isIntersecting)) return;
    observer.disconnect();
    const duration = 1200;
    let start;
    counters.forEach(counter => { counter.textContent = '1'; });
    function tick(now) {
      if (start === undefined) start = now;
      const progress = Math.min((now - start) / duration, 1);
      counters.forEach(counter => {
        const total = Number(counter.dataset.countTo);
        counter.textContent = String(1 + Math.floor((total - 1) * progress));
      });
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }, { threshold: 0.3 });
  observer.observe(stats);
})();
