# Internship API

TASK-2 for the EdVyro Full Stack Development track: a REST API for internship records, built with Node.js, Express and SQLite.

## Run it

```bash
npm install
npm start
```

The server runs on http://localhost:3000. The first time it starts it creates `internships.db` and loads the 5 records from `seed.json`. To reset the data at any time run `npm run seed`.

## Files

- `server.js` - routes and error handling
- `db.js` - SQLite connection, table, seeding
- `validate.js` - input checks for create and update
- `seed.json` - the starting records (same fictional internships used in the frontend project)

## Data model

| Field | Type | Rule |
|-------|------|------|
| id | integer | set by the database |
| code | text | made from the id, e.g. INT-101 |
| title | text | 2 to 100 characters |
| domain | text | 2 to 60 characters |
| mode | text | Remote, Hybrid or On-site |
| location | text | 2 to 60 characters |
| skills | list of text | 1 to 10 items, stored as JSON text in SQLite |
| openings | integer | 0 to 1000 |

## Response format

Success: `{ "data": ... }`. Lists also return `page`, `limit`, `total` and `totalPages`.
Errors always look like this:

```json
{ "error": { "status": 400, "message": "Validation failed", "details": [ { "field": "mode", "message": "..." } ] } }
```

## Endpoints

| Method | Path | Success | Errors |
|--------|------|---------|--------|
| GET | /api/internships | 200 | 400 |
| GET | /api/internships/:id | 200 | 400, 404 |
| POST | /api/internships | 201 | 400 |
| PUT | /api/internships/:id | 200 (all fields needed) | 400, 404 |
| PATCH | /api/internships/:id | 200 (only changed fields) | 400, 404 |
| DELETE | /api/internships/:id | 204 | 400, 404 |

List query options: `page` (default 1), `limit` (default 10, max 50), `domain`, `mode`, `q` (searches title, location and skills).

## curl examples

```bash
# list, second page, 2 per page
curl "http://localhost:3000/api/internships?page=2&limit=2"

# filter
curl "http://localhost:3000/api/internships?mode=Remote&q=sql"

# one record
curl http://localhost:3000/api/internships/2

# create
curl -X POST http://localhost:3000/api/internships \
  -H "Content-Type: application/json" \
  -d '{"title":"QA Intern","domain":"Testing","mode":"Hybrid","location":"Chennai","skills":["Selenium","Jest"],"openings":2}'

# change one field
curl -X PATCH http://localhost:3000/api/internships/6 \
  -H "Content-Type: application/json" -d '{"openings":5}'

# replace the whole record
curl -X PUT http://localhost:3000/api/internships/6 \
  -H "Content-Type: application/json" \
  -d '{"title":"QA Intern","domain":"Testing","mode":"Remote","location":"Chennai","skills":["Jest"],"openings":1}'

# delete
curl -X DELETE http://localhost:3000/api/internships/6

# a validation error (400)
curl -X POST http://localhost:3000/api/internships \
  -H "Content-Type: application/json" -d '{"title":"x","mode":"Moon"}'
```

## Explanation

I kept the API in one `server.js` file with a small `validate.js` so it is easy to read. SQLite through `better-sqlite3` needs no separate database server. Queries use `?` placeholders so user input never goes straight into SQL. Every error goes through one `sendError` function, so the format and status codes stay the same: 400 for bad input, 404 for a missing record, 201 for created, 204 for deleted. I ran every endpoint with curl, including the error cases, before submitting.
