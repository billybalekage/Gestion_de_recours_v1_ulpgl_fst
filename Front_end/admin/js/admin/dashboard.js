// Ouvre un modal spécifique et affiche le conteneur global
function openModal(modalId) {
    const container = document.getElementById("modal-container");
    const modal = document.getElementById(modalId);
    
    container.classList.remove("hidden");
    
    // Cache tous les autres modals contenus dans le container
    document.querySelectorAll(".modal-content").forEach(m => m.classList.add("hidden"));
    
    // Affiche le modal demandé
    modal.classList.remove("hidden");
}

// Ferme tout
function closeModals() {
    document.getElementById("modal-container").classList.add("hidden");
}

// Pour tes boutons HTML qui utilisent toggleModal
function toggleModal(modalId) {
    const container = document.getElementById("modal-container");
    const modal = document.getElementById(modalId);
    
    if (container.classList.contains("hidden")) {
        openModal(modalId);
    } else {
        closeModals();
    }
}

function formatStatus(status) {
  const map = {
    en_attente: { text: "En attente", className: "status-pending" },
    en_cours: { text: "En cours", className: "status-pending" },
    traite_prof: { text: "Traité (prof)", className: "status-received" },
    publie: { text: "Publié", className: "status-received" },
    accepte: { text: "Accepté", className: "status-received" },
    refuse: { text: "Refusé", className: "status-rejected" },
  };
  return map[status] || { text: status || "—", className: "status-pending" };
}

function formatDepartment(department) {
  return department?.replace(/_/g, " ") || "—";
}

let globalRecoursData = [];

async function fetchDashboardData() {
  try {
    const data = await AdminAPI.get("/dashboard/admin");
    globalRecoursData = data.recentRecours || [];

    // --- Statistiques (correction #1) ---
    const stats = data.stats || {};
    const setStat = (id, value) => {
      const el = document.getElementById(id);
      if (el) el.textContent = value ?? 0;
    };
    setStat("total-cours", stats.total_cours);
    setStat("total-etudiants", stats.total_etudiants);
    setStat("total-recours", stats.total_recours);
    setStat("total-profs", stats.total_profs);

    // --- Tableau : tous les recours (tous statuts) ---
    const tbody = document.getElementById("recent-recours-body");
    if (!tbody) return;

    const rows = data.recentRecours || [];
    if (rows.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="6" class="text-center">Aucun recours trouvé.</td></tr>';
      return;
    }

    tbody.innerHTML = rows
      .map((recours) => {
        const status = formatStatus(recours.status);
        const nomDuCours = recours.cours_nom || "Non spécifié";
        const evaluation = recours.evaluation
          ? recours.evaluation.toUpperCase()
          : "—";

        return `
      <tr class="table-row-hover">
        <td>${recours.matricule || "—"}</td>
        <td>${recours.etudiant_nom || "—"}</td>
        <td class="text-bold">${nomDuCours}</td>
        <td>${evaluation}</td>
        <td><span class="status-badge ${status.className}">${status.text}</span></td>
        <td>
          <div style="display: flex; gap: 8px;">
            <button class="btn btn-primary" onclick="openTraiterModal(${recours.id}, 0)">Traiter</button>
          </div>
        </td>
      </tr>`;
      })
      .join("");
  } catch (error) {
    console.error(error);
  }
}

// Fonction pour ouvrir le modal de traitement avec la pièce jointe filtrée

function openTraiterModal(recoursId, coursId) {
  // 1. Trouver le recours spécifique parmi les données déjà chargées
  const recours = globalRecoursData.find((r) => r.id === recoursId);

  if (!recours) {
    console.error("Recours non trouvé");
    return;
  }

  // 2. Remplir le modal avec les informations
  const modal = document.getElementById("modal-decision");
  modal.querySelector(".modal-title").textContent =
    `Traitement: ${recours.objet}`;

  // 3. Gestion de la pièce jointe
  const container = modal.querySelector(".attachments-list"); // Assure-toi d'avoir cet élément dans ton HTML
  if (container) {
    // Si tu as un champ pour la pièce jointe dans ton objet recours
    if (recours.piece_jointe) {
      container.innerHTML = `
        <div class="attachment-item">
            <div class="attachment-left">
                <span class="material-symbols-outlined">attach_file</span>
                <span>Pièce jointe du recours</span>
            </div>
            <a href="${recours.piece_jointe}" target="_blank" class="material-symbols-outlined download-icon">download</a>
        </div>`;
    } else {
      container.innerHTML = "<p>Aucune pièce jointe.</p>";
    }
  }

  // 4. Ouvrir le modal
  openModal("modal-decision");
}

// Fonction d'envoi au professeur
async function envoyerAuProf(coursId, recoursId) {
  if (confirm("Envoyer ce recours au professeur responsable ?")) {
    await AdminAPI.post("/recours/envoyer-prof", { coursId, recoursId });
    alert("Recours envoyé avec succès !");
  }
}

async function logoutAdmin() {
  try {
    await AdminAPI.logout();
  } catch (error) {
    console.error("Logout error:", error);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  // Correction de la sélection sécurisée de l'overlay
  const overlay = document.querySelector(".modal-overlay");
  if (overlay) {
    overlay.addEventListener("click", closeModals);
  }

  const menuBtn = document.getElementById("menu-toggle");
  const sidebar = document.getElementById("sidebar");

  if (menuBtn && sidebar) {
    menuBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      sidebar.classList.toggle("hidden");
      sidebar.classList.toggle("flex");
      sidebar.style.width = "256px";
    });
  }

  document.body.addEventListener("click", (e) => {
    if (window.innerWidth < 1024 && sidebar && menuBtn) {
      if (!sidebar.contains(e.target) && e.target !== menuBtn) {
        sidebar.classList.add("hidden");
        sidebar.classList.remove("flex");
      }
    }
  });

  window.addEventListener("resize", () => {
    if (sidebar) {
      if (window.innerWidth >= 1024) {
        sidebar.classList.remove("hidden");
        sidebar.classList.add("flex");
        sidebar.style.width = "";
      } else {
        sidebar.classList.add("hidden");
        sidebar.classList.remove("flex");
      }
    }
  });

  const logoutBtn = document.querySelector(".sidebar-footer .nav-link");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", (e) => {
      e.preventDefault();
      logoutAdmin();
    });
  }

  if (AdminAPI.redirectIfTokenInvalid()) return;
  fetchDashboardData();
});
