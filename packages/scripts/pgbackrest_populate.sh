#!/bin/bash
SCRIPT_DIR=$(dirname $(realpath $0))

# Make sure to run this script in the root of the scripts file (probably will need to cd in scripts)
SST_RESOURCE=$(pnpx sst shell -- node $SCRIPT_DIR/src/sst.js)
