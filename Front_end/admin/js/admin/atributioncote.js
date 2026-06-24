window.toggleModal = function (id) {
  const modal = document.getElementById(id);
  if (!modal) {
    console.error("Impossible de trouver la modal avec l'ID :", id);
    return;
  }
  // Toggle the hidden class to show/hide the modal
  const isHidden = modal.classList.contains("hidden");
  if (isHidden) {
    modal.classList.remove("hidden");
  } else {
    modal.classList.add("hidden");
  }
};

function formatDepartment(value) {
  const map = {
    genie_informatique: "Génie informatique",
    genie_mecanique: "Génie mécanique",
    genie_civil: "Génie civil",
    genie_electrique: "Génie électrique",
  };
  return map[value] || value || "—";
}

function renderStudents(students) {
  const tbody = document.getElementById("students-table-body");
  if (!tbody) return;

  if (!students || students.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="6" class="text-center">Aucun étudiant trouvé.</td></tr>';
    return;
  }

  tbody.innerHTML = students
    .map(
      (student) => `
      <tr class="table-row">
        <td class="font-mono text-bold text-primary">${student.matricule || "—"}</td>
        <td>
          <div class="student-cell">
            <div class="avatar-text bg-tertiary text-tertiary">${(student.name || "?").charAt(0)}${(student.postnom || "?").charAt(0)}</div>
            <span class="text-semibold">${student.name || "—"} ${student.postnom || ""}</span>
          </div>
        </td>
        <td><span class="badge-dept">${formatDepartment(student.department)}</span></td>
        <td>${student.promotion || "—"}</td>
        <td class="text-center">
          <div class="row-actions">
            <button class="action-edit-btn" data-student-id="${student.id}" data-name="${student.name || ""} ${student.postnom || ""}" data-matricule="${student.matricule || ""}" type="button" title="Attribuer une note">
              <span class="material-symbols-outlined fill-icon">edit_note</span>
            </button>
            <button class="action-edit-btn" data-student-id="${student.id}" data-action="view" type="button" title="Voir détails">
              <span class="material-symbols-outlined fill-icon">visibility</span>
            </button>
            <button class="action-edit-btn" data-student-id="${student.id}" data-action="delete" type="button" title="Supprimer">
              <span class="material-symbols-outlined fill-icon">delete</span>
            </button>
          </div>
        </td>
      </tr>`,
    )
    .join("");
}


async function loadStudents() {
  const search = document.getElementById("student-search")?.value || "";
  const department = document.getElementById("filter-department")?.value || "";
  const promotion = document.getElementById("filter-promotion")?.value || "";
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (department) params.set("department", department);
  if (promotion) params.set("promotion", promotion);

  try {
    const data = await AdminAPI.get(`/etudiants/getAllEtudiants?${params.toString()}`);
    renderStudents(data.etudiants || []);
    document.getElementById("total-etudiants").textContent = data.total || 0;
  } catch (error) {
    console.error(error);
    document.getElementById("students-table-body").innerHTML =
      '<tr><td colspan="6" class="text-center">Erreur de chargement.</td></tr>';
  }
}

async function loadCourseCount() {
  try {
    const data = await AdminAPI.get(`/cours/count`);
    document.getElementById("total-cours").textContent = data.count || 0;
  } catch (error) {
    console.error(error);
  }
}

async function loadCourses() {
  try {
    const data = await AdminAPI.get(`/cours/admin-list`);
    const select = document.getElementById("course-select");
    if (!select) return;
    select.innerHTML = (data.cours || [])
      .map(
        (course) =>
          `<option value="${course.id}">${course.title || "Cours"} (${course.promotion || ""})</option>`,
      )
      .join("");
  } catch (error) {
    console.error(error);
  }
}

function openPrefilledModal(name, matricule) {
  const studentInput = document.getElementById("modalStudentName");
  const matriculeInput = document.getElementById("modalMatricule");
  if (studentInput && matriculeInput) {
    studentInput.value = name;
    matriculeInput.value = matricule;
    toggleModal("gradingModal");
  }
}

async function submitGrade(event) {
  event.preventDefault();
  const payload = {
    matricule: document.getElementById("modalMatricule")?.value.trim(),
    course_id: Number(document.getElementById("course-select")?.value),
    annee_universitaire:
      document.getElementById("note-annee")?.value.trim() || "2025-2026",
    semestre: Number(document.getElementById("note-semestre")?.value || 1),
    note_tp: Number(document.getElementById("note-tp")?.value || 0),
    note_td: Number(document.getElementById("note-td")?.value || 0),
    note_interrogation: Number(
      document.getElementById("note-interrogation")?.value || 0,
    ),
    note_examen: Number(document.getElementById("note-examen")?.value || 0),
  };

  try {
    await AdminAPI.post("/notes/add-note", payload);
    alert("Note enregistrée avec succès");
    toggleModal("gradingModal");
  } catch (error) {
    alert(error.message || "Impossible d’enregistrer la note");
  }
}

async function logoutAdmin() {
  try {
    await AdminAPI.logout();
  } catch (error) {
    console.error(error);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const gradingForm = document.getElementById("gradingForm");
  const searchInput = document.getElementById("student-search");
  const departmentSelect = document.getElementById("filter-department");
  const promotionSelect = document.getElementById("filter-promotion");
  const tableBody = document.getElementById("students-table-body");

  if (gradingForm) gradingForm.addEventListener("submit", submitGrade);
  if (searchInput) searchInput.addEventListener("input", () => loadStudents());
  if (departmentSelect)
    departmentSelect.addEventListener("change", () => loadStudents());
  if (promotionSelect)
    promotionSelect.addEventListener("change", () => loadStudents());

  if (tableBody) {
    tableBody.addEventListener("click", async (event) => {
      const btn = event.target.closest(".action-edit-btn");
      if (!btn) return;

      if (btn.dataset.action === "delete") {
        if (!window.confirm("Supprimer cet étudiant ?")) return;
        try {
          await AdminAPI.delete(`/etudiants/${btn.dataset.studentId}`);
          await loadStudents();
        } catch (error) {
          alert(error.message || "Impossible de supprimer l’étudiant");
        }
        return;
      }

      if (btn.dataset.action === "view") {
        try {
          const data = await AdminAPI.get(
            `/etudiants/getEtudiantById/${btn.dataset.studentId}`,
          );
          alert(
            `Matricule: ${data.matricule || "—"}\nNom: ${data.name || "—"} ${data.postnom || ""}\nEmail: ${data.email || "—"}\nTéléphone: ${data.telephone || "—"}\nDépartement: ${formatDepartment(data.department)}\nPromotion: ${data.promotion || "—"}`,
          );
        } catch (error) {
          alert(error.message || "Impossible d’ouvrir les détails");
        }
        return;
      }

      openPrefilledModal(btn.dataset.name, btn.dataset.matricule);
    });
  }

  document
    .querySelector(".sidebar-footer .logout-link")
    ?.addEventListener("click", (e) => {
      e.preventDefault();
      logoutAdmin();
    });

  loadStudents();
  loadCourseCount();
  loadCourses();
});
