const jwt = require("jsonwebtoken");


module.exports = async function (req, res, next) {
    if (!("authorization" in req.headers)) {
        return res
            .status(401)
            .json({ error: true, message: "Authorization header ('Bearer token') not found" });
    }

    if (!req.headers.authorization.match(/^Bearer /)) {
        return res.status(401).json({ error: true, message: "Authorization header is malformed" });
    }

    const token = req.headers.authorization.replace(/^Bearer /, "");
    try {
        const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
        const email = decodedToken.email; // Assuming the user ID is stored in the token payload

        // Retrieve the user from the database using knex
        const user = await req.db("users").where({ email: email }).first();
        if (!user) {
            return res.status(401).json({ error: true, message: "User not found" });
        }

        // Compare the bearer token from the database with the token provided in the header
        if (user.bearerToken !== token) {
            return res.status(401).json({ error: true, message: "Invalid bearer token" });
        }

        // Token is valid and matches the user's bearer token
        next();
    } catch (e) {
        if (e.name === "TokenExpiredError") {
            return res.status(401).json({ error: true, message: "JWT token has expired" });
        } else {
            return res.status(401).json({ error: true, message: "Invalid JWT Token" });
        }
    }
};
