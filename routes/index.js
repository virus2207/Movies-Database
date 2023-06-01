var express = require('express');
var router = express.Router();
const authorization = require('../Middleware/authorization');



/* GET home page. */
router.get('/', function (req, res, next) {
  res.render('index', { title: 'Express' });
});

router.get("/api/basics", function (req, res, next) {

  req.db
    .from("basics")
    .select("*")
    .then((rows) => {
      res.json({ Error: false, Message: "Success", City: rows })
    })
    .catch((err) => {
      console.log(err);
      res.json({ Error: true, Message: " Error in MySQL Query" })
    });

})

router.get("/api/city/:CountryCode", function (req, res, next) {
  req.db
    .from("city")
    .select("*")
    .where("CountryCode", "=", req.params.CountryCode)
    .then((rows) => {
      res.json({ Error: false, Message: "Success", City: rows });
    }).catch((err) => {
      console.log(err);
      res.json({ Error: true, Message: "Error in MySQL query" });
    });
});


router.get("/people/:id"), function (req, res, next) {
  const id = req.params.id;
  req.db
  slelect("*").from("names").where("nconst", "=", id)
    .then((acotor) => {
      if (acotor.length === 0) {
        return res.status(404).json({ error: true, message: "No record exists of a person with this ID" })
      }
      else {
        res.status(200).json({
          name: acotor.primaryName

        })
      }


    })
    .catch(e => {
      json({ error: true, message: e.message })
    })



}


router.post("/api/update", authorization, function (req, res, next) {
  if (!req.body.name || !req.body.countrycode || !req.body.pop) {
    res.status(400).json({ message: "Error updating population!!" });
    console.log("Error on request body", JSON.stringify(req.body))
  } else {
    const filter = {
      "Name": req.body.name,
      "CountryCode": req.body.countrycode
    }
    const pop = {
      "Population": req.body.pop
    }
    req.db('city').where(filter).update(pop)
      .then(_ => {
        res.status(201).json({ message: `Successfully update ${req.body.name} population to ${req.body.pop}` });
        console.log(`Successful population update`, JSON.stringify(filter));
      }).catch(error => {
        res.status(500).json({ message: "Database erro-not updated !" + error })
      });
  }
});
module.exports = router;
