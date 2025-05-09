#!/bin/bash

# run-all-scenarios.sh - Helper script to run all scenarios and generate comparison dashboard

# Run all test scenarios
for scenario in smoke load stress spike; do
  echo "Running $scenario test..."
  ./run-with-dashboard.sh $scenario
  
  # Wait between tests to avoid conflicts
  sleep 5
done

echo "All tests completed!"
echo "View results at http://localhost:3000"
echo "For scenario comparison, use the Test Type variable selector in the dashboard"