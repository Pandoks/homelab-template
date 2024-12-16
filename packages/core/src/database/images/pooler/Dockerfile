FROM ghcr.io/postgresml/pgcat:latest

COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

USER pgcat

ENTRYPOINT [ "/usr/local/bin/entrypoint.sh" ]

CMD [ "pgcat" ]
