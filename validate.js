// validate.js - checks the body of POST / PUT / PATCH requests
const MODES = ["Remote", "Hybrid", "On-site"];

function isText(value, min, max) {
  return typeof value === "string" && value.trim().length >= min && value.trim().length <= max;
}

// partial = true means missing fields are allowed (used for PATCH)
function validateInternship(body, partial) {
  const errors = [];

  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return { errors: [{ field: "body", message: "Body must be a JSON object" }] };
  }

  const clean = {};

  function check(field, test, message, transform) {
    if (body[field] === undefined) {
      if (!partial) errors.push({ field: field, message: field + " is required" });
      return;
    }
    if (!test(body[field])) {
      errors.push({ field: field, message: message });
      return;
    }
    clean[field] = transform ? transform(body[field]) : body[field];
  }

  const trim = (v) => v.trim();

  check("title", (v) => isText(v, 2, 100), "title must be 2 to 100 characters", trim);
  check("domain", (v) => isText(v, 2, 60), "domain must be 2 to 60 characters", trim);
  check("mode", (v) => MODES.includes(v), "mode must be one of: " + MODES.join(", "));
  check("location", (v) => isText(v, 2, 60), "location must be 2 to 60 characters", trim);
  check(
    "skills",
    (v) => Array.isArray(v) && v.length >= 1 && v.length <= 10 && v.every((s) => isText(s, 1, 40)),
    "skills must be a list of 1 to 10 non-empty strings",
    (v) => v.map(trim)
  );
  check(
    "openings",
    (v) => Number.isInteger(v) && v >= 0 && v <= 1000,
    "openings must be a whole number from 0 to 1000"
  );

  if (partial && Object.keys(body).length === 0) {
    errors.push({ field: "body", message: "Send at least one field to update" });
  }

  return { errors: errors, clean: clean };
}

module.exports = { validateInternship, MODES };
