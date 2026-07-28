const { connectMongoDB } = require('./config/mongodb');
const { Disease, Category } = require('./database/models');

async function test() {
  await connectMongoDB();
  const c = await Category.find().sort({ disease_count: -1 }).limit(1);
  console.log("Top category:", c[0].chapter, c[0].disease_count);
  
  const d = await Disease.find({ first_letter: "A" }).limit(1);
  console.log("First 'A' disease:", d[0].name);

  const stats = await Disease.aggregate([{ $group: { _id: "$severity", cnt: { $sum: 1 } } }]);
  console.log("Stats:", stats);

  process.exit(0);
}
test();
