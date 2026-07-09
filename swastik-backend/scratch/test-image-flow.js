require('dotenv').config();
const { signStorageUrlsInPayload } = require('../config/minio');

async function runTest() {
  console.log("=== Swastik Image Flow Test ===");
  try {
    const rawUrl = `https://swastik-telemedicine-bucket.s3.ap-south-1.amazonaws.com/medicines/123/dummy.webp`;
    console.log("Raw Storage URL (stored in DB):", rawUrl);
    
    const dbPayload = {
      id: 1,
      name: "Paracetamol",
      image_url: rawUrl,
      icon_url: `https://swastik-telemedicine-bucket.s3.ap-south-1.amazonaws.com/tests/123/dummy.webp`
    };
    
    console.log("\\nTesting Middleware (signStorageUrlsInPayload) on payload...");
    const signedPayload = await signStorageUrlsInPayload(dbPayload);
    console.log("\\nSigned Payload Output (Sent to Mobile/Web):");
    console.log(JSON.stringify(signedPayload, null, 2));
    
    console.log("\\nTesting Global Cache - running again...");
    const signedPayload2 = await signStorageUrlsInPayload(dbPayload);
    
    console.log("Cache Hit? (Should be true if URLs are identical)");
    console.log(signedPayload.image_url === signedPayload2.image_url);
    
    console.log("\\n=== TEST COMPLETE ===");
  } catch (err) {
    console.error("Test Error:", err);
  }
}

runTest();
