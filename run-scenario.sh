#!/bin/bash

if [ -z "$1" ]; then
  echo "Usage: ./run-scenario.sh [smoke|load|stress|spike|soak]"
  exit 1
fi

SCENARIO=$1

echo "Running $SCENARIO test scenario..."
docker-compose run --rm -e SCENARIO=$SCENARIO k6