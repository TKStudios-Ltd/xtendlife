/* Dawn — WAAPI animations for Mega Menu + Search Modal (no logs) */
(() => {
  const DURATION = 350;
  const EASING = 'cubic-bezier(.2,.7,.3,1)';

  const isDesktopPointer = () => matchMedia('(pointer:fine)').matches;

  // ----------------- MEGA MENU -----------------
  function closeSiblingMegaMenus(current) {
    document.querySelectorAll('details.mega-menu[open]').forEach((d) => {
      if (d !== current) d.__api?.close({ force: true });
    });
  }

  function bindMegaMenus(root = document) {
    const menus = root.querySelectorAll('details.mega-menu');
    menus.forEach((details) => {
      if (details.__megaBound) return;
      details.__megaBound = true;

      const summary = details.querySelector('summary');
      const panel = details.querySelector('.mega-menu__content');
      if (!summary || !panel) return;

      let anim = null;
      let openState = details.hasAttribute('open');

      // Initial state
      if (openState) {
        panel.style.opacity = '1';
        panel.style.transform = 'translateY(0)';
        panel.style.pointerEvents = 'auto';
        panel.removeAttribute('hidden');
      } else {
        panel.style.opacity = '0';
        panel.style.transform = 'translateY(-16px)';
        panel.style.pointerEvents = 'none';
        panel.setAttribute('hidden', '');
      }

      const killAnim = () => { if (anim) { anim.cancel(); anim = null; } };

      function show() {
        if (openState) return;
        closeSiblingMegaMenus(details);
        killAnim();

        panel.removeAttribute('hidden');
        details.setAttribute('open', '');
        panel.style.pointerEvents = 'auto';

        anim = panel.animate(
          [{ opacity: 0, transform: 'translateY(-16px)' },
           { opacity: 1, transform: 'translateY(0)' }],
          { duration: DURATION, easing: EASING, fill: 'forwards' }
        );
        anim.onfinish = anim.oncancel = () => { anim = null; };
        openState = true;
      }

      function hide({ force = false } = {}) {
        if (!openState && !force) return;
        killAnim();

        anim = panel.animate(
          [{ opacity: 1, transform: 'translateY(0)' },
           { opacity: 0, transform: 'translateY(-16px)' }],
          { duration: DURATION, easing: EASING, fill: 'forwards' }
        );
        const finish = () => {
          details.removeAttribute('open');
          panel.setAttribute('hidden', '');
          panel.style.pointerEvents = 'none';
          anim = null; openState = false;
        };
        anim.onfinish = anim.oncancel = finish;
        setTimeout(() => { if (anim) { try { anim.finish(); } catch(_){} } }, DURATION + 50);
      }

      details.__api = { open: show, close: hide };

      // Prevent native details toggle; we control it
      summary.addEventListener('click', (e) => {
        e.preventDefault(); e.stopPropagation();
        openState ? hide() : show();
      });

      // Hover behavior on desktop
      details.addEventListener('mouseenter', () => { if (isDesktopPointer()) show(); });
      details.addEventListener('mouseleave', () => { if (isDesktopPointer()) hide(); });

      // Escape to close
      details.addEventListener('keyup', (e) => {
        if (e.key === 'Escape' && openState) { hide(); summary.focus(); }
      });

      // Click outside to close
      document.addEventListener('click', (evt) => {
        if (!openState) return;
        if (!details.contains(evt.target)) hide();
      });

      // Keep in sync if other code toggles [open]
      details.addEventListener('toggle', () => {
        if (details.open && !openState) { details.removeAttribute('open'); show(); }
        if (!details.open && openState) { details.setAttribute('open', ''); hide(); }
      });
    });
  }

  // ----------------- SEARCH MODAL -----------------
  /* WAAPI animation for Search modal (details-modal.header__search) */
(() => {
  const DURATION = 350;
  const EASING = 'cubic-bezier(.2,.7,.3,1)';
  const isDesktopPointer = () => matchMedia('(pointer:fine)').matches;

  function bindSearchModals(root = document) {
    // Works for either <details-modal class="header__search"> or <div ...><details-modal class="header__search">
    root.querySelectorAll('details-modal.header__search').forEach((wrap) => {
      const details = wrap.querySelector('details');
      if (!details || details.__waapiBound) return;
      details.__waapiBound = true;

      const summary = details.querySelector('summary.modal__toggle, summary');
      const panel   = details.querySelector('.search-modal.modal__content');
      const overlay = details.querySelector('.modal-overlay');
      const btnClose = details.querySelector('.search-modal__close-button');

      if (!summary || !panel) return;

      // Always start closed (avoid server-rendered open state)
      details.removeAttribute('open');
      panel.style.opacity = '0';
      panel.style.transform = 'translateY(-16px)';
      panel.style.pointerEvents = 'none';
      panel.setAttribute('hidden', '');

      let anim = null;
      let openState = false;

      const kill = () => { if (anim) { anim.cancel(); anim = null; } };

      function openModal() {
        if (openState) return;
        kill();

        // Make renderable & set [open] so your CSS box-shadow applies
        panel.removeAttribute('hidden');
        details.setAttribute('open', '');
        panel.style.pointerEvents = 'auto';

        anim = panel.animate(
          [{ opacity: 0, transform: 'translateY(-16px)' },
           { opacity: 1, transform: 'translateY(0)' }],
          { duration: DURATION, easing: EASING, fill: 'forwards' }
        );
        anim.onfinish = anim.oncancel = () => { anim = null; };
        openState = true;

        // Focus search input shortly after open starts
        setTimeout(() => {
          const input = panel.querySelector('input[type="search"]');
          input && input.focus({ preventScroll: true });
        }, 120);
      }

      function closeModal({ force = false } = {}) {
        if (!openState && !force) return;
        kill();

        anim = panel.animate(
          [{ opacity: 1, transform: 'translateY(0)' },
           { opacity: 0, transform: 'translateY(-16px)' }],
          { duration: DURATION, easing: EASING, fill: 'forwards' }
        );
        const finish = () => {
          details.removeAttribute('open');           // remove to clear box-shadow rule
          panel.setAttribute('hidden', '');
          panel.style.pointerEvents = 'none';
          anim = null;
          openState = false;
        };
        anim.onfinish = anim.oncancel = finish;
        setTimeout(() => { if (anim) { try { anim.finish(); } catch(_){} } }, DURATION + 50);
      }

      // Prevent native <details> toggle, we control it
      summary.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        openState ? closeModal() : openModal();
      });

      // Desktop hover: open on hover, close on leave
      let hoverTO;
      wrap.addEventListener('mouseenter', () => {
        if (!isDesktopPointer()) return;
        clearTimeout(hoverTO);
        openModal();
      });
      wrap.addEventListener('mouseleave', () => {
        if (!isDesktopPointer()) return;
        hoverTO = setTimeout(() => closeModal(), 80);
      });

      // Overlay / button / ESC close
      overlay && overlay.addEventListener('click', () => closeModal());
      btnClose && btnClose.addEventListener('click', (e) => { e.preventDefault(); closeModal(); });
      details.addEventListener('keyup', (e) => { if (e.key === 'Escape' && openState) closeModal(); });

      // Click outside to close (desktop)
      document.addEventListener('click', (evt) => {
        if (!openState) return;
        if (!wrap.contains(evt.target)) closeModal();
      });

      // If some other script toggles [open], re-route through WAAPI so it animates
      details.addEventListener('toggle', () => {
        if (details.open && !openState) { details.removeAttribute('open'); openModal(); }
        if (!details.open && openState) { details.setAttribute('open', ''); closeModal(); }
      });
    });
  }

  // Init + Theme Editor rebind
  const init = (root) => bindSearchModals(root);
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => init(document));
  } else {
    init(document);
  }
  document.addEventListener('shopify:section:load', (e) => init(e.target));
})();

