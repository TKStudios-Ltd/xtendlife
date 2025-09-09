/* assets/sticky-add-to-cart.js */
(function () {
  'use strict';

  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  function resolveTarget(customSel, fallbacks) {
    if (customSel && document.querySelector(customSel)) return document.querySelector(customSel);
    for (const s of fallbacks) { const el = document.querySelector(s); if (el) return el; }
    return null;
  }

  function initBar(bar) {
    if (!bar || bar.dataset.ready === '1') return;
    bar.dataset.ready = '1';

    const sectionId     = bar.dataset.sectionId;
    const triggerSel    = bar.dataset.triggerSelector;
    const triggerOffset = parseInt(bar.dataset.triggerOffset || '300', 10);

    // Sensible defaults for link targets
    const link1Sel = bar.dataset.link1Selector; // often your Details panel/accordion container
    const link2Sel = bar.dataset.link2Selector; // often #Reviews
    const DETAILS_FALLBACKS = [
      `#pta-panel-details-${sectionId}`,
      `#pta-acc-content-details-${sectionId}`,
      '.product__description'
    ];
    const REVIEWS_FALLBACKS = [
      '#Reviews', '#shopify-product-reviews', '#judgeme_product_reviews', '#looxReviews'
    ];

    // Default trigger = product info area if user didn't set one
    const defaultTrigger = document.getElementById(`ProductInfo-${sectionId}`);
    const triggerBase = resolveTarget(triggerSel, [`.product-tabs-accordion--${sectionId}`, defaultTrigger && `#${defaultTrigger.id}`].filter(Boolean));
    if (!triggerBase) return;

    // Create sentinel right after the trigger element with extra offset margin
    let sentinel = document.getElementById(`p-stickybar-sentinel-${sectionId}`);
    if (!sentinel) {
      sentinel = document.createElement('div');
      sentinel.id = `p-stickybar-sentinel-${sectionId}`;
      sentinel.setAttribute('aria-hidden', 'true');
      sentinel.style.cssText = `height:1px;width:1px;margin-top:${triggerOffset}px;`;
      triggerBase.insertAdjacentElement('afterend', sentinel);
    }

    // Show bar only after sentinel has scrolled past the top of the viewport
    const io = new IntersectionObserver((entries) => {
      const e = entries[0];
      const pastTop = e.boundingClientRect.top < 0;
      if (pastTop) { bar.hidden = false; bar.classList.add('is-visible'); }
      else { bar.classList.remove('is-visible'); bar.hidden = true; }
    }, { threshold: [0] });
    io.observe(sentinel);

    // Add-to-cart: submit the main product form
    const findProductForm = () =>
      document.querySelector('form[action$="/cart/add"][id^="product-form-"]');
    bar.querySelector('.p-stickybar__btn')?.addEventListener('click', () => {
      const form = findProductForm();
      if (form) { (form.requestSubmit ? form.requestSubmit() : form.submit()); }
    });

    // Smooth-scroll links
    bar.querySelectorAll('.p-stickybar__links a').forEach(a => {
      a.addEventListener('click', (ev) => {
        ev.preventDefault();
        const which = a.getAttribute('data-target'); // "link1" | "link2"
        const custom = which === 'link1' ? link1Sel : link2Sel;
        const groupFallbacks = which === 'link1' ? DETAILS_FALLBACKS : REVIEWS_FALLBACKS;
        const target = resolveTarget(custom, groupFallbacks);
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });

    // Keep layout tidy when fonts/images shift height
    const update = () => { /* nothing needed for sticky; placeholder for future needs */ };
    if (document.readyState === 'complete') setTimeout(update, 0);
    else window.addEventListener('load', update, { once: true });
  }

  function scan() { $$('.p-stickybar[hidden]').forEach(initBar); }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scan, { once: true });
  } else {
    scan();
  }

  // Theme editor dynamic updates
  if ('Shopify' in window && Shopify.designMode) {
    document.addEventListener('shopify:section:load', scan);
    document.addEventListener('shopify:block:select', scan);
    document.addEventListener('shopify:block:deselect', scan);
  }
})();
