FROM masterdb:latest
USER root

RUN rm -rf /var/lib/postgresql/data/*

COPY ./scripts/process_env.sh /usr/local/bin/process_env.sh
RUN chmod +x /usr/local/bin/process_env.sh

COPY ./core/src/database/images/slave/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

USER postgres

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
