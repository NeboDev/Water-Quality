const swaggerJsdoc = require('swagger-jsdoc');

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Kanan API',
            version: '1.0.0',
            description: `
API REST del sistema  — Monitoreo de calidad del agua en tiempo real.
Conforme a la NOM-127-SSA1-2021.

**Autenticación:** todos los endpoints protegidos requieren un JWT Bearer Token.
Obtén el token haciendo POST a \`/api/v1/auth/login\`.
      `,
            contact: {
                name: 'Facultad de Ciencias de la Computación — BUAP',
            }
        },
        servers: [
            { url: 'http://localhost:3000/api/v1', description: 'Desarrollo local' }
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT'
                }
            },
            schemas: {
                Nodo: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        mac: { type: 'string', example: 'A4:CF:12:45:6B:2F' },
                        ubicacion: { type: 'string', example: 'Bebedero norte — Edificio de Rectoría' },
                        version_fw: { type: 'string', example: '1.0.0' },
                        activo: { type: 'boolean' },
                        fecha_alta: { type: 'string', format: 'date-time' }
                    }
                },
                Valores: {
                    type: 'object',
                    properties: {
                        ph: { type: 'number', example: 7.2 },
                        temperatura: { type: 'number', example: 15.3 },
                        conductividad: { type: 'number', example: 450.5 },
                        turbidez: { type: 'number', example: 1.2 },
                        tds: { type: 'number', example: 320.0 }
                    }
                },
                Telemetria: {
                    type: 'object',
                    properties: {
                        _id: { type: 'string' },
                        nodo_id: { type: 'string', format: 'uuid' },
                        mac: { type: 'string' },
                        timestamp: { type: 'string', format: 'date-time' },
                        valores: { $ref: '#/components/schemas/Valores' }
                    }
                },
                Alerta: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        parametro: { type: 'string', example: 'ph' },
                        valor_leido: { type: 'number', example: 9.5 },
                        valor_min: { type: 'number', example: 6.5 },
                        valor_max: { type: 'number', example: 8.5 },
                        resuelta: { type: 'boolean' },
                        creado_en: { type: 'string', format: 'date-time' },
                        mac: { type: 'string' },
                        ubicacion: { type: 'string' }
                    }
                },
                Muestra: {
                    type: 'object',
                    properties: {
                        _id: { type: 'string' },
                        nodo_id: { type: 'string', format: 'uuid' },
                        mac: { type: 'string' },
                        timestamp: { type: 'string', format: 'date-time' },
                        valores: { $ref: '#/components/schemas/Valores' },
                        nota: { type: 'string' },
                        registrado_por: { type: 'string' }
                    }
                },
                Error: {
                    type: 'object',
                    properties: {
                        mensaje: { type: 'string' }
                    }
                }
            }
        },
        security: [{ bearerAuth: [] }],
        tags: [
            { name: 'Auth', description: 'Autenticación y gestión de sesión' },
            { name: 'Nodos', description: 'Gestión de nodos IoT registrados' },
            { name: 'Telemetría', description: 'Consulta de lecturas en tiempo real e historial' },
            { name: 'Muestras', description: 'Muestras oficiales automáticas del sistema' },
            { name: 'Alertas', description: 'Detección y resolución de anomalías NOM-127' },
            { name: 'Umbrales', description: 'Configuración de límites permisibles por nodo' },
        ]
    },
    // Lee las anotaciones JSDoc de todos los archivos de rutas
    apis: ['./src/routes/*.js']
};

module.exports = swaggerJsdoc(options);