const mqtt = require('mqtt');
const { addTelemetriaQueue } = require('./queue');

// ── Cliente MQTT ──────────────────────────────────────────────
// Se conecta al broker y se suscribe a todos los tópicos
// de telemetría usando el wildcard + que significa "cualquier MAC"
function iniciarMQTT(io) {
    const client = mqtt.connect(process.env.MQTT_BROKER);

    client.on('connect', () => {
        console.log('MQTT conectado al broker');

        // El # al final es wildcard multinivel de MQTT
        // captura nodo/A4:CF:12:45:6B:2F/telemetria
        // y cualquier otro nodo que publique bajo este esquema
        client.subscribe('nodo/+/telemetria', (err) => {
            if (err) {
                console.error('Error suscribiéndose a tópicos MQTT:', err.message);
            } else {
                console.log('Suscrito a nodo/+/telemetria');
            }
        });
    });

    client.on('message', async (topic, message) => {
        try {
            // Extrae la MAC del tópico — viene en la posición del medio
            // nodo / A4:CF:12:45:6B:2F / telemetria
            //  [0]          [1]              [2]
            const partes = topic.split('/');
            const mac = partes[1];

            // Intenta parsear el mensaje como JSON
            // si el ESP32 manda algo malformado lo descartamos aquí
            const payload = JSON.parse(message.toString());

            // Encola la tarea en Redis via BullMQ para procesamiento
            // El cliente MQTT solo recibe y encola, no procesa
            // esto garantiza que ningún mensaje se pierda aunque el worker esté ocupado
            await addTelemetriaQueue({ mac, payload });

        } catch (error) {
            console.error('Error procesando mensaje MQTT:', error.message);
        }
    });

    client.on('error', (error) => {
        console.error('Error en cliente MQTT:', error.message);
    });

    client.on('disconnect', () => {
        console.warn('MQTT desconectado del broker');
    });

    return client;
}

module.exports = iniciarMQTT;