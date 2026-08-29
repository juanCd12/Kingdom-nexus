const form = document.getElementById("registerForm");

const params = new URLSearchParams(window.location.search);

const plan = params.get("plan")


    form.addEventListener("submit", function(event){
        event.preventDefault();

        if(!form.checkValidity()){
            form.reportValidity()
            return;
        }

        const datos = Object.fromEntries(new FormData(form));

        const registro = {
            ...datos,
            plan
        };
        sessionStorage.setItem("registro", JSON.stringify(registro));

        window.location.href = "payment.html"
    });

