require("dotenv").config({
  path: require("path").resolve(__dirname, "../../.env"),
});

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const cookieParser = require("cookie-parser");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const connectMongo = require("./config/mongo");
const { connectPostgres } = require("./config/postgres");
const runMigrations = require("./config/migrations");

const iniciarMQTT = require("./services/mqttClient");
const { iniciarScheduler } = require("./services/muestraScheduler");

const { setIO } = require("./services/socket");

const app = express();
const server = http.createServer(app);

// Misma whitelist para Express CORS y Socket.io — antes Socket.io aceptaba
// cualquier origen ('*') mientras el REST ya estaba restringido, dejando
// abierta la conexión WebSocket (telemetria:live, alertas:nueva, etc.)
// a cualquier sitio que quisiera conectarse
const CORS_ORIGINS = ["http://localhost:5173", "http://localhost:3001"];

//  WebSocket montado sobre el mismo servidor HTTP
const io = new Server(server, {
  cors: { origin: CORS_ORIGINS, credentials: true },
});

const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./config/swagger");

app.use(
  cors({
    origin: CORS_ORIGINS,
    credentials: true,
  }),
);

app.use(helmet());

app.use(express.json());
app.use(cookieParser());

// Limite general para toda la API — protege contra abuso/scraping
// 300 peticiones cada 15 min por IP es holgado para uso normal del dashboard
const limiterGeneral = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { mensaje: "Demasiadas peticiones, intenta de nuevo más tarde" },
});
app.use("/api/v1", limiterGeneral);

// Limite estricto para login/registro — mitiga fuerza bruta de credenciales
// 10 intentos cada 15 min por IP
const limiterAuth = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { mensaje: "Demasiados intentos, intenta de nuevo más tarde" },
});
app.use("/api/v1/auth/login", limiterAuth);
app.use("/api/v1/auth/register", limiterAuth);

// Documentacion
app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    customSiteTitle: "SS IOT API Docs",
    customCss: ".swagger-ui .topbar { background-color: #1F4E79; }",
  }),
);

// Solo den dev para zap
app.get("/swagger-json", (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.send(swaggerSpec);
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ── Rutas de la API ───────────
app.use("/api/v1/auth", require("./routes/auth"));
app.use("/api/v1/nodos", require("./routes/nodos"));
app.use("/api/v1/telemetria", require("./routes/telemetria"));
app.use("/api/v1/muestras", require("./routes/muestras"));
app.use("/api/v1/alertas", require("./routes/alertas"));
app.use("/api/v1/reportes", require("./routes/reportes"));
app.use("/api/v1/umbrales", require("./routes/umbrales"));

// ── Expone el io para usarlo desde cualquier parte del backend ─
app.set("io", io);

async function start() {
  await connectMongo();
  await connectPostgres();
  await runMigrations();

  setIO(io);

  require("./workers/telemetria.worker");
  iniciarMQTT(io);
  iniciarScheduler();

  server.listen(process.env.PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${process.env.PORT}`);
  });
}

start();
