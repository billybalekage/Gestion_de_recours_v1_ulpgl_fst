const API_BASE = "http://localhost:8000/api";
function getToken() {
  const t = localStorage.getItem("token");
  return t && t != "null" && t != "undefined" ? t : null;
}
function authHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
function getMatriculeFromQuery() {
  const params = new URLSearchParams(window.location.search);
  return params.get("matricule") || "";
}
function renderStudentsRows(students) {
  const tbody = document.getElementById("note-students-table-body");
  if (!tbody) return;
  if (!students.length) {
    tbody.innerHTML =
      '<tr><td colspan="6" class="text-center">Aucun étudiant trouvé.</td></tr>';
    return;
  }
  tbody.innerHTML = students
    .map(
      (s) =>
        `<tr><td>${s.matricule || "—"}</td><td>${s.name || "—"}</td><td>${s.postnom || "—"}</td><td>${s.email || "—"}</td><td>${s.promotion || "—"}</td><td class="text-right"><button class="btn btn-secondary" data-action="note" data-matricule="${s.matricule}">Attribuer note</button></td></tr>`,
    )
    .join("");
}

async function fetchCoursesForStudent(matricule) {
  try {
    const res = await fetch(
      `${API_BASE}/cours/etudiant-cours/${encodeURIComponent(matricule)}`,
      { headers: authHeaders() },
    );
    if (!res.ok)
      throw new Error("Impossible de charger les cours de l'étudiant");
    const data = await res.json();
    return data.cours || [];
  } catch (error) {
    console.error(error);
    return [];
  }
}
async function loadNotesStudents() {
  try {
    const promo = document.getElementById("note-promotion").value || "";
    const search = document.getElementById("note-search").value.trim() || "";
    const params = new URLSearchParams();
    if (promo) params.set("promotion", promo);
    if (search) params.set("search", search);
    const res = await fetch(`${API_BASE}/profs/students?${params.toString()}`, {
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error("Impossible de charger les étudiants");
    const data = await res.json();
    renderStudentsRows(data.students || []);
  } catch (e) {
    console.error(e);
    document.getElementById("note-students-table-body").innerHTML =
      '<tr><td colspan="6" class="text-center">Erreur de chargement.</td></tr>';
  }
}
async function openNoteModal(matricule) {
  const body = document.getElementById("note-modal-body");
  if (!body) return;
  const courses = await fetchCoursesForStudent(matricule);
  const courseOptions = courses.length
    ? courses
        .map((c) => `<option value="${c.id}">${c.title || c.title}</option>`)
        .join("")
    : '<option value="">Aucun cours trouvé</option>';

  body.innerHTML = `
		<div class="form-spacing">
			<div class="form-grid">
				<div class="form-group"><label>Matricule</label><input class="form-control readonly-bg" readonly value="${matricule}" /></div>
				<div class="form-group"><label>Cours</label><select id="note-course" class="form-control">${courseOptions}</select></div>
				<div class="form-group"><label>Année universitaire</label><input id="note-annee" class="form-control" placeholder="2025-2026" /></div>
				<div class="form-group"><label>Semestre</label><input id="note-semestre" class="form-control" placeholder="1 ou 2" type="number" min="1" max="2"/></div>
				<div class="form-group"><label>Note TP</label><input id="note-tp" class="form-control" type="number" step="0.01"/></div>
				<div class="form-group"><label>Note TD</label><input id="note-td" class="form-control" type="number" step="0.01"/></div>
				<div class="form-group"><label>Interrogation</label><input id="note-interro" class="form-control" type="number" step="0.01"/></div>
				<div class="form-group"><label>Examen</label><input id="note-examen" class="form-control" type="number" step="0.01"/></div>
			</div>
		</div>`;
  document.getElementById("save-note-btn").onclick = async () => {
    await saveNote(matricule);
  };
  openModal("note-modal");
}

function openModal(id) {
  const container = document.getElementById(id);
  if (!container) return;

  // 1. On affiche le conteneur principal en retirant 'hidden'
  container.classList.remove("hidden");

  // 2. On cible l'overlay et le contenu pour appliquer les transitions d'opacité
  const overlay = container.querySelector(".modal-overlay");
  const content = container.querySelector(".modal-content");

  if (overlay) {
    overlay.classList.remove("opacity-0");
  }

  if (content) {
    // IMPORTANT : On s'assure que 'hidden' est bien retiré de la boîte blanche
    content.classList.remove("hidden", "opacity-0", "scale-95");
  }
}

function closeModal(id) {
  const container = document.getElementById(id);
  if (!container) return;

  const overlay = container.querySelector(".modal-overlay");
  const content = container.querySelector(".modal-content");

  if (overlay) overlay.classList.add("opacity-0");
  if (content) content.classList.add("opacity-0", "scale-95");

  // Attendre la fin de l'animation CSS (300ms) avant de masquer complètement l'élément du DOM
  setTimeout(() => {
    container.classList.add("hidden");
  }, 300);
}

async function saveNote(matricule) {
  try {
    const annee = document.getElementById("note-annee").value.trim();
    const semestre = Number(document.getElementById("note-semestre").value);
    const tp = document.getElementById("note-tp").value;
    const td = document.getElementById("note-td").value;
    const interro = document.getElementById("note-interro").value;
    const examen = document.getElementById("note-examen").value;
    const courseEl = document.getElementById("note-course");
    const course_id = courseEl ? Number(courseEl.value) : null;
    if (!annee || !semestre) {
      return alert("Année et semestre sont requis");
    }
    if (!course_id) {
      return alert("Veuillez sélectionner un cours");
    }
    const payload = {
      matricule,
      course_id,
      annee_universitaire: annee,
      semestre,
      note_tp: tp ? Number(tp) : null,
      note_td: td ? Number(td) : null,
      note_interrogation: interro ? Number(interro) : null,
      note_examen: examen ? Number(examen) : null,
    };
    const res = await fetch(`${API_BASE}/notes/add-note`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(),
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Erreur");
    alert("Note enregistrée");
    closeModal("note-modal");
  } catch (e) {
    console.error(e);
    alert(e.message || "Erreur");
  }
}
function setupHandlers() {
  document
    .getElementById("note-students-table-body")
    .addEventListener("click", (event) => {
      const btn = event.target.closest("button[data-action]");
      if (!btn) return;
      const matricule = btn.dataset.matricule;
      if (matricule) openNoteModal(matricule);
    });

  document
    .getElementById("note-search")
    .addEventListener("input", loadNotesStudents);
  document
    .getElementById("note-promotion")
    .addEventListener("change", loadNotesStudents);
}

document.addEventListener("DOMContentLoaded", () => {
  loadNotesStudents();
  setupHandlers();
});
