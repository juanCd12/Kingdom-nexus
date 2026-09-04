const user = document.getElementById("userName");
const email = document.getElementById("userEmail");

const datos = sessionStorage.getItem("registro");

if(datos){
    const info = JSON.parse(datos);

    user.textContent = `${info.firstName} ${info.lastName}`;
    email.textContent = info.email;
}

