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

// --- Student Management Module ---

function formatDepartment(department) {
  const map = {
    genie_informatique: "Génie informatique",
    genie_mecanique: "Génie mécanique",
    genie_civil: "Génie civil",
    genie_electrique: "Génie électrique",
  };
  return map[department] || department || "—";
}

function renderStudents(etudiants) {
  const tbody = document.getElementById("students-table-body");
  if (!tbody) return;

  if (!etudiants || etudiants.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="7" class="text-center">Aucun étudiant trouvé.</td></tr>';
    return;
  }

  console.log(etudiants[0])

  tbody.innerHTML = etudiants.map((etudiants) => `
      <tr class="table-row-group">
        <td class="font-medium">${etudiants.name || "—"}</td>
        <td>${etudiants.postnom || "—"}</td>
        <td class="text-muted">${etudiants.email || "—"}</td>
        <td class="text-muted">${etudiants.telephone || "—"}</td>
        <td><span class="badge">${etudiants.promotion || "—"}</span></td>
        <td>${formatDepartment(etudiants.department)}</td>
        <td class="text-right">
          <div class="row-actions">
            <button class="action-btn text-primary" type="button" data-id="${etudiants.id}" class="btn-edit" title="Modifier">
              <span class="material-symbols-outlined">edit</span>
            </button>
            <button class="action-btn text-error" type="button" data-id="${etudiants.id}" class="btn-delete" title="Supprimer">
              <span class="material-symbols-outlined">delete</span>
            </button>
          </div>
        </td>
      </tr>
    `,
    )
    .join("");
}

function renderDepartmentSummary(etudiants) {
  const summary = document.getElementById("department-summary");
  if (!summary) return;

  const counts = etudiants.reduce((acc, etudiants) => {
    const key = etudiants.department || "Autre";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  summary.innerHTML = Object.entries(counts)
    .map(
      ([department, count]) =>
        `<span class="badge">${formatDepartment(department)}: ${count}</span>`,
    )
    .join(" ");
}

async function loadStudents() {
  const search = document.getElementById("student-search")?.value || "";
  const promotion = document.getElementById("filter-promotion")?.value || "";
  const department = document.getElementById("filter-departement")?.value || "";

  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (promotion) params.set("promotion", promotion);
  if (department) params.set("department", department);

  try {
    const data = await AdminAPI.get(
      `/etudiants/getAllEtudiants?${params.toString()}`,
    );
    console.log("Reponse d'api et contenu du data", data)
    const totalEl = document.getElementById("total-etudiants");
    console.log("element total du tableau", totalEl)
    if (totalEl) totalEl.textContent = data.total || 0;

    renderStudents(data.etudiants || []);
    renderDepartmentSummary(data.etudiants || []);
  } catch (error) {
    console.error("erreur dans loadStudent" ,error);
    const tbody = document.getElementById("students-table-body");
    if (tbody) {
      tbody.innerHTML =
        '<tr><td colspan="7" class="text-center">Erreur lors du chargement.</td></tr>';
    }
  }
}

async function loadAdminInfo() {
  try {
    const data = await AdminAPI.get("/auth/user-info");
    const nameEl = document.querySelector(".user-name");
    const roleEl = document.querySelector(".user-role");
    if (nameEl) nameEl.textContent = data.name || "Admin";
    if (roleEl) roleEl.textContent = data.email || "Administrateur";
  } catch (error) {
    console.error("Erreur user-info", error);
  }
}

async function logoutAdmin() {
  try {
    await AdminAPI.logout();
  } catch (error) {
    console.error("Logout error", error);
  }
}

async function addStudent(event) {
  event.preventDefault();

  const payload = {
    name: document.getElementById("student-name")?.value.trim() || "",
    postnom: document.getElementById("student-postnom")?.value.trim() || "",
    prenom: document.getElementById("student-prenom")?.value.trim() || "",
    sexe:
      document.querySelector('input[name="student-sexe"]:checked')?.value ||
      "m",
    date_naissance:
      document.getElementById("student-date-naissance")?.value || null,
    email: document.getElementById("student-email")?.value.trim() || "",
    telephone: document.getElementById("student-telephone")?.value.trim() || "",
    matricule: document.getElementById("student-matricule")?.value.trim() || "",
    promotion: document.getElementById("student-promotion")?.value || "",
    department: document.getElementById("student-department")?.value || "",
  };

  try {
    await AdminAPI.post("/etudiants/add", payload);
    alert("Étudiant ajouté avec succès");

    // Close modal using the same function that opens it
    window.toggleModal("add-student-modal");

    document.getElementById("add-student-form")?.reset();
    await loadStudents();
  } catch (error) {
    console.error(error);
    alert(error.message || "Impossible d’ajouter l’étudiant");
  }
}

async function deleteStudent(id) {
  if (!confirm("Êtes-vous sûr de vouloir supprimer cet étudiant ?")) return;
  try {
    await AdminAPI.delete(`/etudiants/${id}`); // Modifiez l'URL selon votre API réelle
    alert("Étudiant supprimé avec succès.");
    await loadStudents();
  } catch (error) {
    console.error(error);
    alert("Erreur lors de la suppression.");
  }
}

function openEditModal(id) {
  console.log("Ouvrir la modification pour l'étudiant ID:", id);
  // Ajoutez ici la logique pour charger les données de l'étudiant et ouvrir la modal
  if (typeof ModalManager !== "undefined") {
    ModalManager.open("edit-student-modal");
  } else {
    window.toggleModal("edit-student-modal");
  }
}

// Initialisation globale
document.addEventListener("DOMContentLoaded", () => {
  if (AdminAPI && AdminAPI.redirectIfTokenInvalid?.()) return;

  loadAdminInfo();
  loadStudents();

  const searchInput = document.getElementById("student-search");
  const promotionSelect = document.getElementById("filter-promotion");
  const departmentSelect = document.getElementById("filter-departement");
  const addForm = document.getElementById("add-student-form");
  const tbody = document.getElementById("students-table-body");

  let timer;
  if (searchInput) {
    searchInput.addEventListener("input", () => {
      clearTimeout(timer);
      timer = setTimeout(loadStudents, 300);
    });
  }
  if (promotionSelect) promotionSelect.addEventListener("change", loadStudents);
  if (departmentSelect)
    departmentSelect.addEventListener("change", loadStudents);
  if (addForm) addForm.addEventListener("submit", addStudent);

  // Gestion moderne des actions sur les lignes du tableau (Event Delegation)
  if (tbody) {
    tbody.addEventListener("click", (event) => {
      const editBtn = event.target.closest(".btn-edit");
      const deleteBtn = event.target.closest(".btn-delete");

      if (editBtn) openEditModal(editBtn.dataset.id);
      if (deleteBtn) deleteStudent(deleteBtn.dataset.id);
    });
  }

  const logoutLink = document.querySelector(".sidebar-footer .nav-link");
  if (logoutLink) {
    logoutLink.addEventListener("click", (e) => {
      e.preventDefault();
      logoutAdmin();
    });
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      document.querySelectorAll(".modal-overlay, .modal").forEach((m) => {
        m.classList.add("hidden");
        m.style.removeProperty("display");
      });
    }
  });
});
