// server.js - Express API for internship records
const express = require("express");
const { db, insertInternship, seedIfEmpty } = require("./db");
const { validateInternship, MODES } = require("./validate");

seedIfEmpty();

const app = express();
app.use(express.json());

// allow the frontend (a different origin) to call the API
app.use((req, res, next) => {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

// turn a database row into the object we send back
function toJson(row) {
  return {
    id: row.id,
    code: row.code,
    title: row.title,
    domain: row.domain,
    mode: row.mode,
    location: row.location,
    skills: JSON.parse(row.skills),
    openings: row.openings,
  };
}

// every error has the same shape: { error: { status, message, details } }
function sendError(res, status, message, details) {
  res.status(status).json({ error: { status: status, message: message, details: details || [] } });
}

function getId(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    sendError(res, 400, "id must be a positive whole number");
    return null;
  }
  return id;
}

app.get("/", (req, res) => {
  res.json({ name: "Internship API", endpoints: "/api/internships" });
});

// GET /api/internships?page=1&limit=10&domain=&mode=&q=
app.get("/api/internships", (req, res) => {
  const page = req.query.page === undefined ? 1 : Number(req.query.page);
  const limit = req.query.limit === undefined ? 10 : Number(req.query.limit);

  const problems = [];
  if (!Number.isInteger(page) || page < 1) problems.push({ field: "page", message: "page must be 1 or more" });
  if (!Number.isInteger(limit) || limit < 1 || limit > 50)
    problems.push({ field: "limit", message: "limit must be between 1 and 50" });
  if (req.query.mode && !MODES.includes(req.query.mode))
    problems.push({ field: "mode", message: "mode must be one of: " + MODES.join(", ") });
  if (problems.length > 0) return sendError(res, 400, "Invalid query parameters", problems);

  const where = [];
  const values = [];
  if (req.query.domain) {
    where.push("domain = ?");
    values.push(req.query.domain);
  }
  if (req.query.mode) {
    where.push("mode = ?");
    values.push(req.query.mode);
  }
  if (req.query.q) {
    where.push("(title LIKE ? OR location LIKE ? OR skills LIKE ?)");
    const like = "%" + req.query.q + "%";
    values.push(like, like, like);
  }
  const whereSql = where.length ? "WHERE " + where.join(" AND ") : "";

  const total = db.prepare("SELECT COUNT(*) AS n FROM internships " + whereSql).get(...values).n;
  const rows = db
    .prepare("SELECT * FROM internships " + whereSql + " ORDER BY id LIMIT ? OFFSET ?")
    .all(...values, limit, (page - 1) * limit);

  res.json({
    data: rows.map(toJson),
    page: page,
    limit: limit,
    total: total,
    totalPages: Math.ceil(total / limit),
  });
});

// GET /api/internships/:id
app.get("/api/internships/:id", (req, res) => {
  const id = getId(req, res);
  if (id === null) return;
  const row = db.prepare("SELECT * FROM internships WHERE id = ?").get(id);
  if (!row) return sendError(res, 404, "Internship " + id + " not found");
  res.json({ data: toJson(row) });
});

// POST /api/internships
app.post("/api/internships", (req, res) => {
  const result = validateInternship(req.body, false);
  if (result.errors.length > 0) return sendError(res, 400, "Validation failed", result.errors);

  const id = insertInternship(result.clean);
  const row = db.prepare("SELECT * FROM internships WHERE id = ?").get(id);
  res.status(201).location("/api/internships/" + id).json({ data: toJson(row) });
});

// PUT replaces every field, PATCH changes only the ones you send
function update(partial) {
  return (req, res) => {
    const id = getId(req, res);
    if (id === null) return;

    const existing = db.prepare("SELECT * FROM internships WHERE id = ?").get(id);
    if (!existing) return sendError(res, 404, "Internship " + id + " not found");

    const result = validateInternship(req.body, partial);
    if (result.errors.length > 0) return sendError(res, 400, "Validation failed", result.errors);

    const merged = Object.assign(toJson(existing), result.clean);
    db.prepare(
      "UPDATE internships SET title = ?, domain = ?, mode = ?, location = ?, skills = ?, openings = ? WHERE id = ?"
    ).run(merged.title, merged.domain, merged.mode, merged.location, JSON.stringify(merged.skills), merged.openings, id);

    const row = db.prepare("SELECT * FROM internships WHERE id = ?").get(id);
    res.json({ data: toJson(row) });
  };
}
app.put("/api/internships/:id", update(false));
app.patch("/api/internships/:id", update(true));

// DELETE /api/internships/:id
app.delete("/api/internships/:id", (req, res) => {
  const id = getId(req, res);
  if (id === null) return;
  const info = db.prepare("DELETE FROM internships WHERE id = ?").run(id);
  if (info.changes === 0) return sendError(res, 404, "Internship " + id + " not found");
  res.sendStatus(204);
});

// anything else
app.use((req, res) => {
  sendError(res, 404, "Route " + req.method + " " + req.path + " not found");
});

// bad JSON and unexpected errors end up here
app.use((err, req, res, next) => {
  if (err.type === "entity.parse.failed") return sendError(res, 400, "Request body is not valid JSON");
  console.error(err);
  sendError(res, 500, "Something went wrong on the server");
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log("API running at http://localhost:" + port);
});
