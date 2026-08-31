# Gestión de credenciales y ACL en Mosquitto — Kanan

> Mosquitto corre dentro de Docker. Todos los comandos que modifican el archivo
> `passwd` se ejecutan **dentro del contenedor** vía `docker exec`.
> El nombre del contenedor depende del directorio raíz del proyecto;
> con Docker Compose v2 suele ser `<carpeta>-mosquitto-1`
> (ej. `iot-ss-mosquitto-1`). Ajústalo si difiere.

---

## 1. Archivo de contraseñas (`passwd`)

### Crear el archivo e insertar el primer usuario

```bash
# Linux / Bash — interactivo (solicita contraseña en pantalla)
docker exec -it <contenedor> mosquitto_passwd -c /mosquitto/config/passwd <usuario>

# Linux / Bash — no interactivo (contraseña como argumento, útil en scripts)
docker exec <contenedor> mosquitto_passwd -c -b /mosquitto/config/passwd <usuario> <contraseña>
```

```powershell
# Windows — PowerShell (PowerShell no es interactivo: usar siempre -b)
docker exec <contenedor> mosquitto_passwd -c -b /mosquitto/config/passwd <usuario> "<contraseña>"
```

> **`-c` sobreescribe el archivo completo.**
> Úsalo únicamente para el primer usuario o cuando quieras reiniciar el archivo desde cero.
>
> En PowerShell usa siempre `-b` para pasar la contraseña como argumento posicional.
> Las comillas son obligatorias si la contraseña contiene espacios o caracteres
> especiales (`!`, `$`, `&`, etc.).

---

### Agregar un usuario adicional

```bash
# Linux / Bash — interactivo
docker exec -it <contenedor> mosquitto_passwd /mosquitto/config/passwd <usuario>

# Linux / Bash — no interactivo
docker exec <contenedor> mosquitto_passwd -b /mosquitto/config/passwd <usuario> <contraseña>
```

```powershell
# Windows — PowerShell (siempre con -b)
docker exec <contenedor> mosquitto_passwd -b /mosquitto/config/passwd <usuario> "<contraseña>"
```

---

### Eliminar un usuario

```bash
# Linux / Bash
docker exec <contenedor> mosquitto_passwd -D /mosquitto/config/passwd <usuario>
```

```powershell
# Windows — PowerShell
docker exec <contenedor> mosquitto_passwd -D /mosquitto/config/passwd <usuario>
```

---

### Verificar el contenido del archivo

```bash
docker exec <contenedor> cat /mosquitto/config/passwd
```

Las líneas tienen la forma `usuario:hash_bcrypt`. Las contraseñas nunca se almacenan en texto plano.

---

## 2. Convención de nombres de usuario en Kanan

| Actor | Usuario sugerido | Rol |
|---|---|---|
| ESP32 con MAC `A4:CF:12:45:6B:2F` | `nodo_A4CF12456B2F` | Publica telemetría |
| Backend Node.js | `kanan_backend` | Suscriptor de todos los nodos |

> Se omiten los `:` de la MAC para evitar caracteres especiales en el nombre de usuario.

---

## 3. Archivo de ACL (`acl`)

Ubicación recomendada: `./mosquitto/config/acl`

```
# ── Nodo ESP32: solo puede publicar en su propio tópico ──────────────────────
user nodo_A4CF12456B2F
topic write nodo/A4:CF:12:45:6B:2F/telemetria

# ── Backend: puede leer telemetría de todos los nodos ────────────────────────
user kanan_backend
topic read nodo/+/telemetria
```

Agrega un bloque `user` / `topic` por cada nuevo nodo registrado.

---

## 4. Configuración en `mosquitto.conf`

```conf
listener 1883
allow_anonymous false

# Autenticación
password_file /mosquitto/config/passwd

# Control de acceso por tópico
acl_file /mosquitto/config/acl
```

Después de modificar `passwd` o `acl`, recarga la configuración sin reiniciar:

```bash
docker exec <contenedor> kill -HUP 1
```

O reinicia el servicio directamente:

```bash
docker compose restart mosquitto
```

---

## 5. Flujo completo para registrar un nuevo nodo

```bash
# 1. Agregar credenciales
docker exec -it <contenedor> mosquitto_passwd -b /mosquitto/config/passwd nodo_<MAC_SIN_PUNTOS> <contraseña>

# 2. Editar ./mosquitto/config/acl y añadir:
#    user nodo_<MAC_SIN_PUNTOS>
#    topic write nodo/<MAC_CON_PUNTOS>/telemetria

# 3. Recargar Mosquitto
docker exec <contenedor> kill -HUP 1
```

---

## 6. Notas de seguridad

- Las contraseñas de los nodos deben generarse aleatoriamente y almacenarse en el
  firmware del ESP32 como constantes de compilación (no en código fuente público).
- En producción, habilitar TLS (`listener 8883`) y reemplazar los certificados
  autofirmados por certificados Let's Encrypt.
- El backend lee las credenciales desde variables de entorno
  (`MQTT_USER`, `MQTT_PASSWORD`) definidas en `.env`, nunca hardcodeadas.
