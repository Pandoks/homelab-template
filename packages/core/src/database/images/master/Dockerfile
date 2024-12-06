# Doesn't necessarily have to be a master datatabase, but master in referencing that it is the database
# that is being referenced during a backup
FROM postgres:17-alpine 
RUN apk update && apk upgrade --no-cache
RUN apk add pgbackrest --no-cache
