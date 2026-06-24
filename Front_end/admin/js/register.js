const API_BASE = "http://localhost:8000/api";

function getToken() {
  const token = localStorage.getItem("token");
  return token && token !== "null" && token !== "undefined" ? token : null;
}

function checkPasswordStrength(password) {
  if (!password) return null;
  if (password.length < 8) return "weak";
  if (/^[a-z0-9]+$/.test(password)) return "fair";
  if (/[A-Z]/.test(password) && /[0-9]/.test(password)) return "strong";
  return "fair";
}

function updatePasswordStrength() {
  const password = document.getElementById("password")?.value;
  const strengthEl = document.getElementById("password-strength");

  if (!strengthEl) return;

  const strength = checkPasswordStrength(password);

  strengthEl.classList.remove("weak", "fair", "strong");

  if (!strength) {
    strengthEl.style.display = "none";
    return;
  }

  const messages = {
    weak: "Mot de passe faible (minimum 8 caractères)",
    fair: "Mot de passe acceptable",
    strong: "Mot de passe fort",
  };

  strengthEl.textContent = messages[strength];
  strengthEl.classList.add(strength);
}

function toggleInitCodeField() {
  const checkbox = document.getElementById("use-init-code");
  const codeGroup = document.getElementById("init-code-group");

  if (checkbox.checked) {
    codeGroup.classList.add("show");
    document.getElementById("init-code").required = true;
  } else {
    codeGroup.classList.remove("show");
    document.getElementById("init-code").required = false;
  }
}

async function handleRegister(event) {
  event.preventDefault();

  const name = document.getElementById("name")?.value.trim();
  const email = document.getElementById("email")?.value.trim();
  const password = document.getElementById("password")?.value.trim();
  const passwordConfirm = document
    .getElementById("password-confirm")
    ?.value.trim();
  const useInitCode = document.getElementById("use-init-code")?.checked;
  const initCode = document.getElementById("init-code")?.value.trim();

  // Clear previous errors
  document
    .querySelectorAll(".error-message, .success-message")
    .forEach((el) => {
      el.classList.remove("show");
    });

  // Validation
  if (!name) {
    showError("name", "Nom est requis");
    return;
  }
  if (!email) {
    showError("email", "Email est requis");
    return;
  }
  if (!password) {
    showError("password", "Mot de passe est requis");
    return;
  }
  if (password !== passwordConfirm) {
    showError("password-confirm", "Les mots de passe ne correspondent pas");
    return;
  }
  if (checkPasswordStrength(password) === "weak") {
    showError(
      "password",
      "Le mot de passe doit contenir au least 8 caractères",
    );
    return;
  }
  if (useInitCode && !initCode) {
    showError("init-code", "Clé d'initialisation requise");
    return;
  }

  const payload = {
    name,
    email,
    password,
    role: "admin",
  };

  // Add init code if using one
  if (useInitCode) {
    payload.initCode = initCode;
  }

  try {
    const response = await fetch(`${API_BASE}/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(getToken() && { Authorization: `Bearer ${getToken()}` }),
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      showError("form", data.message || `Erreur: ${response.status}`);
      return;
    }

    // Show success and redirect
    showSuccess(
      "form",
      "Compte admin créé avec succès ! Redirection en cours...",
    );

    setTimeout(() => {
      window.location.href = "login.html";
    }, 2000);
  } catch (error) {
    console.error("Register error:", error);
    showError(
      "form",
      "Erreur lors de la création du compte. Veuillez réessayer.",
    );
  }
}

function showError(fieldId, message) {
  const errorEl = document.getElementById(`${fieldId}-error`);
  if (errorEl) {
    errorEl.textContent = message;
    errorEl.classList.add("show");
  }
}

function showSuccess(fieldId, message) {
  const successEl = document.getElementById(`${fieldId}-success`);
  if (successEl) {
    successEl.textContent = message;
    successEl.classList.add("show");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("register-form");
  const passwordInput = document.getElementById("password");
  const initCodeCheckbox = document.getElementById("use-init-code");

  if (form) {
    form.addEventListener("submit", handleRegister);
  }

  if (passwordInput) {
    passwordInput.addEventListener("input", updatePasswordStrength);
  }

  if (initCodeCheckbox) {
    initCodeCheckbox.addEventListener("change", toggleInitCodeField);
  }

  // Redirect if already logged in as admin
  if (getToken() && localStorage.getItem("role") === "admin") {
    window.location.href = "html/dashboard.html";
  }
});
