#!/bin/bash

# Check if a scenario was provided
if [ -z "$1" ]; then
  echo "Usage: ./run-with-dashboard.sh [smoke|load|stress|spike|soak|all]"
  exit 1
fi

SCENARIO=$1

# Create directories for Grafana provisioning if they don't exist
mkdir -p grafana/provisioning/datasources
mkdir -p grafana/provisioning/dashboards
mkdir -p grafana/dashboards

# Create or update Grafana datasource configuration
cat > grafana/provisioning/datasources/influxdb.yml <<EOF
apiVersion: 1

datasources:
  - name: InfluxDB
    type: influxdb
    access: proxy
    url: http://influxdb:8086
    database: k6
    isDefault: true
    editable: true
EOF

# Create or update Grafana dashboard provisioning
cat > grafana/provisioning/dashboards/k6.yml <<EOF
apiVersion: 1

providers:
  - name: 'K6 Dashboards'
    orgId: 1
    folder: ''
    type: file
    disableDeletion: false
    editable: true
    options:
      path: /var/lib/grafana/dashboards
EOF

# Run the test with InfluxDB
echo "Starting InfluxDB and Grafana..."
docker-compose up -d influxdb grafana

echo "Waiting for InfluxDB to start..."
sleep 10

echo "Running $SCENARIO test scenario..."
docker-compose run --rm -e SCENARIO=$SCENARIO k6

echo ""
echo "Test completed! View results at http://localhost:3000"
echo "Default Grafana credentials: admin/admin"
echo ""
echo "In Grafana, go to Dashboards > Browse > New Dashboard to create a custom view"
echo "Select visualization panels to add metrics like:"
echo "- http_req_duration by percentiles"
echo "- error_rate"
echo "- successful_checks"
echo "- requests per second"
echo ""
echo "Use test_type='${SCENARIO}' as a query filter to view this specific test run."