const jwt = require("jsonwebtoken");

// JWT_SECRET must be configured via environment variable
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.warn(
    "[WARN] JWT_SECRET not configured. Using temporary fallback. Set JWT_SECRET in .env for production.",
  );
}

const JWT_SECRET_FALLBACK =
  JWT_SECRET || "supersecretkey_change_me_in_production";

function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET_FALLBACK, { expiresIn: "1h" });
}

function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET_FALLBACK);
}

module.exports = {
  signToken,
  verifyToken,
  JWT_SECRET: JWT_SECRET_FALLBACK,
};
