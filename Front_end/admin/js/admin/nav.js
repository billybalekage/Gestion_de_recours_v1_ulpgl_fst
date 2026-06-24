document.addEventListener("DOMContentLoaded", () => {
  // Activate sidebar link that matches current file name
  const links = document.querySelectorAll(".sidebar-nav .nav-link");
  const current = window.location.pathname.split("/").pop();

  // ✨ CORRECTION : On n'arrête plus le script avec un return, on fait juste un if
  if (current) {
    links.forEach((a) => {
      const href = a.getAttribute("href");
      if (!href) return;
      // Normalize
      const linkFile = href.split("/").pop();
      if (linkFile === current) {
        a.classList.add("active"); // Utilise 'active' car c'est ce que tu as mis dans ton HTML
      } else {
        a.classList.remove("active");
      }
    });
  }

  // Mobile menu toggle if present
  const menuToggle = document.getElementById("menu-toggle");
  const sidebar =
    document.getElementById("sidebar") || document.querySelector(".sidebar");
  if (menuToggle && sidebar) {
    menuToggle.addEventListener("click", () => {
      sidebar.classList.toggle("flex");
    });
  }
});
