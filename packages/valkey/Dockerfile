FROM valkey/valkey:8

RUN apt-get update && apt-get install -y --no-install-recommends \
  gettext-base \
  && rm -rf /var/lib/apt/lists/*

RUN mkdir -p /etc/valkey \
  && chown -R valkey:valkey /etc/valkey

COPY ./entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

USER valkey

ENTRYPOINT [ "/usr/local/bin/entrypoint.sh" ]
