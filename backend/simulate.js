const mqtt = require('mqtt');
const { Pool } = require('pg');

// Conexión directa a PostgreSQL expuesto en docker-compose
const pool = new Pool({
  user: 'admin',
  host: 'localhost',
  database: 'iot_agua',
  password: 'admin123',
  port: 5432,
});

// Conexión al broker MQTT local
const client = mqtt.connect('mqtt://localhost:1883');

client.on('connect', async () => {
  console.log('Simulador conectado a MQTT');

  try {
    // Obtener los nodos activos directamente de la base de datos
    const res = await pool.query('SELECT mac FROM nodos WHERE activo = true');
    const nodos = res.rows.map(r => r.mac);

    if (nodos.length === 0) {
      console.log('No hay nodos activos en la base de datos. Registra al menos un nodo en el dashboard primero.');
      process.exit(0);
    }

    console.log(`Iniciando simulación para ${nodos.length} nodos:`, nodos);

    // Publicar telemetría cada 5 segundos
    setInterval(() => {
      nodos.forEach(mac => {
        // Generar valores cercanos a los límites NOM-127 para ver variación
        const payload = {
          // pH ideal: 6.5 - 8.5
          ph: Number((Math.random() * 4 + 5.5).toFixed(2)),
          // Temp: 15.0 - 30.0
          temperatura: Number((Math.random() * 15 + 15).toFixed(2)),
          // Conductividad ideal: < 1500
          conductividad: Math.floor(Math.random() * 1000 + 500),
          // Turbidez ideal: < 5
          turbidez: Number((Math.random() * 6).toFixed(2)),
          // TDS ideal: < 1000
          tds: Math.floor(Math.random() * 600 + 200)
        };

        const topic = `nodo/${mac}/telemetria`;
        client.publish(topic, JSON.stringify(payload));
        console.log(`[${mac}] Publicado:`, payload);
      });
    }, 20000);

  } catch (err) {
    console.error(' Error al conectar con la base de datos:', err);
    process.exit(1);
  }
});

client.on('error', (err) => {
  console.error('Error MQTT:', err);
});
