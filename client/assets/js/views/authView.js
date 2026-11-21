/**
 * Auth View Component with Full Validation & Supabase Integration
 */
const AuthView = {
  isSignUp: false,

  render(container) {
    container.innerHTML = `
      <div class="flex min-h-dvh flex-col justify-center bg-surface px-5 py-8 md:bg-canvas">
        <div class="mx-auto w-full max-w-sm md:rounded-sheet md:border md:border-line md:bg-surface md:p-8 md:shadow-card">
          <div class="mb-7">
            <span class="grid size-11 place-items-center rounded-xl bg-accent-soft text-accent">${UI.icon('sun', 'size-6')}</span>
            <h2 id="auth-title-text" class="mt-4 text-2xl font-semibold tracking-tight">${this.isSignUp ? 'Create your account' : 'Welcome back'}</h2>
            <p id="auth-subtitle-text" class="mt-1 text-sm text-ink-3">
              ${this.isSignUp ? 'Start tracking your rooftop solar.' : 'Sign in to your Solar Tracker.'}
            </p>
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
              <input type="password" id="auth-password" class="input" placeholder="Minimum 6 characters" autocomplete="${this.isSignUp ? 'new-password' : 'current-password'}" required minlength="6" />
            </div>

            ${this.isSignUp ? `
              <div class="field">
                <label class="label" for="auth-confirm-password">Confirm password</label>
                <input type="password" id="auth-confirm-password" class="input" placeholder="Repeat password" autocomplete="new-password" required minlength="6" />
              </div>
            ` : ''}

            <button type="submit" id="auth-submit-btn" class="btn btn-primary btn-block mt-1 min-h-12">
              <i data-lucide="${this.isSignUp ? 'user-plus' : 'log-in'}" aria-hidden="true"></i>
              <span>${this.isSignUp ? 'Sign Up' : 'Sign In'}</span>
            </button>
          </form>

          <p class="mt-6 text-center text-sm text-ink-3">
            <span id="auth-toggle-text">${this.isSignUp ? 'Already have an account?' : "Don't have an account?"}</span>
            <a href="#" id="auth-toggle-btn" class="ml-1 inline-flex min-h-11 items-center font-semibold text-ink underline underline-offset-2">
              ${this.isSignUp ? 'Sign In' : 'Sign Up'}
            </a>
          </p>
        </div>
      </div>
    `;

    if (window.lucide) lucide.createIcons();
    this.bindEvents();
  },

  bindEvents() {
    const form = document.getElementById('auth-form');
    const toggleBtn = document.getElementById('auth-toggle-btn');
    const alertBanner = document.getElementById('auth-alert-banner');

    toggleBtn.onclick = (e) => {
      e.preventDefault();
      this.isSignUp = !this.isSignUp;
      this.render(document.getElementById('content-area'));
    };

    form.onsubmit = async (e) => {
      e.preventDefault();
      alertBanner.style.display = 'none';

      const email = document.getElementById('auth-email').value.trim();
      const password = document.getElementById('auth-password').value;
      const confirmPasswordEl = document.getElementById('auth-confirm-password');
      const submitBtn = document.getElementById('auth-submit-btn');

      // Validation 1: Email Format Regex
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        alertBanner.textContent = 'Please enter a valid email address.';
        alertBanner.style.display = 'block';
        Toast.error('Please enter a valid email address.');
        return;
      }

      // Validation 2: Password Minimum Length
      if (password.length < 6) {
        alertBanner.textContent = 'Password must be at least 6 characters long.';
        alertBanner.style.display = 'block';
        Toast.error('Password must be at least 6 characters long.');
        return;
      }

      // Validation 3: Confirm Password Match (on Sign Up)
      if (this.isSignUp && confirmPasswordEl) {
        const confirmPassword = confirmPasswordEl.value;
        if (password !== confirmPassword) {
          alertBanner.textContent = 'Passwords do not match. Please verify.';
          alertBanner.style.display = 'block';
          Toast.error('Passwords do not match.');
          return;
        }
      }

      submitBtn.disabled = true;
      submitBtn.innerHTML = `${UI.spinner()}<span>Please wait...</span>`;

      try {
        if (this.isSignUp) {
          const result = await Auth.signUp(email, password);
          if (result.needsConfirmation) {
            Toast.success('Account created! Check your email to confirm it, then sign in.');
            return;
          }
          Toast.success('Account created successfully!');
        } else {
          await Auth.signIn(email, password);
          Toast.success('Logged in successfully!');
        }
        Router.navigate('dashboard');
      } catch (err) {
        const errorMsg = err.message || 'Invalid credentials or login failed.';
        alertBanner.textContent = errorMsg;
        alertBanner.style.display = 'block';
        Toast.error(errorMsg);
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<i data-lucide="${this.isSignUp ? 'user-plus' : 'log-in'}"></i><span>${this.isSignUp ? 'Sign Up' : 'Sign In'}</span>`;
        if (window.lucide) lucide.createIcons();
      }
    };
  }
};
