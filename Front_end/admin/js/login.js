const API_BASE = "http://localhost:8000/api";
const BACKEND_ORIGIN = "http://127.0.0.1:8000";

function getApiBase() {
  const hostname = window.location.hostname;
  const port = window.location.port;
  const currentOrigin = `${window.location.protocol}//${hostname}${port ? `:${port}` : ""}`;

  if (currentOrigin === BACKEND_ORIGIN) {
    return API_BASE;
  }

  if (
    (hostname === "localhost" || hostname === "127.0.0.1") &&
    port !== "8000"
  ) {
    return `${BACKEND_ORIGIN}/api`;
  }

  return API_BASE;
}

function getToken() {
  const token = localStorage.getItem("token");
  return token && token !== "null" && token !== "undefined" ? token : null;
}

async function handleLogin(event) {
  event.preventDefault();

  const email = document.getElementById("email")?.value.trim();
  const password = document.getElementById("password")?.value.trim();

  // Clear previous errors / alert
  document
    .querySelectorAll(".error-message")
    .forEach((el) => el.classList.remove("show"));
  const alertEl = document.getElementById("loginAlert");
  if (alertEl) alertEl.style.display = "none";

  if (!email) {
    showError("email", "Email est requis");
    return;
  }
  if (!password) {
    showError("password", "Mot de passe est requis");
    return;
  }

  try {
    localStorage.removeItem("token");
    localStorage.removeItem("role");

    const response = await fetch(`${getApiBase()}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    let data;
    try {
      data = await response.json();
    } catch (parseError) {
      data = { message: `Erreur serveur (${response.status})` };
    }

    if (!response.ok) {
      showError(
        "form",
        data.error || data.message || `Erreur: ${response.status}`,
      );
      return;
    }

    // Check if user is admin
    if (data.role !== "admin") {
      showError("form", "Accès administrateur requis");
      return;
    }

    // Save token and role
    localStorage.setItem("token", data.token);
    localStorage.setItem("role", "admin");

    // Redirect to admin dashboard
    window.location.href = "html/dashboard.html";
  } catch (error) {
    console.error("Login error:", error);
    showError("form", "Erreur de connexion. Veuillez réessayer.");
  }
}

function showError(fieldId, message) {
  const errorEl = document.getElementById(`${fieldId}-error`);
  if (errorEl) {
    errorEl.textContent = message;
    errorEl.classList.add("show");
    return;
  }

  // fallback to alert area
  const alertEl = document.getElementById("loginAlert");
  const alertText = document.getElementById("alertText");
  if (alertEl && alertText) {
    alertText.textContent = message;
    alertEl.style.display = "flex";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("loginForm");

  if (form) {
    form.addEventListener("submit", handleLogin);
  }

  // Redirect if already logged in as admin
  if (getToken() && localStorage.getItem("role") === "admin") {
    window.location.href = "html/dashboard.html";
  }
});
