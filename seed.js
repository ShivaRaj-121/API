// seed.js - wipes the table and loads seed.json again
// run with: npm run seed
const { db, seedIfEmpty } = require("./db");

db.exec("DELETE FROM internships");
db.exec("DELETE FROM sqlite_sequence WHERE name = 'internships'");
seedIfEmpty();

const n = db.prepare("SELECT COUNT(*) AS n FROM internships").get().n;
console.log("Seeded " + n + " internships");
