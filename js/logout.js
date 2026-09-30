const SUPABASE_URL1 = "https://poghdicqjjrtxucuoqev.supabase.co";
const SUPABASE_KEY1 = "sb_publishable_-jDBMc58Msbi22Rys16pAQ_T3Q2CJ8I";

const supabaseClient1 = supabase.createClient(
    SUPABASE_URL1,
    SUPABASE_KEY1
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