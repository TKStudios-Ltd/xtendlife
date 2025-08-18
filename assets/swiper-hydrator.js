/* assets/swiper-hydrator.js */
(function () {
  function initTestimonialSection(sectionRoot) {
    if (!sectionRoot) return;
    const swiperEl = sectionRoot.querySelector('.tswiper');
    if (!swiperEl || swiperEl.dataset.swiperReady === '1') return;

    // Read per-section config from data attributes (with safe defaults)
    const speed = parseInt(swiperEl.dataset.speed || '500', 10);
    const gap = parseInt(swiperEl.dataset.gap || '24', 10);
    const autoplay = (swiperEl.dataset.autoplay || 'false') === 'true';
    const autoplayDelay = parseInt(swiperEl.dataset.autoplayDelay || '4000', 10);

    // Find nav buttons scoped to this section
    const scope = sectionRoot.querySelector('.ts-bleed') || sectionRoot;
    const prevEl = scope.querySelector('.ts-prev');
    const nextEl = scope.querySelector('.ts-next');

    // Swiper must exist globally
    if (typeof window.Swiper === 'undefined') {
      // If Swiper not ready yet, try again soon
      setTimeout(function () { initTestimonialSection(sectionRoot); }, 100);
      return;
    }

    const params = {
      speed,
      spaceBetween: gap,
      slidesPerView: 1.2,
      watchOverflow: true,
      navigation: (prevEl && nextEl) ? { prevEl, nextEl } : undefined,
      breakpoints: {
        750: { slidesPerView: 2.1 },
        990: { slidesPerView: 3.1 }
      }
    };
    if (autoplay) params.autoplay = { delay: autoplayDelay, disableOnInteraction: false };

    const sw = new Swiper(swiperEl, params);
    swiperEl.dataset.swiperReady = '1';

    const forceUpdate = () => { try { sw.update(); } catch(e){} };
    if (document.readyState === 'complete') setTimeout(forceUpdate, 0);
    else window.addEventListener('load', forceUpdate, { once: true });

    document.addEventListener('shopify:section:select', forceUpdate);
  }

  function scan(context) {
    (context || document)
      .querySelectorAll('[data-testimonial-slider]')
      .forEach(initTestimonialSection);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { scan(); }, { once: true });
  } else {
    scan();
  }

  // Re-init when a section is added/edited in Theme Editor
  document.addEventListener('shopify:section:load', function (e) { scan(e.target); });
})();
