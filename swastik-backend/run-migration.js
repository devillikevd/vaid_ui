const runMigration = require('./scripts/migrate-health-data');
runMigration().then(() => {
  console.log("Migration complete.");
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
