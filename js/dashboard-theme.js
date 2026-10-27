const themeStorageKey = "kingdom-nexus-theme";
const themeToggle = document.querySelector("[data-theme-toggle]");
const themeIcon = document.querySelector("[data-theme-icon]");

function applyDashboardTheme(theme) {
  const isDark = theme === "dark";
  document.documentElement.dataset.theme = isDark ? "dark" : "light";
  themeToggle.setAttribute("aria-pressed", String(isDark));
  themeToggle.setAttribute(
    "aria-label",
    `Activar modo ${isDark ? "claro" : "oscuro"}`
  );
  themeIcon.innerHTML = isDark
    ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"/></svg>'
    : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6.5 6.5 0 0 0 8.268 8.268c.344-.215.825-.003.803.401"/></svg>';
}

if (themeToggle && themeIcon) {
  applyDashboardTheme(document.documentElement.dataset.theme || "light");

  themeToggle.addEventListener("click", () => {
    const nextTheme =
      document.documentElement.dataset.theme === "dark" ? "light" : "dark";

    applyDashboardTheme(nextTheme);

    try {
      localStorage.setItem(themeStorageKey, nextTheme);
    } catch (error) {
      console.warn("No se pudo guardar la preferencia de tema.", error);
    }
  });
}
