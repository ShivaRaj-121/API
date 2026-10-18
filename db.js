// db.js - opens the SQLite file and makes sure the table exists
const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

const dbFile = process.env.DB_FILE || path.join(__dirname, "internships.db");
const db = new Database(dbFile);

db.exec(`
  CREATE TABLE IF NOT EXISTS internships (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    code      TEXT UNIQUE,
    title     TEXT NOT NULL,
    domain    TEXT NOT NULL,
    mode      TEXT NOT NULL CHECK (mode IN ('Remote','Hybrid','On-site')),
    location  TEXT NOT NULL,
    skills    TEXT NOT NULL,
    openings  INTEGER NOT NULL CHECK (openings >= 0)
  )
`);

// insert one row and give it a code like INT-101
function insertInternship(item) {
  const info = db
    .prepare(
      "INSERT INTO internships (title, domain, mode, location, skills, openings) VALUES (?, ?, ?, ?, ?, ?)"
    )
    .run(item.title, item.domain, item.mode, item.location, JSON.stringify(item.skills), item.openings);
  const code = "INT-" + (100 + Number(info.lastInsertRowid));
  db.prepare("UPDATE internships SET code = ? WHERE id = ?").run(code, info.lastInsertRowid);
  return info.lastInsertRowid;
}

// fill the table from seed.json (only if it is empty)
function seedIfEmpty() {
  const count = db.prepare("SELECT COUNT(*) AS n FROM internships").get().n;
  if (count > 0) return;
  const items = JSON.parse(fs.readFileSync(path.join(__dirname, "seed.json"), "utf8"));
  for (const item of items) insertInternship(item);
}

module.exports = { db, insertInternship, seedIfEmpty };
