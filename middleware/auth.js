const jwt = require("jsonwebtoken");

// Simple JWT auth middleware. Expects header: Authorization: Bearer <token>
// Attaches decoded token to req.user on success, otherwise returns 401.
module.exports = function (req, res, next) {
  try {
    const auth = req.headers.authorization || req.headers.Authorization;
    if (!auth || !auth.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Authentication required" });
    }
    const token = auth.split(" ")[1];
    if (!token)
      return res.status(401).json({ error: "Authentication token missing" });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // decoded should contain id and email as set during login
    req.user = decoded;
    return next();
  } catch (err) {
    console.error(
      "Auth middleware error:",
      err && err.message ? err.message : err
    );
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};
