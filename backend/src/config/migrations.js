const { pool } = require('./postgres');

async function runMigrations() {
    try {

        // ── Extension para UUID ───────────────────────────────────────
        // PostgreSQL no genera UUIDs por defecto esta extension lo habilita
        await pool.query(`
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    `);

        // ── Tabla: usuarios ───────────────────────────────────────────
        // Almacena los usuarios del sistema con su rol asignado
        // ENUM define los unicos valores validos para el campo rol
        await pool.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        nombre        VARCHAR(100) NOT NULL,
        email         VARCHAR(150) NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        rol           VARCHAR(20) NOT NULL CHECK (rol IN ('admin', 'operador', 'visualizador', 'icuap')),
        creado_en     TIMESTAMP DEFAULT NOW()
      );
    `);

        // ── Tabla: nodos ──────────────────────────────────────────────
        // Directorio de todos los ESP32 desplegados
        // La MAC es unica porque identifica físicamente cada dispositivo
        await pool.query(`
      CREATE TABLE IF NOT EXISTS nodos (
        id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        mac          VARCHAR(17) NOT NULL UNIQUE,
        ubicacion    VARCHAR(200) NOT NULL,
        version_fw   VARCHAR(20),
        activo       BOOLEAN DEFAULT TRUE,
        fecha_alta   TIMESTAMP DEFAULT NOW()
      );
    `);

        // ── Tabla: umbrales ───────────────────────────────────────────
        // Límites permisibles por parámetro y por nodo
        // Referencia a nodos con ON DELETE CASCADE:
        // si se elimina un nodo sus umbrales se eliminan automaticamente
        await pool.query(`
      CREATE TABLE IF NOT EXISTS umbrales (
        id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        nodo_id    UUID NOT NULL REFERENCES nodos(id) ON DELETE CASCADE,
        parametro  VARCHAR(20) NOT NULL CHECK (parametro IN ('ph', 'temperatura', 'conductividad', 'turbidez', 'tds')),
        valor_min  NUMERIC(10,4) NOT NULL,
        valor_max  NUMERIC(10,4) NOT NULL,
        UNIQUE(nodo_id, parametro)
      );
    `);

        // ── Tabla: reportes_nom127 ────────────────────────────────────
        // Historial de reportes generados para el ICUAP
        // Referencia tanto al nodo como al usuario que lo genero
        await pool.query(`
      CREATE TABLE IF NOT EXISTS reportes_nom127 (
        id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        nodo_id        UUID NOT NULL REFERENCES nodos(id),
        generado_por   UUID NOT NULL REFERENCES usuarios(id),
        fecha          DATE NOT NULL DEFAULT CURRENT_DATE,
        cumple_nom     BOOLEAN NOT NULL,
        pdf_url        TEXT,
        creado_en      TIMESTAMP DEFAULT NOW()
      );
    `);

        // ── Tabla: alertas ────────────────────────────────────────────
        // Registro de cada anomalia detectada por el motor de alertas
        await pool.query(`
      CREATE TABLE IF NOT EXISTS alertas (
        id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        nodo_id       UUID NOT NULL REFERENCES nodos(id),
        parametro     VARCHAR(20) NOT NULL,
        valor_leido   NUMERIC(10,4) NOT NULL,
        valor_min     NUMERIC(10,4) NOT NULL,
        valor_max     NUMERIC(10,4) NOT NULL,
        resuelta      BOOLEAN DEFAULT FALSE,
        creado_en     TIMESTAMP DEFAULT NOW()
      );
    `);

        console.log('Migraciones ejecutadas correctamente');

    } catch (error) {
        console.error('Error ejecutando migraciones:', error.message);
        process.exit(1);
    }
}

module.exports = runMigrations;