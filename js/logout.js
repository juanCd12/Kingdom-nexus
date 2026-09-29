const SUPABASE_URL = "https://poghdicqjjrtxucuoqev.supabase.co";
const SUPABASE_KEY = "sb_publishable_-jDBMc58Msbi22Rys16pAQ_T3Q2CJ8I";

const supabaseClient = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

const logoutButton = document.querySelector(".logout-button");

/* LOGOUT */

logoutButton.addEventListener("click", async function(){
    const { error } = await supabaseClient.auth.signOut();

    if(error){
        console.error("Error al cerrar sesión")
    }

    window.location.href = "../login.html"
})