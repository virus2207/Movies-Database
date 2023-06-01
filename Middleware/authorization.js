const jwt = require("jsonwebtoken");

module.exports = function (req, res, next) {
    // console.log(req.headers)
    // if (!("authorization" in req.headers) || !req.headers.authorization.match(/^Bearer /)) {
    //     res.status(401).json({ error: true, message: "Authorization header ('Bearer token') not found" });
    //     return;
    // }

    const token = req.headers.authorization
    try {
        jwt.verify(token, process.env.JWT_SECRET);
    } catch (e) {
        if (e.name === "TokenExpiredError") {
            res.status(401).json({ error: true, message: "JWT token has expired" });

        } else {
            res.status(401).json({ error: true, message: "Invalid JWT Token" });
        };
        return
    }
    next();
}

// const authorization = function (req, res, next) {
//     const expires_in = 60 * 60 * 24;
//     const exp = Math.floor(Date.now() / 100) + expires_in;
//     const token = jwt.sign({ exp }, process.env.JWT_SECRET);
//     res.status(200).json({
//         token,
//         token_type: "Bearer",
//         expires_in
//     })
// }
// module.exports = authorization;