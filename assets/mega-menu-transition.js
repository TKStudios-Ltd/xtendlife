/* Mega menu transition debugger for Dawn */
(() => {
  const LOG = true;
  const log = (...args) => LOG && console.log('[MegaMenu]', ...args);

  function parseTime(s) {
    s = String(s || '').trim();
    if (!s) return 0;
    if (s.endsWith('ms')) return parseFloat(s) / 1000;
    if (s.endsWith('s')) return parseFloat(s);
    const n = parseFloat(s);
    return Number.isNaN(n) ? 0 : n;
  }

  function findAllMegaMenus(root = document) {
    // Be liberal across Dawn versions
    const selectors = [
      'details.mega-menu',
      'header-menu details.mega-menu',
      'sticky-header details.mega-menu',
    ];
    const set = new Set();
    selectors.forEach((sel) =>
      root.querySelectorAll(sel).forEach((el) => set.add(el))
    );
    return [...set];
  }

  function bind(root = document) {
    const detailsList = findAllMegaMenus(root);
    log('bind(): found', detailsList.length, 'mega menus in', root);

    detailsList.forEach((details, idx) => {
      const content =
        details.querySelector('.mega-menu__content') ||
        details.querySelector('[class*="mega-menu__content"]');

      if (!content) {
        log('WARN: no .mega-menu__content inside', details);
        return;
      }
      if (content.__bound) {
        log('skip already bound', details.id || `#${idx}`);
        return;
      }
      content.__bound = true;

      log('binding menu', details.id || `#${idx}`, 'content:', content);

      // Ensure renderable so transitions can run
      if (content.hasAttribute('hidden')) {
        log('init: removing [hidden]');
        content.removeAttribute('hidden');
      }

      // Helpful: print current transition props
      const cs = getComputedStyle(content);
      log('content transition:', {
        property: cs.transitionProperty,
        duration: cs.transitionDuration,
        delay: cs.transitionDelay,
      });

      details.addEventListener('toggle', () => {
        log('toggle:', { id: details.id, open: details.open });

        if (details.open) {
          // Opening
          if (content.hasAttribute('hidden')) {
            log('opening: removing [hidden]');
            content.removeAttribute('hidden');
          } else {
            log('opening: [hidden] was already not set');
          }
          // Force reflow so the tween always starts
            // eslint-disable-next-line no-unused-expressions
          content.offsetWidth;
          log('opening: forced reflow; should animate opacity/transform now');
        } else {
          // Closing
          const onEnd = (e) => {
            if (e && e.target !== content) {
              // Ignore transitionend from children
              return;
            }
            log('transitionend on content → set [hidden]');
            content.setAttribute('hidden', '');
            content.removeEventListener('transitionend', onEnd);
          };
          content.addEventListener('transitionend', onEnd, { once: true });

          // Fallback timeout in case transitionend never fires
          const s = getComputedStyle(content);
          const maxDur = Math.max(
            ...s.transitionDuration.split(',').map(parseTime)
          );
          const maxDelay = Math.max(
            ...s.transitionDelay.split(',').map(parseTime)
          );
          const wait = Math.ceil((maxDur + maxDelay) * 1000) + 50;

          log('closing: waiting ~', wait, 'ms for transitionend fallback');
          setTimeout(() => {
            if (!details.open && !content.hasAttribute('hidden')) {
              log('fallback timeout → set [hidden]');
              content.setAttribute('hidden', '');
            }
          }, wait);
        }
      });
    });
  }

  // Initial bind
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => bind());
  } else {
    bind();
  }

  // Re-bind when Header section is re-rendered (Theme Editor / Section Rendering)
  document.addEventListener('shopify:section:load', (ev) => {
    log('shopify:section:load', ev.target?.id);
    bind(ev.target);
  });
})();
