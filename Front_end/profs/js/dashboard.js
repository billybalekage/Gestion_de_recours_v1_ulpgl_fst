const API_BASE = "http://localhost:8000/api";

// --- AUTHENTIFICATION ---
// À remplacer tout en haut de dashboard.js
function getToken() {
  const t = localStorage.getItem("token");
  console.log("[DEBUG AUTH] Token brut récupéré du localStorage :", t);
  return t && t !== "null" && t !== "undefined" ? t.trim() : null;
}

function authHeaders() {
  const token = getToken();
  if (!token) {
    console.error("[DEBUG AUTH] Aucun token valide trouvé pour les en-têtes !");
    return {};
  }
  return { "Authorization": `Bearer ${token}` };
}

// --- FORMATTAGE ---
function formatStatus(status) {
  const map = {
    en_attente: { text: "En attente", className: "status-pending" },
    en_cours: { text: "En cours", className: "status-pending" },
    traite_prof: { text: "Traité", className: "status-received" },
    publie: { text: "Publié", className: "status-received" },
    accepte: { text: "Accepté", className: "status-received" },
    refuse: { text: "Refusé", className: "status-rejected" },
  };
  return map[status] || { text: status || "—", className: "status-pending" };
}

// --- CHARGEMENT DU TABLEAU DE BORD ---
// async function loadProfessorDashboard() {
//   try {
//     const res = await fetch("http://localhost:8000/api/recours/prof/dashboard", { 
//       method: "GET",
//       headers: {
//         "Content-Type": "application/json",
//         ...authHeaders()
//       } 
//     });
    
//     if (!res.ok) throw new Error("Impossible de charger le tableau de bord");
    
//     const data = await res.json();
//     const dash = data.dashboard || {};
    
//     document.getElementById("stat-total-etudiants").textContent = dash.total_students_department || 0;
//     document.getElementById("stat-total-promotions").textContent = dash.students_by_promotion?.length || 0;
//     document.getElementById("stat-total-recours").textContent = dash.total_recours_assigned || 0;
    
//     const userNameEl = document.querySelector('.user-name');
//     if (userNameEl) userNameEl.textContent = dash.professor_name || 'Professeur';
//   } catch (error) {
//     console.error("[DEBUG DASHBOARD] Erreur stats :", error);
//   }
// }

// --- FILTRES DE RECHERCHE ---
function getRecoursFilters() {
  const status = document.getElementById("filter-recours-status")?.value || "";
  const search = document.getElementById("dashboard-search")?.value.trim() || "";
  const params = new URLSearchParams();

  if (status) params.set("status", status);
  if (search) params.set("search", search);

  return params.toString();
}

// --- AFFICHAGE DU TABLEAU DES RECOURS ---
function renderRecoursTable(rows) {
  const tbody = document.getElementById("recours-table-body");
  if (!tbody) return;
  
  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center">Aucun recours assigné.</td></tr>';
    return;
  }
  
  tbody.innerHTML = rows.map((item) => {
    const status = formatStatus(item.status);
    return `
      <tr>
        <td>${item.matricule || "—"}</td>
        <td>${item.etudiant_name || ""} ${item.etudiant_postnom || ""}</td>
        <td>${item.cours_nom || "—"}</td>
        <td>${item.evaluation || "—"}</td>
        <td><span class="status-badge ${status.className}">${status.text}</span></td>
        <td class="text-right">
          <button class="btn btn-secondary" data-id="${item.id}" data-action="traiter">
            Traiter
          </button>
        </td>
      </tr>`;
  }).join("");
}

// --- REQUÊTE HTTP : CHARGEMENT DES RECOURS ---
async function loadProfessorRecours() {
  try {
    const query = getRecoursFilters();
    const url = `http://localhost:8000/api/recours/prof/my-recours${query ? `?${query}` : ""}`;
    
    console.log("[DEBUG DASHBOARD] Appel vers :", url);

    const res = await fetch(url, { 
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders()
      }
    });
    
    if (!res.ok) {
      console.error("[DEBUG DASHBOARD] Réponse serveur K.O. Statut :", res.status);
      throw new Error("Impossible de charger les recours");
    }
    
    const data = await res.json();
    renderRecoursTable(data.recours || []);
  } catch (error) {
    console.error("[DEBUG DASHBOARD] Erreur attrapée :", error);
    const tbody = document.getElementById("recours-table-body");
    if (tbody) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center" style="color: red;">Erreur lors du chargement des recours.</td></tr>';
    }
  }
}

// --- ÉVÉNEMENTS & ACTIONS ---
function setupRecoursActions() {
  document.getElementById("recours-table-body")?.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action='traiter']");
    if (!button) return;
    const id = button.dataset.id;
    window.location.href = `recours.html?recours_id=${id}`;
  });

  document.getElementById("filter-recours-status")?.addEventListener("change", loadProfessorRecours);
  
  document.getElementById("dashboard-search")?.addEventListener("input", () => {
    clearTimeout(window.dashboardSearchTimer);
    window.dashboardSearchTimer = setTimeout(loadProfessorRecours, 250);
  });
}

// --- INITIALISATION ---
document.addEventListener("DOMContentLoaded", () => {
  const token = getToken();
  if (!token) { 
    window.location.href = "../login.html"; 
    return; 
  }

  // loadProfessorDashboard();
  loadProfessorRecours();
  setupRecoursActions();
});