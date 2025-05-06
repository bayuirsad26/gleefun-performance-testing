# Gleefun API Performance Testing Documentation

## Overview

This project provides a containerized setup for performance testing the Gleefun API using [k6](https://k6.io/), a modern load testing tool. The tests are designed to evaluate the API's performance under various load conditions, helping identify bottlenecks and ensure the API can handle expected traffic.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Project Structure](#project-structure)
- [Test Scenarios](#test-scenarios)
- [Getting Started](#getting-started)
- [Running Tests](#running-tests)
- [Visualizing Results](#visualizing-results)
- [Customizing Tests](#customizing-tests)
- [Interpreting Results](#interpreting-results)
- [Integration with CI/CD](#integration-with-cicd)
- [Troubleshooting](#troubleshooting)

## Prerequisites

- Docker and Docker Compose
- Basic understanding of API testing concepts
- Network access to the target API endpoints

## Project Structure

```
k6-tests/
├── docker-compose.yml         # Docker configuration for running tests
├── tests/
│   └── blockchain-api-test.js # Performance test script for blockchain API
├── results/                   # Directory where test results are stored
├── run-scenario.sh            # Helper script to run specific test scenarios
└── run-with-dashboard.sh      # Script to run tests with InfluxDB and Grafana
```

## Test Scenarios

The test suite includes the following scenarios:

1. **Smoke Test**: Light testing with 1 virtual user (VU) for 30 seconds to verify API functionality.
2. **Load Test**: Gradually increases to 10 concurrent users, maintains that load for 3 minutes, then ramps down.
3. **Stress Test**: Incrementally scales to 100 users to identify breaking points.
4. **Spike Test**: Suddenly increases to 100 users to simulate traffic spikes.
5. **Soak Test**: Maintains 5 users for 30 minutes to identify degradation over time.

## Getting Started

1. Clone or download this repository to your server
2. Navigate to the project directory:
   ```bash
   cd k6-tests
   ```
3. Ensure all scripts are executable:
   ```bash
   chmod +x *.sh
   ```

## Running Tests

### Running All Scenarios

To run all test scenarios defined in the script:

```bash
docker-compose up k6
```

### Running a Specific Scenario

To run a single scenario (e.g., smoke test):

```bash
./run-scenario.sh smoke
```

Available options: `smoke`, `load`, `stress`, `spike`, `soak`

### Running with Dashboard Visualization

To run tests with real-time visualization using InfluxDB and Grafana:

```bash
./run-with-dashboard.sh
```

After running, access Grafana at http://localhost:3000

## Visualizing Results

### Basic Results

Test results are output to the console and saved as JSON in the `results` directory.

### Advanced Visualization with Grafana

When using the dashboard setup:

1. Access Grafana at http://localhost:3000
2. Default credentials: admin/admin
3. First-time setup:
   - Add InfluxDB as a data source (URL: http://influxdb:8086, Database: k6)
   - Import a k6 dashboard (ID: 2587) from Grafana's dashboard repository

## Customizing Tests

### Modifying Endpoints

Edit the target URL in `tests/blockchain-api-test.js`:

```javascript
const url = "https://api.gleefun.io/api/v1/blockchains";
```

### Adding Authentication

For APIs requiring authentication, add appropriate headers:

```javascript
const params = {
  headers: {
    "Content-Type": "application/json",
    Authorization: "Bearer YOUR_TOKEN_HERE",
  },
};
```

### Adjusting Load Parameters

Modify the number of virtual users and durations in the options section:

```javascript
export const options = {
  scenarios: {
    load: {
      executor: "ramping-vus",
      startVUs: 1,
      stages: [
        { duration: "1m", target: 10 }, // Modify these values
        { duration: "3m", target: 10 },
        { duration: "1m", target: 0 },
      ],
    },
  },
};
```

### Setting Performance Thresholds

Adjust performance expectations in the thresholds section:

```javascript
thresholds: {
  http_req_duration: ['p(95)<500', 'p(99)<1500'], // 95% under 500ms, 99% under 1.5s
  'http_req_duration{status:200}': ['avg<400'], // Average successful response under 400ms
  http_req_failed: ['rate<0.01'], // Error rate below 1%
},
```

## Interpreting Results

### Key Metrics

1. **Request Duration**: How long requests take to complete

   - `http_req_duration` - Total request time
   - Look at percentiles (p95, p99) for outlier analysis

2. **Throughput**: Number of requests per second

   - `iterations` - Total number of completed iterations
   - Higher is better, but watch for increased errors

3. **Error Rate**: Percentage of failed requests

   - `http_req_failed` - Rate of failed requests
   - Should be close to 0% for healthy systems

4. **Resource Utilization**: CPU, memory, and network usage
   - Monitor server metrics alongside k6 tests
   - Identify resource bottlenecks

### Performance Goals

| Metric              | Target         | Warning        | Critical      |
| ------------------- | -------------- | -------------- | ------------- |
| Response Time (p95) | < 500ms        | 500ms - 1s     | > 1s          |
| Error Rate          | < 1%           | 1% - 5%        | > 5%          |
| Throughput          | Depends on API | Sustained drop | Steep decline |

## Integration with CI/CD

To integrate with CI/CD pipelines:

### GitHub Actions Example

```yaml
name: API Performance Tests

on:
  schedule:
    - cron: "0 0 * * 1" # Weekly on Mondays
  workflow_dispatch: # Allow manual triggering

jobs:
  performance-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Run K6 Tests
        run: |
          cd k6-tests
          docker-compose run k6
```

### Jenkins Pipeline Example

```groovy
pipeline {
    agent any
    stages {
        stage('Performance Test') {
            steps {
                dir('k6-tests') {
                    sh 'docker-compose run k6'
                }
            }
        }
    }
}
```

## Troubleshooting

### Common Issues and Solutions

1. **Connection Errors**

   - Verify API endpoint is accessible from the Docker network
   - Check for firewall or rate-limiting issues

2. **Insufficient Resources**

   - Increase Docker resource limits for high-load tests
   - Distribute testing across multiple machines for very large tests

3. **Invalid Results**

   - Ensure test duration is sufficient for meaningful data
   - Exclude initial "warm-up" period when analyzing results

4. **InfluxDB/Grafana Issues**
   - Verify services are running: `docker-compose ps`
   - Check logs: `docker-compose logs influxdb grafana`

### Getting Help

For more information:

- k6 Documentation: https://k6.io/docs/
- Grafana Documentation: https://grafana.com/docs/
- InfluxDB Documentation: https://docs.influxdata.com/influxdb/v1.8/

## Conclusion

This performance testing setup provides a comprehensive way to evaluate and monitor the Gleefun API's performance. Regular testing helps maintain optimal performance and identify issues before they impact users.

Happy testing!
