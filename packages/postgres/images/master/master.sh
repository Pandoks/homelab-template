#!/bin/sh
# sh file instead of sql file because we need to access environment variables

psql -c "CREATE USER replicator WITH REPLICATION LOGIN ENCRYPTED PASSWORD '$PGREPPASS'"

psql -c "CREATE USER pooler WITH PASSWORD '$PGPOOLPASS'"
psql -c "GRANT CONNECT ON DATABASE $POSTGRES_DB TO pooler"
psql -c "GRANT USAGE ON SCHEMA public TO pooler"
psql -c "GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO pooler"
psql -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO pooler"
