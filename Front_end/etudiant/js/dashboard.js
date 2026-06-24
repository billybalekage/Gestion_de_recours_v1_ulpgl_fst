const API_BASE = "http://localhost:8000/api";

function toggleModal(id) {
  const modal = document.getElementById(id);
  const content = modal.querySelector(".modal-content");

  if (!modal || !content) return;

  if (modal.classList.contains("hidden")) {
    modal.classList.remove("hidden");
    setTimeout(() => {
      content.classList.remove("scale-95");
      content.classList.add("scale-100");
    }, 10);
  } else {
    content.classList.remove("scale-100");
    content.classList.add("scale-95");
    setTimeout(() => {
      modal.classList.add("hidden");
    }, 200);
  }
}

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

function isTokenExpired(token) {
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

function statusLabel(status) {
  const map = {
    en_attente: "En attente",
    accepte: "Validé",
    refuse: "Refusé",
  };
  return map[status] || status;
}

function statusClass(status) {
  if (status === "accepte") return "status-valid";
  if (status === "refuse") return "status-rejected";
  return "status-pending";
}

async function loadStudentProfile() {
  try {
    const token = getToken();
    if (!token || redirectIfTokenExpired(token)) return;

    const res = await fetch(`${API_BASE}/etudiants/etudiant/name-matricule`, {
      headers: authHeaders(),
    });

    if (res.status === 401 || res.status === 403) {
      redirectIfTokenExpired(token);
      const errorText = await res.text().catch(() => "");
      throw new Error(
        errorText || "Session expirée. Veuillez vous reconnecter.",
      );
    }
    if (!res.ok) {
      const errorText = await res.text().catch(() => "");
      throw new Error(errorText || "Profil non disponible");
    }

    const data = await res.json();

    // 1. Affichage du nom
    document.getElementById("name_etudiants").textContent =
      `Bonjour, ${data.name || "Étudiant"}`;

    // 2. Affichage du matricule (Ajoute cette ligne)
    if (data.matricule) {
      document.getElementById("matricule_etudiants").textContent =
        data.matricule;
    }
  } catch (error) {
    console.error(error);
  }
}

async function loadStudentRecours() {
  try {
    const token = getToken();
    if (!token || redirectIfTokenExpired(token)) return;

    const res = await fetch(`${API_BASE}/recours/my-recent-recours`, {
      headers: authHeaders(),
    });
    if (res.status === 401 || res.status === 403) {
      redirectIfTokenExpired(token);
      const errorText = await res.text().catch(() => "");
      throw new Error(
        errorText || "Session expirée. Veuillez vous reconnecter.",
      );
    }
    if (!res.ok) {
      const errorText = await res.text().catch(() => "");
      throw new Error(errorText || "Impossible de charger les recours");
    }
    const data = await res.json();

    document.getElementById("stat-total").textContent = data.total ?? 0;
    document.getElementById("stat-pending").textContent = data.pending ?? 0;
    document.getElementById("stat-accepted").textContent = data.accepted ?? 0;
    document.getElementById("stat-refused").textContent = data.refused ?? 0;

    const tbody = document.getElementById("recent-recours-body");
    if (!tbody) return;

    if (!data.recours || data.recours.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center">Aucun recours trouvé.</td></tr>';
      return;
    }

    tbody.innerHTML = data.recours.slice(0, 5).map((item) => {
      const list = Array.isArray(item.cours_list) ? item.cours_list : [];
      const coursNoms = list.length
        ? [...new Set(list.map((c) => c.course_name).filter(Boolean))].join(", ")
        : (item.course_name || "—");
      const evaluations = list.length
        ? [...new Set(list.map((c) => c.evaluation).filter(Boolean))].join(", ").toUpperCase()
        : (item.evaluation || "—");
      return `
      <tr class="table-row">
        <td class="font-semibold">#REC-${item.id}</td>
        <td>${coursNoms || "—"}</td>
        <td>${evaluations || "—"}</td>
        <td>${new Date(item.created_at).toLocaleDateString("fr-FR")}</td>
        <td><span class="status-badge ${statusClass(item.status)}">${statusLabel(item.status)}</span></td>
        <td>
          <button class="action-btn" type="button" title="Voir détails">
            <span class="material-symbols-outlined">visibility</span>
          </button>
        </td>
      </tr>
    `;
    }).join("");
  } catch (error) {
    console.error(error);
  }
}

async function loadCourses() {
  try {
    const token = getToken();
    if (!token || redirectIfTokenExpired(token)) return;

    const res = await fetch(`${API_BASE}/cours/mes-cours`, {
      headers: authHeaders(),
    });
    if (res.status === 401 || res.status === 403) {
      redirectIfTokenExpired(token);
      const errorText = await res.text().catch(() => "");
      throw new Error(
        errorText || "Session expirée. Veuillez vous reconnecter.",
      );
    }
    if (!res.ok) {
      const errorText = await res.text().catch(() => "");
      throw new Error(errorText || "Impossible de charger les cours");
    }
    const data = await res.json();
    const select = document.getElementById("recours-cours");
    if (!select) return;
    select.innerHTML = '<option value="">Sélectionnez un cours</option>' + data.map((item) => `<option value="${item.id}">${item.title}</option>`).join("");
  } catch (error) {
    console.error(error);
  }
}

async function submitRecours(event) {
  event.preventDefault();

  const form = event.target;
  const selectedEvaluations = [...form.querySelectorAll('input[type="checkbox"]:checked')].map((input) => input.value);
  const files = form.querySelector("#recours-files").files;

  if (!selectedEvaluations.length) {
    alert("Choisissez au moins un type d’évaluation.");
    return;
  }

  const fd = new FormData();
  fd.append("objet", form.querySelector("#recours-objet").value.trim());
  fd.append("annee", form.querySelector("#recours-annee").value.trim());
  fd.append("description", form.querySelector("#recours-description").value.trim());
  fd.append("activeIndexes", JSON.stringify([0]));
  fd.append("cours_0", form.querySelector("#recours-cours").value);
  fd.append("eval_0", JSON.stringify(selectedEvaluations));
  for (const file of files) fd.append("attachments_0", file);

  try {
    const token = getToken();
    if (!token || redirectIfTokenExpired(token)) return;

    const res = await fetch(`${API_BASE}/recours/add-recours`, {
      method: "POST",
      headers: authHeaders(),
      body: fd,
    });
    const data = await res.json();
    if (res.status === 401) {
      redirectIfTokenExpired(token);
      throw new Error("Session expirée. Veuillez vous reconnecter.");
    }
    if (!res.ok) throw new Error(data.error || "Échec de l’enregistrement");
    alert("Recours envoyé avec succès.");
    form.reset();
    toggleModal("appeal-modal");
    loadStudentRecours();
  } catch (error) {
    console.error(error);
    alert(error.message || "Une erreur est survenue.");
  }
}

function logoutStudent() {
  localStorage.removeItem("token");
  localStorage.removeItem("role");
  window.location.href = "../../login.html";
}

window.addEventListener("DOMContentLoaded", () => {
  const modal = document.getElementById("appeal-modal");
  if (modal) {
    modal.addEventListener("click", function (e) {
      if (e.target === this) toggleModal("appeal-modal");
    });
  }

  const logoutLink = document.querySelector(".sidebar-footer .nav-item");
  if (logoutLink) logoutLink.addEventListener("click", (e) => {
    e.preventDefault();
    logoutStudent();
  });

  const form = document.getElementById("recours-form");
  if (form) form.addEventListener("submit", submitRecours);

  loadStudentProfile();
  loadStudentRecours();
  loadCourses();
});
