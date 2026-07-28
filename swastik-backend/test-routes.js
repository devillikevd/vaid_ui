const { connectMongoDB } = require('./config/mongodb');
const { Disease, Category, HealthSearchStat } = require('./database/models');

async function runTests() {
  await connectMongoDB();
  console.log("Connected.");
  
  try {
    // 1. Stats
    const stats = await Disease.aggregate([{ $group: { _id: "$severity", cnt: { $sum: 1 } } }]);
    console.log("Stats (severity length):", stats.length);
    
    // 2. Categories
    const categories = await Category.find().sort({ disease_count: -1 });
    console.log("Categories length:", categories.length);
    
    // 3. Alphabet
    const A = await Disease.find({ first_letter: "A" }).sort({ name: 1 }).skip(0).limit(5);
    console.log("Alphabet 'A' first item:", A[0].name);

    // 4. Search
    const q = "fever";
    const regex = new RegExp(q, "i");
    const search = await Disease.find({
      $or: [
        { name: { $regex: regex } },
        { code: { $regex: regex } },
        { keywords: { $regex: regex } },
        { chapter: { $regex: regex } },
      ]
    }).limit(1);
    console.log("Search 'fever' result:", search.length > 0 ? search[0].name : "No results");
    
    // 5. Single Disease
    const disease = await Disease.findOne({ code: A[0].code });
    console.log("Single Disease Code:", disease.code);
    
    // 6. Search Stat Logging
    await HealthSearchStat.create({ query: 'fever', result_count: 10 });
    const statCount = await HealthSearchStat.countDocuments();
    console.log("Search stats logged. Total stats:", statCount);

    console.log("✅ All queries passed!");
  } catch (err) {
    console.error("❌ Test Failed:", err);
    process.exit(1);
  }
  process.exit(0);
}

runTests();
