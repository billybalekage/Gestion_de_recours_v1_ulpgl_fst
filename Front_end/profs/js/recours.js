/**
 * Professor recours management
 * Step 3: Prof views recours for his courses, treats them, sends back to admin
 */

const API_BASE = "http://localhost:8000/api";

function getToken() {
  const token = localStorage.getItem("token");
  if (!token || token === "null" || token === "undefined") return null;
  return token.trim();
}

function authHeaders(extra = {}) {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}`, ...extra } : { ...extra };
}

function statusLabel(status) {
  const map = {
    en_attente: "En attente",
    en_cours: "En cours",
    traite_prof: "Traité",
    publie: "Publié",
    accepte: "Accepté",
    refuse: "Refusé",
  };
  return map[status] || status || "—";
}

// --- MODAL helpers ---
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

// --- LOAD RECOURS ---
async function fetchRecoursForProfessor() {
  const token = getToken();
  if (!token) { window.location.href = "../login.html"; return; }

  const search = document.getElementById("prof-recours-search")?.value || "";
  const status = document.getElementById("prof-status-filter")?.value || "";
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (status) params.set("status", status);

  try {
    const res = await fetch(`${API_BASE}/recours/prof/my-recours?${params.toString()}`, {
      headers: authHeaders(),
    });
    if (!res.ok) {
      if (res.status === 401) { window.location.href = "../login.html"; return; }
      throw new Error("Impossible de charger les recours");
    }
    const data = await res.json();
    renderRecoursTable(data.recours || []);
  } catch (err) {
    console.error(err);
    const container = document.getElementById("prof-recours-body");
    if (container) container.innerHTML = '<tr><td colspan="8" class="text-center">Erreur de chargement.</td></tr>';
  }
}

function renderRecoursTable(rows) {
  const tbody = document.getElementById("prof-recours-body");
  if (!tbody) return;

  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="8" class="text-center">Aucun recours en attente pour vos cours.</td></tr>';
    return;
  }

  tbody.innerHTML = rows.map((r) => {
    const hasPJ = !!r.piece_jointe;
    const pieceJointeHTML = hasPJ
      ? `<a href="${API_BASE.replace('/api','')}/api/recours/attachment/${r.recours_cours_id}?token=${localStorage.getItem('token')}" target="_blank" class="btn btn-secondary" style="padding:2px 8px;font-size:0.8em;">
           <span class="material-symbols-outlined" style="font-size:14px;">description</span> Voir
         </a>`
      : '<span style="color:#64748b;">—</span>';

    return `
    <tr>
      <td>#REC-${r.id}</td>
      <td>${r.matricule || "—"}</td>
      <td>${r.etudiant_name || ""} ${r.etudiant_postnom || ""}</td>
      <td>${r.cours_nom || "—"}</td>
      <td>${r.evaluation ? r.evaluation.toUpperCase() : "—"}</td>
      <td>${pieceJointeHTML}</td>
      <td><span class="badge">${statusLabel(r.status)}</span></td>
      <td>
        <button class="btn btn-primary btn-traiter"
          data-recours-id="${r.id}"
          data-recours-cours-id="${r.recours_cours_id || ""}"
          data-matricule="${r.matricule}"
          data-cours="${encodeURIComponent(r.cours_nom || "")}"
          data-objet="${encodeURIComponent(r.objet || "")}"
          type="button">
          Traiter
        </button>
      </td>
    </tr>`;
  }).join("");
}

// --- TREATMENT MODAL ---
let currentRecoursId = null;
let currentRecoursCourId = null;

async function openTraitementModal(recoursId, recoursCourId, matricule, cours, objet) {
  currentRecoursId = recoursId;
  currentRecoursCourId = recoursCourId || null;

  const titleEl = document.getElementById("prof-modal-title");
  if (titleEl) titleEl.textContent = `Traiter recours #REC-${recoursId} — ${decodeURIComponent(cours || "")}`;

  document.getElementById("prof-decision").value = "";
  document.getElementById("prof-motif").value = "";

  // Load student notes
  const notesContainer = document.getElementById("prof-notes-container");
  notesContainer.innerHTML = "Chargement des notes…";

  try {
    const res = await fetch(`${API_BASE}/notes/admin/matricule/${encodeURIComponent(matricule)}`, {
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error("Impossible de charger les notes");
    const json = await res.json();
    const notes = json.notes || [];

    if (!notes.length) {
      notesContainer.innerHTML = "<p>Aucune note trouvée pour cet étudiant.</p>";
    } else {
      notesContainer.innerHTML = `
        <table style="width:100%;border-collapse:collapse;font-size:0.9em;">
          <thead>
            <tr>
              <th>Cours</th><th>Année</th><th>Sem.</th><th>TP</th><th>TD</th><th>Interro.</th><th>Examen</th><th>Action</th>
            </tr>
          </thead>
          <tbody>
            ${notes.map((n, i) =>
              `<tr data-note-row="${i}"
                   data-course-id="${n.course_id ?? ""}"
                   data-annee="${n.annee_universitaire || ""}"
                   data-semestre="${n.semestre || ""}">
                <td>${n.course_name || "—"}</td>
                <td>${n.annee_universitaire || "—"}</td>
                <td>${n.semestre || "—"}</td>
                <td><input type="number" step="0.01" class="form-control note-edit" data-field="note_tp" value="${n.note_tp ?? ""}" style="width:70px;padding:4px;"/></td>
                <td><input type="number" step="0.01" class="form-control note-edit" data-field="note_td" value="${n.note_td ?? ""}" style="width:70px;padding:4px;"/></td>
                <td><input type="number" step="0.01" class="form-control note-edit" data-field="note_interrogation" value="${n.note_interrogation ?? ""}" style="width:70px;padding:4px;"/></td>
                <td><input type="number" step="0.01" class="form-control note-edit" data-field="note_examen" value="${n.note_examen ?? ""}" style="width:70px;padding:4px;"/></td>
                <td><button type="button" class="btn btn-secondary btn-modifier-note" data-matricule="${encodeURIComponent(matricule)}" style="padding:4px 8px;font-size:0.8em;">Modifier</button></td>
              </tr>`
            ).join("")}
          </tbody>
        </table>`;

      // Bind "Modifier la note" buttons (PUT /api/notes/update)
      notesContainer.querySelectorAll(".btn-modifier-note").forEach((btn) => {
        btn.addEventListener("click", () => updateStudentNote(btn));
      });
    }
  } catch (e) {
    console.error(e);
    notesContainer.textContent = "Erreur lors du chargement des notes.";
  }

  openModal("prof-traitement-modal");
}

// Modifier la note d'un étudiant pour un cours (PUT /api/notes/update)
async function updateStudentNote(btn) {
  const row = btn.closest("tr");
  if (!row) return;
  const matricule = decodeURIComponent(btn.dataset.matricule || "");
  const course_id = row.dataset.courseId ? Number(row.dataset.courseId) : null;
  const annee_universitaire = row.dataset.annee || "";
  const semestre = row.dataset.semestre ? Number(row.dataset.semestre) : null;

  if (!course_id || !annee_universitaire || !semestre) {
    return alert("Informations insuffisantes pour modifier cette note.");
  }

  const payload = { matricule, course_id, annee_universitaire, semestre };
  row.querySelectorAll(".note-edit").forEach((inp) => {
    const v = inp.value.trim();
    payload[inp.dataset.field] = v === "" ? null : Number(v);
  });

  try {
    const res = await fetch(`${API_BASE}/notes/update`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Erreur lors de la mise à jour");
    btn.textContent = "Enregistré ✓";
    setTimeout(() => { btn.textContent = "Modifier"; }, 1500);
  } catch (e) {
    console.error(e);
    alert(e.message || "Erreur lors de la mise à jour de la note.");
  }
}

async function saveProfTreatment() {
  const decision = document.getElementById("prof-decision").value;
  const motif = document.getElementById("prof-motif").value.trim();

  if (!decision) return alert("Veuillez sélectionner une décision.");
  if (!motif) return alert("Le motif est obligatoire.");
  if (!currentRecoursId) return alert("Aucun recours sélectionné.");

  try {
    const res = await fetch(`${API_BASE}/traitement_recours/prof/traiter`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({
        recours_id: Number(currentRecoursId),
        recours_cours_id: currentRecoursCourId ? Number(currentRecoursCourId) : null,
        decision,
        motif,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Erreur lors du traitement");

    alert("Traitement enregistré. L'administration sera notifiée pour publication.");
    closeModal("prof-traitement-modal");
    fetchRecoursForProfessor();
  } catch (e) {
    console.error(e);
    alert(e.message || "Erreur lors de l'enregistrement.");
  }
}

// --- LOAD PROF INFO ---
async function loadProfInfo() {
  try {
    const res = await fetch(`${API_BASE}/profs/me`, { headers: authHeaders() });
    if (res.ok) {
      const data = await res.json();
      const prof = data.prof || data;
      const nameEl = document.getElementById("prof-name");
      if (nameEl) nameEl.textContent = `${prof.name || ""} ${prof.postnom || ""}`.trim() || "Professeur";
    }
  } catch (_) {}
}

// --- INIT ---
window.addEventListener("DOMContentLoaded", () => {
  const token = getToken();
  if (!token) { window.location.href = "../login.html"; return; }

  loadProfInfo();
  fetchRecoursForProfessor();

  // Table click delegation
  document.getElementById("prof-recours-body")?.addEventListener("click", (e) => {
    const btn = e.target.closest(".btn-traiter");
    if (!btn) return;
    const recoursId = btn.dataset.recoursId;
    const recoursCourId = btn.dataset.recoursCoursId;
    const matricule = btn.dataset.matricule;
    const cours = btn.dataset.cours;
    const objet = btn.dataset.objet;
    openTraitementModal(recoursId, recoursCourId, matricule, cours, objet);
  });

  // Modal save
  document.getElementById("prof-save-treatment")?.addEventListener("click", saveProfTreatment);

  // Close buttons
  document.getElementById("close-prof-modal")?.addEventListener("click", () => closeModal("prof-traitement-modal"));
  document.getElementById("close-prof-modal-2")?.addEventListener("click", () => closeModal("prof-traitement-modal"));

  // Modal overlay click
  document.querySelector(".modal-overlay")?.addEventListener("click", () => closeModal("prof-traitement-modal"));

  // Filters
  document.getElementById("refresh-prof-recours")?.addEventListener("click", fetchRecoursForProfessor);
  document.getElementById("prof-recours-search")?.addEventListener("input", fetchRecoursForProfessor);
  document.getElementById("prof-status-filter")?.addEventListener("change", fetchRecoursForProfessor);

  // Logout
  document.querySelector(".logout-link")?.addEventListener("click", (e) => {
    e.preventDefault();
    localStorage.removeItem("token");
    window.location.href = "../login.html";
  });
});
