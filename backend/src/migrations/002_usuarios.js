module.exports = {
  // Almacena los usuarios del sistema con su rol asignado
  // ENUM define los unicos valores validos para el campo rol
  up: async (pool) => {
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
  },
  down: async (pool) => {
    await pool.query(`DROP TABLE IF EXISTS usuarios;`);
  },
};
