// Augment predictive search with Articles when Dawn doesn't return them.
// Safe: does not modify predictive-search.js. Works by observing the dropdown render.

(function () {
  const MAX_ARTICLES = 6;

  // Utility: debounce to avoid hammering suggest endpoint while typing fast
  function debounce(fn, delay) {
    let t;
    return function (...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  function buildArticleLI(article, idx) {
    const title = article.title || '';
    const url = article.url || '#';
    const li = document.createElement('li');
    li.id = `predictive-search-option-article-augment-${idx + 1}`;
    li.className = 'predictive-search__list-item';
    li.setAttribute('role', 'option');
    li.setAttribute('aria-selected', 'false');
    li.innerHTML = `
      <a href="${url}" class="predictive-search__item link link--text" tabindex="-1">
        <div class="predictive-search__item-content predictive-search__item-content--centered">
          <p class="predictive-search__item-heading h5">${title.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
        </div>
      </a>
    `;
    return li;
  }

  async function fetchArticles(term) {
    const res = await fetch(
      `/search/suggest.json?q=${encodeURIComponent(term)}&resources[type]=article&resources[limit]=${MAX_ARTICLES}`
    );
    if (!res.ok) return [];
    const json = await res.json();
    // Path: resources.results.articles (Shopify suggest.json)
    return (json && json.resources && json.resources.results && json.resources.results.articles) || [];
  }

  // When the predictive dropdown renders (Dawn updates innerHTML),
  // we look for the articles UL; if empty, we query suggest.json to fill it.
  async function tryPopulateArticles(container) {
    if (!container) return;

    // Find the root predictive-search custom element this container belongs to
    const root = container.closest('predictive-search');
    if (!root) return;

    // Get the current term from the input inside this predictive-search instance
    const input = root.querySelector('input[type="search"]');
    const term = (input && input.value && input.value.trim()) || '';
    if (!term) return;

    const ul = container.querySelector('#predictive-search-results-articles-list');
    if (!ul) return;

    // If Dawn already filled articles, do nothing
    if (ul.children && ul.children.length > 0) return;

    // Avoid repeat fetch for the same term within this instance
    const key = `__articles_fetching_${term}`;
    if (root[key]) return;
    root[key] = true;

    try {
      const articles = await fetchArticles(term);
      ul.innerHTML = ''; // clear any placeholders
      if (!articles.length) {
        // Optional: show a minimal “no articles” note or leave blank
        // ul.innerHTML = '<li class="predictive-search__list-item"><div class="predictive-search__item-content predictive-search__item-content--centered"><p class="predictive-search__item-heading h5">No articles found</p></div></li>';
        return;
      }
      articles.forEach((a, i) => ul.appendChild(buildArticleLI(a, i)));
    } catch (e) {
      // Silently fail to keep dropdown stable
      console.warn('Article augment error', e);
    } finally {
      // Allow future terms to fetch again
      setTimeout(() => { root[key] = false; }, 50);
    }
  }

  // Observe predictive dropdown updates
  function attachObserver(psEl) {
    const resultsHost = psEl.querySelector('[data-predictive-search]');
    if (!resultsHost) return;

    const debouncedPopulate = debounce(() => tryPopulateArticles(resultsHost), 60);

    const mo = new MutationObserver(debouncedPopulate);
    mo.observe(resultsHost, { childList: true, subtree: true });
    // Also try immediately in case it's already open
    debouncedPopulate();
  }

  // Initialize on page load and on subsequent AJAX loads
  function initAll() {
    document.querySelectorAll('predictive-search').forEach(attachObserver);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }

  // In case sections are re-rendered dynamically (e.g., via Shopify sections),
  // re-init observers after brief delay.
  document.addEventListener('shopify:section:load', () => setTimeout(initAll, 50));
})();
