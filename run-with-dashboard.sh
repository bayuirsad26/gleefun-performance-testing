#!/bin/bash

# Check if a scenario was provided
if [ -z "$1" ]; then
  echo "Usage: ./run-with-dashboard.sh [smoke|load|stress|spike|soak|all]"
  exit 1
fi

SCENARIO=$1

# Run the test with InfluxDB output
docker-compose up -d influxdb grafana
echo "Waiting for InfluxDB to start..."
sleep 10
docker-compose run -e SCENARIO=$SCENARIO -e K6_OUT="influxdb=http://influxdb:8086/k6" k6

echo ""
echo "Test completed! View results at http://localhost:3000"
echo "Default Grafana credentials: admin/admin"
echo ""
echo "If this is your first time, you'll need to:"
echo "1. Add InfluxDB as a data source (URL: http://influxdb:8086, Database: k6)"
echo "2. Import a k6 dashboard from https://grafana.com/grafana/dashboards/2587"