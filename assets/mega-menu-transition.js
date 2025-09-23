/* Mega menu: animate every open/close (Dawn fix) */
(() => {
  function bind(root = document) {
    root.querySelectorAll('details.mega-menu').forEach((details) => {
      const content = details.querySelector('.mega-menu__content');
      if (!content || content.__bound) return;
      content.__bound = true;

      // Let it be renderable so transitions can run
      content.removeAttribute('hidden');

      details.addEventListener('toggle', () => {
        if (details.open) {
          // Opening: ensure it's not hidden and force a reflow so the tween always starts
          content.removeAttribute('hidden');
          void content.offsetWidth; // reflow
        } else {
          // Closing: wait for the transition to finish, then hide for a11y/tab order
          const onEnd = (e) => {
            if (e && e.target !== content) return;
            content.setAttribute('hidden', '');
            content.removeEventListener('transitionend', onEnd);
          };
          content.addEventListener('transitionend', onEnd, { once: true });

          // Fallback in case transitionend doesn’t fire (e.g., property change)
          setTimeout(() => {
            if (!details.open) content.setAttribute('hidden', '');
          }, 700);
        }
      });
    });
  }

  // Initial load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => bind());
  } else {
    bind();
  }

  // Re-bind when the Header section is re-rendered (Shopify Theme Editor / Section Rendering API)
  document.addEventListener('shopify:section:load', (ev) => bind(ev.target));
})();
