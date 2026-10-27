# Explicación de las funciones de contraseña

Este documento explica el generador de contraseñas de [auth.js](../js/auth.js) y
el flujo para solicitar y actualizar una contraseña mediante el enlace seguro de
Supabase, implementado en [forgot-password.js](../js/forgot-password.js) y
[reset-password.js](../js/reset-password.js).

## 1. `getRandomCharacter`

```javascript
function getRandomCharacter(characters) {
  const array = new Uint32Array(1);

  crypto.getRandomValues(array);

  return characters[array[0] % characters.length];
}
```

### ¿Qué hace?

Selecciona y devuelve un carácter aleatorio de una cadena de caracteres.

### Paso a paso

1. Recibe una cadena mediante el parámetro `characters`.
2. Crea un arreglo numérico con un solo espacio:

   ```javascript
   const array = new Uint32Array(1);
   ```

3. `crypto.getRandomValues(array)` llena el arreglo con un número aleatorio seguro para usos relacionados con seguridad.
4. El operador `%` obtiene el resto de una división. Ese resto siempre queda dentro del rango de posiciones disponibles en la cadena.
5. Devuelve el carácter que está en esa posición.

### Ejemplo

```javascript
const numbers = "0123456789";
const result = getRandomCharacter(numbers);
```

Si el número aleatorio generado fuera `27`, el cálculo sería:

```javascript
27 % 10; // 7
```

Como la cadena tiene 10 caracteres y la posición `7` contiene el carácter `"7"`, el resultado sería:

```javascript
"7";
```

El resultado real puede ser cualquier carácter de `"0123456789"`.

### Otro ejemplo

```javascript
const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
getRandomCharacter(uppercase);
```

Esta llamada devuelve una sola letra mayúscula, por ejemplo `"G"` o `"T"`.

---

## 2. `shufflePassword`

```javascript
function shufflePassword(password) {
  const characters = password.split("");

  const array = new Uint32Array(characters.length);

  crypto.getRandomValues(array);

  for (let i = characters.length - 1; i > 0; i--) {
    const randomIndex = array[i] % (i + 1);

    [characters[i], characters[randomIndex]] = [
      characters[randomIndex],
      characters[i],
    ];
  }

  return characters.join("");
}
```

### ¿Qué hace?

Cambia aleatoriamente el orden de los caracteres de una contraseña.

La función no cambia los caracteres ni su cantidad; únicamente modifica sus posiciones.

### Paso a paso

1. Convierte la cadena en un arreglo:

   ```javascript
   "Ab3!xyz".split("");
   // ["A", "b", "3", "!", "x", "y", "z"]
   ```

2. Crea un arreglo numérico con la misma cantidad de espacios que caracteres tiene la contraseña.
3. Lo llena con valores aleatorios usando `crypto.getRandomValues`.
4. Recorre el arreglo desde el último carácter hasta el segundo.
5. Para cada posición, calcula otra posición aleatoria.
6. Intercambia los dos caracteres.
7. Convierte el arreglo nuevamente en una cadena con `join("")`.

### Ejemplo sencillo

```javascript
const password = "Ab3!xyz";
const result = shufflePassword(password);
```

Un posible resultado sería:

```javascript
"3yA!xbz";
```

Otro resultado posible sería:

```javascript
"!z3bAxy";
```

Cada ejecución puede producir un orden diferente, pero siempre conservará los mismos caracteres:

```text
Entrada:  A b 3 ! x y z
Salida:   3 y A ! x b z
```

### ¿Cómo funciona el intercambio?

Esta parte:

```javascript
[characters[i], characters[randomIndex]] = [
  characters[randomIndex],
  characters[i],
];
```

intercambia dos valores sin necesitar una variable temporal.

Por ejemplo, si tenemos:

```javascript
characters[i] = "A";
characters[randomIndex] = "3";
```

después del intercambio quedan así:

```javascript
characters[i] = "3";
characters[randomIndex] = "A";
```

---

## 3. Cómo trabajan juntas

En `createPassword`, primero se genera una contraseña que contiene al menos:

- Una letra mayúscula.
- Una letra minúscula.
- Un número.
- Un carácter especial.

Por ejemplo, antes de mezclar podría quedar así:

```javascript
"Ab3!kP7xM2qZ";
```

Después se llama a:

```javascript
password = shufflePassword(password);
```

Y podría transformarse en:

```javascript
"7q!MxAbZ2Pk3";
```

La mezcla evita que los primeros cuatro caracteres siempre indiquen dónde están la mayúscula, la minúscula, el número y el carácter especial.

En resumen:

```text
getRandomCharacter -> elige un carácter aleatorio
shufflePassword    -> cambia aleatoriamente el orden de una contraseña
```

---

## 4. Recuperación y actualización de contraseña

El flujo de recuperación se compone de [forgot-password.js](../js/forgot-password.js),
que solicita a Supabase el correo de recuperación, y [reset-password.js](../js/reset-password.js),
que valida el acceso procedente del enlace y guarda la contraseña nueva. La página
[reset-password.html](../paginas/reset-password.html) mantiene el formulario oculto
hasta validar la sesión de recuperación.

### Variables de `forgot-password.js`

| Variable | Función |
| --- | --- |
| `SUPABASE_URL` | URL del proyecto Supabase al que se envía la solicitud. |
| `SUPABASE_KEY` | Clave pública (`publishable`) que permite al navegador usar Supabase Auth. No debe sustituirse por una clave `service_role`. |
| `supabaseClient` | Cliente de Supabase creado con la URL y la clave pública; se usa para solicitar el correo. |
| `form` | Formulario de recuperación de correo en la página `forgot-password.html`. |
| `submitButton` | Botón que se desactiva mientras se procesa la solicitud, para evitar envíos repetidos. |
| `statusMessage` | Elemento accesible donde se muestra el progreso, el resultado o el error. |
| `event` | Evento de envío; se cancela el envío HTML normal para procesarlo con JavaScript. |
| `email` | Dirección escrita por el usuario, usada para solicitar el correo de recuperación. |
| `redirectTo` | URL absoluta de `reset-password.html` calculada desde la dirección actual, para que funcione en desarrollo y producción. Debe estar permitida en la lista de redirecciones de Supabase. |
| `error` | Error devuelto por Supabase, si no se pudo solicitar el correo. |

### Funciones de `forgot-password.js`

#### Manejador de envío del formulario

Previene el envío tradicional, valida el correo con las reglas HTML, muestra el estado de carga y llama a `supabaseClient.auth.resetPasswordForEmail`. Si Supabase responde sin error, muestra un mensaje genérico para no revelar si una dirección está registrada. Si hay un error de Supabase o de conexión, lo registra en la consola y muestra un mensaje comprensible. El botón vuelve a habilitarse al finalizar.

### Variables de `reset-password.js`

| Variable | Función |
| --- | --- |
| `SUPABASE_URL` | URL del proyecto Supabase que valida el enlace y actualiza la cuenta. |
| `SUPABASE_KEY` | Clave pública (`publishable`) usada desde el navegador; la autorización real depende de la sesión temporal emitida por Supabase. |
| `supabaseClient` | Cliente de Supabase Auth para escuchar la recuperación y cambiar la contraseña. |
| `form` | Formulario de contraseña nueva; permanece oculto mientras el acceso no esté autorizado. |
| `newPasswordInput` | Campo de la contraseña nueva; exige un mínimo de ocho caracteres. |
| `confirmPasswordInput` | Campo usado para confirmar que ambas contraseñas sean iguales. |
| `submitButton` | Botón que se desactiva durante la actualización para evitar solicitudes duplicadas. |
| `statusMessage` | Mensaje accesible para informar validación, errores y resultado. |
| `loginLink` | Enlace para volver al inicio de sesión que se muestra después de actualizar la contraseña. |
| `recoveryAuthorized` | Indicador en memoria que solo pasa a `true` cuando Supabase notifica `PASSWORD_RECOVERY` y entrega una sesión. Una sesión normal ya existente no habilita este formulario. |
| `event` | Evento de autenticación emitido por Supabase, por ejemplo `PASSWORD_RECOVERY` o `INITIAL_SESSION`. |
| `session` | Sesión autenticada que Supabase entrega junto con el evento; se requiere para autorizar el formulario. |
| `error` | Error devuelto por `updateUser` o capturado si la petición falla por una excepción de red u otra falla inesperada. |

### Funciones de `reset-password.js`

#### Escucha de cambios de autenticación

`supabaseClient.auth.onAuthStateChange` recibe los eventos de Supabase. El evento
`PASSWORD_RECOVERY`, acompañado de una sesión, habilita el formulario. Al finalizar
la inicialización, si no se recibió ese evento, se envía al usuario a la pantalla de
recuperación. Así, tener una sesión normal o escribir directamente la dirección no
permite cambiar la contraseña desde esta página.

#### Manejador de envío del formulario

Cancela el envío normal, confirma que la sesión de recuperación siga autorizada,
valida los campos y compara ambas contraseñas. Si coinciden, llama a
`supabaseClient.auth.updateUser({ password })`. Ante un error muestra un mensaje y
mantiene el formulario para que el usuario pueda corregir el problema; ante el éxito
oculta el formulario, confirma la actualización y ofrece el enlace de inicio de
sesión. La contraseña nunca se imprime en consola.

### Protección y configuración necesaria

El bloqueo de navegación de esta pantalla es una protección de interfaz; la
autorización efectiva para cambiar la contraseña la realiza Supabase al exigir una
sesión válida obtenida del enlace de recuperación. En la configuración de Supabase
Auth debe incluirse como URL permitida la dirección de retorno usada por el sitio,
por ejemplo `https://tu-dominio/paginas/reset-password.html` (y la URL local de
desarrollo si corresponde). Sin esa entrada, Supabase rechazará la redirección del
correo.
