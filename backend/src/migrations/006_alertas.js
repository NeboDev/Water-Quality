module.exports = {
  // Registro de cada anomalia detectada por el motor de alertas
  up: async (pool) => {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS alertas (
        id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        nodo_id       UUID NOT NULL REFERENCES nodos(id) ON DELETE CASCADE,
        parametro     VARCHAR(20) NOT NULL,
        valor_leido   NUMERIC(10,4) NOT NULL,
        valor_min     NUMERIC(10,4) NOT NULL,
        valor_max     NUMERIC(10,4) NOT NULL,
        resuelta      BOOLEAN DEFAULT FALSE,
        creado_en     TIMESTAMP DEFAULT NOW()
      );
    `);
  },
  down: async (pool) => {
    await pool.query(`DROP TABLE IF EXISTS alertas;`);
  },
};
