// Define toggleModal function for modal management
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

/**
 * Professors Management Module
 */

/**
 * Format department display
 */
function formatDepartment(department) {
  const map = {
    genie_informatique: "Génie informatique",
    genie_mecanique: "Génie mécanique",
    genie_civil: "Génie civil",
    genie_electrique: "Génie électrique",
  };
  return map[department] || department || "—";
}

/**
 * Render professors table
 */
function renderProfessors(profs) {
  const tbody = document.getElementById("professors-table-body");
  if (!tbody) return;

  if (!profs || profs.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="6" class="text-center">Aucun professeur trouvé.</td></tr>';
    return;
  }

  tbody.innerHTML = profs
    .map(
      (prof) => `
      <tr class="table-row">
        <td>${prof.name || "—"}</td>
        <td>${prof.postnom || "—"}</td>
        <td>${prof.email || "—"}</td>
        <td>${prof.telephone || "—"}</td>
        <td>${formatDepartment(prof.department)}</td>
        <td class="text-right">
          <div class="row-actions">
            <button class="action-btn btn-view" data-id="${prof.id}" type="button" title="Détails"><span class="material-symbols-outlined">visibility</span></button>
            <button class="action-btn btn-delete" data-id="${prof.id}" type="button" title="Supprimer"><span class="material-symbols-outlined">delete</span></button>
          </div>
        </td>
      </tr>`,
    )
    .join("");
}

/**
 * Render department summary
 */
function renderDepartmentSummary(counts) {
  const el = document.getElementById("department-summary");
  if (!el) return;

  if (!counts || counts.length === 0) {
    el.textContent = "Aucun département";
    return;
  }

  el.innerHTML = counts
    .map(
      (item) =>
        `<span class="badge badge-info">${formatDepartment(item.department)}: ${item.count}</span>`,
    )
    .join(" ");
}

/**
 * Load and display professors list
 */
async function loadProfessors() {
  const search = document.getElementById("prof-search")?.value || "";
  const department = document.getElementById("filter-department")?.value || "";

  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (department) params.set("department", department);

  try {
    const data = await AdminAPI.get(`/profs/admin-list?${params.toString()}`);
    renderProfessors(data.profs || []);
    const totalEl = document.getElementById("total-professors");
    if (totalEl) totalEl.textContent = data.total || 0;
  } catch (error) {
    console.error(error);
    const tbody = document.getElementById("professors-table-body");
    if (tbody) {
      tbody.innerHTML =
        '<tr><td colspan="6" class="text-center">Erreur de chargement.</td></tr>';
    }
  }
}

/**
 * Load and display department statistics
 */
async function loadDepartmentStats() {
  try {
    const counts = await AdminAPI.get(`/profs/count-by-department`);
    renderDepartmentSummary(counts.counts || []);
  } catch (error) {
    console.error(error);
  }
}

/**
 * Load and display admin info
 */
async function loadAdminInfo() {
  try {
    const data = await AdminAPI.get(`/auth/user-info`);
    const nameEl = document.querySelector(".user-name");
    const roleEl = document.querySelector(".user-role");
    if (nameEl) nameEl.textContent = data.name || "Admin";
    if (roleEl) roleEl.textContent = data.role || "Animateur";
  } catch (error) {
    console.error(error);
  }
}

/**
 * View professor details
 */
async function viewProfessor(id) {
  try {
    const data = await AdminAPI.get(`/profs/${id}`);
    const prof = data.professeur || data.prof || {};
    alert(
      `Nom: ${prof.name || ""} ${prof.postnom || ""} ${prof.prenom || ""}\n` +
        `Email: ${prof.email || "—"}\n` +
        `Téléphone: ${prof.telephone || "—"}\n` +
        `Département: ${formatDepartment(prof.department)}\n` +
        `Profession: ${prof.profession || "—"}\n` +
        `État civil: ${prof.etat_civil || "—"}`,
    );
  } catch (error) {
    alert("Impossible de charger les détails du professeur.");
    console.error(error);
  }
}

/**
 * Delete professor
 */
async function deleteProfessor(id) {
  if (!window.confirm("Supprimer ce professeur ?")) return;

  try {
    await AdminAPI.delete(`/profs/${id}`);
    await loadProfessors();
    await loadDepartmentStats();
  } catch (error) {
    alert(error.message || "Impossible de supprimer le professeur");
    console.error(error);
  }
}

/**
 * Add new professor
 */
async function addProfessor(event) {
  event.preventDefault();

  const payload = {
    name: document.getElementById("prof-name")?.value.trim(),
    postnom: document.getElementById("prof-postnom")?.value.trim(),
    prenom: document.getElementById("prof-prenom")?.value.trim(),
    matricule: document.getElementById("prof-matricule")?.value.trim(),
    department: document.getElementById("prof-department")?.value.trim(),
    email: document.getElementById("prof-email")?.value.trim(),
    sexe: document.getElementById("prof-sexe")?.value || "", 
    date_naissance: document.getElementById("prof-date-naissance")?.value.trim(),
    etat_civil: document.getElementById("prof-etat-civil")?.value || "",
    profession: document.getElementById("prof-profession")?.value || "",
    telephone: document.getElementById("prof-telephone")?.value.trim(),
    password: document.getElementById("prof-telephone")?.value.trim(),
  };

  try {
    await AdminAPI.submitForm(
      "/profs/add",
      payload,
      async () => {
        await loadProfessors();
        await loadDepartmentStats();
        document.getElementById("add-prof-form")?.reset();
        ModalManager.close("add_prof_modal");
      },
    );
  } catch (error) {
    console.error(error);
  }
}

// Initialize on DOM ready
document.addEventListener("DOMContentLoaded", async () => {
  // Check authentication
  if (AdminAPI.redirectIfTokenInvalid?.()) return;

  // Ensure user has admin role — if not, redirect to admin login
  try {
    const role = localStorage.getItem("role");
    if (role !== "admin") {
      console.warn("Access denied: client role is not admin, redirecting to admin login.");
      window.location.href = AdminAPI.getLoginUrl();
      return;
    }
  } catch (e) {
    console.warn("Unable to verify role, redirecting to admin login.");
    window.location.href = AdminAPI.getLoginUrl();
    return;
  }

  const openModalBtn = document.getElementById("openModalBtn");
  const searchInput = document.getElementById("prof-search");
  const departmentSelect = document.getElementById("filter-department");
  const form = document.getElementById("add-prof-form");
  const tbody = document.getElementById("professors-table-body");

  // Modal handlers
  if (openModalBtn) {
    openModalBtn.addEventListener("click", () => {
      ModalManager.open("add_prof_modal");
    });
  }

  // Search and filter handlers
  if (searchInput) {
    searchInput.addEventListener("input", () => loadProfessors());
  }
  if (departmentSelect) {
    departmentSelect.addEventListener("change", () => loadProfessors());
  }

  // Form submission
  if (form) {
    form.addEventListener("submit", addProfessor);
  }

  // Table row actions
  if (tbody) {
    tbody.addEventListener("click", (event) => {
      const viewBtn = event.target.closest(".btn-view");
      const deleteBtn = event.target.closest(".btn-delete");
      if (viewBtn) return viewProfessor(viewBtn.dataset.id);
      if (deleteBtn) return deleteProfessor(deleteBtn.dataset.id);
    });
  }

  // Keyboard shortcut for close
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      ModalManager.close("add_prof_modal");
    }
  });

  // Initial data load
  await loadAdminInfo();
  await loadDepartmentStats();
  await loadProfessors();
});
