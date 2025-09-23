/* Dawn Mega Menu — WAAPI “big guns” animator */
(() => {
  const DURATION = 350;
  const EASING = 'cubic-bezier(.2,.7,.3,1)';
  const log = (...a) => console.log('[MegaMenuWAAPI]', ...a);

  // Utility
  const isDesktopPointer = () => matchMedia('(pointer:fine)').matches;

  // Close any other open mega menus
  function closeSiblings(current) {
    document.querySelectorAll('details.mega-menu[open]').forEach(d => {
      if (d !== current) d.__api?.close({ force: true });
    });
  }

  function bind(root = document) {
    const menus = root.querySelectorAll('details.mega-menu');
    if (!menus.length) return log('No mega menus found');

    menus.forEach((details, i) => {
      if (details.__bound) return;
      details.__bound = true;

      const summary = details.querySelector('summary');
      const panel = details.querySelector('.mega-menu__content');
      if (!summary || !panel) {
        log('Missing summary or panel in menu', details.id || `#${i}`);
        return;
      }

      let anim = null;
      let openState = details.hasAttribute('open');

      // Ensure panel starts consistent
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

      function killAnim() {
        if (anim) {
          anim.cancel();
          anim = null;
        }
      }

      function show() {
        if (openState) return;
        closeSiblings(details);
        killAnim();

        // Renderable before anim
        panel.removeAttribute('hidden');
        details.setAttribute('open', '');
        panel.style.pointerEvents = 'auto';

        anim = panel.animate(
          [
            { opacity: 0, transform: 'translateY(-16px)' },
            { opacity: 1, transform: 'translateY(0)' }
          ],
          { duration: DURATION, easing: EASING, fill: 'forwards' }
        );
        anim.onfinish = () => { anim = null; };
        anim.oncancel = () => { anim = null; };

        openState = true;
        log('opened', details.id || `#${i}`);
      }

      function hide({ force = false } = {}) {
        if (!openState && !force) return;
        killAnim();

        // Keep [open] during animation for focus/esc, remove after finish
        anim = panel.animate(
          [
            { opacity: 1, transform: 'translateY(0)' },
            { opacity: 0, transform: 'translateY(-16px)' }
          ],
          { duration: DURATION, easing: EASING, fill: 'forwards' }
        );
        const finish = () => {
          details.removeAttribute('open');
          panel.setAttribute('hidden', '');
          panel.style.pointerEvents = 'none';
          anim = null;
          openState = false;
          log('closed', details.id || `#${i}`);
        };
        anim.onfinish = finish;
        anim.oncancel = finish; // defensive
        // Fallback in case browser cancels silently
        setTimeout(() => { if (anim) { try { anim.finish(); } catch {} } }, DURATION + 50);
      }

      // Expose simple API for sibling-closer
      details.__api = { open: show, close: hide };

      // Prevent native <details> toggle; we control it.
      summary.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        openState ? hide() : show();
      });

      // Desktop hover behavior (optional; comment out if you only want click)
      details.addEventListener('mouseenter', () => {
        if (isDesktopPointer()) show();
      });
      details.addEventListener('mouseleave', (e) => {
        if (isDesktopPointer()) hide();
      });

      // Close on Escape
      details.addEventListener('keyup', (e) => {
        if (e.key === 'Escape' && openState) {
          hide();
          summary.focus();
        }
      });

      // Click outside to close
      document.addEventListener('click', (evt) => {
        if (!openState) return;
        if (!details.contains(evt.target)) hide();
      });

      // Neutralize any external toggles (Dawn might still toggle [open])
      details.addEventListener('toggle', () => {
        // If something else opened it, sync our state via show()
        if (details.open && !openState) {
          // Revert native change and open via WAAPI
          details.removeAttribute('open');
          show();
        }
        // If something else closed it, re-close via WAAPI so it animates
        if (!details.open && openState) {
          details.setAttribute('open', '');
          hide();
        }
      });

      log('bound', details.id || `#${i}`);
    });
  }

  // Initial + Theme Editor rebind
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => bind());
  } else {
    bind();
  }
  document.addEventListener('shopify:section:load', (e) => bind(e.target));
})();
