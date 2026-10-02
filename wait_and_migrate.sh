#!/bin/bash
while ! docker compose ps | grep backend | grep -q Up; do
  sleep 2
done
sleep 5
docker compose exec backend php artisan migrate --force
