FROM ghcr.io/postgresml/pgcat:latest

COPY ../../../../../scripts/process_env.sh /usr/local/bin/process_env.sh
RUN chmod +x /usr/local/bin/process_env.sh

COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

USER pgcat

ENTRYPOINT [ "/usr/local/bin/entrypoint.sh" ]

CMD [ "pgcat" ]
