/**
 * Valida un campo de formulario específico y retorna el mensaje de error.
 * Si el campo es válido, retorna una cadena vacía ("").
 * @param {string} name - El nombre del campo (ej. "email", "password")
 * @param {string} value - El valor actual del campo
 * @returns {string} - Mensaje de error o cadena vacía
 */
export const validateField = (name, value) => {
    let errMsg = "";

    if (name === "nombreUsuario" && value.length > 0 && value.trim().length < 3) {
        errMsg = "El nombre debe tener al menos 3 caracteres.";
    }

    if (name === "email" && value.length > 0) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) errMsg = "Ingresa un correo electrónico válido.";
    }

    if (name === "password" && value.length > 0) {
        if (value.length < 8) {
            errMsg = "La contraseña debe tener al menos 8 caracteres.";
        } else if (!/[A-Z]/.test(value)) {
            errMsg = "Debe incluir al menos una letra mayúscula.";
        } else if (!/[a-z]/.test(value)) {
            errMsg = "Debe incluir al menos una letra minúscula.";
        } else if (!/[^A-Za-z0-9]/.test(value)) {
            errMsg = "Debe incluir al menos un símbolo especial (ej. @, #, !, etc.).";
        }
    }

    return errMsg;
};