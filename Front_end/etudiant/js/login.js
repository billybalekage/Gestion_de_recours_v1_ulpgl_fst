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

function showError(fieldId, message) {
  const target = document.getElementById(`${fieldId}-error`);
  if (target) {
    target.textContent = message;
    target.classList.add("show");
  } else {
    // fallback to alert area if present
    const alertEl = document.getElementById("loginAlert");
    const alertText = document.getElementById("alertText");
    if (alertEl && alertText) {
      alertText.textContent = message;
      alertEl.style.display = "flex";
    }
  }
}

function clearErrors() {
  document.querySelectorAll(".error-message").forEach((el) => {
    el.textContent = "";
    el.classList.remove("show");
  });
  const alertEl = document.getElementById("loginAlert");
  if (alertEl) alertEl.style.display = "none";
}

function toggleFirstConnexion() {
  const firstTime = document.getElementById("firstTime");
  const matriculeGroup = document.getElementById("matriculeGroup");
  const newPasswordGroup = document.getElementById("newPasswordGroup");
  const passwordGroup = document.getElementById("passwordGroup");

  if (firstTime && firstTime.checked) {
    matriculeGroup.style.display = "block";
    newPasswordGroup.style.display = "block";
    passwordGroup.style.display = "none";
  } else {
    matriculeGroup.style.display = "none";
    newPasswordGroup.style.display = "none";
    passwordGroup.style.display = "block";
  }
}

async function handleLogin(event) {
  event.preventDefault();
  clearErrors();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();
  const matricule = document.getElementById("matricule").value.trim();
  const newPassword = document.getElementById("newPassword").value.trim();
  const isFirstTime =
    document.getElementById("firstTime") &&
    document.getElementById("firstTime").checked;

  if (!email) {
    showError("email", "Email est requis");
    return;
  }

  if (isFirstTime) {
    if (!matricule) {
      showError("matricule", "Matricule requis");
      return;
    }
    if (!newPassword) {
      showError("newPassword", "Nouveau mot de passe requis");
      return;
    }
  } else {
    if (!password) {
      showError("password", "Mot de passe requis");
      return;
    }
  }

  const payload = { email };
  if (isFirstTime) {
    payload.matricule = matricule;
    payload.newPassword = newPassword;
  } else {
    payload.password = password;
  }

  try {
    const response = await fetch(`${getApiBase()}/etudiants/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
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
        data.error || data.message || `Erreur ${response.status}`,
      );
      return;
    }

    localStorage.setItem("token", data.token);
    localStorage.setItem("role", data.role || "etudiant");
    window.location.href = "../etudiant/html/dashboard.html";
  } catch (error) {
    showError("form", "Erreur de connexion. Veuillez réessayer.");
    console.error(error);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const firstTimeCheckbox = document.getElementById("firstTime");
  if (firstTimeCheckbox)
    firstTimeCheckbox.addEventListener("change", toggleFirstConnexion);
  const loginForm = document.getElementById("loginForm");
  if (loginForm) loginForm.addEventListener("submit", handleLogin);

  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");
  if (token && role === "etudiant") {
    window.location.href = "../etudiant/html/dashboard.html";
  }
});
