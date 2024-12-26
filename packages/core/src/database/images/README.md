# Database Images

These images are used to setup a highly available and failure tolerant postgres database system.

**NOTE:** This database setup requires the root `.env` file to be filled.

## Local Running

In order to run the docker compose file, you need to first setup TLS certificates by running:

```
setup_tls.dev.sh
```

After running the script, you can now run `docker compose up`.

## Connecting to the Databases

You can connect to the databses via the connection pooler `pgcat`. Currently this is setup
to accept connections on `localhost:6432` with the username `pooler`.

Because of certain configurations and implementation details of `pgcat` we need to connect to it via
a connection string with `gssencmod=disable`:

```
psql 'postgresql://pooler:password@127.0.0.1:6432/main?gssencmod=disable'
```

### Checking Master & Slave Behavior

The compose file doesn't expose the ports of the underlying databases to `localhost`. You can change
this if you want in the `compose.yaml` file. Instead, I recommend directly accessing the docker container
and running `psql` to connect to the underlying database. You can then observe if queries are behaving
in relation with `pgcat`. Ie. Replication is working and the pooler is writing to the master and reading
from the slave.
