/**
 * Admin Traitements Module
 * Step 4: Admin publishes prof treatments to students
 */

async function loadPendingTraitements() {
  const tbody = document.getElementById("admin-traitements-body");
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="9" class="text-center">Chargement…</td></tr>';

  try {
    const data = await AdminAPI.get(`/traitement_recours/admin/pending`);
    renderAdminTraitements(data.traitements || []);
  } catch (error) {
    console.error(error);
    tbody.innerHTML = '<tr><td colspan="9" class="text-center">Erreur de chargement.</td></tr>';
  }
}

function renderAdminTraitements(rows) {
  const tbody = document.getElementById("admin-traitements-body");
  if (!tbody) return;

  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="9" class="text-center">Aucun traitement en attente de publication.</td></tr>';
    return;
  }

  tbody.innerHTML = rows.map((r) => {
    const decisionClass = r.decision === "accepte" ? "badge badge-tertiary" : "badge badge-secondary";
    const decisionLabel = r.decision === "accepte" ? "Accepté" : "Refusé";
    const profName = [r.prof_name, r.prof_postnom].filter(Boolean).join(" ") || "—";

    return `<tr>
      <td>#T-${r.id} / #REC-${r.recours_id}</td>
      <td>${r.matricule || "—"}</td>
      <td>${r.etudiant_name || ""} ${r.etudiant_postnom || ""}</td>
      <td>${r.cours_nom || "—"}</td>
      <td>${r.evaluation ? r.evaluation.toUpperCase() : "—"}</td>
      <td><span class="${decisionClass}">${decisionLabel}</span></td>
      <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;" title="${r.motif || ""}">${r.motif || "—"}</td>
      <td>${profName}</td>
      <td>
        <button data-id="${r.id}" class="btn btn-primary btn-publish" type="button">
          <span class="material-symbols-outlined" style="font-size:16px;">publish</span> Publier
        </button>
      </td>
    </tr>`;
  }).join("");
}

async function publishTreatment(id) {
  if (!window.confirm("Publier ce traitement ? L'étudiant sera notifié.")) return;
  try {
    await AdminAPI.post(`/traitement_recours/publish/${id}`, {});
    alert("Traitement publié avec succès. L'étudiant a été notifié.");
    await loadPendingTraitements();
  } catch (err) {
    console.error(err);
    alert("Erreur lors de la publication: " + (err.message || ""));
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  if (AdminAPI && AdminAPI.redirectIfTokenInvalid?.()) return;

  const tbody = document.getElementById("admin-traitements-body");
  if (tbody) {
    tbody.addEventListener("click", (e) => {
      const btn = e.target.closest("button.btn-publish");
      if (btn) publishTreatment(btn.dataset.id);
    });
  }

  // Only auto-load if the traitements tab is visible
  // (loadPendingTraitements is called from switchTab in recours.js)
});
