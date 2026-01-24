<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="utf-8">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Forgot Password | Reset Your Password</title>
  <link rel="stylesheet" href="<?php echo base_url("assets/authstyles.css") ?>">
</head>

<body>
  <!-- Toast Notification -->
  <?php if ($this->session->flashdata('toast_success')): ?>
    <div id="toast" class="toast success">
      <?= $this->session->flashdata('toast_success') ?>
    </div>
  <?php endif; ?>

  <?php if ($this->session->flashdata('toast_error')): ?>
    <div id="toast" class="toast error">
      <?= $this->session->flashdata('toast_error') ?>
    </div>
  <?php endif; ?>

  <div>
    <form class="form" method="post" action="<?= site_url('AuthController/sendResetLink') ?>" id="forgotPasswordForm">
      <div class="flex-column">
        <h2>Forgot Password</h2>
        <p style="color: #999; font-size: 0.9rem; margin-top: 0.5rem; text-align: center;">
          Enter your email address and we'll send you a link to reset your password.
        </p>
      </div>

      <!-- Server-side error message -->
      <?php if (isset($error)): ?>
        <div class="error-msg">
          <?= $error ?>
        </div>
      <?php endif; ?>

      <!-- Email Field -->
      <div class="flex-column">
        <label for="email">Email Address</label>
      </div>
      <div class="inputForm" id="emailInput">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" viewBox="0 0 24 24" height="20" fill="none">
          <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
            d="M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7z"/>
          <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
            d="m4 7 8 5 8-5"/>
        </svg>
        <input placeholder="Enter your email address" class="input" type="email" name="email" id="email"
          autocomplete="email" required>
      </div>
      <div id="emailValidation"></div>

      <button class="button-submit" type="submit" id="submitBtn">
        <span>Send Reset Link</span>
      </button>

      <p class="p">Remember your password?
        <span class="span">
          <a href='<?= site_url('AuthController') ?>'>Sign In</a>
        </span>
      </p>
    </form>
  </div>

  <script src="https://code.jquery.com/jquery-3.7.1.min.js"
    integrity="sha256-/JqT3SQfawRcv/BIHPThkBvs0OEvtFFmqPF/lYI/Cxo=" crossorigin="anonymous"></script>
  <script>
    // Toast notification
    const toast = document.getElementById("toast");
    if (toast) {
      setTimeout(() => toast.classList.add("show"), 100);
      setTimeout(() => {
        toast.classList.remove("show");
        setTimeout(() => toast.remove(), 400);
      }, 3000);
    }

    // Email validation
    const emailInput = document.getElementById('email');
    const emailDiv = document.getElementById('emailInput');
    const emailValidation = document.getElementById('emailValidation');

    emailInput.addEventListener('input', function() {
      const email = this.value.trim();
      if (!email) {
        emailDiv.classList.remove('error', 'success');
        emailValidation.innerHTML = '';
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        emailDiv.classList.add('error');
        emailDiv.classList.remove('success');
        emailValidation.innerHTML = '<div class="validation-msg error">⚠ Invalid email format</div>';
      } else {
        emailDiv.classList.remove('error');
        emailDiv.classList.add('success');
        emailValidation.innerHTML = '<div class="validation-msg success">✓ Valid email</div>';
      }
    });

    // Form submission
    document.getElementById('forgotPasswordForm').addEventListener('submit', function(e) {
      const email = emailInput.value.trim();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!email || !emailRegex.test(email)) {
        e.preventDefault();
        showToast('Please enter a valid email address', 'error');
        return;
      }

      lockButton('submitBtn', 'Sending...');
    });

    function lockButton(id, text) {
      const btn = document.getElementById(id);
      if (!btn) return;
      btn.disabled = true;
      btn.classList.add('loading');
      btn.querySelector('span').textContent = text;
    }

    function showToast(message, type = 'error', duration = 3000) {
      const t = document.createElement('div');
      t.className = `toast ${type}`;
      t.textContent = message;
      document.body.appendChild(t);
      setTimeout(() => t.classList.add('show'), 5);
      setTimeout(() => {
        t.classList.remove('show');
        setTimeout(() => t.remove(), 300);
      }, duration);
    }
  </script>
</body>

</html>