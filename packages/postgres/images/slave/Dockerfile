FROM masterdb:latest
USER root

RUN rm -rf /var/lib/postgresql/data/*

COPY ./postgres/images/slave/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

USER postgres

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
