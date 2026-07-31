import http from 'k6/http';
import { check, sleep } from 'k6';

// Authenticated patient endpoints (hub/reports/calendar/progress/streaks/badges).
// Requires a valid access token (login first, then pass it in).
// Run:  k6 run -e ACCESS_TOKEN=<jwt> load-tests/wellness-authenticated.js
// Tune:  k6 run -e BASE_URL=... -e ACCESS_TOKEN=<jwt> -e CHALLENGE_ID=<id> -e VUS=50 load-tests/wellness-authenticated.js

export const options = {
  scenarios: {
    ramp: {
      executor: 'ramping-vus',
      startVUs: 2,
      stages: [
        { duration: '30s', target: __ENV.VUS ? Number(__ENV.VUS) : 10 },
        { duration: '1m', target: __ENV.VUS ? Number(__ENV.VUS) : 10 },
        { duration: '30s', target: 0 },
      ],
      gracefulRampDown: '10s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<1000', 'p(99)<2000'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:4000';
const ACCESS_TOKEN = __ENV.ACCESS_TOKEN || '';

if (!ACCESS_TOKEN) {
  throw new Error('ACCESS_TOKEN is required. Run: k6 run -e ACCESS_TOKEN=<jwt> load-tests/wellness-authenticated.js');
}

const params = {
  headers: {
    Authorization: `Bearer ${ACCESS_TOKEN}`,
    'Content-Type': 'application/json',
  },
};

const ENDPOINTS = [
  '/api/wellness/hub',
  '/api/wellness/reports?days=30',
  '/api/wellness/workouts/calendar',
  '/api/wellness/workouts/progress?days=30',
  '/api/wellness/streaks',
  '/api/wellness/badges',
];

export default function () {
  let url = `${BASE_URL}${ENDPOINTS[(__ITER + __VU) % ENDPOINTS.length]}`;
  if (__ENV.CHALLENGE_ID && (__ITER + __VU) % 6 === 0) {
    url = `${BASE_URL}/api/wellness/challenges/${__ENV.CHALLENGE_ID}/leaderboard`;
  }
  const res = http.get(url, params);
  check(res, {
    'status is 200': (r) => r.status === 200,
    'success flag': (r) => r.json('success') === true,
  });
  sleep(0.3);
}
