FROM ghcr.io/postgresml/pgcat:latest

RUN apt update
RUN apt install -y --no-install-recommends gettext-base

COPY ./postgres/images/pooler/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

ENTRYPOINT [ "/usr/local/bin/entrypoint.sh" ]

CMD [ "pgcat", "/etc/pgcat/pgcat.toml" ]
