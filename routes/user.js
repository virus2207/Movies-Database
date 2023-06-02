var express = require('express');
var router = express.Router();
const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET;
const bcrypt = require("bcrypt");
const authorization = require('../Middleware/Authorization');

const getProfileAuthorization = require('../Middleware/profileAuthorization');


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
      const bearerToken = jwt.sign({ email, exp: bearerExp }, process.env.JWT_SECRET);

      const refreshExp = Math.floor(Date.now() / 1000) + refreshExpiresIn;
      const refreshToken = jwt.sign({ email, exp: refreshExp }, process.env.JWT_SECRET);

      const saltRounds = 10;
      const bearer_hash = bcrypt.hashSync(bearerToken, saltRounds);
      const refresh_hash = bcrypt.hashSync(refreshToken, saltRounds);


      return req.db.from("users")
        .where('email', "=", email)
        .update({
          "bearerToken": bearer_hash,
          "refreshToken": refresh_hash
        })
        .then(() => {
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
    })
    .catch(e => {
      res.status(401).json({ error: true, message: "Failed to login: " + e.message })
    });
});

router.post('/refresh', function (req, res, next) {

  const refreshToken = req.body.refreshToken;

  if (!refreshToken) {
    return res.status(400).json({
      error: true,
      message: "Request body incomplete, refresh token required"
    })
  }

  try {

    const verify_token = jwt.verify(refreshToken, process.env.JWT_SECRET);
    email = verify_token.email;

    const bearer_expires_in = 600; // 10 mins 
    const bearerExp = Math.floor(Date.now() / 1000) + bearer_expires_in;
    const bearerToken = jwt.sign({ email, exp: bearerExp }, process.env.JWT_SECRET);

    const refresh_expires_in = 86400;
    const refreshExp = Math.floor(Date.now() / 1000) + refresh_expires_in;
    const refreshtoken = jwt.sign({ email, exp: refreshExp }, process.env.JWT_SECRET);

    const saltRounds = 10;
    const bearer_hash = bcrypt.hashSync(bearerToken, saltRounds);
    const refresh_hash = bcrypt.hashSync(refreshToken, saltRounds);

    req.db.from("users")
      .where('email', "=", email)
      .update({
        "bearerToken": bearer_hash,
        "refreshToken": refresh_hash
      })

    res.status(200).json({
      bearerToken: {
        token: bearerToken,
        token_type: "Bearer",
        expires_in: bearer_expires_in
      },
      refreshToken: {
        token: refreshtoken,
        token_type: "Refresh",
        expires_in: refresh_expires_in
      }

    })

  }
  catch (err) {
    res.status(401).json({ error: true, message: err.message + "JWT token has expired" })

  }


})

router.get('/:email/profile', getProfileAuthorization, function (req, res, next) {
  const email = req.params.email;
  const queryUsers = req.db.from("users").select("*").where("email", "=", email);
  queryUsers
    .then(users => {
      if (users.length === 0) {
        return res.status(404).json({ error: true, message: "user not found" })
      }
      const user = users[0];
      const userProfile = {
        email: user.email,
        firstName: user.firstname,
        lastName: user.lastname
      }

      if ("authorization" in req.headers) {

        const bearerToken = req.headers.authorization.replace(/^Bearer /, "");
        let authorized = false;

        try {
          const token_decoded = jwt.verify(bearerToken, process.env.JWT_SECRET);
          if (token_decoded.email === email) {
            authorized = true;
          }
        }
        catch (e) {

          throw new Error(e.message)
        }
        if (authorized) {
          const dob = user.dob.toISOString().split('T')[0]; // Extract year, month, and date (YYYY-MM-DD)
          userProfile.dob = dob
          userProfile.address = user.address
        }
      }
      res.status(200).json(userProfile)
    })
    .catch(e => {
      res.status(401).json({ error: true + " " + e.message });

    })

})


router.put('/:email/profile', authorization, function (req, res, next) {
  const email = req.params.email;
  const profile = req.body;

  //check if the req body is complete

  if (!profile.firstName || !profile.lastName || !profile.dob || !profile.address) {
    return res.status(400).json({ error: true, message: "Request body incomplete: firstName, lastName, dob and address are required" })
  }

  //check if the fields are string

  if (
    typeof profile.firstName !== 'string' ||
    typeof profile.lastName !== 'string' ||
    typeof profile.dob !== 'string' ||
    typeof profile.address !== 'string'
  ) {
    return res.status(400).json({ error: true, message: "Request body invalid: firstName, lastName, dob and address must be strings only" });
  }

  // Check if the dob field is a valid date in the format YYYY-MM-DD
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(profile.dob)) {
    return res.status(400).json({ error: true, message: "Invalid input: dob must be a real date in format YYYY-MM-DD" });
  }

  // Check if the authenticated user is modifying their own profile
  const token = req.headers.authorization.replace(/^Bearer /, "");
  const verify_token = jwt.verify(token, process.env.JWT_SECRET);
  token_email = verify_token.email;

  if (token_email !== email) {
    return res.status(403).json({ error: true, message: "Forbidden" })
  }
  const updateUser = req.db.from("users").where("email", "=", email).update({
    firstname: profile.firstName,
    lastname: profile.lastName,
    dob: profile.dob,
    address: profile.address
  });
  updateUser
    .then(count => {
      if (count === 0) {
        return res.status(400).json({ error: true, message: "User not found" })
      }

      const updatedProfile = {
        email: email,
        firstname: profile.firstName,
        lastname: profile.lastName,
        dob: profile.dob,
        address: profile.address

      };
      res.status(200).json(updatedProfile)
    })
    .catch(e => {
      res.status(500).json({ error: true, message: "Failed to update user profile" + e });
    })

})

module.exports = router;
