const fs = require("fs");
const path = require("path");

// Load the resume template synchronously at cold start.
// This ensures we don't read the file system on every single request.
const RESUME_PATH = path.join(__dirname, "master_resume.tex");
const MASTER_RESUME = fs.readFileSync(RESUME_PATH, "utf8");

module.exports = MASTER_RESUME;
