module.exports = {
  // PostgreSQL no genera UUIDs por defecto esta extension lo habilita
  up: async (pool) => {
    await pool.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);
  },
  down: async (pool) => {
    await pool.query(`DROP EXTENSION IF EXISTS "uuid-ossp";`);
  },
};
