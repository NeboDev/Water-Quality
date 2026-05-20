import http from 'k6/http';
import { check } from 'k6';

export const options = {
    vus: 25,
    duration: '30s',
};

export default function () {
    const res = http.post('http://localhost:3000/api/v1/auth/login',
        JSON.stringify({ email: 'admin@buap.mx', password: 'admin123' }),
        { headers: { 'Content-Type': 'application/json' } }
    );
    check(res, { 'login 200': (r) => r.status === 200 });
}