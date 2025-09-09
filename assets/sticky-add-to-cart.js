/* sticky-add-to-cart.js */
(() => {
  const DEBUG = false;
  const log = (...a) => DEBUG && console.log('[StickyBar]', ...a);

  // Prevent double init
  if (window.__stickyBarInit) return;
  window.__stickyBarInit = true;

  // Find all sticky bars on the page (usually 1)
  const bars = document.querySelectorAll('.p-stickybar[data-section-id]');
  if (!bars.length) return log('no bars found');

  const pageY = () => window.pageYOffset || document.documentElement.scrollTop || 0;

  bars.forEach((bar) => {
    if (bar.dataset.ready === '1') return;
    bar.dataset.ready = '1';

    // Remove HTML hidden attribute; JS controls visibility via class
    if (bar.hasAttribute('hidden')) bar.removeAttribute('hidden');

    // Portal to <body> so no parent transform/sticky can trap it
    if (bar.parentElement !== document.body) {
      document.body.appendChild(bar);
      log('moved to <body>');
    }

    // Read config
    const triggerSelector = bar.dataset.triggerSelector || '#product-tabs-accordion';
    const offset = parseInt(bar.dataset.triggerOffset || '0', 10);
    const minScroll = parseInt(bar.dataset.minScroll || '60', 10); // user must scroll at least this much

    // Links mapping (from schema)
    const mapLinkToken = (token) => {
      if (!token) return null;
      if (token === 'link1') return bar.dataset.link1Selector || null;
      if (token === 'link2') return bar.dataset.link2Selector || null;
      return token; // assume it's already a selector like "#id" or ".class"
    };

    const trigger = document.querySelector(triggerSelector);
    if (!trigger) {
      log('trigger not found:', triggerSelector, '→ keeping bar hidden');
    }

    const baselineY = pageY(); // where the page was when loaded
    const trigBottom = () =>
      trigger ? trigger.getBoundingClientRect().bottom + pageY() : Infinity;

    // Ensure hidden on load
    bar.classList.remove('is-visible');

    const onScroll = () => {
      const y = pageY();
      const viewBottom = y + window.innerHeight;

      // Show only after:
      // 1) user scrolled at least minScroll beyond baseline, AND
      // 2) viewport bottom passes trigger bottom minus offset
      const shouldShow =
        y > baselineY + minScroll &&
        trigger &&
        viewBottom >= (trigBottom() - offset);

      bar.classList.toggle('is-visible', !!shouldShow);
      log('update', { y, baselineY, minScroll, viewBottom, trigBtm: trigBottom(), offset, shouldShow });
    };

    // Wire up
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    // Run once after paint (keeps it hidden unless conditions already met)
    requestAnimationFrame(onScroll);

    // Links → smooth scroll
    bar.querySelectorAll('.p-stickybar__links .link').forEach((a) => {
      a.addEventListener('click', (e) => {
        e.preventDefault();
        let sel = a.dataset.target;
        sel = mapLinkToken(sel);
        const target = sel ? document.querySelector(sel) : null;
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        else log('link target not found for', a, '→', sel);
      });
    });

    // Add to cart → submit the product form on the page
    const addBtn = bar.querySelector('.p-stickybar__btn');
    if (addBtn) {
      // Dawn product form id starts with "product-form-"
      const productForm =
        document.querySelector('form[id^="product-form-"]') ||
        document.querySelector('product-form form');
      addBtn.addEventListener('click', () => productForm?.requestSubmit());
    }
  });
})();
