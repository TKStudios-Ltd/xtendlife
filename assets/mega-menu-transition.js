/* Mega menu: class-driven animation for Dawn (replaces <details> default) */
(() => {
  function bind(root = document) {
    const menus = root.querySelectorAll('details.mega-menu');
    menus.forEach((details) => {
      if (details.__megaBound) return;
      details.__megaBound = true;

      const summary = details.querySelector('summary');
      const content = details.querySelector('.mega-menu__content');
      if (!summary || !content) return;

      // Ensure content is not hard-hidden, we’ll manage visibility
      content.removeAttribute('hidden');

      function openMenu() {
        if (details.open) return;      // keep state in sync
        details.setAttribute('open', '');        // a11y/escape behavior
        content.classList.add('is-open');        // animate open
      }

      function closeMenu() {
        if (!details.open) return;
        // Keep [open] during the animation; remove it after transition ends
        content.classList.remove('is-open');     // animate close

        const onEnd = (e) => {
          if (e && e.target !== content) return; // ignore children
          content.removeEventListener('transitionend', onEnd);
          details.removeAttribute('open');       // fully closed now
        };

        // If no transition fires, fail-safe after 400ms
        content.addEventListener('transitionend', onEnd, { once: true });
        setTimeout(() => {
          if (details.open) details.removeAttribute('open');
        }, 450);
      }

      // Intercept native toggle so it doesn't insta-remove [open]
      summary.addEventListener('click', (ev) => {
        ev.preventDefault(); // cancel <details> native toggle
        ev.stopPropagation();

        if (details.open) {
          closeMenu();
        } else {
          openMenu();
        }
      });

      // Close on Escape (matches Dawn behavior)
      details.addEventListener('keyup', (e) => {
        if (e.key === 'Escape' && details.open) {
          closeMenu();
          summary.focus();
        }
      });

      // Defensive: if something else toggles [open], keep classes in sync
      details.addEventListener('toggle', () => {
        if (details.open) {
          content.classList.add('is-open');
        } else {
          content.classList.remove('is-open');
        }
      });
    });
  }

  // Initial + Theme Editor rebinds
  const ready = () => bind();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ready);
  } else {
    ready();
  }
  document.addEventListener('shopify:section:load', (e) => bind(e.target));
})();
