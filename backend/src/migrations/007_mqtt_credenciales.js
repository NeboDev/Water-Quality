module.exports = {
  up: async (pool) => {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS mqtt_credenciales (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        nodo_id UUID NOT NULL REFERENCES nodos(id) ON DELETE CASCADE,
        username VARCHAR(100) NOT NULL UNIQUE,
        generado_en TIMESTAMP DEFAULT NOW(),
        UNIQUE(nodo_id)
      );
    `);
  },
  down: async (pool) => {
    await pool.query(`DROP TABLE IF EXISTS mqtt_credenciales;`);
  },
};
