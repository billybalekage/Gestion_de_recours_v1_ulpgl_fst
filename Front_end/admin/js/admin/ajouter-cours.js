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
    const select = document.getElementById("course-professor");
    if (select)
      select.innerHTML = '<option value="">Erreur de chargement</option>';
  }
}

// Initialisation au chargement de la page
document.addEventListener("DOMContentLoaded", async () => {
  if (AdminAPI.redirectIfTokenInvalid()) return;

  // Charger immédiatement les professeurs pour le formulaire
  await loadProfessors();

  const form = document.getElementById("add-course-form");

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
        // Envoi direct à l'API sans passer par le helper d'un modal encombrant
        await AdminAPI.post("/cours/add", payload);

        // Notification de succès puis redirection vers la table des cours
        alert("Cours ajouté avec succès !");
        window.location.href = "cours.html";
      } catch (error) {
        console.error(error);
        alert(
          error.message || "Une erreur est survenue lors de l'enregistrement.",
        );
      }
    });
  }
});
