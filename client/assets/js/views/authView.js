/**
 * Auth View Component
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
              ${this.isSignUp ? 'Enter your details to register' : 'Enter your credentials to access your dashboard'}
            </p>
          </div>

          <form id="auth-form">
            <div class="form-group">
              <label class="form-label" for="auth-email">Email Address</label>
              <input type="email" id="auth-email" class="form-control" placeholder="name@example.com" value="" required />
            </div>

            <div class="form-group">
              <label class="form-label" for="auth-password">Password</label>
              <input type="password" id="auth-password" class="form-control" placeholder="••••••••" value="" required />
            </div>

            <button type="submit" id="auth-submit-btn" class="btn btn-primary" style="width: 100%; margin-top: 10px;">
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

    toggleBtn.onclick = (e) => {
      e.preventDefault();
      this.isSignUp = !this.isSignUp;
      this.render(document.getElementById('content-area'));
    };

    form.onsubmit = async (e) => {
      e.preventDefault();
      const email = document.getElementById('auth-email').value;
      const password = document.getElementById('auth-password').value;
      const submitBtn = document.getElementById('auth-submit-btn');

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
        Toast.error(err.message || 'Authentication failed');
      } finally {
        submitBtn.disabled = false;
      }
    };
  }
};
