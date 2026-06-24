// Admin recours management

function formatDepartment(value) {
  return value ? value.replace(/_/g, " ") : "—";
}

function formatStatus(status) {
  const map = {
    en_attente: { text: "En attente", className: "badge badge-error" },
    en_cours: { text: "En cours", className: "badge badge-primary" },
    traite_prof: { text: "Traité prof", className: "badge badge-warning" },
    publie: { text: "Publié", className: "badge badge-tertiary" },
    accepte: { text: "Accepté", className: "badge badge-tertiary" },
    refuse: { text: "Refusé", className: "badge badge-secondary" },
  };
  return map[status] || { text: status || "—", className: "badge badge-neutral" };
}

function openModal(modalId) {
  const container = document.getElementById("modal-container");
  const modal = document.getElementById(modalId);
  if (!container || !modal) return;
  container.classList.remove("hidden");
  modal.classList.remove("hidden");
  setTimeout(() => {
    container.querySelector(".modal-overlay")?.classList.remove("opacity-0");
    modal.classList.remove("opacity-0", "scale-95");
    modal.classList.add("opacity-100", "scale-100");
  }, 10);
}

function closeModal(modalId) {
  const container = document.getElementById("modal-container");
  const modal = document.getElementById(modalId);
  if (!container || !modal) return;
  container.querySelector(".modal-overlay")?.classList.add("opacity-0");
  modal.classList.remove("opacity-100", "scale-100");
  modal.classList.add("opacity-0", "scale-95");
  setTimeout(() => {
    modal.classList.add("hidden");
    if (!document.querySelector("#modal-container .modal-content:not(.hidden)"))
      container.classList.add("hidden");
  }, 250);
}

window.switchTab = function (tab) {
  const panelRecours = document.getElementById("panel-recours");
  const panelTraitements = document.getElementById("panel-traitements");
  const btnRecours = document.getElementById("tab-recours");
  const btnTraitements = document.getElementById("tab-traitements");

  if (tab === "recours") {
    panelRecours.style.display = "";
    panelTraitements.style.display = "none";
    btnRecours.className = "btn btn-primary";
    btnTraitements.className = "btn btn-secondary";
  } else {
    panelRecours.style.display = "none";
    panelTraitements.style.display = "";
    btnRecours.className = "btn btn-secondary";
    btnTraitements.className = "btn btn-primary";
    loadPendingTraitements();
  }
};

function renderRecours(items) {
  const tbody = document.getElementById("recours-table-body");
  if (!tbody) return;

  if (!items || items.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="text-center">Aucun recours trouvé.</td></tr>';
    return;
  }

  tbody.innerHTML = items.map((item) => {
    const status = formatStatus(item.status);
    const coursList = Array.isArray(item.cours_list) ? item.cours_list : [];
    const coursDisplay = coursList.length
      ? coursList.map((c) => `${c.nom_cours} (${c.evaluation?.toUpperCase()})`).join(", ")
      : "—";

    return `
      <tr>
        <td>#REC-${item.id}</td>
        <td>${item.matricule || "—"}</td>
        <td>${item.etudiant_name || "—"}</td>
        <td title="${coursDisplay}" style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${coursDisplay}</td>
        <td>${item.promotion || "—"}</td>
        <td>${formatDepartment(item.department)}</td>
        <td><span class="${status.className}">${status.text}</span></td>
        <td>
          <div style="display:flex;gap:6px;flex-wrap:wrap;">
            <button class="btn btn-primary btn-view-detail" data-recours-id="${item.id}" title="Voir détail" type="button" style="padding:4px 8px;">
              <span class="material-symbols-outlined" style="font-size:16px;">visibility</span>
            </button>
            <button class="btn btn-secondary btn-send-prof" data-recours-id="${item.id}" title="Envoyer au prof" type="button" style="padding:4px 8px;"
              ${item.assigned_to_prof ? 'disabled title="Déjà envoyé"' : ''}>
              <span class="material-symbols-outlined" style="font-size:16px;">send</span>
            </button>
            <button class="btn btn-secondary btn-view-notes" data-matricule="${item.matricule}" title="Voir notes" type="button" style="padding:4px 8px;">
              <span class="material-symbols-outlined" style="font-size:16px;">grade</span>
            </button>
            <button class="btn btn-secondary btn-invalidate" data-recours-id="${item.id}" title="Invalider" type="button" style="padding:4px 8px;background:#e74c3c;color:#fff;">
              <span class="material-symbols-outlined" style="font-size:16px;">block</span>
            </button>
          </div>
        </td>
      </tr>`;
  }).join("");
}

async function loadRecours() {
  if (AdminAPI && AdminAPI.redirectIfTokenInvalid?.()) return;

  const search = document.getElementById("recours-search")?.value || "";
  const department = document.getElementById("filter-department")?.value || "";
  const promotion = document.getElementById("filter-promotion")?.value || "";
  const status = document.getElementById("filter-status")?.value || "";
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (department) params.set("department", department);
  if (promotion) params.set("promotion", promotion);
  if (status) params.set("status", status);

  try {
    const data = await AdminAPI.get(`/recours/admin-list?${params.toString()}`);
    const list = data.recours || [];
    renderRecours(list);
    document.getElementById("total-recours").textContent = list.length;
    document.getElementById("total-traites").textContent = list.filter(
      (item) => ["accepte", "refuse", "publie", "traite_prof"].includes(item.status),
    ).length;
    document.getElementById("total-pending").textContent = list.filter(
      (item) => ["en_attente", "en_cours"].includes(item.status),
    ).length;
    document.getElementById("recours-total-badge").textContent = list.length;
    document.getElementById("recours-traites-badge").textContent = list.filter(
      (item) => ["accepte", "refuse", "publie"].includes(item.status),
    ).length;
    document.getElementById("recours-pending-badge").textContent = list.filter(
      (item) => ["en_attente", "en_cours"].includes(item.status),
    ).length;
  } catch (error) {
    console.error(error);
    document.getElementById("recours-table-body").innerHTML =
      '<tr><td colspan="8" class="text-center">Erreur de chargement des recours.</td></tr>';
  }
}

async function loadFilters() {
  try {
    const data = await AdminAPI.get(`/recours/admin-list`);
    const list = data.recours || [];
    const departments = [...new Set(list.map((item) => item.department).filter(Boolean))].sort();
    const promotions = [...new Set(list.map((item) => item.promotion).filter(Boolean))].sort();
    const deptSelect = document.getElementById("filter-department");
    const promoSelect = document.getElementById("filter-promotion");
    deptSelect.innerHTML = '<option value="">Tous les départements</option>' +
      departments.map((d) => `<option value="${d}">${formatDepartment(d)}</option>`).join("");
    promoSelect.innerHTML = '<option value="">Toutes les promotions</option>' +
      promotions.map((p) => `<option value="${p}">${p}</option>`).join("");
  } catch (error) {
    console.error(error);
  }
}

async function loadAdminInfo() {
  try {
    const data = await AdminAPI.get(`/dashboard/admin`);
    const admin = data.admin || {};
    document.querySelector(".user-name").textContent = admin.name || "Admin";
    document.querySelector(".user-role").textContent = admin.email || "Administrateur";
  } catch (error) {
    console.error(error);
  }
}

// Current recours context
let currentRecoursId = null;
let currentRecoursCoursList = [];

async function openDetail(recoursId) {
  try {
    const data = await AdminAPI.get(`/recours/admin-list`);
    const item = (data.recours || []).find((row) => String(row.id) === String(recoursId));
    if (!item) throw new Error("Recours introuvable");

    currentRecoursId = item.id;
    currentRecoursCoursList = Array.isArray(item.cours_list) ? item.cours_list : [];

    const coursList = currentRecoursCoursList;
    const coursHTML = coursList.length
      ? `<ul style="margin:0;padding-left:20px;">${coursList.map((c) =>
          `<li>${c.nom_cours} — <strong>${c.evaluation?.toUpperCase()}</strong>
           ${c.piece_jointe
             ? `<a href="/api/recours/attachment/${c.id}?token=${localStorage.getItem('token')}" target="_blank" style="margin-left:8px;font-size:0.85em;">(voir pièce jointe)</a>`
             : " (sans pièce jointe)"
           }</li>`
        ).join("")}</ul>`
      : "Aucun cours lié.";

    document.getElementById("detail-content").innerHTML = `
      <div class="form-spacing">
        <div class="form-grid">
          <div class="form-group"><label class="form-label">Matricule</label><input class="form-control" type="text" value="${item.matricule || "—"}" readonly style="background:#f1f5f9;"/></div>
          <div class="form-group"><label class="form-label">Étudiant</label><input class="form-control" type="text" value="${item.etudiant_name || "—"}" readonly style="background:#f1f5f9;"/></div>
        </div>
        <div class="form-grid">
          <div class="form-group"><label class="form-label">Promotion</label><input class="form-control" type="text" value="${item.promotion || "—"}" readonly style="background:#f1f5f9;"/></div>
          <div class="form-group"><label class="form-label">Département</label><input class="form-control" type="text" value="${formatDepartment(item.department)}" readonly style="background:#f1f5f9;"/></div>
        </div>
        <div class="form-group"><label class="form-label">Objet</label><input class="form-control" type="text" value="${item.objet || "—"}" readonly style="background:#f1f5f9;"/></div>
        <div class="form-group"><label class="form-label">Description</label><textarea class="form-control" rows="3" readonly style="background:#f1f5f9;">${item.description || "Aucune description."}</textarea></div>
        <div class="form-group"><label class="form-label">Cours concernés</label><div style="background:#f1f5f9;padding:10px;border-radius:6px;">${coursHTML}</div></div>
        <div class="form-group"><label class="form-label">Statut</label><input class="form-control" type="text" value="${formatStatus(item.status).text}" readonly style="background:#f1f5f9;"/></div>
        <div class="form-group"><label class="form-label">Année universitaire</label><input class="form-control" type="text" value="${item.annee_universitaire || "—"}" readonly style="background:#f1f5f9;"/></div>
      </div>`;

    document.getElementById("treatment-matricule").value = item.matricule || "";
    document.getElementById("treatment-objet").value = item.objet || "";
    document.getElementById("treatment-decision").value = "";
    document.getElementById("treatment-motif").value = "";

    // Update send-to-prof button state
    const sendBtn = document.getElementById("btn-send-prof-from-detail");
    if (sendBtn) {
      sendBtn.disabled = !!item.assigned_to_prof;
      sendBtn.title = item.assigned_to_prof ? "Déjà envoyé au professeur" : "Envoyer au professeur";
    }

    openModal("detail-modal");
  } catch (error) {
    alert(error.message || "Impossible d'ouvrir le détail");
  }
}

async function openNotes(matricule) {
  if (!matricule) return alert("Aucun matricule disponible.");
  try {
    const data = await AdminAPI.get(`/notes/admin/matricule/${encodeURIComponent(matricule)}`);
    const notes = data.notes || [];
    document.getElementById("notes-content").innerHTML = notes.length
      ? `<table style="width:100%;border-collapse:collapse;">
          <thead><tr><th>Cours</th><th>Sem.</th><th>Année</th><th>TP</th><th>TD</th><th>Interro.</th><th>Examen</th></tr></thead>
          <tbody>${notes.map((n) =>
            `<tr><td>${n.course_name || "—"}</td><td>${n.semestre || "—"}</td><td>${n.annee_universitaire || "—"}</td>
             <td>${n.note_tp ?? "—"}</td><td>${n.note_td ?? "—"}</td><td>${n.note_interrogation ?? "—"}</td><td>${n.note_examen ?? "—"}</td></tr>`
          ).join("")}</tbody>
        </table>`
      : "<p>Aucune note disponible pour cet étudiant.</p>";
    openModal("notes-modal");
  } catch (error) {
    alert(error.message || "Impossible de charger les notes");
  }
}

async function submitTreatment() {
  const recoursId = currentRecoursId;
  const decision = document.getElementById("treatment-decision")?.value;
  const motif = document.getElementById("treatment-motif")?.value.trim();
  if (!recoursId || !decision || !motif)
    return alert("Veuillez renseigner la décision et le motif.");
  try {
    await AdminAPI.post(`/traitement_recours/traitement_recours`, {
      recours_id: Number(recoursId),
      decision,
      motif,
    });
    closeModal("treatment-modal");
    closeModal("detail-modal");
    await loadRecours();
    alert("Traitement enregistré avec succès.");
  } catch (error) {
    alert(error.message || "Impossible de traiter le recours");
  }
}

async function adminSendToProf(id) {
  if (!confirm("Envoyer ce recours au professeur responsable ?")) return;
  try {
    await AdminAPI.post(`/recours/admin/send-to-prof/${id}`, {});
    alert("Envoyé au professeur");
    await loadRecours();
  } catch (e) {
    console.error(e);
    alert("Erreur lors de l'envoi.");
  }
}

async function adminInvalidate(id) {
  const motif = prompt("Motif d'invalidation (optionnel):") || "";
  if (!confirm("Confirmer l'invalidation de ce recours ?")) return;
  try {
    await AdminAPI.post(`/recours/admin/invalidate/${id}`, { motif });
    alert("Recours invalidé");
    await loadRecours();
  } catch (e) {
    console.error(e);
    alert("Erreur");
  }
}

async function logoutAdmin() {
  try { await AdminAPI.logout(); } catch (error) { console.error("Logout error:", error); }
}

document.addEventListener("DOMContentLoaded", async () => {
  if (AdminAPI && AdminAPI.redirectIfTokenInvalid?.()) return;

  const searchInput = document.getElementById("recours-search");
  const departmentSelect = document.getElementById("filter-department");
  const promotionSelect = document.getElementById("filter-promotion");
  const statusSelect = document.getElementById("filter-status");
  const refreshBtn = document.getElementById("refresh-recours");
  const tableBody = document.getElementById("recours-table-body");

  document.querySelector(".logout-link")?.addEventListener("click", (e) => {
    e.preventDefault();
    logoutAdmin();
  });

  document.querySelectorAll("[data-close-modal]").forEach((btn) =>
    btn.addEventListener("click", () => closeModal(btn.getAttribute("data-close-modal")))
  );

  document.getElementById("open-treatment-btn")?.addEventListener("click", () => {
    closeModal("detail-modal");
    setTimeout(() => openModal("treatment-modal"), 150);
  });

  document.getElementById("btn-send-prof-from-detail")?.addEventListener("click", () => {
    if (!currentRecoursId) return;
    closeModal("detail-modal");
    adminSendToProf(currentRecoursId);
  });

  document.getElementById("submit-treatment")?.addEventListener("click", submitTreatment);

  document.querySelector(".modal-overlay")?.addEventListener("click", () => {
    document.querySelectorAll("#modal-container .modal-content:not(.hidden)").forEach((modal) =>
      closeModal(modal.id)
    );
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape")
      document.querySelectorAll("#modal-container .modal-content:not(.hidden)").forEach((modal) =>
        closeModal(modal.id)
      );
  });

  if (searchInput) searchInput.addEventListener("input", loadRecours);
  [departmentSelect, promotionSelect, statusSelect].forEach(
    (el) => el && el.addEventListener("change", loadRecours)
  );
  if (refreshBtn) refreshBtn.addEventListener("click", async () => {
    await loadFilters();
    await loadRecours();
  });

  tableBody?.addEventListener("click", (event) => {
    const detailBtn = event.target.closest(".btn-view-detail");
    const notesBtn = event.target.closest(".btn-view-notes");
    const sendBtn = event.target.closest(".btn-send-prof");
    const invalidateBtn = event.target.closest(".btn-invalidate");

    if (detailBtn) return openDetail(detailBtn.dataset.recoursId);
    if (notesBtn) return openNotes(notesBtn.dataset.matricule);
    if (sendBtn) return adminSendToProf(sendBtn.dataset.recoursId);
    if (invalidateBtn) return adminInvalidate(invalidateBtn.dataset.recoursId);
  });

  document.getElementById("refresh-traitements")?.addEventListener("click", loadPendingTraitements);

  await loadAdminInfo();
  await loadFilters();
  await loadRecours();
});
