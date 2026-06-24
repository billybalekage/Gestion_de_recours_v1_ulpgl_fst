// Course Management Module

/**
 * Format department display
 */
function formatDepartment(value) {
  return value ? value.replace(/_/g, " ") : "—";
}

/**
 * Format promotion display
 */
function formatPromotion(value) {
  return value || "—";
}

/**
 * Handle Modal toggle using the exact CSS classes (.hidden)
 */
const SafeModalManager = {
  open: function (modalId) {
    if (
      typeof ModalManager !== "undefined" &&
      typeof ModalManager.open === "function"
    ) {
      ModalManager.open(modalId);
    } else {
      const modal = document.getElementById(modalId);
      if (modal) modal.classList.remove("hidden");
    }
  },
  close: function (modalId) {
    if (
      typeof ModalManager !== "undefined" &&
      typeof ModalManager.close === "function"
    ) {
      ModalManager.close(modalId);
    } else {
      const modal = document.getElementById(modalId);
      if (modal) modal.classList.add("hidden");
    }
  },
};

function renderCourses(courses) {
  const tbody = document.getElementById("courses-table-body");
  if (!tbody) return;

  if (!courses.length) {
    tbody.innerHTML =
      '<tr><td colspan="6" class="text-center">Aucun cours trouvé.</td></tr>';
    return;
  }

  tbody.innerHTML = courses
    .map((course) => {
      const credits = course.credits ?? "—";
      const department = formatDepartment(course.department);
      const promotion = formatPromotion(course.promotion);
      return `
        <tr class="table-row group">
          <td>
            <div class="table-cell-title">
              <div class="table-icon-box">
                <span class="material-symbols-outlined">school</span>
              </div>
              <span class="font-semibold text-on-surface">${course.title || "—"}</span>
            </div>
          </td>
          <td><span class="text-on-surface">${course.professor_name || "—"}</span></td>
          <td><span class="text-on-surface">${credits} ECTS</span></td>
          <td><span class="badge badge-secondary">${promotion}</span></td>
          <td><span class="text-outline">${department}</span></td>
          <td class="text-right">
            <div class="table-actions">
              <button class="btn-table btn-view" data-course-id="${course.id}" type="button">
                <span class="material-symbols-outlined text-sm">visibility</span>
                Détail
              </button>
              <button class="btn-table btn-delete" data-course-id="${course.id}" type="button">
                <span class="material-symbols-outlined text-sm">delete</span>
              </button>
            </div>
          </td>
        </tr>`;
    })
    .join("");
}

/**
 * Load and display courses list
 */
async function loadCourses() {
  const search = document.getElementById("course-search")?.value || "";
  const promotion = document.getElementById("filter-promotion")?.value || "";
  const department = document.getElementById("filter-department")?.value || "";

  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (promotion) params.set("promotion", promotion);
  if (department) params.set("department", department);

  try {
    const data = await AdminAPI.get(`/cours/admin-list?${params.toString()}`);
    const courses = data.cours || [];
    renderCourses(courses);

    const totalCoursesElem = document.getElementById("total-courses");
    if (totalCoursesElem)
      totalCoursesElem.textContent = data.total ?? courses.length;

    const uniqueDepartments = new Set(
      courses.map((item) => item.department).filter(Boolean),
    ).size;

    const deptSummaryElem = document.getElementById("department-summary");
    if (deptSummaryElem) deptSummaryElem.textContent = uniqueDepartments;
  } catch (error) {
    console.error(error);
    const tbody = document.getElementById("courses-table-body");
    if (tbody) {
      tbody.innerHTML =
        '<tr><td colspan="6" class="text-center">Erreur de chargement des cours.</td></tr>';
    }
  }
}

/**
 * Load professors list for form select
 */
async function loadProfessors() {
  try {
    const data = await AdminAPI.get(`/profs/admin-list`);
    const select = document.getElementById("course-professor");
    if (!select) return;

    select.innerHTML =
      '<option value="">Choisir un professeur</option>' +
      (data.profs || [])
        .map(
          (prof) =>
            `<option value="${prof.id}">${prof.name || ""} ${prof.prenom || ""} — ${prof.email || ""}</option>`,
        )
        .join("");
  } catch (error) {
    console.error("Impossible de charger les professeurs", error);
  }
}

/**
 * Load and display admin info
 */
async function loadAdminInfo() {
  try {
    const data = await AdminAPI.get(`/dashboard/admin`);
    const admin = data.admin || {};
    const userName = document.querySelector(".user-name");
    const userRole = document.querySelector(".user-role");
    if (userName) userName.textContent = admin.name || "Admin";
    if (userRole) userRole.textContent = admin.email || "Administrateur";
  } catch (error) {
    console.error("Impossible de charger les infos admin", error);
  }
}

/**
 * Delete a course
 */
async function deleteCourse(courseId) {
  if (!window.confirm("Supprimer ce cours ?")) return;

  try {
    await AdminAPI.delete(`/cours/delete/${courseId}`);
    await loadCourses();
  } catch (error) {
    alert(error.message || "Suppression impossible");
  }
}

/**
 * View course details
 */
async function viewCourse(courseId) {
  try {
    const data = await AdminAPI.get(`/cours/${courseId}`);
    const course = data.cours || {};
    alert(
      `Cours: ${course.title}\nCrédits: ${course.credits || 0}\nPromotion: ${course.promotion || "—"}\nDépartement: ${formatDepartment(course.department)}\nProfesseur: ${course.professor_name || "—"}`,
    );
  } catch (error) {
    console.error(error);
  }
}

// Initialize on DOM ready
document.addEventListener("DOMContentLoaded", async () => {
  // if (AdminAPI.redirectIfTokenInvalid()) return;

  const openModalBtn = document.getElementById("open-modal-btn");
  const closeModalBtn = document.getElementById("close-modal-cancel");
  const closeModalIcon = document.getElementById("close-modal-icon");
  const searchInput = document.getElementById("course-search");
  const promotionFilter = document.getElementById("filter-promotion");
  const departmentFilter = document.getElementById("filter-department");
  const refreshBtn = document.querySelector(".filters-section .btn-icon");
  const form = document.getElementById("add-course-form");
  const tbody = document.getElementById("courses-table-body");

  // Modal open button
  if (openModalBtn) {
    openModalBtn.addEventListener("click", () => {
      SafeModalManager.open("course-modal");
      loadProfessors();
    });
  }

  // Modal close buttons (Annuler & Icône de fermeture X)
  if (closeModalBtn) {
    closeModalBtn.addEventListener("click", () =>
      SafeModalManager.close("course-modal"),
    );
  }
  if (closeModalIcon) {
    closeModalIcon.addEventListener("click", () =>
      SafeModalManager.close("course-modal"),
    );
  }

  // Search and filter handlers
  if (searchInput) {
    searchInput.addEventListener("input", () => loadCourses());
  }
  if (promotionFilter) {
    promotionFilter.addEventListener("change", () => loadCourses());
  }
  if (departmentFilter) {
    departmentFilter.addEventListener("change", () => loadCourses());
  }
  if (refreshBtn) {
    refreshBtn.addEventListener("click", () => loadCourses());
  }

  // Table row actions
  if (tbody) {
    tbody.addEventListener("click", (event) => {
      const deleteButton = event.target.closest(".btn-delete");
      const viewButton = event.target.closest(".btn-view");
      if (deleteButton) return deleteCourse(deleteButton.dataset.courseId);
      if (viewButton) return viewCourse(viewButton.dataset.courseId);
    });
  }

  // Form submission
  if (form) {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      const payload = {
        title: document.getElementById("course-title")?.value.trim(),
        description:
          document.getElementById("course-description")?.value.trim() || "",
        credits: Number(document.getElementById("course-credits")?.value),
        professor_id: document.getElementById("course-professor")?.value,
        promotion: document.getElementById("course-promotion")?.value,
        department: document.getElementById("course-department")?.value,
      };

      try {
        await AdminAPI.submitForm("course-modal", "/cours/add", payload, () => {
          loadCourses();
          SafeModalManager.close("course-modal");
        });
      } catch (error) {
        console.error(error);
      }
    });
  }

  // Initial data load
  await loadAdminInfo();
  await loadCourses();
});
