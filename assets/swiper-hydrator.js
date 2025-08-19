/* assets/swiper-hydrator.js */
(function () {
  'use strict';

  const toInt = (v, d = 0) => {
    const n = parseInt(v, 10);
    return Number.isNaN(n) ? d : n;
  };
  const toBool = (v) => String(v).toLowerCase() === 'true';

  function initOne(root) {
    if (!root) return;

    // Root may be the section or the swiper element itself
    const swiperEl =
      root.matches?.('.tswiper') ? root : root.querySelector?.('.tswiper');

    if (!swiperEl) return;
    if (swiperEl.dataset.swiperReady === '1') return;

    // Ensure Swiper is available (covers rare race when scripts are deferred)
    if (typeof window.Swiper === 'undefined') {
      setTimeout(() => initOne(root), 60);
      return;
    }

    // Read config from data attributes
    const speed = toInt(swiperEl.dataset.speed || 500, 500);
    const gap = toInt(swiperEl.dataset.gap || 20, 20);
    const autoplay = toBool(swiperEl.dataset.autoplay || false);
    const autoplayDelay = toInt(swiperEl.dataset.autoplayDelay || 4000, 4000);
    const mode = (swiperEl.dataset.mode || '').toLowerCase(); // 'fixed' or ''

    // Scope nav to this section
    const scope =
      swiperEl.closest?.('[data-testimonial-slider]') ||
      swiperEl.closest?.('.ts-bleed') ||
      root;

    const prevEl = scope?.querySelector?.('.ts-prev') || null;
    const nextEl = scope?.querySelector?.('.ts-next') || null;

    /** @type {import('swiper').SwiperOptions} */
    const params = {
      speed,
      spaceBetween: gap,
      watchOverflow: true,
      navigation: prevEl && nextEl ? { prevEl, nextEl } : undefined,
      on: {
        afterInit(sw) {
          console?.log?.('[TS] init OK', {
            slides: sw.slides.length,
            width: sw.width,
            spv: sw.params.slidesPerView
          });
        },
        breakpoint(sw, p) {
          console?.log?.('[TS] breakpoint', {
            width: sw.width,
            spv: p?.slidesPerView
          });
        },
        resize(sw) {
          console?.log?.('[TS] resize', {
            width: sw.width,
            spv: sw.params.slidesPerView
          });
        }
      }
    };

    if (mode === 'fixed') {
      // Fixed-width slides (CSS controls width via .swiper-slide { width: ... })
      params.slidesPerView = 'auto';
    } else {
      // Fractional slides per view
      params.slidesPerView = 1.2;
      params.breakpoints = {
        750: { slidesPerView: 2.1 },
        990: { slidesPerView: 3.1 }
      };
    }

    if (autoplay) {
      params.autoplay = {
        delay: autoplayDelay,
        disableOnInteraction: false
      };
    }

    const sw = new Swiper(swiperEl, params);
    swiperEl.dataset.swiperReady = '1';

    // Keep layout tight as assets/fonts load
    const forceUpdate = () => {
      try {
        sw.update();
      } catch (_) {}
    };

    if (document.readyState === 'complete') {
      setTimeout(forceUpdate, 0);
    } else {
      window.addEventListener('load', forceUpdate, { once: true, passive: true });
    }

    // Update on image load inside slides
    swiperEl.querySelectorAll('img').forEach((img) => {
      if (!img.complete) {
        img.addEventListener('load', forceUpdate, { once: true, passive: true });
      }
    });

    // Shopify Theme Editor hooks
    document.addEventListener('shopify:section:load', (e) => {
      if (e?.target && (e.target.contains(swiperEl) || swiperEl.contains(e.target))) {
        forceUpdate();
      } else {
        scan(e.target);
      }
    }, { passive: true });

    document.addEventListener('shopify:section:select', forceUpdate, { passive: true });
    document.addEventListener('shopify:section:deselect', forceUpdate, { passive: true });
    document.addEventListener('shopify:block:select', forceUpdate, { passive: true });
    document.addEventListener('shopify:block:deselect', forceUpdate, { passive: true });
  }

  function scan(context) {
    const root = context || document;
    const marked = root.querySelectorAll?.('[data-testimonial-slider]') || [];
    const loose = root.querySelectorAll?.('.tswiper') || [];

    console?.log?.('[TS] scan', {
      marked: marked.length,
      tswipers: loose.length
    });

    // Prefer marked sections (better scoping)
    marked.forEach(initOne);
    // Also catch any stray .tswiper (fallback)
    loose.forEach(initOne);
  }

  // Initial scan
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => scan(), { once: true, passive: true });
  } else {
    scan();
  }

  // Watch for dynamic inserts (e.g., editor, app blocks)
  if ('MutationObserver' in window) {
    const mo = new MutationObserver((mutations) => {
      for (const m of mutations) {
        for (const node of m.addedNodes) {
          if (!(node instanceof Element)) continue;
          if (
            node.matches?.('[data-testimonial-slider], .tswiper') ||
            node.querySelector?.('[data-testimonial-slider], .tswiper')
          ) {
            scan(node);
          }
        }
      }
    });
    mo.observe(document.documentElement, { childList: true, subtree: true });
  }
})();
