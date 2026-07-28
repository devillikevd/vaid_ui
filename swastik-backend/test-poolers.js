const { Pool } = require("pg");

const regions = [
  "aws-0-us-east-1", "aws-0-us-east-2", "aws-0-us-west-1", "aws-0-us-west-2",
  "aws-0-ap-south-1", "aws-0-ap-southeast-1", "aws-0-eu-central-1", "aws-0-eu-west-1", "aws-0-eu-west-2", "aws-0-sa-east-1",
  "gcp-0-us-central1", "gcp-0-us-east1", "gcp-0-us-east4", "gcp-0-us-west1", 
  "gcp-0-europe-west1", "gcp-0-europe-west2", "gcp-0-europe-west3",
  "gcp-0-asia-south1", "gcp-0-asia-southeast1", "gcp-0-asia-northeast1",
  "gcp-0-australia-southeast1", "gcp-0-southamerica-east1"
];

async function checkRegion(region) {
  const url = `postgresql://postgres.fzbdticlmxbxeektckst:2Dv%23E8-kadJ6%23Pi@${region}.pooler.supabase.com:6543/postgres`;
  const pool = new Pool({ connectionString: url, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 3000 });
  try {
    const res = await pool.query("SELECT 1 as val");
    return region;
  } catch (e) {
    if (e.message.includes("password authentication failed")) return region;
    return null;
  } finally {
    await pool.end();
  }
}

async function run() {
  console.log("Checking regions...");
  const promises = regions.map(async r => {
    const found = await checkRegion(r);
    if (found) console.log("FOUND REGION:", found);
  });
  await Promise.all(promises);
  console.log("Done.");
}
run();
