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

  const bearerExpiresInSeconds = parseInt(req.body.bearerExpiresInSeconds);
  const refreshExpiresInSeconds = parseInt(req.body.refreshExpiresInSeconds);


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
        throw new Error("Incorrect email or password");
      };

      const user = users[0];
      return bcrypt.compare(password, user.hash);
    })
    .then(match => {
      if (!match) {
        throw new Error("Incorrect email or password")
      }

      var bearer_expires_in = 60 * 10; // 10 minutes in seconds 
      var refresh_expires_in = 60 * 60 * 24; //24 hours in seconds 

      if (bearerExpiresInSeconds && refreshExpiresInSeconds) {
        bearer_expires_in = bearerExpiresInSeconds;
        refresh_expires_in = refreshExpiresInSeconds;

      }
      else if (bearerExpiresInSeconds) {
        bearer_expires_in = bearerExpiresInSeconds;
      }

      else if (refreshExpiresInSeconds) {
        refresh_expires_in = refreshExpiresInSeconds;
      }

      const bearer_exp = Math.floor(Date.now() / 1000) + bearer_expires_in; //current time stamp in seconds + added time 
      const refresh_exp = Math.floor(Date.now() / 1000) + refresh_expires_in;

      const bearer_token = jwt.sign({ bearer_exp }, process.env.JWT_SECRET);
      const refresh_token = jwt.sign({ refresh_exp }, process.env.JWT_SECRET)
      res.status(200).json({

        bearerToken:
        {
          token: bearer_token,
          token_type: "Bearer",
          expires_in: bearer_expires_in,
        },
        refreshToken:
        {
          token: refresh_token,
          token_type: "Refresh",
          expires_in: refresh_expires_in
        }
      }

      );

    })
    .catch(e => {
      res.status(401).json({ error: true, message: e.message })
    })
});

module.exports = router;
