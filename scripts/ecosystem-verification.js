#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const REPO_ROOT = path.resolve(__dirname, '..');
const BASE_URL = process.env.SWASTIK_BASE_URL || 'http://127.0.0.1:5001';
const DEFAULT_COORDS = new URLSearchParams({
  latitude: '19.1158835',
  longitude: '72.854202',
  radius: '25',
});

function logCheck(status, label, detail = '') {
  const icons = {
    pass: 'PASS',
    warn: 'WARN',
    fail: 'FAIL',
    info: 'INFO',
  };
  const suffix = detail ? ` - ${detail}` : '';
  console.log(`[${icons[status] || 'INFO'}] ${label}${suffix}`);
}

async function fetchJson(route) {
  const url = `${BASE_URL}${route}`;
  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
  });

  let json = null;
  try {
    json = await response.json();
  } catch {
    json = null;
  }

  if (!response.ok) {
    const detail = json?.message || json?.error || response.statusText;
    throw new Error(`${route} -> ${response.status} ${detail}`);
  }

  return json;
}

function requireFile(relativePath) {
  const absolutePath = path.join(REPO_ROOT, relativePath);
  return fs.existsSync(absolutePath);
}

function parseGoogleServicesPackage(relativePath) {
  const absolutePath = path.join(REPO_ROOT, relativePath);
  if (!fs.existsSync(absolutePath)) return null;

  try {
    const raw = JSON.parse(fs.readFileSync(absolutePath, 'utf8'));
    const packages = [];
    for (const client of raw.client || []) {
      const pkg = client?.client_info?.android_client_info?.package_name;
      if (pkg) packages.push(pkg);
    }
    return packages;
  } catch {
    return null;
  }
}

async function run() {
  const failures = [];
  const warnings = [];

  console.log(`SWASTIK ecosystem verification`);
  console.log(`Base URL: ${BASE_URL}`);

  try {
    const health = await fetchJson('/health');
    logCheck('pass', 'Backend health', JSON.stringify(health.checks || {}));
    if (health?.checks?.minio !== 'ok') {
      warnings.push('MinIO is down, so binary uploads will fall back or fail depending on the flow.');
      logCheck('warn', 'Storage', 'MinIO is not healthy');
    }
  } catch (error) {
    failures.push(`Backend health failed: ${error.message}`);
    logCheck('fail', 'Backend health', error.message);
  }

  const publicRoutes = [
    ['/api/hospitals/nearby?' + DEFAULT_COORDS.toString(), 'Nearby hospitals'],
    ['/api/hospitals/clinics?' + DEFAULT_COORDS.toString(), 'Nearby clinics'],
    ['/api/hospitals/pharmacies?' + DEFAULT_COORDS.toString(), 'Nearby pharmacies'],
    ['/api/hospitals/diagnostic-centers?' + DEFAULT_COORDS.toString(), 'Nearby diagnostic centers'],
  ];

  for (const [route, label] of publicRoutes) {
    try {
      const json = await fetchJson(route);
      const items = Array.isArray(json?.data) ? json.data.length : Array.isArray(json) ? json.length : 0;
      logCheck('pass', label, `${items} item(s) returned`);
    } catch (error) {
      failures.push(`${label} failed: ${error.message}`);
      logCheck('fail', label, error.message);
    }
  }

  const firebaseChecks = [
    {
      file: 'app/google-services.json',
      expectedPackage: 'com.example.swastik',
      label: 'Patient app Firebase config',
    },
    {
      file: 'ambulance-app/google-services.json',
      expectedPackage: 'com.example.swastik.ambulance',
      label: 'Ambulance app Firebase config',
    },
  ];

  for (const check of firebaseChecks) {
    const packages = parseGoogleServicesPackage(check.file);
    if (!packages) {
      warnings.push(`${check.file} is missing or unreadable`);
      logCheck('warn', check.label, 'missing or unreadable');
      continue;
    }

    if (!packages.includes(check.expectedPackage)) {
      failures.push(`${check.file} does not contain ${check.expectedPackage}`);
      logCheck('fail', check.label, `packages=${packages.join(', ') || 'none'}`);
      continue;
    }

    logCheck('pass', check.label, check.expectedPackage);
  }

  const smokePath = path.join(REPO_ROOT, 'swastik-backend/scripts/tmp-dispatch-live-smoke.js');
  if (process.argv.includes('--dispatch-smoke')) {
    if (!fs.existsSync(smokePath)) {
      failures.push('Dispatch smoke script is missing');
      logCheck('fail', 'Dispatch smoke', 'swastik-backend/scripts/tmp-dispatch-live-smoke.js missing');
    } else {
      logCheck('info', 'Dispatch smoke', 'running live dispatch smoke');
      const result = spawnSync(process.execPath, [smokePath], {
        cwd: REPO_ROOT,
        stdio: 'inherit',
        env: process.env,
      });
      if (result.status !== 0) {
        failures.push(`Dispatch smoke failed with exit ${result.status}`);
      } else {
        logCheck('pass', 'Dispatch smoke', 'completed successfully');
      }
    }
  } else if (fs.existsSync(smokePath)) {
    logCheck('info', 'Dispatch smoke', 'available via --dispatch-smoke');
  } else {
    warnings.push('Dispatch smoke helper is missing');
    logCheck('warn', 'Dispatch smoke', 'helper script not found');
  }

  const documentationChecks = [
    'COMPLETE_ECOSYSTEM_JOURNEY.md',
    'ADMIN_APPROVAL_FLOWCHARTS.md',
  ];

  for (const relativePath of documentationChecks) {
    if (requireFile(relativePath)) {
      logCheck('pass', `Documentation`, relativePath);
    } else {
      warnings.push(`${relativePath} is missing`);
      logCheck('warn', 'Documentation', `${relativePath} missing`);
    }
  }

  console.log('');
  console.log(`Summary: ${failures.length} failure(s), ${warnings.length} warning(s)`);

  if (failures.length) {
    failures.forEach((failure) => console.log(`- ${failure}`));
    process.exitCode = 1;
    return;
  }

  warnings.forEach((warning) => console.log(`- ${warning}`));
}

run().catch((error) => {
  console.error('[FAIL] Unexpected verifier error:', error);
  process.exit(1);
});
