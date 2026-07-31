import http from 'k6/http';
import { check, sleep } from 'k6';

// Public/marketplace endpoints (no auth required).
// Run:  k6 run load-tests/wellness-public.js
// Tune:  k6 run -e BASE_URL=https://api.example.com -e VUS=50 load-tests/wellness-public.js

export const options = {
  scenarios: {
    ramp: {
      executor: 'ramping-vus',
      startVUs: 5,
      stages: [
        { duration: '30s', target: __ENV.VUS ? Number(__ENV.VUS) : 20 },
        { duration: '1m', target: __ENV.VUS ? Number(__ENV.VUS) : 20 },
        { duration: '30s', target: 0 },
      ],
      gracefulRampDown: '10s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<800', 'p(99)<1500'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:4000';

const ENDPOINTS = [
  '/api/wellness/exercises?limit=30',
  '/api/wellness/exercises/stats',
  '/api/wellness/facilities?limit=20',
  '/api/wellness/supplements?limit=20',
  '/api/wellness/reels?limit=20',
  '/api/wellness/plans?limit=20',
  '/api/wellness/coaches?limit=20',
];

export default function () {
  const url = `${BASE_URL}${ENDPOINTS[(__ITER + __VU) % ENDPOINTS.length]}`;
  const res = http.get(url);
  check(res, {
    'status is 200': (r) => r.status === 200,
    'success flag': (r) => r.json('success') === true,
  });
  sleep(0.2);
}
