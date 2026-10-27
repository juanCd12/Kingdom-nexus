const SUPABASE_URL = "https://poghdicqjjrtxucuoqev.supabase.co";
const SUPABASE_KEY = "sb_publishable_-jDBMc58Msbi22Rys16pAQ_T3Q2CJ8I";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
const form = document.getElementById("resetPasswordForm");
const newPasswordInput = document.getElementById("new-password");
const confirmPasswordInput = document.getElementById("confirm-password");
const submitButton = document.getElementById("reset-password-button");
const statusMessage = document.getElementById("resetStatus");
const loginLink = document.getElementById("resetLoginLink");

let recoveryAuthorized = false;

supabaseClient.auth.onAuthStateChange((event, session) => {
    if (event === "PASSWORD_RECOVERY" && session) {
        recoveryAuthorized = true;
        form.hidden = false;
        statusMessage.textContent = "Enlace validado. Ya puedes elegir una nueva contraseña.";
        return;
    }

    if (event === "INITIAL_SESSION") {
        window.setTimeout(() => {
            if (!recoveryAuthorized) {
                window.location.replace("./forgot-password.html");
            }
        }, 1000);
    }
});

form.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!recoveryAuthorized) {
        statusMessage.textContent =
            "El enlace de recuperación no es válido. Solicita uno nuevo para continuar.";
        window.location.replace("./forgot-password.html");
        return;
    }

    if (!form.reportValidity()) {
        return;
    }

    if (newPasswordInput.value !== confirmPasswordInput.value) {
        statusMessage.textContent = "Las contraseñas no coinciden.";
        confirmPasswordInput.focus();
        return;
    }

    submitButton.disabled = true;
    statusMessage.textContent = "Actualizando la contraseña...";

    try {
        const { error } = await supabaseClient.auth.updateUser({
            password: newPasswordInput.value
        });

        if (error) {
            console.error("No se pudo actualizar la contraseña:", error);
            statusMessage.textContent =
                "No se pudo actualizar la contraseña. El enlace puede haber expirado; solicita uno nuevo e inténtalo otra vez.";
            return;
        }

        form.hidden = true;
        loginLink.hidden = false;
        statusMessage.textContent =
            "Tu contraseña se actualizó correctamente. Ya puedes iniciar sesión.";
    } catch (error) {
        console.error("Error al actualizar la contraseña:", error);
        statusMessage.textContent =
            "Ocurrió un error al actualizar la contraseña. Revisa tu conexión e inténtalo de nuevo.";
    } finally {
        submitButton.disabled = false;
    }
});
