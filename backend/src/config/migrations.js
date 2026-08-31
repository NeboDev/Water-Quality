const fs = require("fs");
const path = require("path");
const { pool } = require("./postgres");

const MIGRATIONS_DIR = path.join(__dirname, "..", "migrations");

// Tabla que lleva el registro de que migraciones ya se aplicaron y cuando.
// Es la que le da versionado real al esquema: antes, correr runMigrations()
// dos veces era indistinguible de correrlo una vez porque todo era
// CREATE TABLE IF NOT EXISTS sin ningun tracking.
async function asegurarTablaControl() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id          SERIAL PRIMARY KEY,
      nombre      VARCHAR(255) NOT NULL UNIQUE,
      aplicada_en TIMESTAMP DEFAULT NOW()
    );
  `);
}

// Lee los archivos de /migrations en orden (el prefijo numerico define el
// orden de ejecucion, ej. 001_x.js corre antes que 002_y.js)
function listarMigraciones() {
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".js"))
    .sort();
}

async function obtenerAplicadas() {
  const result = await pool.query("SELECT nombre FROM schema_migrations");
  return new Set(result.rows.map((r) => r.nombre));
}

// Aplica todas las migraciones pendientes, en orden, cada una en su propia
// transaccion. Si una falla, se revierte esa migracion y se detiene el
// proceso — las anteriores ya aplicadas y commiteadas quedan como estan.
async function runMigrations() {
  try {
    await asegurarTablaControl();

    const archivos = listarMigraciones();
    const aplicadas = await obtenerAplicadas();
    const pendientes = archivos.filter((f) => !aplicadas.has(f));

    if (pendientes.length === 0) {
      console.log("Migraciones al dia, no hay pendientes");
      return;
    }

    for (const archivo of pendientes) {
      const migracion = require(path.join(MIGRATIONS_DIR, archivo));
      const cliente = await pool.connect();
      try {
        await cliente.query("BEGIN");
        await migracion.up(cliente);
        await cliente.query(
          "INSERT INTO schema_migrations (nombre) VALUES ($1)",
          [archivo],
        );
        await cliente.query("COMMIT");
        console.log(`Migracion aplicada: ${archivo}`);
      } catch (error) {
        await cliente.query("ROLLBACK");
        console.error(`Error aplicando migracion ${archivo}:`, error.message);
        throw error;
      } finally {
        cliente.release();
      }
    }

    console.log(`${pendientes.length} migracion(es) aplicada(s) correctamente`);
  } catch (error) {
    console.error("Error ejecutando migraciones:", error.message);
    process.exit(1);
  }
}

// Revierte la ultima migracion aplicada (o las ultimas `n` si se especifica).
// Uso manual: node -e "require('./config/migrations').rollback(1)"
async function rollback(n = 1) {
  try {
    await asegurarTablaControl();

    const result = await pool.query(
      "SELECT nombre FROM schema_migrations ORDER BY id DESC LIMIT $1",
      [n],
    );

    if (result.rows.length === 0) {
      console.log("No hay migraciones para revertir");
      return;
    }

    for (const { nombre } of result.rows) {
      const migracion = require(path.join(MIGRATIONS_DIR, nombre));
      if (!migracion.down) {
        console.error(
          `La migracion ${nombre} no define down(), no se puede revertir automaticamente`,
        );
        continue;
      }
      const cliente = await pool.connect();
      try {
        await cliente.query("BEGIN");
        await migracion.down(cliente);
        await cliente.query("DELETE FROM schema_migrations WHERE nombre = $1", [
          nombre,
        ]);
        await cliente.query("COMMIT");
        console.log(`Migracion revertida: ${nombre}`);
      } catch (error) {
        await cliente.query("ROLLBACK");
        console.error(`Error revirtiendo migracion ${nombre}:`, error.message);
        throw error;
      } finally {
        cliente.release();
      }
    }
  } catch (error) {
    console.error("Error revirtiendo migraciones:", error.message);
    process.exit(1);
  }
}

module.exports = runMigrations;
module.exports.rollback = rollback;
