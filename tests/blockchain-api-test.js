import http from "k6/http";
import { check, sleep } from "k6";
import { Rate, Trend } from "k6/metrics";
import { randomIntBetween } from "https://jslib.k6.io/k6-utils/1.2.0/index.js";

// Custom metrics - make sure to export them to make them available in Grafana
export const errorRate = new Rate("error_rate");
export const requestDuration = new Trend("request_duration");
export const successfulChecks = new Rate("successful_checks");

// Get scenario from environment variable
const SELECTED_SCENARIO = __ENV.SCENARIO || "all";

// Define all scenario configurations
const scenarioConfigs = {
  smoke: {
    executor: "constant-vus",
    vus: 1,
    duration: "30s",
    tags: { test_type: "smoke" },
  },
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
  soak: {
    executor: "constant-vus",
    vus: 5,
    duration: "30m",
    tags: { test_type: "soak" },
  },
};

// Determine which scenarios to include
const activeScenarios = {};
if (SELECTED_SCENARIO === "all") {
  // Include all scenarios
  Object.assign(activeScenarios, scenarioConfigs);
} else if (scenarioConfigs[SELECTED_SCENARIO]) {
  // Include only the selected scenario
  activeScenarios[SELECTED_SCENARIO] = scenarioConfigs[SELECTED_SCENARIO];
} else {
  console.error(
    `Unknown scenario: ${SELECTED_SCENARIO}. Defaulting to smoke test.`
  );
  activeScenarios.smoke = scenarioConfigs.smoke;
}

// Test configuration
export const options = {
  // Only include active scenarios
  scenarios: activeScenarios,
  thresholds: {
    http_req_duration: ["p(95)<850", "p(99)<1500"],
    "http_req_duration{status:200}": ["avg<500"],
    http_req_failed: ["rate<0.01"],
    // Add thresholds for custom metrics
    error_rate: ["rate<0.05"],
    successful_checks: ["rate>0.95"],
  },
  // Important: explicitly set InfluxDB tags for better visualization
  tags: {
    api: "blockchain",
    version: "v1",
  },
  // Ensure all metrics are properly sent to InfluxDB
  noConnectionReuse: false,
  // Don't discard response bodies to ensure we can check content
  discardResponseBodies: false,
};

// Default function that is executed for each virtual user
export default function () {
  const url = "https://api.gleefun.io/api/v1/blockchains";

  // Add custom headers and tags for better filtering in Grafana
  const params = {
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "k6-performance-test",
    },
    tags: {
      name: "BlockchainsAPI",
      endpoint: "blockchains_list",
      test_type: SELECTED_SCENARIO,
    },
  };

  // Make the API request
  const startTime = new Date().getTime();
  const response = http.get(url, params);
  const duration = new Date().getTime() - startTime;

  // Record custom metrics
  requestDuration.add(duration, {
    endpoint: "blockchains_list",
    test_type: SELECTED_SCENARIO,
  });

  // Debug logging for the first iteration
  if (__ITER === 0) {
    console.log("Response Status Code:", response.status);
    console.log("Response Content Type:", response.headers["Content-Type"]);
    console.log(
      "Response Body Length:",
      response.body ? response.body.length : 0
    );
    console.log("Current scenario:", SELECTED_SCENARIO);

    // Log the first part of the response body
    try {
      const bodyPreview = response.body.substring(0, 100) + "...";
      console.log("Response Body Preview:", bodyPreview);
    } catch (e) {
      console.log("Error previewing response body:", e);
    }
  }

  // Perform checks on the response - include all important aspects to check
  const checkResult = check(response, {
    "status is 200": (r) => r.status === 200,
    "response time < 850ms": (r) => r.timings.duration < 850,
    "content type is JSON": (r) =>
      r.headers["Content-Type"] &&
      r.headers["Content-Type"].includes("application/json"),
    "has blockchain data": (r) => {
      try {
        if (!r.body) {
          return false;
        }
        const body = JSON.parse(r.body);
        return Array.isArray(body) && body.length > 0;
      } catch (e) {
        return false;
      }
    },
    "blockchain items have required fields": (r) => {
      try {
        if (!r.body) {
          return false;
        }
        const blockchains = JSON.parse(r.body);
        if (!Array.isArray(blockchains) || blockchains.length === 0) {
          return false;
        }
        const firstItem = blockchains[0];
        return (
          typeof firstItem.key === "string" &&
          typeof firstItem.name === "string" &&
          typeof firstItem.imageUrl === "string"
        );
      } catch (e) {
        return false;
      }
    },
  });

  // Record error rate and successful checks with proper tags
  errorRate.add(!checkResult, {
    endpoint: "blockchains_list",
    test_type: SELECTED_SCENARIO,
  });
  successfulChecks.add(checkResult, {
    endpoint: "blockchains_list",
    test_type: SELECTED_SCENARIO,
  });

  // Add variable sleep time between requests
  sleep(randomIntBetween(2, 5));
}

// Perform a warm-up request before the actual test
export function setup() {
  console.log("Test setup - any preparations can be done here");
  console.log(`Running scenario: ${SELECTED_SCENARIO}`);

  // Warm-up request to establish connection and prime any caches
  console.log("Performing warm-up request...");
  const warmupResponse = http.get("https://api.gleefun.io/api/v1/blockchains", {
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "k6-performance-test-warmup",
    },
  });
  console.log(`Warm-up request status: ${warmupResponse.status}`);

  // Log the response body format for debugging
  try {
    const body = JSON.parse(warmupResponse.body);
    console.log("Warm-up response is array:", Array.isArray(body));
    console.log("Warm-up response length:", body.length);
    if (body.length > 0) {
      console.log("First item keys:", Object.keys(body[0]).join(", "));
    }
  } catch (e) {
    console.log("Error parsing warm-up response:", e.message);
  }

  sleep(2);

  return {};
}

export function teardown(data) {
  console.log("Test teardown - any cleanup can be done here");
}
