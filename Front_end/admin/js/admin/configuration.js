// ==========================================================================
// 1. GESTION DES MODAUX (Isolée au maximum pour garantir le fonctionnement)
// ==========================================================================
window.toggleModal = function (modalId) {
  console.log("Appel de toggleModal pour l'ID :", modalId); // Pour le debug dans la console

  const container = document.getElementById("modal-container");
  const specificModal = document.getElementById(modalId);

  if (!container || !specificModal) {
    console.error(
      "Erreur structurelle : Impossible de trouver les éléments HTML pour le modal ID :",
      modalId,
    );
    return;
  }

  const isHidden = specificModal.classList.contains("hidden");

  if (isHidden) {
    // 1. Masquer tous les sous-modaux par sécurité
    const allModals = container.querySelectorAll(".modal-content");
    allModals.forEach((m) => m.classList.add("hidden"));

    // 2. Afficher le container et le modal demandé
    container.classList.remove("hidden");
    specificModal.classList.remove("hidden");
  } else {
    window.closeAllModals();
  }
};

window.closeAllModals = function () {
  const container = document.getElementById("modal-container");
  if (container) {
    container.classList.add("hidden");
    const allModals = container.querySelectorAll(".modal-content");
    allModals.forEach((m) => m.classList.add("hidden"));
  }
};

// Compteur pour donner des IDs uniques aux sélecteurs de cours
let coursCount = 0;
// Variable globale pour stocker les cours chargés depuis la base de données
let listeCoursGlobale = [];

// Fonction pour récupérer l'intégralité des cours au chargement initial
async function prechargerCours() {
  try {
    if (typeof AdminAPI !== "undefined") {
      const result = await AdminAPI.get("/cours/admin-list");
      listeCoursGlobale = Array.isArray(result)
        ? result
        : result.cours || result.data || [];
    }
  } catch (error) {
    console.error(
      "Erreur lors du préchargement global des cours (L'API a échoué mais le reste fonctionne) :",
      error,
    );
  }
}

// ==========================================================================
// 2. GESTION DYNAMIQUE ET FILTRAGE DES BLOCS DE COURS
// ==========================================================================
window.ajouterBlocCours = function () {
  const container = document.getElementById("coursContainer");
  if (!container) return;

  const departmentSelect =
    document.querySelector('select[name="department"]') ||
    document.getElementById("selectDepartment");
  const promotionSelect =
    document.querySelector('select[name="promotion"]') ||
    document.getElementById("selectPromotion");

  const depSelected = departmentSelect ? departmentSelect.value : "";
  const promoSelected = promotionSelect ? promotionSelect.value : "";

  coursCount++;

  const bloc = document.createElement("div");
  bloc.id = `bloc-cours-${coursCount}`;
  bloc.className = "bloc-cours-row";
  bloc.style.display = "flex";
  bloc.style.gap = "10px";
  bloc.style.marginBottom = "10px";

  bloc.innerHTML = `
    <select name="course_ids" class="form-control" required>
      <option value="" disabled selected>Sélectionnez une matière...</option>
    </select>
    <button type="button" class="btn" onclick="supprimerBlocCours('${bloc.id}')" style="background: var(--error, #ff4d4d); color: white; border: none; padding: 0 12px; border-radius: var(--radius-lg, 8px); cursor: pointer;">
      <span class="material-symbols-outlined">delete</span>
    </button>
  `;
  container.appendChild(bloc);

  const select = bloc.querySelector("select");

  let coursFiltres = listeCoursGlobale;
  if (depSelected === "Génie Électrique") {
    coursFiltres = listeCoursGlobale.filter(
      (c) =>
        c.department === "Génie Électrique" &&
        (!promoSelected || c.promotion === promoSelected),
    );
  } else if (depSelected) {
    coursFiltres = listeCoursGlobale.filter(
      (c) => c.department === depSelected,
    );
  }

  if (coursFiltres.length === 0) {
    select.innerHTML = `<option value="" disabled>Aucune matière disponible pour ces critères</option>`;
  } else {
    coursFiltres.forEach((c) => {
      const option = document.createElement("option");
      option.value = c.id;
      option.textContent = `${c.title} (${c.promotion || c.department})`;
      select.appendChild(option);
    });
  }
};

window.supprimerBlocCours = function (blocId) {
  const bloc = document.getElementById(blocId);
  if (bloc) bloc.remove();
};

// ==========================================================================
// 3. CHARGEMENT ET INJECTION DES DEUX TABLEAUX ADMIN
// ==========================================================================
async function chargerTableauxPeriodes() {
  const activeBody = document.getElementById("periodesActivesBody");
  const inactiveBody = document.getElementById("periodesInactivesBody");

  if (!activeBody || !inactiveBody) return;

  try {
    if (typeof AdminAPI === "undefined") return;
    const periodes = await AdminAPI.get("/periode-recours/all");

    activeBody.innerHTML = "";
    inactiveBody.innerHTML = "";

    const tzo = new Date().getTimezoneOffset() * 60000;
    const maintenant = new Date(Date.now() - tzo);
    maintenant.setHours(0, 0, 0, 0);

    periodes.forEach((p) => {
      const dateDeb = new Date(p.date_debut);
      const dateF = new Date(p.date_fin);

      const dateDebCompare = new Date(dateDeb).setHours(0, 0, 0, 0);
      const dateFCompare = new Date(dateF).setHours(0, 0, 0, 0);

      const affichageDebut = dateDeb.toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
      const affichageFin = dateF.toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });

      let badgeStatut = "";
      let estActive = false;

      if (maintenant >= dateDebCompare && maintenant <= dateFCompare) {
        badgeStatut =
          '<span style="background:#e8f5e9; color:#2e7d32; padding:4px 8px; border-radius:4px; font-size:12px; font-weight:bold;">En cours</span>';
        estActive = true;
      } else if (maintenant < dateDebCompare) {
        badgeStatut =
          '<span style="background:#fff3e0; color:#e65100; padding:4px 8px; border-radius:4px; font-size:12px; font-weight:bold;">Planifié</span>';
      } else {
        badgeStatut =
          '<span style="background:#ffebee; color:#c62828; padding:4px 8px; border-radius:4px; font-size:12px; font-weight:bold;">Terminé</span>';
      }

      const rowHtml = `
        <tr>
          <td style="padding: 10px; border: 1px solid #ddd;">${p.annee_universitaire} (S${p.semestre})</td>
          <td style="padding: 10px; border: 1px solid #ddd; font-weight:600;">${p.department}</td>
          <td style="padding: 10px; border: 1px solid #ddd;">${p.promotion}</td>
          <td style="padding: 10px; border: 1px solid #ddd;">${affichageDebut}</td>
          <td style="padding: 10px; border: 1px solid #ddd;">${affichageFin}</td>
          <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">${badgeStatut}</td>
        </tr>
      `;

      if (estActive) {
        activeBody.insertAdjacentHTML("beforeend", rowHtml);
      } else {
        inactiveBody.insertAdjacentHTML("beforeend", rowHtml);
      }
    });

    if (activeBody.children.length === 0) {
      activeBody.innerHTML = `<tr><td colspan="6" style="padding:15px; text-align:center; color:#777; font-style:italic;">Aucune période active en ce moment.</td></tr>`;
    }
    if (inactiveBody.children.length === 0) {
      inactiveBody.innerHTML = `<tr><td colspan="6" style="padding:15px; text-align:center; color:#777; font-style:italic;">Aucun historique de période trouvé.</td></tr>`;
    }
  } catch (error) {
    console.error(
      "Erreur lors de la récupération des périodes (L'API a échoué mais les modaux fonctionnent) :",
      error,
    );
  }
}

// ==========================================================================
// 4. SOUMISSION DU FORMULAIRE DE CRÉATION DE PÉRIODE
// ==========================================================================
document
  .getElementById("periodeRecoursForm")
  ?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const formData = new FormData(e.target);
    const courseSelects = e.target.querySelectorAll(
      'select[name="course_ids"]',
    );
    const course_ids = Array.from(courseSelects)
      .map((select) => Number(select.value))
      .filter((val) => !isNaN(val) && val > 0);

    const payload = {
      annee_universitaire: formData.get("annee_universitaire"),
      semestre: Number(formData.get("semestre")),
      date_debut: formData.get("date_debut"),
      date_fin: formData.get("date_fin"),
      promotion: formData.get("promotion"),
      department: formData.get("department"),
      course_ids: course_ids,
    };

    try {
      await AdminAPI.post("/config/add-config", payload);
      alert("Période créée avec succès !");
      toggleModal("periodeModal");
      e.target.reset();
      document.getElementById("coursContainer").innerHTML = "";
      chargerTableauxPeriodes();
    } catch (error) {
      console.error("Erreur lors de l'envoi :", error);
      alert(error.message || "Impossible de contacter le serveur.");
    }
  });

// ==========================================================================
// 5. INITIALISATION SECURISEE AU CHARGEMENT DE LA PAGE
// ==========================================================================
document.addEventListener("DOMContentLoaded", async () => {
  // On encapsule l'authentification et les requêtes réseau dans des blocs distincts
  try {
    if (
      typeof AdminAPI !== "undefined" &&
      typeof AdminAPI.redirectIfTokenInvalid === "function"
    ) {
      if (AdminAPI.redirectIfTokenInvalid()) return;
    }
  } catch (e) {
    console.error("Erreur lors de la vérification du Token :", e);
  }

  // Lancement asynchrone des requêtes sans bloquer l'arbre d'exécution principal
  prechargerCours();
  chargerTableauxPeriodes();

  const departmentSelect = document.querySelector('select[name="department"]');
  departmentSelect?.addEventListener("change", () => {
    const container = document.getElementById("coursContainer");
    if (container) container.innerHTML = "";
  });
});
