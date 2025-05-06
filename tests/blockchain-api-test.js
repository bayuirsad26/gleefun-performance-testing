import http from "k6/http";
import { check, sleep } from "k6";
import { Rate, Trend } from "k6/metrics";
import { randomIntBetween } from "https://jslib.k6.io/k6-utils/1.2.0/index.js";

// Custom metrics
const errorRate = new Rate("error_rate");
const requestDuration = new Trend("request_duration");

// Test configuration
export const options = {
  // Test scenarios with different user loads
  scenarios: {
    // Smoke test - just to verify the API works
    smoke: {
      executor: "constant-vus",
      vus: 1,
      duration: "30s",
      tags: { test_type: "smoke" },
    },
    // Load test - moderate number of users
    load: {
      executor: "ramping-vus",
      startVUs: 1,
      stages: [
        { duration: "1m", target: 10 },
        { duration: "3m", target: 10 },
        { duration: "1m", target: 0 },
      ],
      gracefulRampDown: "30s",
      tags: { test_type: "load" },
    },
    // Stress test - find the breaking point
    stress: {
      executor: "ramping-vus",
      startVUs: 1,
      stages: [
        { duration: "2m", target: 50 },
        { duration: "5m", target: 50 },
        { duration: "2m", target: 100 },
        { duration: "5m", target: 100 },
        { duration: "2m", target: 0 },
      ],
      gracefulRampDown: "30s",
      tags: { test_type: "stress" },
    },
    // Spike test - sudden surge of users
    spike: {
      executor: "ramping-vus",
      startVUs: 1,
      stages: [
        { duration: "10s", target: 1 },
        { duration: "1m", target: 100 },
        { duration: "3m", target: 100 },
        { duration: "1m", target: 1 },
      ],
      gracefulRampDown: "30s",
      tags: { test_type: "spike" },
    },
    // Soak test - run for a long time with constant load
    soak: {
      executor: "constant-vus",
      vus: 5,
      duration: "30m",
      tags: { test_type: "soak" },
    },
  },
  thresholds: {
    // Define performance objectives
    http_req_duration: ["p(95)<500", "p(99)<1500"], // 95% of requests should be below 500ms, 99% below 1.5s
    "http_req_duration{status:200}": ["avg<400"], // Average response time for successful requests
    http_req_failed: ["rate<0.01"], // Error rate should be below 1%
    error_rate: ["rate<0.01"], // Custom error rate should be below 1%
  },
};

// Default function that is executed for each virtual user
export default function () {
  const url = "https://api.gleefun.io/api/v1/blockchains";

  // Add custom headers if needed
  const params = {
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "k6-performance-test",
    },
    tags: { name: "BlockchainsAPI" },
  };

  // Make the API request
  const startTime = new Date().getTime();
  const response = http.get(url, params);
  const duration = new Date().getTime() - startTime;

  // Record custom metrics
  requestDuration.add(duration);

  // Perform checks on the response
  const checkResult = check(response, {
    "status is 200": (r) => r.status === 200,
    "response time < 500ms": (r) => r.timings.duration < 500,
    "content type is JSON": (r) =>
      r.headers["Content-Type"] &&
      r.headers["Content-Type"].includes("application/json"),
    "has blockchain data": (r) => {
      try {
        const body = JSON.parse(r.body);
        return Array.isArray(body.data);
      } catch (e) {
        return false;
      }
    },
  });

  // Record error rate based on checks
  errorRate.add(!checkResult);

  // Add random sleep time between requests to simulate real user behavior
  sleep(randomIntBetween(1, 3));
}

// Function to handle test lifecycle events (optional)
export function setup() {
  console.log("Test setup - any preparations can be done here");
  // You could perform auth, create test data, etc.
}

export function teardown(data) {
  console.log("Test teardown - any cleanup can be done here");
  // Cleanup test data, logout, etc.
}
