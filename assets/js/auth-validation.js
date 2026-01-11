/**
 * Authentication Form Validation
 * Unified client-side validation for Register & Login
 */

// -------------------------------
// Validation State
// -------------------------------
const validationState = {
	username: false,
	password: false,
	confirmPassword: false,
};

const loginForm = document.getElementById("loginForm");

// -------------------------------
// Username Validation
// -------------------------------
function validateUsername(username) {
	const usernameInput = document.getElementById("usernameInput");
	const validationDiv = document.getElementById("usernameValidation");

	if (!username) {
		usernameInput.classList.remove("error", "success");
		validationDiv.innerHTML = "";
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
		if (!loginForm)
			validationDiv.innerHTML = errors
				.map((e) => `<div class="validation-msg error">⚠ ${e}</div>`)
				.join("");
		validationState.username = false;
		return false;
	}

	usernameInput.classList.remove("error");
	usernameInput.classList.add("success");
	if (!loginForm)
		validationDiv.innerHTML = `<div class="validation-msg success">✓ Valid username</div>`;
	validationState.username = true;
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
// Confirm Password (Register Only)
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
	closed.style.display = field.type === "password" ? "block" : "none";
	open.style.display = field.type === "password" ? "none" : "block";
}

// -------------------------------
// Init
// -------------------------------
document.addEventListener("DOMContentLoaded", () => {
	const uname = document.getElementById("uname");
	const pass = document.getElementById("password");
	const cpass = document.getElementById("cpassword");
	const registerForm = document.getElementById("registerForm");

	// Username events (shared)
	if (uname) {
		uname.addEventListener("input", (e) => validateUsername(e.target.value));
		uname.addEventListener("keypress", (e) => {
			if (!/^[a-zA-Z0-9]$/.test(e.key)) {
				e.preventDefault();
				document.getElementById("usernameInput").classList.add("error");
				setTimeout(
					() =>
						document.getElementById("usernameInput").classList.remove("error"),
					300
				);
			}
		});
	}

	// Register password events
	if (pass && registerForm) {
		pass.addEventListener("input", (e) => {
			updatePasswordStrength(e.target.value);
			validatePasswordConfirmation();
		});
	}

	// Confirm password events
	if (cpass && registerForm) {
		cpass.addEventListener("input", validatePasswordConfirmation);
	}

	// Register submit
	if (registerForm) {
		registerForm.addEventListener("submit", (e) => {
			const strength = updatePasswordStrength(pass.value);
			const validUser = validateUsername(uname.value);

			if (
				!validUser ||
				!strength ||
				!(strength === "good" || strength === "strong") ||
				!validationState.confirmPassword
			) {
				e.preventDefault();
				showToast("Fix errors before creating account", "error");
				return;
			}

			lockButton("submitBtn", "Creating Account...");
		});
	}

	// Login submit (minimal validation)
	if (loginForm) {
		loginForm.addEventListener("submit", (e) => {
			const validUser = validateUsername(uname.value);

			if (!validUser) {
				e.preventDefault();
				showToast("Invalid username or password", "error");
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
		: form.querySelector(".button-submit");
	if (!btn) return;
	btn.disabled = true;
	btn.classList.add("loading");
	btn.querySelector("span").textContent = text;
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
