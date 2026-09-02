#!/bin/sh
set -e

# Fly volume mounts as root; app runs as nextjs — ensure SQLite path is writable.
if [ -d /data ]; then
  chown -R nextjs:nodejs /data
fi

exec su -s /bin/sh nextjs -c "npx prisma migrate deploy && node server.js"
