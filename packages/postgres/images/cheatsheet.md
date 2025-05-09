# Connecting to the Databases

You can connect to the databses via the connection pooler `pgcat`.

Because of certain configurations and implementation details of `pgcat` we need to connect to it via
a connection string with `gssencmode=disable`:

```
psql 'postgresql://pgcat:<password>@<host>:6432/<database>?gssencmode=disable'
```

# Initializing Patroni

# Pgbackrest Backups

> [!NOTE]
> When your patroni cluster is first setup, you will need to create a stanza for the backups. To do this,
> manually go to the pgbackrest deployment and run:
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
