FROM postgres:15-alpine
USER postgres
ENV PGDATA=/var/lib/postgresql/data/pgdata
RUN mkdir -p ${PGDATA} && chown -R postgres:postgres ${PGDATA}
EXPOSE 5432
CMD ["postgres"]
