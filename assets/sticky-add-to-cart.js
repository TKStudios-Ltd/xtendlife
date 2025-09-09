/* assets/sticky-add-to-cart.js */
(function () {
  'use strict';

  console.info('[StickyBar] script loaded');

  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  function logFactory(bar) {
    const DEBUG = bar?.dataset?.debug === '1' || window.STICKY_BAR_DEBUG === true;
    return (...args) => { if (DEBUG) console.log('[StickyBar]', ...args); };
  }

  function resolveTarget(customSel, fallbacks, log) {
    if (customSel) {
      const el = document.querySelector(customSel);
      log('resolveTarget(custom)', customSel, '->', !!el);
      if (el) return el;
    }
    for (const s of fallbacks) {
      if (!s) continue;
      const el = document.querySelector(s);
      log('resolveTarget(fallback)', s, '->', !!el);
      if (el) return el;
    }
    log('resolveTarget: nothing found');
    return null;
  }

  function initBar(bar) {
    if (!bar || bar.dataset.ready === '1') return;
    const log = logFactory(bar);
    bar.dataset.ready = '1';

    const sectionId     = bar.dataset.sectionId;
    const triggerSel    = bar.dataset.triggerSelector;
    const triggerOffset = parseInt(bar.dataset.triggerOffset || '300', 10);

    const link1Sel = bar.dataset.link1Selector;
    const link2Sel = bar.dataset.link2Selector;

    log('initBar', { sectionId, triggerSel, triggerOffset, link1Sel, link2Sel });

    // Basic environment checks
    const stickySupported = CSS && CSS.supports && (CSS.supports('position', 'sticky') || CSS.supports('position', '-webkit-sticky'));
    log('CSS position:sticky support =', stickySupported);

    // Reasonable defaults
    const DETAILS_FALLBACKS = [
      `#pta-panel-details-${sectionId}`,
      `#pta-acc-content-details-${sectionId}`,
      '.product__description'
    ];
    const REVIEWS_FALLBACKS = ['#Reviews', '#shopify-product-reviews', '#judgeme_product_reviews', '#looxReviews'];

    // Determine the element after which we start showing the bar
    const defaultTrigger = document.getElementById(`ProductInfo-${sectionId}`);
    const triggerBase = resolveTarget(
      triggerSel,
      [`.product-tabs-accordion--${sectionId}`, defaultTrigger && `#${defaultTrigger.id}`],
      log
    );

    if (!triggerBase) {
      log('ABORT: No trigger element found. Set a valid "Show after element" selector in the block settings.');
      return;
    }
    log('Trigger element =', triggerBase);

    // Create sentinel after trigger + offset
    let sentinel = document.getElementById(`p-stickybar-sentinel-${sectionId}`);
    if (!sentinel) {
      sentinel = document.createElement('div');
      sentinel.id = `p-stickybar-sentinel-${sectionId}`;
      sentinel.setAttribute('aria-hidden', 'true');
      sentinel.style.cssText = `height:1px;width:1px;margin-top:${triggerOffset}px;`;
      triggerBase.insertAdjacentElement('afterend', sentinel);
      log('Sentinel created after trigger with offset', triggerOffset);
    } else {
      log('Sentinel already present');
    }

    function show() {
      if (bar.hidden) { bar.hidden = false; log('bar.hidden -> false'); }
      bar.classList.add('is-visible');
      log('STATE: show (is-visible added)');
    }

    function hide() {
      bar.classList.remove('is-visible');
      if (!bar.hidden) { bar.hidden = true; log('bar.hidden -> true'); }
      log('STATE: hide (is-visible removed)');
    }

    // IntersectionObserver (preferred)
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        const e = entries[0];
        const top = e.boundingClientRect.top;
        const pastTop = top < 0;
        log('IO update → sentinel.top=', Math.round(top), 'pastTop=', pastTop, 'isIntersecting=', e.isIntersecting);
        pastTop ? show() : hide();
      }, { threshold: [0] });
      io.observe(sentinel);
      log('IntersectionObserver attached');
    } else {
      // Fallback: scroll listener
      log('IntersectionObserver not supported; using scroll fallback');
      const onScroll = () => {
        const rect = sentinel.getBoundingClientRect();
        const pastTop = rect.top < 0;
        log('Scroll update → sentinel.top=', Math.round(rect.top), 'pastTop=', pastTop);
        pastTop ? show() : hide();
      };
      window.addEventListener('scroll', onScroll, { passive: true });
      onScroll();
    }

    // Hook up add-to-cart to the main product form
    const findProductForm = () => document.querySelector('form[action$="/cart/add"][id^="product-form-"]');
    const btn = bar.querySelector('.p-stickybar__btn');
    if (btn) {
      btn.addEventListener('click', () => {
        const form = findProductForm();
        log('Add to cart clicked; form found =', !!form, form);
        if (form) { (form.requestSubmit ? form.requestSubmit() : form.submit()); }
      });
    } else {
      log('WARNING: .p-stickybar__btn not found inside bar');
    }

    // Smooth-scroll links
    bar.querySelectorAll('.p-stickybar__links a').forEach(a => {
      a.addEventListener('click', (ev) => {
        ev.preventDefault();
        const which = a.getAttribute('data-target'); // "link1" | "link2"
        const custom = which === 'link1' ? link1Sel : link2Sel;
        const groupFallbacks = which === 'link1' ? DETAILS_FALLBACKS : REVIEWS_FALLBACKS;
        const target = resolveTarget(custom, groupFallbacks, log);
        log('Nav click', which, '→ target =', target);
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });

    // Helpful warnings about parent overflow (can break sticky)
    const parents = [];
    let p = bar.parentElement;
    while (p && parents.length < 6) { parents.push(p); p = p.parentElement; }
    const breaking = parents.find(el => {
      const cs = getComputedStyle(el);
      return /(auto|scroll|hidden)/.test(cs.overflow) || /(auto|scroll|hidden)/.test(cs.overflowY);
    });
    if (breaking) log('WARNING: Ancestor has overflow that can break sticky →', breaking);
  }

  function scan(root) {
    (root || document).querySelectorAll('.p-stickybar').forEach(initBar);
  }

  // Initial scan
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => scan(), { once: true });
  } else {
    scan();
  }

  // Theme editor / dynamic content
  if ('Shopify' in window && Shopify.designMode) {
    document.addEventListener('shopify:section:load', (e) => { console.info('[StickyBar] section:load'); scan(e.target); });
    document.addEventListener('shopify:block:select', (e) => { console.info('[StickyBar] block:select'); scan(e.target); });
    document.addEventListener('shopify:block:deselect', (e) => { console.info('[StickyBar] block:deselect'); scan(e.target); });
  }
})();

