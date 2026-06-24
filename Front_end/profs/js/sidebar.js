// Gestion responsive de la sidebar (ouverte par défaut sur desktop, fermée sur mobile)
document.addEventListener("DOMContentLoaded", () => {
  const sidebar = document.querySelector(".sidebar");
  const toggleBtn = document.getElementById("menu-toggle");
  if (!sidebar) return;

  function openSidebar() {
    sidebar.classList.add("flex");
  }
  function closeSidebar() {
    sidebar.classList.remove("flex");
  }
  function toggleSidebar(e) {
    if (e) e.stopPropagation();
    sidebar.classList.toggle("flex");
  }

  if (toggleBtn) toggleBtn.addEventListener("click", toggleSidebar);

  // Fermer en cliquant en dehors de la sidebar sur mobile
  document.addEventListener("click", (e) => {
    if (window.innerWidth > 1023) return;
    if (!sidebar.classList.contains("flex")) return;
    if (sidebar.contains(e.target) || (toggleBtn && toggleBtn.contains(e.target))) return;
    closeSidebar();
  });

  // Réinitialiser l'état au redimensionnement
  window.addEventListener("resize", () => {
    if (window.innerWidth > 1023) closeSidebar();
  });
});
