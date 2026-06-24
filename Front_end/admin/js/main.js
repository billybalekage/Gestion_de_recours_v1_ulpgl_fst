document.addEventListener("DOMContentLoaded", () => {
  // ==========================================================================
  // 1. GESTION DE LA VISIBILITÉ DU MOT DE PASSE (L'ŒIL)
  // ==========================================================================
  const passwordInput = document.getElementById("password"); // recupère le champ de mot de passe
  const togglePasswordIcon = document.getElementById("togglePassword"); // recupère l'icône de l'œil

  // Vérifie que les éléments existent avant d'ajouter l'événement
  if (togglePasswordIcon && passwordInput) {
    // Ajoute un écouteur de clic sur l'icône de l'œil
    togglePasswordIcon.addEventListener("click", () => {
      // Permute l'état d'affichage entre masqué et lisible
      const isPassword = passwordInput.getAttribute("type") === "password"; // Vérifie si le champ est actuellement de type "password"
      passwordInput.setAttribute("type", isPassword ? "text" : "password"); // Change le type du champ pour afficher ou masquer le mot de passe

      // Bascule le design de l'icône
      togglePasswordIcon.classList.toggle("fa-eye"); // Affiche l'icône de l'œil ouvert
      togglePasswordIcon.classList.toggle("fa-eye-slash"); // Affiche l'icône de l'œil barré (masqué)
    });
  }

  // ==========================================================================
  // 2. GESTION DE LA POP-UP REINITIALISATION (MOT DE PASSE OUBLIÉ)
  // ==========================================================================
  const forgotLink = document.getElementById("forgotPasswordLink"); // recupère le lien de réinitialisation du mot de passe
  const forgotModal = document.getElementById("forgotModal"); // recupère la boîte modale de réinitialisation du mot de passe
  const closeModalBtn = document.getElementById("closeModal"); // recupère le bouton de fermeture de la boîte modale (la croix X)

  // Vérifie que les éléments existent avant d'ajouter les événements
  if (forgotLink && forgotModal && closeModalBtn) {
    // Ouverture
    forgotLink.addEventListener("click", (e) => {
      e.preventDefault();
      forgotModal.classList.add("active"); // Affiche la boîte modale en ajoutant la classe "active"
    });

    // Fermeture via le bouton de fermeture (la croix X)
    closeModalBtn.addEventListener("click", () => {
      forgotModal.classList.remove("active"); // Masque la boîte modale en enlevant la classe "active"
    });

    // Fermeture via clic en dehors de la boîte
    window.addEventListener("click", (e) => {
      if (e.target === forgotModal) {
        forgotModal.classList.remove("active");
      }
    });
  }
});
