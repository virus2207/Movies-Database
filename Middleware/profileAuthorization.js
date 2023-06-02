const jwt = require("jsonwebtoken");
module.exports = function (req, res, next) {
    if (!("authorization" in req.headers)) {
        // No authorization header is found, but continue to the next middleware/route
        return next();
    }

    if (!("authorization" in req.headers)) {
        return res.status(401).json({ error: true, message: "Authorization header ('Bearer token') not found" });

    }
    if (!req.headers.authorization.match(/^Bearer /)) {
        return res.status(401).json({ error: true, message: "Authorization header is malformed" });
    }

    const token = req.headers.authorization.replace(/^Bearer /, "");
    try {
        jwt.verify(token, process.env.JWT_SECRET);
    } catch (e) {
        if (e.name === "TokenExpiredError") {
            return res.status(401).json({ error: true, message: "JWT token has expired" });

        } else {

            return res.status(401).json({ error: true, message: "Invalid JWT Token" });
        };
    }
    next();
}
