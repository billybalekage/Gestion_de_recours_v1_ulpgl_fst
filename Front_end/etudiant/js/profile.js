const API_BASE = "http://localhost:8000/api";

function getToken() {
  const token = localStorage.getItem("token");
  if (!token || token === "null" || token === "undefined") return null;
  return token.trim();
}

function authHeaders(extra = {}) {
  const token = getToken();
  return token
    ? {
        Authorization: `Bearer ${token}`,
        ...extra,
      }
    : { ...extra };
}

function isTokenExpired(token = getToken()) {
  if (!token) return true;
  try {
    const payloadBase64 = token.split(".")[1];
    if (!payloadBase64) return true;
    const normalized = payloadBase64.replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(normalized));
    return typeof payload.exp === "number" && payload.exp * 1000 <= Date.now();
  } catch (error) {
    console.error("Erreur de décodage du token", error);
    return true;
  }
}

function redirectIfTokenExpired(token = getToken()) {
  if (isTokenExpired(token)) {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    window.location.href = "../../login.html";
    return true;
  }
  return false;
}

async function loadStudentProfilePage() {
  const token = getToken();
  if (!token || redirectIfTokenExpired(token)) return;

  try {
    const response = await fetch(`${API_BASE}/etudiants/etudiant/name-matricule`, {
      headers: authHeaders(),
    });

    if (!response.ok) {
      if (response.status === 401) {
        redirectIfTokenExpired(token);
      }
      throw new Error("Impossible de récupérer les informations du profil.");
    }

    const data = await response.json();
    const headerName = document.getElementById("studentName");
    const studentNameValue = document.getElementById("studentNameValue");
    const studentMatricule = document.getElementById("studentMatricule");
    const studentMatriculeValue = document.getElementById("studentMatriculeValue");
    const studentStatus = document.getElementById("studentStatus");
    const studentInfo = document.getElementById("studentInfo");

    if (headerName) headerName.textContent = data.name || "Étudiant";
    if (studentNameValue) studentNameValue.textContent = data.name || "Étudiant";
    if (studentMatricule)
      studentMatricule.textContent = `Matricule: ${data.matricule || "--"}`;
    if (studentMatriculeValue)
      studentMatriculeValue.textContent = data.matricule || "--";
    if (studentStatus)
      studentStatus.textContent = data.role
        ? `Rôle : ${data.role}`
        : "Rôle : étudiant";
    if (studentInfo)
      studentInfo.textContent =
        data.matricule && data.name
          ? `Bienvenue dans votre espace personnel, ${data.name}.`
          : "Bienvenue dans votre espace étudiant.";
  } catch (error) {
    console.error(error);
    const errorBanner = document.getElementById("profileError");
    if (errorBanner) {
      errorBanner.textContent =
        "Impossible de charger le profil. Veuillez vous reconnecter.";
      errorBanner.style.display = "block";
    }
  }
}

function logoutStudent() {
  localStorage.removeItem("token");
  localStorage.removeItem("role");
  window.location.href = "../../login.html";
}

window.addEventListener("DOMContentLoaded", () => {
  loadStudentProfilePage();

  const logoutButton = document.querySelector(".logout-btn");
  if (logoutButton) {
    logoutButton.addEventListener("click", (e) => {
      e.preventDefault();
      logoutStudent();
    });
  }
});
