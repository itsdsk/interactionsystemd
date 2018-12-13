#!/bin/bash

# enable mDNS <hostname>.local (connect to the host's system bus from the application container)
export DBUS_SYSTEM_BUS_ADDRESS=unix:path=/host/run/dbus/system_bus_socket

# start webserver/cms
pm2 start /usr/src/app/app.js --cwd "/usr/src/app/" --name "remoteapp"

# start renderer
umount /dev/shm && mount -t tmpfs shm /dev/shm
rm /tmp/.X0-lock &>/dev/null || true
startx /usr/src/app/libs/player/node_modules/electron/dist/electron /usr/src/app/libs/player --enable-logging
