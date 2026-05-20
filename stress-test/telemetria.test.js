import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend } from 'k6/metrics';

const tiempoTelemetria = new Trend('kanan_tiempo_telemetria');
const BASE_URL = 'http://localhost:3000/api/v1';

export const options = {
    vus: 10,
    duration: '30s',
    thresholds: {
        'kanan_tiempo_telemetria': ['p(95)<400'],
    },
};

//  SE ejecuta una sola vez para no ensuciar la metrica de tiempo
export function setup() {
    const res = http.post(`${BASE_URL}/auth/login`,
        JSON.stringify({ email: 'admin@buap.mx', password: 'admin123' }),
        { headers: { 'Content-Type': 'application/json' } }
    );
    return { token: res.cookies['kanan_token'][0].value };
}

export default function (data) {
    const params = {
        cookies: { kanan_token: data.token }
    };

    const res = http.get(`${BASE_URL}/telemetria/live`, params);

    tiempoTelemetria.add(res.timings.duration);

    check(res, {
        'status 200': (r) => r.status === 200,
        'data present': (r) => r.body.length > 0,
    });

    sleep(1);
}