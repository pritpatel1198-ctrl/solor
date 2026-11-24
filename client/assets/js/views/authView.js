/**
 * Sign-in screen (new accounts are not created from the app)
 */
const AuthView = {
  render(container) {
    container.innerHTML = `
      <div class="flex min-h-dvh flex-col justify-center bg-surface px-5 py-8 md:bg-canvas">
        <div class="mx-auto w-full max-w-sm md:rounded-sheet md:border md:border-line md:bg-surface md:p-8 md:shadow-card">
          <div class="mb-7">
            <span class="grid size-11 place-items-center rounded-xl bg-accent-soft text-accent">${UI.icon('sun', 'size-6')}</span>
            <h2 id="auth-title-text" class="mt-4 text-2xl font-semibold tracking-tight">Welcome back</h2>
            <p id="auth-subtitle-text" class="mt-1 text-sm text-ink-3">Sign in to your Solar Tracker.</p>
          </div>

          <!-- Alert message banner for error feedback -->
          <div id="auth-alert-banner" role="alert" class="mb-4 hidden rounded-control bg-bad-soft px-3 py-2.5 text-sm font-medium text-bad"></div>

          <form id="auth-form" class="flex flex-col gap-4" novalidate>
            <div class="field">
              <label class="label" for="auth-email">Email</label>
              <input type="email" id="auth-email" class="input" placeholder="name@example.com" autocomplete="email" inputmode="email" autocapitalize="none" spellcheck="false" required />
            </div>

            <div class="field">
              <label class="label" for="auth-password">Password</label>
              <div class="relative">
                <input type="password" id="auth-password" class="input pr-12" placeholder="Minimum 6 characters" autocomplete="current-password" required minlength="6" />
                <button type="button" id="auth-password-toggle" class="absolute inset-y-0 right-0 grid w-12 place-items-center rounded-r-control text-ink-3 hover:text-ink" aria-label="Show password" aria-pressed="false" aria-controls="auth-password">
                  ${UI.icon('eye')}
                </button>
              </div>
            </div>

            <button type="submit" id="auth-submit-btn" class="btn btn-primary btn-block mt-1 min-h-12">
              ${UI.icon('log-in')}
              <span>Sign In</span>
            </button>
          </form>
        </div>
      </div>
    `;

    UI.refreshIcons();
    this.bindEvents();
  },

  bindEvents() {
    const form = document.getElementById('auth-form');
    const alertBanner = document.getElementById('auth-alert-banner');
    const passwordInput = document.getElementById('auth-password');
    const toggle = document.getElementById('auth-password-toggle');

    toggle.onclick = () => {
      const show = passwordInput.type === 'password';
      passwordInput.type = show ? 'text' : 'password';
      toggle.setAttribute('aria-pressed', String(show));
      toggle.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
      toggle.innerHTML = UI.icon(show ? 'eye-off' : 'eye');
      UI.refreshIcons();
    };

    form.onsubmit = async (e) => {
      e.preventDefault();
      alertBanner.style.display = 'none';

      const email = document.getElementById('auth-email').value.trim();
      const password = passwordInput.value;
      const submitBtn = document.getElementById('auth-submit-btn');

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        alertBanner.textContent = 'Please enter a valid email address.';
        alertBanner.style.display = 'block';
        return;
      }

      if (password.length < 6) {
        alertBanner.textContent = 'Password must be at least 6 characters long.';
        alertBanner.style.display = 'block';
        return;
      }

      submitBtn.disabled = true;
      submitBtn.innerHTML = `${UI.spinner()}<span>Please wait...</span>`;

      try {
        await Auth.signIn(email, password);
        Toast.success('Logged in successfully!');
        Router.navigate('dashboard');
      } catch (err) {
        alertBanner.textContent = err.message || 'Invalid credentials or login failed.';
        alertBanner.style.display = 'block';
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `${UI.icon('log-in')}<span>Sign In</span>`;
        UI.refreshIcons();
      }
    };
  }
};
