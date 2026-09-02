/* =====================================================
   DOM
===================================================== */

const form = document.getElementById("registerForm");

const pass = document.getElementById("password");
const confirmPass = document.getElementById("confirmPassword");

const alertContainer = document.getElementById("alertContainer");
const alertMessage = document.getElementById("alertMessage");

const generatePass = document.getElementById("generatePassword");

const toggles = document.querySelectorAll(".toggle-password");

const passwordStrengthText =
    document.getElementById("passwordStrengthText");

const passwordStrengthBar =
    document.getElementById("passwordStrengthBar");


/* =====================================================
   PASSWORD REQUIREMENTS
const params = new URLSearchParams(window.location.search);
const plan = params.get("plan");
const validPlans = ["basic", "professional", "enterprise"];
const selectedPlanValue = validPlans.includes(plan) ? plan : "basic";

const plan = params.get("plan");


/*
    El usuario debe llegar al registro
    después de seleccionar un plan.
*/

const planesValidos = [
    "basic",
    "professional",
    "enterprise"
];

if (!planesValidos.includes(plan)) {
    window.location.href = "index.html";
}


/* =====================================================
   REGISTER
        }


        lucide.createIcons();

    });
}

});


/* =====================================================
   PASSWORD STRENGTH
===================================================== */

function checkPasswordStrength(password) {

    let score = 0;


    /* Longitud */

    if (password.length >= 8) {

        score++;

    }


    /* 12 caracteres */

    if (password.length >= 12) {

        score++;

    }


    /* Minúscula */

    if (/[a-z]/.test(password)) {

        score++;

    }


    /* Mayúscula */

    if (/[A-Z]/.test(password)) {

        score++;

    }


    /* Número */

    if (/[0-9]/.test(password)) {

        score++;

    }


    /* Carácter especial */

    if (/[^A-Za-z0-9]/.test(password)) {

        score++;

    }


    return score;

}


/* =====================================================
   UPDATE PASSWORD STRENGTH
===================================================== */

function updatePasswordStrength(password) {

    const score =
        checkPasswordStrength(password);


    /* =============================================
       SIN CONTRASEÑA
    ============================================== */

    if (password.length === 0) {

        passwordStrengthText.textContent =
            "Sin contraseña";

        passwordStrengthBar.style.width =
            "0%";


        resetRequirements();

        return;
    }


    /* =============================================
       REQUIREMENTS
    ============================================== */

    updateRequirement(
        requirementLength,
        password.length >= 8
    );

    updateRequirement(
        requirementUppercase,
        /[A-Z]/.test(password)
    );

    updateRequirement(
        requirementLowercase,
        /[a-z]/.test(password)
    );

    updateRequirement(
        requirementNumber,
        /[0-9]/.test(password)
    );

    updateRequirement(
        requirementSpecial,
        /[^A-Za-z0-9]/.test(password)
    );


    /* =============================================
       STRENGTH
    ============================================== */

    if (score <= 2) {

        passwordStrengthText.textContent =
            "Débil";

        passwordStrengthBar.style.width =
            "33%";

    }

    else if (score <= 4) {

        passwordStrengthText.textContent =
            "Media";

        passwordStrengthBar.style.width =
            "66%";

    }

    else {

        passwordStrengthText.textContent =
            "Fuerte";

        passwordStrengthBar.style.width =
            "100%";

    }

}


/* =====================================================
   REQUIREMENT STATUS
===================================================== */

function updateRequirement(element, valid) {

    const icon =
        element.querySelector("svg");


    if (valid) {

        element.classList.add("valid");

        element.innerHTML =
            '<i data-lucide="circle-check"></i>' +
            element.textContent.trim();

    }

    else {

        element.classList.remove("valid");

        element.innerHTML =
            '<i data-lucide="circle"></i>' +
            element.textContent.trim();

    }


    lucide.createIcons();

}


/* =====================================================
   RESET REQUIREMENTS
===================================================== */

function resetRequirements() {

    updateRequirement(
        requirementLength,
        false
    );

    updateRequirement(
        requirementUppercase,
        false
    );

    updateRequirement(
        requirementLowercase,
        false
    );

    updateRequirement(
        requirementNumber,
        false
    );

    updateRequirement(
        requirementSpecial,
        false
    );

}








