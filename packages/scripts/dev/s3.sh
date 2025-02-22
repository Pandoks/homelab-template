#!/bin/sh

awslocal s3 mb s3://$(echo $BACKUP_BUCKET)
