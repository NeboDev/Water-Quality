module.exports = {
  // Directorio de todos los ESP32 desplegados
  // La MAC es unica porque identifica físicamente cada dispositivo
  up: async (pool) => {
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
  },
  down: async (pool) => {
    await pool.query(`DROP TABLE IF EXISTS nodos;`);
  },
};
