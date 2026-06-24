async function chargerNotifications() {
  try {
    const token = localStorage.getItem("token");
    if (!token) {
      window.location.href = "../../login.html";
      return;
    }

    const response = await fetch(
      "http://localhost:8000/api/notification/get-notification",
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );

    if (!response.ok) throw new Error("Erreur serveur lors de la récupération");

    const data = await response.json();
    const etudiant = data.etudiant || {};
    const fullName = `${etudiant.fullname || `${etudiant.name || ""} ${etudiant.postnom || ""}`.trim() || "Étudiant"}`;

    // 1. Mise à jour des informations de l'étudiant
    document.getElementById("topNavName").innerText = fullName;
    document.getElementById("topNavId").innerText =
      `Matricule: ${etudiant.matricule || "--"}`;
    document.getElementById("sidebarPromo").innerText =
      `${etudiant.department || "Département"} - ${etudiant.promotion || "Promotion"}`;
    document.getElementById("welcomeSubtitle").innerText =
      `Espace personnel de suivi des recours — Classe de ${etudiant.promotion || "votre promotion"}`;

    // 2. Gestion de l'affichage de la Période Active
    const zonePeriode = document.getElementById("zonePeriodeActive");
    const periodes = Array.isArray(data.periodes)
      ? data.periodes
      : data.periodeActive
      ? [data.periodeActive]
      : [];
    if (periodes.length) {
      const periode = periodes[0];
      // Extraction et formatage des tags des cours concernés
      const coursTags =
        periode.cours_concernes &&
        periode.cours_concernes[0] !== null
          ? periode.cours_concernes
              .map(
                (c) =>
                  `<span style="display:inline-block; background:rgba(239,68,68,0.1); color:#dc2626; padding:4px 10px; border-radius:6px; font-size:12px; font-weight:600; margin:4px;">${c.title}</span>`,
              )
              .join("")
          : '<span style="font-size:13px; color:#64748b;">Tous les modules</span>';

      zonePeriode.innerHTML = `
              <article class="notification-card accent-error border-error-light" style="background:#fff5f5; border-left:4px solid #ef4444;">
                <div class="card-icon-wrapper bg-icon-error">
                  <span class="material-symbols-outlined fill-icon">alarm</span>
                </div>
                <div class="card-body">
                  <div class="card-meta">
                    <span class="tag-status" style="background:#ef4444; color:#fff;">Urgent</span>
                    <span class="tag-category bg-cat-error">Dépôt Ouvert</span>
                    <span class="time-stamp">Période Active</span>
                  </div>
                  <h2 class="card-title" style="color:#991b1b;">Dépôt de recours autorisé pour votre promotion</h2>
                  <p class="card-description" style="color:#7f1d1d;">
                    Une fenêtre de recours officielle a été ouverte pour le département <strong>${etudiant.department || "—"}</strong> (${etudiant.promotion || "—"}). Assurez-vous de soumettre vos requêtes avant la date de fermeture.
                  </p>

                  <div class="info-bento-grid bg-bento-error" style="background:rgba(255,255,255,0.7);">
                    <div class="bento-item">
                      <span class="bento-label">Semestre</span>
                      <span class="bento-value text-bold" style="color:#1e293b;">Semestre ${periode.semestre || "—"}</span>
                    </div>
                    <div class="bento-item">
                      <span class="bento-label">Date d'ouverture</span>
                      <span class="bento-value" style="color:#1e293b;">${formatDate(periode.date_debut)}</span>
                    </div>
                    <div class="bento-item">
                      <span class="bento-label" style="color:#b91c1c; font-weight:700;">Clôture Impérative</span>
                      <span class="bento-value text-error text-bold" style="color:#dc2626; font-weight:700;">${formatDate(periode.date_fin)} (23h59)</span>
                    </div>
                    <div class="bento-item" style="grid-column: span 2 / span 2;">
                      <span class="bento-label">Modules autorisés à la contestation</span>
                      <div style="margin-top:6px;">${coursTags}</div>
                    </div>
                  </div>
                </div>
                <div class="card-actions">
                  <button class="btn-action-error" onclick="window.location.href='recours.html'">Déposer un recours</button>
                </div>
              </article>
            `;
    } else {
      zonePeriode.innerHTML = `
              <div style="background:#f1f5f9; border: 1px dashed #cbd5e1; padding: 20px; border-radius:12px; text-align:center; color:#64748b; font-size:14px;">
                <span class="material-symbols-outlined" style="vertical-align:middle; margin-radius:4px;">info</span>
                Aucune période de recours active n'est déclarée pour la promotion <strong>${etudiant.promotion || "votre promotion"}</strong> à ce jour.
              </div>
            `;
    }

    // 3. Gestion de la liste des Traitements
    const containerTraitements = document.getElementById(
      "notificationsContainer",
    );
    if (!data.traitements || data.traitements.length === 0) {
      containerTraitements.innerHTML = `
              <div style="text-align:center; padding:40px; color:#94a3b8;">
                <span class="material-symbols-outlined" style="font-size:48px; display:block; margin-bottom:8px;">notifications_off</span>
                Aucune décision ou traitement de recours n'a encore été enregistré pour votre compte.
              </div>
            `;
      return;
    }

    // Affichage du point de notification sur mobile s'il y a des éléments
    document.getElementById("mobileDot").style.display = "block";

    containerTraitements.innerHTML = data.traitements
      .map((t, index) => {
        const estValide = t.statut === "Validé";
        const accentClass = estValide ? "accent-primary" : "accent-tertiary";
        const bgIcon = estValide ? "bg-icon-primary" : "bg-icon-neutral";
        const statusColor = estValide ? "#16a34a" : "#dc2626";

        return `
              <article class="notification-card ${accentClass}" id="card_t_${t.id}">
                <div class="card-icon-wrapper ${bgIcon}">
                  <span class="material-symbols-outlined fill-icon">${estValide ? "check_circle" : "cancel"}</span>
                </div>
                <div class="card-body">
                  <div class="card-meta">
                    <span class="tag-status bg-new">Nouveau</span>
                    <span class="tag-category" style="background: ${estValide ? "#dcfce7" : "#fee2e2"}; color: ${statusColor};">${t.statut}</span>
                    <span class="time-stamp">${formatDate(t.created_at)}</span>
                  </div>
                  <h2 class="card-title">Verdict Commission : ${t.objet}</h2>
                  <p class="card-description">
                    La commission d'appel a statué sur votre requête. 
                    <strong>Remarque officielle :</strong> ${t.commentaire || "Aucune observation particulière n'a été saisie."}
                  </p>

                  <div class="info-bento-grid bg-bento-neutral">
                    <div class="bento-item">
                      <span class="bento-label">Cours visé</span>
                      <span class="bento-value text-bold">${t.cours_nom}</span>
                    </div>
                    <div class="bento-item">
                      <span class="bento-label">Décision arrêtée</span>
                      <span class="bento-value text-bold" style="color: ${statusColor};">${t.statut}</span>
                    </div>
                  </div>
                </div>
                <div class="card-actions">
                  <button class="btn-check" title="Marquer comme lu" onclick="marquerCardLu('card_t_${t.id}')">
                    <span class="material-symbols-outlined">check_circle</span>
                  </button>
                </div>
              </article>
            `;
      })
      .join("");
  } catch (error) {
    console.error(error);
    document.getElementById("notificationsContainer").innerHTML =
      `<p style="color:#ef4444;">Erreur lors de la synchronisation en ligne.</p>`;
  }
}

// Utilitaires de formatage
function formatDate(dateString) {
  if (!dateString) return "--";
  const option = { year: "numeric", month: "long", day: "numeric" };
  return new Date(dateString).toLocaleDateString("fr-FR", option);
}

function marquerCardLu(elementId) {
  const card = document.getElementById(elementId);
  if (card) {
    card.classList.add("state-read");
    card.style.opacity = "0.55";
    card.style.filter = "grayscale(0.6)";
    const badge = card.querySelector(".bg-new");
    if (badge) badge.remove();
    const btn = card.querySelector(".btn-check");
    if (btn) btn.remove();
  }
}

function toutMarquerLu() {
  document.querySelectorAll(".notification-card").forEach((card) => {
    marquerCardLu(card.id);
  });
  document.getElementById("mobileDot").style.display = "none";
}

// Lancement automatique au chargement du DOM
document.addEventListener("DOMContentLoaded", chargerNotifications);
