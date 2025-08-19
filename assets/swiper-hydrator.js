/* assets/swiper-hydrator.js */
(function () {
  'use strict';

  const SWIPER_SEL = '.tswiper, .ts2-swiper';

  const toInt  = (v, d = 0) => (Number.isNaN(parseInt(v, 10)) ? d : parseInt(v, 10));
  const toBool = (v) => String(v).toLowerCase() === 'true';

  function initOne(root) {
    if (!root) return;

    // Find the swiper element (supports both old and new sections)
    const swiperEl = root.matches?.(SWIPER_SEL) ? root : root.querySelector?.(SWIPER_SEL);
    if (!swiperEl) return;
    if (swiperEl.dataset.swiperReady === '1') return;

    // Wait for Swiper bundle if needed
    if (typeof window.Swiper === 'undefined') {
      setTimeout(() => initOne(root), 60);
      return;
    }

    // Read config
    const speed         = toInt(swiperEl.dataset.speed || 500, 500);
    const gap           = toInt(swiperEl.dataset.gap || 20, 20);
    const autoplay      = toBool(swiperEl.dataset.autoplay || false);
    const autoplayDelay = toInt(swiperEl.dataset.autoplayDelay || 4000, 4000);
    const mode          = (swiperEl.dataset.mode || '').toLowerCase(); // 'fixed' or ''
    const dots          = toBool(swiperEl.dataset.dots || false);
    const pagSelector   = swiperEl.dataset.pagination || '.swiper-pagination';

    // Scope to this section
    const scope =
      swiperEl.closest?.('[data-testimonial-slider]') ||
      swiperEl.closest?.('.ts-bleed') ||
      swiperEl.closest?.('section') ||
      document;

    const prevEl = scope?.querySelector?.('.ts-prev') || null;
    const nextEl = scope?.querySelector?.('.ts-next') || null;
    const pagEl  = scope?.querySelector?.(pagSelector) || null;

    /** @type {import('swiper').SwiperOptions} */
    const params = {
      speed,
      spaceBetween: gap,
      watchOverflow: true,
      navigation: prevEl && nextEl ? { prevEl, nextEl } : undefined,
      on: {
        afterInit(sw) { console?.log?.('[TS] init OK', { slides: sw.slides.length, spv: sw.params.slidesPerView }); },
      }
    };

    if (mode === 'fixed') {
      // CSS controls width via .swiper-slide { width: ... }
      params.slidesPerView = 'auto';
    } else {
      // Fractional fallback
      params.slidesPerView = 1.2;
      params.breakpoints = { 750: { slidesPerView: 2.1 }, 990: { slidesPerView: 3.1 } };
    }

    if (autoplay) params.autoplay = { delay: autoplayDelay, disableOnInteraction: false };
    if (dots && pagEl) params.pagination = { el: pagEl, clickable: true };

    const sw = new Swiper(swiperEl, params);
    swiperEl.dataset.swiperReady = '1';

    const forceUpdate = () => { try { sw.update(); } catch (_) {} };

    if (document.readyState === 'complete') setTimeout(forceUpdate, 0);
    else window.addEventListener('load', forceUpdate, { once: true, passive: true });

    // Update when slide images load
    swiperEl.querySelectorAll('img').forEach((img) => {
      if (!img.complete) img.addEventListener('load', forceUpdate, { once: true, passive: true });
    });
  }

  function scan(context) {
    const root  = context || document;
    const marks = root.querySelectorAll?.('[data-testimonial-slider]') || [];
    const loose = root.querySelectorAll?.(SWIPER_SEL) || [];

    marks.forEach(initOne);
    loose.forEach(initOne);
  }

  // Initial scan
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => scan(), { once: true, passive: true });
  } else {
    scan();
  }

  // Watch dynamic inserts
  if ('MutationObserver' in window) {
    const mo = new MutationObserver((mutations) => {
      for (const m of mutations) {
        for (const node of m.addedNodes) {
          if (!(node instanceof Element)) continue;
          if (node.matches?.('[data-testimonial-slider], ' + SWIPER_SEL) ||
              node.querySelector?.('[data-testimonial-slider], ' + SWIPER_SEL)) {
            scan(node);
          }
        }
      }
    });
    mo.observe(document.documentElement, { childList: true, subtree: true });
  }
})();
