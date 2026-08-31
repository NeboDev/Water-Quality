module.exports = {
  // Límites permisibles por parametro y por nodo (fuente unica de verdad
  // para NOM-127, consultada tanto por telemetria_worker.js como por
  // reporteGenerator.js)
  // Referencia a nodos con ON DELETE CASCADE:
  // si se elimina un nodo sus umbrales se eliminan automaticamente
  up: async (pool) => {
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
  },
  down: async (pool) => {
    await pool.query(`DROP TABLE IF EXISTS umbrales;`);
  },
};
