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

// Conexión al broker MQTT local con credenciales
const client = mqtt.connect('mqtt://localhost:1883', {
  username: 'simulador',
  password: 'simulador123',
});

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

    // Publicar telemetría 
    setInterval(() => {
      nodos.slice(0, 2).forEach(mac => {
        const payload = {
          valores: {
            ph: Number((Math.random() * 4 + 5.5).toFixed(2)),
            temperatura: Number((Math.random() * 15 + 15).toFixed(2)),
            conductividad: Math.floor(Math.random() * 1000 + 500),
            turbidez: Number((Math.random() * 6).toFixed(2)),
            tds: Math.floor(Math.random() * 600 + 200)
          }
        };

        const topic = `nodo/${mac}/telemetria`;
        client.publish(topic, JSON.stringify(payload));
        console.log(`[${mac}] Publicado:`, payload);
      });
    }, 5000);

    setInterval(() => {
      nodos.slice(2, 4).forEach(mac => {
        const payload = {
          valores: {
            ph: Number((Math.random() * 4 + 5.5).toFixed(2)),
            temperatura: Number((Math.random() * 15 + 15).toFixed(2)),
            conductividad: Math.floor(Math.random() * 1000 + 500),
            turbidez: Number((Math.random() * 6).toFixed(2)),
            tds: Math.floor(Math.random() * 600 + 200)
          }
        };

        const topic = `nodo/${mac}/telemetria`;
        client.publish(topic, JSON.stringify(payload));
        console.log(`[${mac}] Publicado:`, payload);
      });
    }, 8000);

  } catch (err) {
    console.error('Error al conectar con la base de datos:', err);
    process.exit(1);
  }
});

client.on('error', (err) => {
  console.error('Error MQTT:', err);
});
