#!/bin/sh
set -eu

cp /run/mongot/pwfile /tmp/mongot-pwfile
chmod 600 /tmp/mongot-pwfile

exec /mongot-community/mongot \
  --config=/mongot-community/config.default.yml \
  --internalListAllIndexesForTesting=true
