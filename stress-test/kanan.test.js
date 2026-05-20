import http from 'k6/http';
import ws from 'k6/ws';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

// Metricaas
const errores = new Counter('kanan_errores');
const tasaExito = new Rate('kanan_tasa_exito');
const tiempoLogin = new Trend('kanan_tiempo_login');
const tiempoTelemetria = new Trend('kanan_tiempo_telemetria');

// Configuracion del escenario 
// Simula tres fases: rampa de subida, carga sostenida y bajada
export const options = {
    scenarios: {

        // Escenario 1: usuarios con sesion activa consultando el dashboard
        usuarios_dashboard: {
            executor: 'ramping-vus',
            startVUs: 0,
            stages: [
                { duration: '30s', target: 10 }, // sube a 10 usuarios en 30s
                { duration: '1m', target: 10 }, // mantiene 10 usuarios por 1 minuto
                { duration: '30s', target: 25 }, // sube a 25 usuarios
                { duration: '1m', target: 25 }, // mantiene carga alta
                { duration: '30s', target: 0 }, // baja gradualmente
            ],
            exec: 'flujo_dashboard',
        },

        // Escenario 2: carga en endpoints REST de alertas y telemetría
        consultas_api: {
            executor: 'constant-arrival-rate',
            rate: 20,            // 20 peticiones por segundo
            timeUnit: '1s',
            duration: '3m',
            preAllocatedVUs: 10,
            exec: 'flujo_api',
        },

    },
    thresholds: {
        // El 95% de las peticiones deben responder en menos de 500ms
        'http_req_duration': ['p(95)<500'],
        // El 99% de las peticiones deben responder en menos de 1500ms
        'http_req_duration': ['p(99)<1500'],
        // Menos del 1% de errores HTTP
        'http_req_failed': ['rate<0.01'],
        // Métricas específicas de Kanan
        'kanan_tiempo_login': ['p(95)<300'],
        'kanan_tiempo_telemetria': ['p(95)<400'],
        'kanan_tasa_exito': ['rate>0.99'],
    },
};

const BASE_URL = 'http://localhost:3000/api/v1';
const WS_URL = 'ws://localhost:3000';

// Helper: login y obtener cookie 
function login() {
    const start = Date.now();
    const res = http.post(`${BASE_URL}/auth/login`,
        JSON.stringify({ email: 'admin@buap.mx', password: 'admin123' }),
        { headers: { 'Content-Type': 'application/json' } }
    );
    tiempoLogin.add(Date.now() - start);

    const ok = check(res, {
        'login exitoso': r => r.status === 200,
        'cookie establecida': r => r.cookies['kanan_token'] !== undefined,
    });

    tasaExito.add(ok);
    if (!ok) errores.add(1);

    return res.cookies;
}

// Escenario 1: flujo completo del dashboard 
export function flujo_dashboard() {
    // Cada VU simula un usuario del dashboard
    const cookies = login();
    if (!cookies['kanan_token']) return;

    const jar = http.cookieJar();
    jar.set('http://localhost:3000', 'kanan_token', cookies['kanan_token'][0].value);

    const params = { cookies: { kanan_token: cookies['kanan_token'][0].value } };

    // Carga inicial del dashboard
    const resLive = http.get(`${BASE_URL}/telemetria/live`, params);
    tiempoTelemetria.add(resLive.timings.duration);
    check(resLive, { 'telemetria live 200': r => r.status === 200 });

    sleep(1);

    // Consulta alertas no resueltas
    const resAlertas = http.get(`${BASE_URL}/alertas?resuelta=false`, params);
    check(resAlertas, { 'alertas 200': r => r.status === 200 });

    sleep(1);

    // Consulta umbrales para las graficas
    const resUmbrales = http.get(`${BASE_URL}/umbrales`, params);
    check(resUmbrales, { 'umbrales 200': r => r.status === 200 });

    sleep(1);

    // Consulta nodos
    const resNodos = http.get(`${BASE_URL}/nodos`, params);
    check(resNodos, { 'nodos 200': r => r.status === 200 });

    sleep(2);

    // Logout al terminar
    http.post(`${BASE_URL}/auth/logout`, null, params);
}

//  Escenario 2: carga en endpoints REST 
export function flujo_api() {
    const cookies = login();
    if (!cookies['kanan_token']) return;

    const params = { cookies: { kanan_token: cookies['kanan_token'][0].value } };

    // Alterna entre endpoints para simular uso real
    const endpoints = [
        `${BASE_URL}/telemetria/live`,
        `${BASE_URL}/alertas`,
        `${BASE_URL}/nodos`,
        `${BASE_URL}/umbrales`,
        `${BASE_URL}/muestras`,
    ];

    // Elige un endpoint aleatorio
    const url = endpoints[Math.floor(Math.random() * endpoints.length)];
    const res = http.get(url, params);

    check(res, {
        'respuesta exitosa': r => r.status === 200,
        'respuesta rápida': r => r.timings.duration < 500,
    });

    if (res.status !== 200) errores.add(1);

    sleep(0.5);
}

//  Resumen al terminar 
export function handleSummary(data) {
    return {
        'stress-test/resultado.json': JSON.stringify(data, null, 2),
        stdout: resumenTexto(data),
    };
}

function resumenTexto(data) {
    const dur = data.metrics['http_req_duration'];
    const failed = data.metrics['http_req_failed'];
    const reqs = data.metrics['http_reqs'];

    return `
╔══════════════════════════════════════════════╗
║       KANAN — RESULTADO PRUEBA DE ESTRÉS     ║
╠══════════════════════════════════════════════╣
║ Total peticiones:  ${String(reqs?.values?.count || 0).padEnd(24)}║
║ Peticiones/seg:    ${String((reqs?.values?.rate || 0).toFixed(2)).padEnd(24)}║
║ Tasa de error:     ${String(((failed?.values?.rate || 0) * 100).toFixed(2) + '%').padEnd(24)}║
║ P50 duración:      ${String(((dur?.values?.['p(50)'] || 0)).toFixed(0) + 'ms').padEnd(24)}║
║ P95 duración:      ${String(((dur?.values?.['p(95)'] || 0)).toFixed(0) + 'ms').padEnd(24)}║
║ P99 duración:      ${String(((dur?.values?.['p(99)'] || 0)).toFixed(0) + 'ms').padEnd(24)}║
╚══════════════════════════════════════════════╝
`;
}