const SUPABASE_URL2 = "https://poghdicqjjrtxucuoqev.supabase.co";
const SUPABASE_KEY2 = "sb_publishable_-jDBMc58Msbi22Rys16pAQ_T3Q2CJ8I";

const supabaseClient2 = supabase.createClient(
    SUPABASE_URL2,
    SUPABASE_KEY2
);

(async function mostrarDatos(){
    const { data: sessionData, error: sessionError } = await supabaseClient2.auth.getSession();

if (sessionError) {
  console.error("Error session:", sessionError);
  return;
}

const user = sessionData?.session?.user;
if (!user) return;

const { data, error } = await supabaseClient2
  .from("register")
  .select("name, lastname, email")
  .eq("id", user.id)
  .single();

if (error) {
  console.error("Error al cargar perfil:", error);
  return;
}

const { count } = await supabaseClient2
    .from("products")
    .select("*", { count: "exact", head: true });

    if(error){
        console.error("Error al encontrar productos", fault)
    }

document.getElementById("userName").textContent = `${data.name} ${data.lastname}`;
document.getElementById("userEmail").textContent = data.email;
document.getElementById("count").textContent = count
})()


