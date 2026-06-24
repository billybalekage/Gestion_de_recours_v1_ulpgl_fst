const API_BASE = "http://localhost:8000/api";
let currentIndex = 0;
let listeIndexes = [];
let coursDisponibles = [];

// --- UTILS ---
function getToken() {
  return localStorage.getItem("token");
}
function authHeaders() {
  return { Authorization: `Bearer ${getToken()}` };
}

function statusLabel(status) {
  const map = {
    en_attente: "En attente",
    en_cours: "En cours",
    traite_prof: "Traité par le prof",
    publie: "Publié",
    accepte: "Validé",
    refuse: "Refusé",
  };
  return map[status] || status || "—";
}

function statusClass(status) {
  if (status === "accepte" || status === "publie") return "status-valid";
  if (status === "refuse") return "status-rejected";
  return "status-pending";
}

// Evaluations requiring mandatory attachment
const EVAL_REQUIRES_ATTACHMENT = ["TP", "TD", "Interrogation"];

// --- MODAL ---
window.toggleModal = function (modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  if (modal.classList.contains("hidden")) {
    modal.classList.remove("hidden");
    document.body.style.overflow = "hidden";
  } else {
    modal.classList.add("hidden");
    document.body.style.overflow = "auto";
  }
};

function bloquerBoutonRecours(bouton, message) {
  if (!bouton) return;
  bouton.disabled = true;
  bouton.removeAttribute("onclick");
  bouton.style.opacity = "0.7";
  bouton.style.cursor = "not-allowed";
  bouton.style.background = "#bdc3c7";
  bouton.style.borderColor = "#bdc3c7";
  bouton.innerHTML = `<span class="material-symbols-outlined" style="font-size:18px;vertical-align:middle;margin-right:5px;">lock</span> ${message}`;
}

// --- LOAD HISTORY ---
async function loadStudentRecours() {
  try {
    // Correction #9 : on affiche TOUS les recours de l'étudiant (pas seulement les récents)
    const res = await fetch(`${API_BASE}/recours/my-all-recours`, {
      headers: authHeaders(),
    });
    if (!res.ok) return;
    const data = await res.json();
    const rows = data.recours || [];

    // Statistiques calculées côté client à partir de la liste complète
    const total = rows.length;
    const pending = rows.filter((r) => r.status === "en_attente").length;
    const accepted = rows.filter((r) => ["accepte", "publie"].includes(r.status)).length;
    const refused = rows.filter((r) => r.status === "refuse").length;
    document.getElementById("stat-total").textContent = total;
    document.getElementById("stat-pending").textContent = pending;
    document.getElementById("stat-accepted").textContent = accepted;
    document.getElementById("stat-refused").textContent = refused;

    const tbody = document.getElementById("recent-recours-body");
    if (!tbody) return;

    if (!data.recours || data.recours.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center">Aucun recours trouvé.</td></tr>';
      return;
    }

    tbody.innerHTML = data.recours
      .map((item) => {
        // Build a compact list of courses for display
        const coursList = Array.isArray(item.cours_list) ? item.cours_list : [];
        const coursDisplay = coursList.length
          ? coursList.map((c) => `${c.course_name} (${c.evaluation?.toUpperCase()})`).join(", ")
          : "—";

        return `
        <tr class="table-row">
          <td class="font-semibold">#REC-${item.id}</td>
          <td>${item.objet || "—"}</td>
          <td title="${coursDisplay}">${coursDisplay.length > 60 ? coursDisplay.slice(0, 57) + "…" : coursDisplay}</td>
          <td>${new Date(item.created_at).toLocaleDateString("fr-FR")}</td>
          <td><span class="status-badge ${statusClass(item.status)}">${statusLabel(item.status)}</span></td>
          <td>
            <button class="action-btn" type="button" title="Voir détails" onclick="voirDetailRecours(${item.id})">
              <span class="material-symbols-outlined">visibility</span>
            </button>
          </td>
        </tr>`;
      })
      .join("");
  } catch (error) {
    console.error("Erreur historique:", error);
  }
}

window.voirDetailRecours = function (id) {
  alert(`Fonctionnalité de détail à implémenter pour le recours #${id}.`);
};

// --- DYNAMIC COURSE BLOCS ---
function rafraichirOptionsCours() {
  listeIndexes.forEach((index) => {
    const select = document.querySelector(`select[name="cours_${index}"]`);
    if (select && select.children.length <= 1) {
      coursDisponibles.forEach((c) => {
        const option = document.createElement("option");
        option.value = c.id;
        option.textContent = c.title;
        select.appendChild(option);
      });
    }
  });
}

// Update attachment label based on selected evaluations
function updateAttachmentLabel(index) {
  const checkboxes = document.querySelectorAll(`.eval-check-${index}`);
  const checkedValues = Array.from(checkboxes)
    .filter((cb) => cb.checked)
    .map((cb) => cb.value);

  const requiresFile = checkedValues.some((v) => EVAL_REQUIRES_ATTACHMENT.includes(v));
  const label = document.getElementById(`attachment-label-${index}`);
  const input = document.querySelector(`input[name="attachments_${index}"]`);
  if (label) {
    label.textContent = requiresFile
      ? "Pièce justificative (OBLIGATOIRE pour TP/TD/Interrogation)"
      : "Pièce justificative (optionnel pour Examen)";
    label.style.color = requiresFile ? "#e74c3c" : "";
    label.style.fontWeight = requiresFile ? "600" : "";
  }
  if (input) {
    input.required = requiresFile;
  }
}

window.ajouterBlocCours = function () {
  const container = document.getElementById("coursContainer");
  const index = currentIndex;

  listeIndexes.push(index);
  document.getElementById("activeIndexes").value = JSON.stringify(listeIndexes);

  const blocHtml = `
    <div class="bloc-cours-card" id="bloc_${index}" style="background:#f9f9fb;border:1px solid #e0e0e0;padding:20px;margin-bottom:20px;border-radius:12px;position:relative;">
      <button type="button" onclick="supprimerBlocCours(${index})" style="position:absolute;top:10px;right:10px;border:none;background:none;color:#ff4d4d;cursor:pointer;">
        <span class="material-symbols-outlined">delete</span>
      </button>
      <div class="form-group">
        <label class="form-label">Matière concernée</label>
        <select class="form-control" name="cours_${index}" required>
          <option value="">-- Choisir un cours --</option>
        </select>
      </div>
      <div class="form-group" style="margin-top:15px;">
        <label class="form-label" style="font-weight:600;">Type(s) d'évaluation :</label>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:8px;">
          <label><input type="checkbox" class="eval-check-${index}" value="TP"> TP</label>
          <label><input type="checkbox" class="eval-check-${index}" value="TD"> TD</label>
          <label><input type="checkbox" class="eval-check-${index}" value="Interrogation"> Interrogation</label>
          <label><input type="checkbox" class="eval-check-${index}" value="Examen"> Examen</label>
        </div>
        <input type="hidden" name="eval_${index}" id="hidden_eval_${index}" value="[]">
      </div>
      <div class="form-group" style="margin-top:15px;">
        <label class="form-label" id="attachment-label-${index}">Pièce justificative (optionnel pour Examen)</label>
        <input type="file" name="attachments_${index}" class="form-control" accept="image/*,.pdf">
        <small style="color:#64748b;">Formats acceptés : JPEG, PNG, GIF, WebP, PDF (max 5 Mo)</small>
      </div>
    </div>
  `;

  container.insertAdjacentHTML("beforeend", blocHtml);

  document.querySelectorAll(`.eval-check-${index}`).forEach((cb) => {
    cb.addEventListener("change", () => {
      const checked = Array.from(
        document.querySelectorAll(`.eval-check-${index}:checked`),
      ).map((c) => c.value);
      document.getElementById(`hidden_eval_${index}`).value = JSON.stringify(checked);
      updateAttachmentLabel(index);
    });
  });

  currentIndex++;
  rafraichirOptionsCours();
};

window.supprimerBlocCours = function (index) {
  const bloc = document.getElementById(`bloc_${index}`);
  if (bloc) {
    bloc.remove();
    listeIndexes = listeIndexes.filter((i) => i !== index);
    document.getElementById("activeIndexes").value = JSON.stringify(listeIndexes);
  }
};

// --- INIT ---
async function initialiserPageRecours() {
  const token = getToken();
  if (!token) {
    window.location.href = "../login.html";
    return;
  }

  loadStudentRecours();

  // Load student profile info for the form
  try {
    const profileRes = await fetch(`${API_BASE}/etudiants/me`, { headers: authHeaders() });
    if (profileRes.ok) {
      const profile = await profileRes.json();
      const etudiant = profile.etudiant || profile;
      const fullName = `${etudiant.name || ""} ${etudiant.postnom || ""} ${etudiant.prenom || ""}`.trim();
      const nameInput = document.getElementById("studentFullName");
      const matriculeInput = document.getElementById("studentMatricule");
      if (nameInput) nameInput.value = fullName;
      if (matriculeInput) matriculeInput.value = etudiant.matricule || "";
    }
  } catch (_) {}

  const btnNouveauRecours = document.getElementById("annees_academique");

  try {
    const response = await fetch(`${API_BASE}/periode-recours/active`, {
      headers: authHeaders(),
    });
    const result = await response.json();

    if (!response.ok) {
      bloquerBoutonRecours(
        btnNouveauRecours,
        result.message || "Aucune période active disponible.",
      );
      return;
    }

    const periodeId = result.id;
    const anneeUniv = result.annee_universitaire || "Active";
    const anneeInput = document.getElementById("anneeAcademiqueInput");
    if (anneeInput) anneeInput.value = anneeUniv;

    const coursResponse = await fetch(
      `${API_BASE}/cours/periode/${periodeId}`,
      { headers: authHeaders() },
    );
    const coursResult = await coursResponse.json();

    if (coursResponse.ok && coursResult) {
      if (Array.isArray(coursResult)) coursDisponibles = coursResult;
      else if (Array.isArray(coursResult.cours)) coursDisponibles = coursResult.cours;
      else coursDisponibles = [];
    }

    if (coursDisponibles.length > 0) {
      document.getElementById("coursContainer").innerHTML = "";
      listeIndexes = [];
      currentIndex = 0;
      ajouterBlocCours();
    } else {
      bloquerBoutonRecours(btnNouveauRecours, "Aucun cours ouvert pour cette période.");
    }
  } catch (err) {
    console.error("Erreur d'initialisation:", err);
    bloquerBoutonRecours(btnNouveauRecours, "Erreur de connexion serveur.");
  }
}

initialiserPageRecours();

// --- FORM SUBMISSION ---
const form = document.getElementById("recoursForm");
if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Client-side validation: ensure each eval-required has an attachment
    let valid = true;
    for (const index of listeIndexes) {
      const checkboxes = document.querySelectorAll(`.eval-check-${index}:checked`);
      const vals = Array.from(checkboxes).map((cb) => cb.value);
      const requiresFile = vals.some((v) => EVAL_REQUIRES_ATTACHMENT.includes(v));
      const fileInput = document.querySelector(`input[name="attachments_${index}"]`);
      if (requiresFile && (!fileInput || !fileInput.files || fileInput.files.length === 0)) {
        alert(`Vous devez joindre un justificatif pour le(s) type(s) TP/TD/Interrogation (bloc cours #${index + 1}).`);
        valid = false;
        break;
      }
    }
    if (!valid) return;

    try {
      const response = await fetch(`${API_BASE}/recours/add-recours`, {
        method: "POST",
        headers: authHeaders(),
        body: new FormData(form),
      });
      const result = await response.json();

      if (response.ok) {
        alert("Recours envoyé avec succès !");
        form.reset();
        toggleModal("appealModal");
        document.getElementById("coursContainer").innerHTML = "";
        listeIndexes = [];
        currentIndex = 0;
        ajouterBlocCours();
        loadStudentRecours();
      } else {
        alert("Erreur : " + (result.error || result.message));
      }
    } catch (error) {
      console.error(error);
      alert("Une erreur réseau est survenue.");
    }
  });
}
