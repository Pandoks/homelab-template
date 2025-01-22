# Homelab Template

## Running Locally

```
k3d cluster create --registry-use k3d-homelab-template.localhost:12345 --volume $(pwd):/postgres@all --k3s-arg "--disable=traefik@server:*" -p "80:80@loadbalancer" -p "443:443@loadbalancer"
```
