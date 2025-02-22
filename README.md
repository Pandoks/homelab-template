# Homelab Template

## Running Locally

```
k3d cluster create --registry-use k3d-homelab-template.localhost:12345 --volume $(pwd):/postgres@all --k3s-arg "--disable=traefik@server:*" -p "80:80@loadbalancer" -p "443:443@loadbalancer"
```

Make sure that you are logged into Docker and you are also logged into ghcr.io through docker. If you
haven't, create a personal access token (classic) from github and give it package: read write delete
privaledges. You will then do `docker login ghcr.io` and the username will be your github username,
while the password is the personal access token.
