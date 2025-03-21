# Homelab Template

## Running Locally

```
k3d cluster create local-cluster \
    --agents 3 \
    --registry-create local-registry:12345 \
    --api-port 6443 \
    --k3s-arg "--disable=traefik@server:*" \
    --k3s-arg "--disable=servicelb@server:*"
```

For some of the docker compose files, you'll need to be logged in. Make sure that you are logged
into Docker and you are also logged into ghcr.io through docker. If you haven't, create a personal
access token (classic) from github and give it package: read write delete privaledges. You will
then do `docker login ghcr.io` and the username will be your github username, while the password is
the personal access token.
