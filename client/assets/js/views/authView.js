/**
 * Auth View Component with Full Validation & Supabase Integration
 */
const AuthView = {
  isSignUp: false,

  render(container) {
    container.innerHTML = `
      <div class="auth-wrapper">
        <div class="auth-card">
          <div class="auth-header">
            <div class="auth-brand">
              <div class="brand-icon"><i data-lucide="sun"></i></div>
              <span class="brand-title" style="font-size: 1.3rem;">Solar Tracker</span>
            </div>
            <h2 id="auth-title-text" class="auth-title">${this.isSignUp ? 'Create your account' : 'Welcome back'}</h2>
            <p id="auth-subtitle-text" class="auth-subtitle">
              ${this.isSignUp ? 'Enter your email & password to register' : 'Enter your email & password to access your dashboard'}
            </p>
          </div>

          <!-- Alert message banner for error feedback -->
          <div id="auth-alert-banner" style="display: none; padding: 12px; border-radius: var(--radius-md); background: var(--danger-50); color: var(--danger-600); border: 1px solid var(--danger-200); font-size: 0.85rem; margin-bottom: 16px;"></div>

          <form id="auth-form">
            <div class="form-group">
              <label class="form-label" for="auth-email">Email Address</label>
              <input type="email" id="auth-email" class="form-control" placeholder="name@example.com" value="" required />
            </div>

            <div class="form-group">
              <label class="form-label" for="auth-password">Password</label>
              <input type="password" id="auth-password" class="form-control" placeholder="Minimum 6 characters" value="" required minlength="6" />
            </div>

            ${this.isSignUp ? `
              <div class="form-group">
                <label class="form-label" for="auth-confirm-password">Confirm Password</label>
                <input type="password" id="auth-confirm-password" class="form-control" placeholder="Repeat password" value="" required minlength="6" />
              </div>
            ` : ''}

            <button type="submit" id="auth-submit-btn" class="btn btn-primary" style="width: 100%; margin-top: 14px;">
              <i data-lucide="${this.isSignUp ? 'user-plus' : 'log-in'}"></i>
              <span>${this.isSignUp ? 'Sign Up' : 'Sign In'}</span>
            </button>
          </form>

          <div style="text-align: center; margin-top: 24px; font-size: 0.88rem; color: var(--text-secondary);">
            <span id="auth-toggle-text">${this.isSignUp ? 'Already have an account?' : "Don't have an account?"}</span>
            <a href="#" id="auth-toggle-btn" style="color: var(--primary-600); font-weight: 600; margin-left: 6px;">
              ${this.isSignUp ? 'Sign In' : 'Sign Up'}
            </a>
          </div>
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
      submitBtn.innerHTML = `<span>Processing...</span>`;

      try {
        if (this.isSignUp) {
          await Auth.signUp(email, password);
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
