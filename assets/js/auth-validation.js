/**
 * Authentication Form Validation
 * Unified client-side validation for Register & Login
 */

// -------------------------------
// Validation State
// -------------------------------
const validationState = {
	username: false,
	email: false,
	password: false,
	confirmPassword: false,
};

const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");

// -------------------------------
// Username Validation
// -------------------------------
function validateUsername(username) {
	const usernameInput = document.getElementById("usernameInput");
	const validationDiv = document.getElementById("usernameValidation");

	if (!username) {
		usernameInput.classList.remove("error", "success");
		if (validationDiv) validationDiv.innerHTML = "";
		validationState.username = false;
		return false;
	}

	const errors = [];
	if (username.length < 3)
		errors.push("Username must be at least 3 characters long");
	if (!/^[a-zA-Z0-9]+$/.test(username))
		errors.push("Username can only contain letters and numbers");
	if (!/^(?=(?:.*[a-zA-Z]){3,}).+$/.test(username))
		errors.push("Username must contain at least 3 alphabets");

	if (errors.length > 0) {
		usernameInput.classList.add("error");
		usernameInput.classList.remove("success");
		if (!loginForm && validationDiv)
			validationDiv.innerHTML = errors
				.map((e) => `<div class="validation-msg error">⚠ ${e}</div>`)
				.join("");
		validationState.username = false;
		return false;
	}

	usernameInput.classList.remove("error");
	usernameInput.classList.add("success");
	if (!loginForm && validationDiv)
		validationDiv.innerHTML = `<div class="validation-msg success">✓ Valid username</div>`;
	validationState.username = true;
	return true;
}

// -------------------------------
// Email Validation
// -------------------------------
function validateEmail(email) {
	const emailInput = document.getElementById("emailInput");
	const validationDiv = document.getElementById("emailValidation");

	if (!email) {
		if (emailInput) emailInput.classList.remove("error", "success");
		if (validationDiv) validationDiv.innerHTML = "";
		validationState.email = false;
		return false;
	}

	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	
	if (!emailRegex.test(email)) {
		if (emailInput) {
			emailInput.classList.add("error");
			emailInput.classList.remove("success");
		}
		if (validationDiv)
			validationDiv.innerHTML = `<div class="validation-msg error">⚠ Invalid email format</div>`;
		validationState.email = false;
		return false;
	}

	if (emailInput) {
		emailInput.classList.remove("error");
		emailInput.classList.add("success");
	}
	if (validationDiv)
		validationDiv.innerHTML = `<div class="validation-msg success">✓ Valid email</div>`;
	validationState.email = true;
	return true;
}

// -------------------------------
// Password Strength (Register Only)
// -------------------------------
function calculatePasswordStrength(password) {
	const req = {
		length: password.length >= 8,
		uppercase: /[A-Z]/.test(password),
		lowercase: /[a-z]/.test(password),
		number: /[0-9]/.test(password),
		special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
	};
	const met = Object.values(req).filter(Boolean).length;

	return {
		strength:
			met >= 5 ? "strong" : met >= 4 ? "good" : met >= 3 ? "fair" : "weak",
		requirements: req,
	};
}

function updatePasswordStrength(password) {
	const container = document.getElementById("passwordStrength");
	if (!container) return;

	const strengthFill = document.getElementById("strengthFill");
	const strengthText = document.getElementById("strengthText");

	if (!password) {
		container.style.display = "none";
		validationState.password = false;
		return;
	}

	container.style.display = "block";
	const { strength, requirements } = calculatePasswordStrength(password);

	strengthFill.className = `strength-fill ${strength}`;
	strengthText.textContent = `Password Strength: ${
		strength.charAt(0).toUpperCase() + strength.slice(1)
	}`;

	Object.entries(requirements).forEach(([k, v]) => {
		const el = document.getElementById(`req-${k}`);
		if (el) el.classList.toggle("met", v);
	});

	validationState.password = strength === "good" || strength === "strong";
	return strength;
}

// -------------------------------
// Confirm Password (Register/Reset Only)
// -------------------------------
function validatePasswordConfirmation() {
	const pass = document.getElementById("password");
	const cpass = document.getElementById("cpassword");
	const container = document.getElementById("confirmPasswordValidation");

	if (!pass || !cpass || !container) return;

	if (!cpass.value) {
		container.innerHTML = "";
		validationState.confirmPassword = false;
		return;
	}

	if (pass.value !== cpass.value) {
		container.innerHTML = `<div class="validation-msg error">⚠ Passwords do not match</div>`;
		validationState.confirmPassword = false;
		return;
	}

	container.innerHTML = `<div class="validation-msg success">✓ Passwords match</div>`;
	validationState.confirmPassword = true;
}

// -------------------------------
// Common Password Toggle
// -------------------------------
function togglePassword(fieldId) {
	const field = document.getElementById(fieldId);
	if (!field) return;
	const closed = field.parentElement.querySelector(".eye-closed");
	const open = field.parentElement.querySelector(".eye-open");

	field.type = field.type === "password" ? "text" : "password";
	if (closed) closed.style.display = field.type === "password" ? "block" : "none";
	if (open) open.style.display = field.type === "password" ? "none" : "block";
}

// -------------------------------
// Init
// -------------------------------
document.addEventListener("DOMContentLoaded", () => {
	const uname = document.getElementById("uname");
	const email = document.getElementById("email");
	const pass = document.getElementById("password");
	const cpass = document.getElementById("cpassword");
	const resetPasswordForm = document.getElementById("resetPasswordForm");

	// Username events (shared - login & register)
	if (uname) {
		uname.addEventListener("input", (e) => validateUsername(e.target.value));
		uname.addEventListener("keypress", (e) => {
			if (!/^[a-zA-Z0-9]$/.test(e.key)) {
				e.preventDefault();
				const usernameInput = document.getElementById("usernameInput");
				if (usernameInput) {
					usernameInput.classList.add("error");
					setTimeout(() => usernameInput.classList.remove("error"), 300);
				}
			}
		});
	}

	// Email events (register only)
	if (email && registerForm) {
		email.addEventListener("input", (e) => validateEmail(e.target.value));
	}

	// Register password events
	if (pass && registerForm) {
		pass.addEventListener("input", (e) => {
			updatePasswordStrength(e.target.value);
			validatePasswordConfirmation();
		});
	}

	// Reset password events
	if (pass && resetPasswordForm) {
		pass.addEventListener("input", (e) => {
			updatePasswordStrength(e.target.value);
			validatePasswordConfirmation();
		});
	}

	// Confirm password events
	if (cpass && (registerForm || resetPasswordForm)) {
		cpass.addEventListener("input", validatePasswordConfirmation);
	}

	// Register submit
	if (registerForm) {
		registerForm.addEventListener("submit", (e) => {
			const strength = updatePasswordStrength(pass.value);
			const validUser = validateUsername(uname.value);
			const validEmail = validateEmail(email.value);

			if (
				!validUser ||
				!validEmail ||
				!strength ||
				!(strength === "good" || strength === "strong") ||
				!validationState.confirmPassword
			) {
				e.preventDefault();
				showToast("Please fix all errors before creating account", "error");
				return;
			}

			lockButton("submitBtn", "Creating Account...");
		});
	}

	// Reset password submit
	if (resetPasswordForm) {
		resetPasswordForm.addEventListener("submit", (e) => {
			const strength = updatePasswordStrength(pass.value);

			if (
				!strength ||
				!(strength === "good" || strength === "strong") ||
				!validationState.confirmPassword
			) {
				e.preventDefault();
				showToast("Please fix all errors before resetting password", "error");
				return;
			}

			lockButton("submitBtn", "Resetting Password...");
		});
	}

	// Login submit (minimal validation)
	if (loginForm) {
		loginForm.addEventListener("submit", (e) => {
			// For login, username can be email too, so we don't validate strictly
			if (!uname.value.trim()) {
				e.preventDefault();
				showToast("Username or email cannot be empty", "error");
				return;
			}

			if (!pass.value.trim()) {
				e.preventDefault();
				showToast("Password cannot be empty", "error");
				return;
			}

			if (pass.value.length < 4) {
				e.preventDefault();
				showToast("Password too short", "warning");
				return;
			}

			lockButton(null, "Signing In...", loginForm);
		});
	}
});

// -------------------------------
// Helpers
// -------------------------------
function lockButton(id, text, form = null) {
	const btn = id
		? document.getElementById(id)
		: form ? form.querySelector(".button-submit") : null;
	if (!btn) return;
	btn.disabled = true;
	btn.classList.add("loading");
	const span = btn.querySelector("span");
	if (span) span.textContent = text;
}

function showToast(message, type = "error", duration = 3000) {
	const t = document.createElement("div");
	t.className = `toast ${type}`;
	t.textContent = message;
	document.body.appendChild(t);
	setTimeout(() => t.classList.add("show"), 5);
	setTimeout(() => {
		t.classList.remove("show");
		setTimeout(() => t.remove(), 300);
	}, duration);
}