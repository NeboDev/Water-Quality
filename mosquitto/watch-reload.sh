#!/bin/sh
/usr/sbin/mosquitto -c /mosquitto/config/mosquitto.conf &
MOSQUITTO_PID=$!

trap 'kill -HUP "$MOSQUITTO_PID"' HUP

inotifywait -m -e close_write /mosquitto/config/passwd /mosquitto/config/acl_file |
while read -r path action file; do
  echo "Cambio detectado en $file, recargando Mosquitto..."
  kill -HUP "$MOSQUITTO_PID"
done