const dashboardPreferenceKeys = [
  "products",
  "branches",
  "purchases",
  "alerts",
  "recentActivity",
];
const dashboardPreferenceStoragePrefix =
  "kingdom-nexus-dashboard-preferences:";
const dashboardPreferenceInputs = Array.from(
  document.querySelectorAll("[data-dashboard-preference]")
);
const dashboardPreferenceSections = Array.from(
  document.querySelectorAll("[data-dashboard-section]")
);
const dashboardPreferencesFeedback = document.getElementById(
  "dashboardPreferencesFeedback"
);
const saveDashboardPreferencesButton = document.getElementById(
  "saveDashboardPreferences"
);

function showDashboardPreferencesFeedback(message, isError = false) {
  if (!dashboardPreferencesFeedback) {
    console[isError ? "error" : "warn"](message);
    return;
  }

  dashboardPreferencesFeedback.textContent = message;
  dashboardPreferencesFeedback.hidden = false;
  dashboardPreferencesFeedback.classList.toggle("error", isError);
  dashboardPreferencesFeedback.classList.toggle("success", !isError);
  dashboardPreferencesFeedback.setAttribute(
    "role",
    isError ? "alert" : "status"
  );
}

function getDefaultDashboardPreferences() {
  return Object.fromEntries(
    dashboardPreferenceKeys.map((key) => [key, true])
  );
}

function normalizeDashboardPreferences(preferences) {
  const defaults = getDefaultDashboardPreferences();

  if (
    !preferences ||
    typeof preferences !== "object" ||
    Array.isArray(preferences)
  ) {
    return defaults;
  }

  for (const key of dashboardPreferenceKeys) {
    if (typeof preferences[key] === "boolean") {
      defaults[key] = preferences[key];
    }
  }

  return defaults;
}

function applyDashboardPreferences(preferences) {
  for (const section of dashboardPreferenceSections) {
    const preference = section.dataset.dashboardSection;
    section.hidden = preferences[preference] === false;
  }
}

async function initializeDashboardPreferences() {
  const isPreferencesPage = dashboardPreferenceInputs.length > 0;
  let userId = "guest";

  if (window.supabase) {
    try {
      const supabaseClient = window.supabase.createClient(
        "https://poghdicqjjrtxucuoqev.supabase.co",
        "sb_publishable_-jDBMc58Msbi22Rys16pAQ_T3Q2CJ8I"
      );
      const { data, error } = await supabaseClient.auth.getSession();
      if (error) {
        console.warn(
          "No se pudo validar la sesión; se usarán preferencias locales del navegador.",
          error
        );
      } else if (data?.session?.user?.id) {
        userId = data.session.user.id;
      } else if (isPreferencesPage) {
        showDashboardPreferencesFeedback(
          "No hay una sesión activa. Puedes probar y guardar preferencias en este navegador."
        );
      }
    } catch (error) {
      console.warn(
        "No se pudo validar la sesión; se usarán preferencias locales del navegador.",
        error
      );
      if (isPreferencesPage) {
        showDashboardPreferencesFeedback(
          "No se pudo validar la sesión. Puedes probar y guardar preferencias en este navegador."
        );
      }
    }
  } else if (isPreferencesPage) {
    showDashboardPreferencesFeedback(
      "El servicio de autenticación no está disponible. Puedes probar y guardar preferencias en este navegador."
    );
  }

  const storageKey = `${dashboardPreferenceStoragePrefix}${userId}`;
  let preferences = getDefaultDashboardPreferences();

  try {
    const savedPreferences = window.localStorage.getItem(storageKey);
    if (savedPreferences !== null) {
      preferences = normalizeDashboardPreferences(
        JSON.parse(savedPreferences)
      );
    }
  } catch (error) {
    console.error("No se pudieron cargar las preferencias del dashboard.", error);
    showDashboardPreferencesFeedback(
      "No se pudieron cargar las preferencias guardadas. Se usarán las opciones predeterminadas.",
      true
    );
  }

  for (const input of dashboardPreferenceInputs) {
    input.checked = preferences[input.dataset.dashboardPreference] !== false;
  }
  applyDashboardPreferences(preferences);

  if (saveDashboardPreferencesButton) {
    saveDashboardPreferencesButton.addEventListener("click", () => {
      const selectedPreferences = getDefaultDashboardPreferences();
      for (const input of dashboardPreferenceInputs) {
        selectedPreferences[input.dataset.dashboardPreference] = input.checked;
      }

      try {
        window.localStorage.setItem(
          storageKey,
          JSON.stringify(selectedPreferences)
        );
      } catch (error) {
        console.error(
          "No se pudieron guardar las preferencias del dashboard.",
          error
        );
        showDashboardPreferencesFeedback(
          "No se pudieron guardar los cambios en este navegador. Revisa el almacenamiento disponible e inténtalo de nuevo.",
          true
        );
        return;
      }

      showDashboardPreferencesFeedback(
        "Preferencias guardadas. Se aplicarán al abrir el dashboard."
      );
    });
  }
}

initializeDashboardPreferences();
