/* assets/swiper-hydrator.js */
(function () {
  function initOne(sectionRoot) {
    if (!sectionRoot) return;

    const swiperEl =
      sectionRoot.matches('.tswiper') ? sectionRoot : sectionRoot.querySelector('.tswiper');

    if (!swiperEl) return;
    if (swiperEl.dataset.swiperReady === '1') return;

    const scope = swiperEl.closest('[data-testimonial-slider]') || swiperEl.closest('.ts-bleed') || sectionRoot;
    const prevEl = scope?.querySelector('.ts-prev') || null;
    const nextEl = scope?.querySelector('.ts-next') || null;

    const speed = parseInt(swiperEl.dataset.speed || '500', 10);
    const gap = parseInt(swiperEl.dataset.gap || '24', 10);
    const autoplay = (swiperEl.dataset.autoplay || 'false') === 'true';
    const autoplayDelay = parseInt(swiperEl.dataset.autoplayDelay || '4000', 10);

    if (typeof window.Swiper === 'undefined') {
      console.info('[TS] Waiting for Swiper…');
      setTimeout(function () { initOne(sectionRoot); }, 100);
      return;
    }

    const params = {
      speed,
      spaceBetween: gap,
      slidesPerView: 1.2,
      watchOverflow: true,
      navigation: (prevEl && nextEl) ? { prevEl, nextEl } : undefined,
      breakpoints: { 750: { slidesPerView: 2.1 }, 990: { slidesPerView: 3.1 } },
      on: {
        afterInit(sw) { console.log('[TS] init OK', { slides: sw.slides.length, width: sw.width, spv: sw.params.slidesPerView }); },
        breakpoint(sw, p) { console.log('[TS] breakpoint', { width: sw.width, spv: p.slidesPerView }); },
        resize(sw) { console.log('[TS] resize', { width: sw.width, spv: sw.params.slidesPerView }); }
      }
    };
    if (autoplay) params.autoplay = { delay: autoplayDelay, disableOnInteraction: false };

    const sw = new Swiper(swiperEl, params);
    swiperEl.dataset.swiperReady = '1';

    const forceUpdate = () => { try { sw.update(); } catch(e){} };
    if (document.readyState === 'complete') setTimeout(forceUpdate, 0);
    else window.addEventListener('load', forceUpdate, { once: true });
  }

  function scan(context) {
    const root = context || document;
    const marked = root.querySelectorAll('[data-testimonial-slider]');
    const raw = root.querySelectorAll('.tswiper');
    console.log('[TS] scan', { marked: marked.length, tswipers: raw.length });
    if (marked.length) marked.forEach(initOne);
    raw.forEach(initOne);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { scan(); }, { once: true });
  } else {
    scan();
  }

  document.addEventListener('shopify:section:load', function (e) { scan(e.target); });
  document.addEventListener('shopify:section:select', function (e) { scan(e.target); });
})();
