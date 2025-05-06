#!/bin/bash

if [ -z "$1" ]; then
  echo "Usage: ./run-scenario.sh [smoke|load|stress|spike|soak]"
  exit 1
fi

SCENARIO=$1

echo "Running $SCENARIO test scenario..."
docker-compose run k6 run --tag scenario=$SCENARIO /tests/blockchain-api-test.js
