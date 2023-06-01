var express = require('express');
var router = express.Router();
const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET;
const bcrypt = require("bcrypt");

/* GET users listing. */
router.get('/', function (req, res, next) {
  res.send('respond with a resource');
});


router.post('/register', function (req, res, next) {
  const email = req.body.email;
  const password = req.body.password;

  if (!email || !password) {
    res.status(400).json({
      error: true, message: "Request body incomplete - email and password needed"
    });
    return;
  }
  const queryUsers = req.db.from('users').select("*").where("email", "=", email);
  //check user email in the database
  queryUsers.then(users => {
    if (users.length > 0) {
      throw new Error("User alreay exists");
    }
    //insert new user into DB
    const saltRounds = 10;
    const hash = bcrypt.hashSync(password, saltRounds);
    return req.db.from("users").insert({ email, hash });
  })
    .then(() => {
      res.status(201).json({ success: true, message: "User created" })
    })
    .catch(e => {
      res.status(500).json({ success: false, message: e.message });
    });
});

router.post('/login', function (req, res, next) {

  const email = req.body.email;
  const password = req.body.password;
  const bearerExpiresIn = req.body.bearerExpiresInSeconds || 600; // Default: 10 minutes
  const refreshExpiresIn = req.body.refreshExpiresInSeconds || 86400; // Default: 24 hours

  // Verify body
  if (!email || !password) {
    res.status(400).json({
      error: true, message: "Request body incomplete - email and password needed"
    });
    return;
  }

  const queryUsers = req.db.from("users").select("*").where("email", "=", email);

  queryUsers
    .then(users => {
      if (users.length === 0) {
        throw new Error("incorrect email or password");
      }

      const user = users[0];
      return bcrypt.compare(password, user.hash);
    })
    .then(match => {
      if (!match) {
        throw new Error("incorrect email or password");
      }

      const bearerExp = Math.floor(Date.now() / 1000) + bearerExpiresIn;
      const bearerToken = jwt.sign({ exp: bearerExp }, process.env.JWT_SECRET);

      const refreshExp = Math.floor(Date.now() / 1000) + refreshExpiresIn;
      const refreshToken = jwt.sign({ exp: refreshExp }, process.env.JWT_SECRET);

      res.status(200).json({
        bearerToken: {
          token: bearerToken,
          token_type: "Bearer",
          expires_in: bearerExpiresIn
        },
        refreshToken: {
          token: refreshToken,
          token_type: "Refresh",
          expires_in: refreshExpiresIn
        }
      });

    })
    .catch(e => {
      res.status(401).json({ error: true, message: "Failed to login: " + e.message })
    });
});


module.exports = router;
