The scripts inside of `package.json` are used only for dev environments.

The setup `.sql` files are used for the production postgres docker containers to setup.

For production migrations, you will need to manually run:

```
pnpm drizzle-kit --config ./main/drizzle/drizzle-prod.config.ts push
```

This is just so that you don't accidentally push to prod when you're playing around in dev env.
