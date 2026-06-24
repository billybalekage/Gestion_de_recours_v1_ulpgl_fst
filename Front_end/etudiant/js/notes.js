const STUDENT_API_BASE = "http://localhost:8000/api";

document.addEventListener("DOMContentLoaded", () => {
  const tableBody = document.querySelector("#courses-table tbody");
  const searchInput = document.getElementById("course-search");
  const totalCoursesCount = document.getElementById("total-courses-count");

  let allNotes = [];

  getStudentNotes();

  // 1. Génération dynamique des lignes du tableau
  function renderNotesTable(notesToRender) {
    if (!tableBody) return;

    tableBody.innerHTML = "";

    if (notesToRender.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="7" class="text-center text-muted" style="padding: 20px;">
            Aucune note disponible ou aucun cours trouvé.
          </td>
        </tr>
      `;
      updateCourseCount(0);
      return;
    }

    notesToRender.forEach((item) => {
      const row = document.createElement("tr");
      row.className = "clickable-row";

      // Normalisation des clés retournées par votre backend PG
      const title =
        item.course_name || item.course_title || item.title || "Cours inconnu";
      const code =
        item.course_code ||
        item.department ||
        item.annee_universitaire ||
        "Code indisponible";
      const credits = item.credits ?? item.credit ?? "-";
      const professor =
        item.professor_name || item.professor || "Enseignant non assigné";

      const tp = item.note_tp ?? item.tp ?? "-";
      const td = item.note_td ?? item.td ?? "-";
      const interro =
        item.note_interrogation ?? item.interro ?? item.interrogation ?? "-";
      const examen = item.note_examen ?? item.examen ?? "-";

      row.innerHTML = `
        <td>
          <div class="course-cell">
            <div class="course-icon bg-blue-light text-primary">
              <span class="material-symbols-outlined">terminal</span>
            </div>
            <div>
              <p class="course-title">${title}</p>
              <p class="course-subtitle">${code}</p>
            </div>
          </div>
        </td>
        <td class="text-center text-muted">${credits}</td>
        <td class="prof-name">${professor}</td>
        <td class="text-center">${tp}</td>
        <td class="text-center">${td}</td>
        <td class="text-center">${interro}</td>
        <td class="text-center">${examen}</td>
      `;

      row.addEventListener("click", () => {
        console.log("Ligne cliquée :", title);
      });

      tableBody.appendChild(row);
    });

    updateCourseCount(notesToRender.length);
  }

  // 2. Gestion du compteur global
  function updateCourseCount(count) {
    if (totalCoursesCount) {
      totalCoursesCount.textContent = count;
    }
  }

  // 3. Filtrage temps réel (Barre de recherche)
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      const searchTerm = e.target.value.toLowerCase().trim();

      const filteredNotes = allNotes.filter((item) => {
        const title = (item.course_title || item.title || "").toLowerCase();
        const prof = (
          item.professor_name ||
          item.professor ||
          ""
        ).toLowerCase();
        return title.includes(searchTerm) || prof.includes(searchTerm);
      });

      renderNotesTable(filteredNotes);
    });
  }

  // 4. Récupération des données de l'API
  async function getStudentNotes() {
    const token = localStorage.getItem("token");
    if (!token) {
      window.location.href = "../../login.html";
      return;
    }

    try {
      const response = await fetch(`${STUDENT_API_BASE}/notes/my-notes`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 401) {
        localStorage.removeItem("token");
        window.location.href = "../../login.html";
        return;
      }

      if (!response.ok) {
        throw new Error("Erreur lors du chargement des notes");
      }

      const responseData = await response.json();
      allNotes =
        responseData.notes ||
        responseData.data ||
        (Array.isArray(responseData) ? responseData : []);

      renderNotesTable(allNotes);
    } catch (error) {
      console.error("Erreur lors de la récupération des notes :", error);
      if (tableBody) {
        tableBody.innerHTML = `
          <tr>
            <td colspan="7" class="text-center text-error" style="padding: 20px; color: #ff4d4d;">
              Erreur lors de la communication avec le serveur.
            </td>
          </tr>
        `;
      }
    }
  }
});
