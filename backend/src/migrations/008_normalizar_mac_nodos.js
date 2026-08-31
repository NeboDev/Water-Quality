module.exports = {
  // Normaliza las MACs ya registradas al formato canonico (sin ':' ni '-',
  // mayusculas) para que coincidan con el username de mqtt_credenciales
  // y con el topico que ahora publica el firmware (nodo/<mac>/telemetria)
  up: async (pool) => {
    await pool.query(`
      UPDATE nodos
      SET mac = UPPER(REPLACE(REPLACE(mac, ':', ''), '-', ''))
      WHERE mac ~ '[:\\-]';
    `);
  },
  // No hay forma de recuperar el formato original con separadores de
  // manera confiable (se perdio la info de si era ':' o '-'), así que
  // el down() reinserta ':' cada 2 caracteres, que era el formato mas comun
  down: async (pool) => {
    await pool.query(`
      UPDATE nodos
      SET mac = UPPER(
        SUBSTRING(mac, 1, 2) || ':' || SUBSTRING(mac, 3, 2) || ':' ||
        SUBSTRING(mac, 5, 2) || ':' || SUBSTRING(mac, 7, 2) || ':' ||
        SUBSTRING(mac, 9, 2) || ':' || SUBSTRING(mac, 11, 2)
      )
      WHERE LENGTH(mac) = 12;
    `);
  },
};
