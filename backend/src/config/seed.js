// config/seed.js
const bcrypt = require("bcrypt");
const { pool } = require("./postgres");

/**
 * Crea el usuario administrador inicial si no existe ninguno en el sistema.
 * Las credenciales se toman de las variables de entorno.
 * Se ejecuta automáticamente después de las migraciones.
 */
async function seedAdmin() {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  const adminNombre = process.env.ADMIN_NOMBRE;

  // Validación estricta: si faltan las variables, no se crea el admin
  // y se lanza una advertencia clara para el desarrollador/administrador.
  if (!adminEmail || !adminPassword) {
    console.warn(
      "[Seed] ADMIN_EMAIL o ADMIN_PASSWORD no definidos en .env. " +
        "No se creará usuario administrador automático.",
    );
    return;
  }

  try {
    // Verifica si YA EXISTE algún usuario con rol 'admin' en la base de datos.
    // Esto evita sobrescribir o duplicar si ya hay uno creado manualmente.
    const existeAdmin = await pool.query(
      "SELECT id FROM usuarios WHERE rol = $1 LIMIT 1",
      ["admin"],
    );

    if (existeAdmin.rows.length > 0) {
      console.log(
        "[Seed] Usuario administrador ya existe. Omitiendo creación.",
      );
      return;
    }

    // Si no existe, lo creamos con la contraseña hasheada.
    const hash = await bcrypt.hash(adminPassword, 10);
    await pool.query(
      `INSERT INTO usuarios (nombre, email, password_hash, rol)
       VALUES ($1, $2, $3, 'admin')`,
      [adminNombre, adminEmail, hash],
    );

    console.log(
      `[Seed] Usuario administrador creado exitosamente: ${adminEmail}`,
    );
    console.log(`   (Rol: admin, Nombre: ${adminNombre})`);
  } catch (error) {
    // Si algo falla (ej. conexión a BD), el error debe ser visible para detener
    // el despliegue si es crítico, o al menos alertar.
    console.error(
      "[Seed] Error crítico al crear usuario administrador:",
      error.message,
    );
  }
}

module.exports = { seedAdmin };
