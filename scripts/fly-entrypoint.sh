#!/bin/sh
set -e

# Fly secrets override this default when DATABASE_URL is set.
: "${DATABASE_URL:=file:/data/prod.db}"
export DATABASE_URL

# Volume mount is owned by root; app runs as nextjs.
if [ -d /data ]; then
  chown -R nextjs:nodejs /data
fi

cd /app
exec su -s /bin/sh nextjs -c "npx prisma migrate deploy && exec node server.js"
