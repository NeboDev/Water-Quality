FROM eclipse-mosquitto:2
RUN apk add --no-cache inotify-tools
COPY watch-reload.sh /watch-reload.sh
RUN chmod +x /watch-reload.sh
ENTRYPOINT ["/watch-reload.sh"]