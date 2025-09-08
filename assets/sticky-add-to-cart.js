(function(){
      const bar = document.getElementById('p-stickybar-{{ section.id }}');
      const defaultTarget = document.getElementById('ProductInfo-{{ section.id }}');

      if (!bar || !defaultTarget) return;

      /* Read editor settings */
      const targetSel = '{{ block.settings.trigger_selector | strip | escape }}';
      const offsetPx  = {{ block.settings.trigger_offset | default: 0 | plus: 0 }};

      /* Resolve trigger element */
      let triggerBase = defaultTarget;
      if (targetSel && document.querySelector(targetSel)) {
        triggerBase = document.querySelector(targetSel);
      }

      /* Create trigger sentinel just AFTER the chosen element, with extra offset */
      let sentinel = document.getElementById('p-stickybar-sentinel-{{ section.id }}');
      if (!sentinel) {
        sentinel = document.createElement('div');
        sentinel.id = 'p-stickybar-sentinel-{{ section.id }}';
        sentinel.setAttribute('aria-hidden', 'true');
        sentinel.style.cssText = 'height:1px;width:1px; margin-top:'+ offsetPx +'px;';
        triggerBase.insertAdjacentElement('afterend', sentinel);
      }

      /* Show when sentinel has moved above the viewport (i.e., scrolled past) */
      const io = new IntersectionObserver((entries) => {
        const e = entries[0];
        const past = e.boundingClientRect.top < 0; // sentinel above viewport top
        if (past) { bar.removeAttribute('hidden'); bar.classList.add('is-visible'); }
        else { bar.classList.remove('is-visible'); bar.setAttribute('hidden','hidden'); }
      }, { threshold: [0] });
      io.observe(sentinel);

      /* Submit the REAL product form */
      bar.querySelector('.p-stickybar__btn')?.addEventListener('click', () => {
        const form = document.querySelector('form[action$="/cart/add"][id^="product-form-"]');
        if (form) { form.requestSubmit ? form.requestSubmit() : form.submit(); }
      });

      /* Smooth scroll for the two center links (with fallbacks) */
      const FALLBACKS = {
        details: [
          '#pta-panel-details-{{ section.id }}',
          '#pta-acc-content-details-{{ section.id }}',
          '.product__description'
        ],
        reviews: [
          '#Reviews', '#shopify-product-reviews', '#judgeme_product_reviews', '#looxReviews'
        ]
      };
      function resolveTarget(sel, group){
        if (sel && document.querySelector(sel)) return document.querySelector(sel);
        const list = FALLBACKS[group] || [];
        for (const s of list) { const el = document.querySelector(s); if (el) return el; }
        return null;
      }
      bar.querySelectorAll('.p-stickybar__links a').forEach(a => {
        a.addEventListener('click', (e) => {
          const raw = a.getAttribute('data-target') || '';
          const group = /review/i.test(a.textContent) ? 'reviews' : 'details';
          const target = resolveTarget(raw, group);
          if (target) { e.preventDefault(); target.scrollIntoView({ behavior:'smooth', block:'start' }); }
        });
      });
})();