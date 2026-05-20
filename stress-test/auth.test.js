import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend } from 'k6/metrics';

const tiempoLogin = new Trend('kanan_tiempo_login');
const BASE_URL = 'http://localhost:3000/api/v1';

export const options = {
    vus: 10,
    duration: '30s',
    thresholds: {
        'kanan_tiempo_login': ['p(95)<300'],
    },
};

export default function () {
    const payload = JSON.stringify({
        email: 'admin@buap.mx',
        password: 'admin123'
    });

    const params = { headers: { 'Content-Type': 'application/json' } };

    const res = http.post(`${BASE_URL}/auth/login`, payload, params);

    tiempoLogin.add(res.timings.duration);

    check(res, {
        'status 200': (r) => r.status === 200,
        'has token': (r) => r.cookies['kanan_token'] !== undefined,
    });

    sleep(1);
}