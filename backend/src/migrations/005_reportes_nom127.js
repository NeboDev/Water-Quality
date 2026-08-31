module.exports = {
  // Historial de reportes generados para el ICUAP
  // Referencia tanto al nodo como al usuario que lo genero
  up: async (pool) => {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS reportes_nom127 (
        id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        nodo_id        UUID NOT NULL REFERENCES nodos(id) ON DELETE CASCADE,
        generado_por   UUID NOT NULL REFERENCES usuarios(id),
        fecha          DATE NOT NULL DEFAULT CURRENT_DATE,
        cumple_nom     BOOLEAN NOT NULL,
        pdf_url        TEXT,
        creado_en      TIMESTAMP DEFAULT NOW()
      );
    `);
  },
  down: async (pool) => {
    await pool.query(`DROP TABLE IF EXISTS reportes_nom127;`);
  },
};
