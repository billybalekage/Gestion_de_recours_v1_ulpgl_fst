document.addEventListener('DOMContentLoaded', () => {
  const menuBtn = document.getElementById('menu-toggle');
  const sidebar = document.getElementById('sidebar');
  const backdrop = document.getElementById('sidebar-backdrop');

  if (!menuBtn || !sidebar) return;

  const setSidebarState = (open) => {
    sidebar.classList.toggle('open', open);
    document.body.classList.toggle('sidebar-open', open);
    if (backdrop) backdrop.classList.toggle('show', open);
  };

  menuBtn.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    setSidebarState(!sidebar.classList.contains('open'));
  });

  if (backdrop) {
    backdrop.addEventListener('click', () => setSidebarState(false));
  }

  document.addEventListener('click', (event) => {
    if (window.innerWidth >= 1024) return;
    const clickedInsideSidebar = sidebar.contains(event.target);
    const clickedMenuBtn = menuBtn.contains(event.target);
    if (!clickedInsideSidebar && !clickedMenuBtn && sidebar.classList.contains('open')) {
      setSidebarState(false);
    }
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth >= 1024) {
      setSidebarState(false);
      sidebar.classList.remove('open');
    }
  });

  sidebar.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      if (window.innerWidth < 1024) setSidebarState(false);
    });
  });

  const currentPage = window.location.pathname.split("/").pop();
  if (currentPage) {
    const sidebarSelectors = ["a.nav-item", "a.nav-link"];
    sidebarSelectors.forEach((selector) => {
      sidebar.querySelectorAll(selector).forEach((link) => {
        const href = link.getAttribute("href");
        if (!href || href === "#") return;
        const pageName = href.split("/").pop();
        if (pageName === currentPage) {
          link.classList.add("active");
          link.classList.add("sidebar-active");
        } else {
          link.classList.remove("active");
          link.classList.remove("sidebar-active");
        }
      });
    });

    document.querySelectorAll("a.bottom-nav-item").forEach((link) => {
      const href = link.getAttribute("href");
      if (!href || href === "#") return;
      const pageName = href.split("/").pop();
      if (pageName === currentPage) {
        link.classList.add("active");
      } else {
        link.classList.remove("active");
      }
    });
  }
});
