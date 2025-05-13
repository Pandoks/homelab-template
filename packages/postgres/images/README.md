> [!NOTE]
> This guide is only for the database setup in kubernetes and does not apply for local or dev environments.

# Connecting to the Databases

You can connect to the databses via the connection pooler `pgcat`.

Because of certain configurations and implementation details of `pgcat` we need to connect to it via
a connection string with `gssencmode=disable`:

```
psql 'postgresql://pgcat:<password>@<host>:6432/<database>?gssencmode=disable'
```

# Initializing Patroni

Once all Patroni nodes are up, you will need to manually setup extensions, databases, and roles.

## Extensions

All Patorni nodes are installed with the same extensions:

- pg_cron
- postGIS
- pgvector

To activiate the extensions, you will need to run the following SQL commands in the database of your choice as the admin user:

```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgvector;
```

## Databases

You will need to create the database that you want for the patroni cluster. It should be the same name
as the prefix or suffix of the StatefulSets, Services, etc. You'll initially need to connect to the
database as the admin user to create the database:

```
psql -U admin -d postgres
```

To create the database, run the following SQL command as the admin user:

```sql
CREATE DATABASE <database_name>;
```

## Roles

You will have to create the `pgcat` role for the database. This is for the connection pooler. You don't
want to give the `pgcat` role too much permissions since it should only be used for your client applications
and not for the database administration. To create the role, run the following SQL command as the admin user
**in the database you want to create the role for `<database_name>`**:

```sql
CREATE ROLE pgcat WITH LOGIN PASSWORD '<password>';

-- Database connection and temporary table privileges
GRANT CONNECT, TEMPORARY ON DATABASE <database_name> TO pgcat;

-- Schema usage (allows access to objects, but not creation/deletion)
GRANT USAGE ON SCHEMA public TO pgcat;

-- All privileges on existing tables, sequences, and functions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO pgcat;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO pgcat;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO pgcat;

-- All privileges on future tables, sequences, and functions (run as the object owner)
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON TABLES TO pgcat;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON SEQUENCES TO pgcat;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON FUNCTIONS TO pgcat;
```

# Pgbackrest Backups

> [!NOTE]
> When your patroni cluster is first setup (databases, roles, etc), you will need to create a stanza
> for the backups. To do this, manually go to the pgbackrest deployment after the patroni cluster is
> up and run:
>
> ```
> pgbackrest --stanza=<stanza> create-stanza
> ```

### Backup Types

| Type     | Command                                           | Description                                       |
| -------- | ------------------------------------------------- | ------------------------------------------------- |
| **Full** | `pgbackrest --stanza=<stanza> backup --type=full` | Full backup from scratch                          |
| **Diff** | `pgbackrest --stanza=<stanza> backup --type=diff` | Backup based off of the most recent _full_ backup |
| **Incr** | `pgbackrest --stanza=<stanza> backup --type=incr` | Backup based off of the most recent backup        |

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

# Connecting to the Database

As mentioned above, you'll have to connect to pgcat to connect to the cluster's database cluster on the
host machine. You can do this by running the following command:

```
psql -U pgcat -d <database_name> -h localhost -p 6432
```

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
