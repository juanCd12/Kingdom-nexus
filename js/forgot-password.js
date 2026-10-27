const SUPABASE_URL = "https://poghdicqjjrtxucuoqev.supabase.co";
const SUPABASE_KEY = "sb_publishable_-jDBMc58Msbi22Rys16pAQ_T3Q2CJ8I";

const supabaseClient = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

const form = document.getElementById("loginForm");
const submitButton = form.querySelector('button[type="submit"]');
const statusMessage = document.getElementById("formMessage");

form.addEventListener("submit", async function (event) {
    event.preventDefault();

    if (!form.reportValidity()) {
        return;
    }

    const email = new FormData(form).get("email").trim();
    const redirectTo = new URL("./reset-password.html", window.location.href).href;

    submitButton.disabled = true;
    statusMessage.textContent = "Enviando las instrucciones...";

    try {
        const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
            redirectTo
        });

        if (error) {
            console.error("No se pudo enviar el correo de recuperación:", error);
            statusMessage.textContent = "No se pudo enviar el correo. Inténtalo de nuevo.";
            return;
        }

        statusMessage.textContent =
            "Si existe una cuenta con ese correo, recibirás un enlace para restablecer la contraseña.";
    } catch (error) {
        console.error("Error al solicitar la recuperación de contraseña:", error);
        statusMessage.textContent =
            "Ocurrió un error al enviar las instrucciones. Revisa tu conexión e inténtalo de nuevo.";
    } finally {
        submitButton.disabled = false;
    }
});