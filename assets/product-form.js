if (!customElements.get('product-form')) {
  customElements.define(
    'product-form',
    class ProductForm extends HTMLElement {
      constructor() {
        super();
        this._inited = false;
        this._observer = null;
        this._warned = false;
        this.onSubmitHandler = this.onSubmitHandler?.bind(this);
      }

      connectedCallback() {
        // Defer a tick so children parse, then try init.
        queueMicrotask(() => this._ensureInit());
      }

      disconnectedCallback() {
        this._teardown();
      }

      _ensureInit() {
        if (this._inited) return;

        // Try to locate the form now.
        this.form = this._findForm();

        if (!this.form) {
          // If the form is injected later (e.g. quick add/modal/template),
          // observe until it appears, then init.
          this._observeForForm();
          return;
        }

        // Variant input
        const variantInput = this.form.querySelector('[name="id"]');
        if (!variantInput) {
          // Don’t spam—only warn once per element.
          if (!this._warned) {
            console.warn('[product-form] Missing input[name="id"] inside form. Will no-op for this element.', this);
            this._warned = true;
          }
          return;
        }
        variantInput.disabled = false;

        // Submit button
        this.submitButton = this.querySelector('[type="submit"]');
        if (!this.submitButton) {
          if (!this._warned) {
            console.warn('[product-form] Missing submit button. Will no-op for this element.', this);
            this._warned = true;
          }
          return;
        }
        this.submitButtonText = this.submitButton.querySelector('span') || this.submitButton;

        // Cart target (optional)
        this.cart = document.querySelector('cart-notification') || document.querySelector('cart-drawer');
        if (document.querySelector('cart-drawer')) {
          this.submitButton.setAttribute('aria-haspopup', 'dialog');
        }

        // Error display opt-out
        this.hideErrors = this.dataset.hideErrors === 'true';

        // Events
        this.onSubmitHandler = this.onSubmitHandler.bind(this);
        this.form.addEventListener('submit', this.onSubmitHandler);

        this._inited = true;
        this._disconnectObserver();
      }

      _findForm() {
        // Common cases in Dawn:
        // 1) <product-form><form action="/cart/add">…</form></product-form>
        // 2) content injected later (modal/template) -> observer will catch it
        // 3) very rarely the element itself IS the form (fallback)
        return (
          this.querySelector('form[action*="/cart/add"]') ||
          this.querySelector('form') ||
          (this.matches('form') ? this : null)
        );
      }

      _observeForForm() {
        // Already observing?
        if (this._observer) return;

        this._observer = new MutationObserver(() => {
          const f = this._findForm();
          if (f) {
            this._disconnectObserver();
            this._ensureInit();
          }
        });

        this._observer.observe(this, { childList: true, subtree: true });

        // Optional: after 10s, give up with a single warning
        this._formTimeout = setTimeout(() => {
          this._disconnectObserver();
          if (!this._warned) {
            console.warn('[product-form] No <form> found inside <product-form> after waiting. Skipping init for this element.', this);
            this._warned = true;
          }
        }, 10000);
      }

      _disconnectObserver() {
        if (this._observer) {
          this._observer.disconnect();
          this._observer = null;
        }
        if (this._formTimeout) {
          clearTimeout(this._formTimeout);
          this._formTimeout = null;
        }
      }

      _teardown() {
        this._disconnectObserver();
        if (this.form && this.onSubmitHandler) {
          this.form.removeEventListener('submit', this.onSubmitHandler);
        }
        this._inited = false;
      }

      onSubmitHandler(evt) {
        evt.preventDefault();
        if (this.submitButton.getAttribute('aria-disabled') === 'true') return;

        this.handleErrorMessage();

        this.submitButton.setAttribute('aria-disabled', true);
        this.submitButton.classList.add('loading');
        const spinner = this.querySelector('.loading__spinner');
        if (spinner) spinner.classList.remove('hidden');

        const config = fetchConfig('javascript');
        config.headers['X-Requested-With'] = 'XMLHttpRequest';
        delete config.headers['Content-Type'];

        const formData = new FormData(this.form);

        if (this.cart) {
          formData.append(
            'sections',
            this.cart.getSectionsToRender().map((section) => section.id)
          );
          formData.append('sections_url', window.location.pathname);
          this.cart.setActiveElement(document.activeElement);
        }
        config.body = formData;

        fetch(`${routes.cart_add_url}`, config)
          .then((r) => r.json())
          .then((response) => {
            if (response.status) {
              publish(PUB_SUB_EVENTS.cartError, {
                source: 'product-form',
                productVariantId: formData.get('id'),
                errors: response.errors || response.description,
                message: response.message,
              });
              this.handleErrorMessage(response.description);

              const soldOutMessage = this.submitButton.querySelector('.sold-out-message');
              if (!soldOutMessage) return;
              this.submitButton.setAttribute('aria-disabled', true);
              this.submitButtonText.classList.add('hidden');
              soldOutMessage.classList.remove('hidden');
              this.error = true;
              return;
            } else if (!this.cart) {
              window.location = window.routes.cart_url;
              return;
            }

            const startMarker = CartPerformance.createStartingMarker('add:wait-for-subscribers');
            if (!this.error)
              publish(PUB_SUB_EVENTS.cartUpdate, {
                source: 'product-form',
                productVariantId: formData.get('id'),
                cartData: response,
              }).then(() => {
                CartPerformance.measureFromMarker('add:wait-for-subscribers', startMarker);
              });

            this.error = false;

            const quickAddModal = this.closest('quick-add-modal');
            if (quickAddModal) {
              document.body.addEventListener(
                'modalClosed',
                () => {
                  setTimeout(() => {
                    CartPerformance.measure('add:paint-updated-sections', () => {
                      this.cart.renderContents(response);
                    });
                  });
                },
                { once: true }
              );
              quickAddModal.hide(true);
            } else {
              CartPerformance.measure('add:paint-updated-sections', () => {
                this.cart.renderContents(response);
              });
            }
          })
          .catch(console.error)
          .finally(() => {
            this.submitButton.classList.remove('loading');
            if (this.cart && this.cart.classList.contains('is-empty')) this.cart.classList.remove('is-empty');
            if (!this.error) this.submitButton.removeAttribute('aria-disabled');
            const spinner = this.querySelector('.loading__spinner');
            if (spinner) spinner.classList.add('hidden');
            CartPerformance.measureFromEvent('add:user-action', evt);
          });
      }

      handleErrorMessage(errorMessage = false) {
        if (this.hideErrors) return;
        this.errorMessageWrapper =
          this.errorMessageWrapper || this.querySelector('.product-form__error-message-wrapper');
        if (!this.errorMessageWrapper) return;
        this.errorMessage =
          this.errorMessage || this.errorMessageWrapper.querySelector('.product-form__error-message');

        this.errorMessageWrapper.toggleAttribute('hidden', !errorMessage);
        if (errorMessage && this.errorMessage) {
          this.errorMessage.textContent = errorMessage;
        }
      }

      toggleSubmitButton(disable = true, text) {
        if (disable) {
          this.submitButton.setAttribute('disabled', 'disabled');
          if (text) this.submitButtonText.textContent = text;
        } else {
          this.submitButton.removeAttribute('disabled');
          this.submitButtonText.textContent = window.variantStrings.addToCart;
        }
      }

      get variantIdInput() {
        return this.form ? this.form.querySelector('[name="id"]') : null;
      }
    }
  );
}
