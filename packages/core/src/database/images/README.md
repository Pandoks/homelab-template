# Database Images

These images are used to setup a highly available and failure tolerant postgres database system.

> [!NOTE]
>
> This database setup requires the root `.env` file to be filled.

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

## Pgbackrest Backups

For database backups, we are going to be using [pgbackrest](https://pgbackrest.org). This is the architecture:

```mermaid
flowchart LR
    subgraph cloud[" "]
        s3[("S3")]
        subgraph backup[backup container]
            pgbackrest[pgbackrest]
            style pgbackrest fill:#000,stroke:#333,stroke-width:2px
        end
        subgraph slave[slave container]
            slavepostgres[(postgres)]
            slavebackup[pgbackrest]
            style slavepostgres fill:#4479A1,stroke:#333,stroke-width:2px
            style slavebackup fill:#000,stroke:#333,stroke-width:2px
        end
        subgraph master[master container]
            masterpostgres[(postgres)]
            masterbackup[pgbackrest]
            style masterpostgres fill:#4479A1,stroke:#333,stroke-width:2px
            style masterbackup fill:#000,stroke:#333,stroke-width:2px
        end

        style master fill:#4479A1,stroke:#333,stroke-width:2px
        style slave fill:#,stroke:#333,stroke-width:2px
        style backup fill:#CC6600,stroke:#333,stroke-width:2px
        style s3 fill:#006400,stroke:#333,stroke-width:2px

        masterpostgres -- "WAL replication" --- slavepostgres
        masterbackup -- "WAL archive" --> s3
        pgbackrest -- "upload" --> s3
        pgbackrest <-. "main backup" .-> slavebackup
        pgbackrest -. "supplement main backup" .-> masterbackup
    end

    style cloud fill:transparent
```

### Backup Types

| Full                                              | Diff                                                | Incr                                              |
| ------------------------------------------------- | --------------------------------------------------- | ------------------------------------------------- |
| Full backup from scratch                          | Backup based off of the most recent **full** backup | Backup based off of the most recent backup        |
| `pgbackrest --stanza=<stanza> backup --type=full` | `pgbackrest --stanza=<stanza> backup --type=diff`   | `pgbackrest --stanza=<stanza> backup --type=incr` |

### Backup Schedule

We use the pgbackrest's container cron job to invoke `pgbackrest backup` because we take backups from
the backup container which then communicates with the pgbackrest instances on the database containers.
By default, we take backups from the slave container, but we still need to communicate with the master
database as it has the WAL archives we need to complete a full backup.

> [!IMPORTANT]
>
> The backup cron schedule is located in the `backup/cron` file, but remember to rename it to the container's
> user (pgbackrest) when creating the volume mount for deployment:
>
> ```
> - images/backup/cron:/etc/crontabs/pgbackrest
> ```

#### Recommended Schedule

- **Full backups:** Once a week, preferrably weekends
- **Differential Backups:** Every night
- **Incremental Backups:** Multiple times throughout the day

Although this is recommended, you should change your backup schedule based off of usage. For example,
if you don't get that many database changes, you may want to decrease the frequency for backups and
vice versa. It's a general rule of thumb to have do **incremental backups** more than **differential backups**,
and have more **differential backups** than **full backups** because of the system resources, and storage
requirements that they need.

Because I have relatively low database changes, my current backup schedule is a full backup once a week,
a differential backup 2 times a week, and an incremental backup once a day. The retention policy for
differential backups is 2 so that I will keep a full week's backup, and the retention policy for full
backups is 4 so that I will keep a full month's worth of backups.

> [!WARNING]
>
> Make sure to change the retention policies for the different types of backups in `pgbackrest.conf`
>
> ```
> repo-retention-full=4
> repo-retention-diff=2
> ```
>
> We don't have `repo-retention-incr` because `pgbackrest` automatically takes care of them when either
> diff or full backups are deleted.

## Database Cron Jobs

`pg_cron` is already installed in the images so that you can run database cron jobs. Currently, for
the main database that handles auth, there is a cron job that takes care of deleting expired sessions
every single week.

> [!WARNING]
>
> The timezone for all images is GMT. This is to ensure consistency and to avoid confusion when working
> across multiple images/containers

> [!NOTE]
>
> `pg_cron` may only be installed to on database in a cluster. If you need to run jobs in multiple
> databases, use `cron.schedule_in_database()`.

> [!NOTE]
>
> `pg_cron` does not run on any server that in in `hot standby` mode, but will automatically
> start when the server is promoted. This means that all cron operations (ie. viewing & editing) should
> be done on the master database.

### Viewing Cron Jobs

To show all current cron jobs in a database, run:

```

SELECT * FROM cron.job;

```

### Adding Cron Jobs

> [!NOTE]
>
> It is generally better to independently create a SQL function to call inside of the cron job instead
> of doing it in line so that you can test it regardless of the cron schedule

#### Creating a Function

```sql
CREATE OR REPLACE FUNCTION example()
RETURNS void AS $$
BEGIN
    -- SQL query here
END;
$$ LANGUAGE plpsql;
```

> [!TIP]
>
> If you're doing cleanup or bulk operations, it's generally good to end the function with
> `VACUUM <table>` for tables that you did bulk operations on

#### Creating a Cron Schedule

```sql
SELECT cron.schedule('<name>', '<cron schedule>', 'SELECT example()', '[optional: specify database]');
```

#### Update a Cron Schedule

```sql
SELECT cron.schedule('<name>', '<cron schedule>', 'SELECT example()', '[optional: specify database]');
```

#### Delete a Cron Schedule

```sql
SELECT cron.unschedule('<name>');
```

# Appendix

## Cron Format

```
 ┌───────────── min (0 - 59)
 │ ┌────────────── hour (0 - 23)
 │ │ ┌─────────────── day of month (1 - 31) or last day of the month ($)
 │ │ │ ┌──────────────── month (1 - 12)
 │ │ │ │ ┌───────────────── day of week (0 - 6) (0 to 6 are Sunday to
 │ │ │ │ │                  Saturday, or use names; 7 is also Sunday)
 │ │ │ │ │
 │ │ │ │ │
 * * * * *
```