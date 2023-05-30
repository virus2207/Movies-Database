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

  //verify body
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
        throw new Error("User does not exist");
      };

      const user = users[0];
      return bcrypt.compare(password, user.hash);
    })
    .then(match => {
      if (!match) {
        throw new Error("Passwords does not match")
      }

      const expires_in = 60 * 60 * 24;
      const exp = Math.floor(Date.now() / 1000) + expires_in;
      const token = jwt.sign({ exp }, process.env.JWT_SECRET);
      res.status(200).json({
        token,
        token_type: "Bearer",
        expires_in
      });

    })
    .catch(e => {
      res.status(500).json({ error: true, message: "fial to login " + e.message })
    })
});

module.exports = router;
