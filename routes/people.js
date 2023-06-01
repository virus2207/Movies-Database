var express = require('express');
var router = express.Router();
const authorization = require('../Middleware/authorization');

router.get("/:id", authorization, function (req, res, next) {
    const id = req.params.id;
    req.db
        // .select(
        //     'names.primaryName',
        //     'names.birthYear',
        //     'names.deathYear',
        //     'principals.category',
        //     'principals.characters',
        //     'basics.primaryTitle'
        // )

        .from('names')
        .leftJoin('principals', 'names.nconst', 'principals.nconst')
        .leftJoin('basics', 'principals.tconst', 'basics.tconst')
        .where('names.nconst', '=', id)
        .then((results) => {
            if (results.length === 0) {
                return res.status(404).json({ error: true, message: "No record exists of a person with this ID" });
            } else {

                const people = {
                    name: results[0].primaryName,
                    birthYear: results[0].birthYear,
                    deathYear: results[0].deathYear,
                }


                const roles = results.map((actor) => ({
                    movieName: actor.primaryTitle,
                    movieId: actor.tconst,
                    category: actor.category,
                    characters: actor.characters !== "" ? [actor.characters.replace(/[\[\]"]/g, "")] : [],
                    imdbRating: parseFloat(actor.imdbRating),
                }));
                res.status(200).json({
                    people, roles

                })
            }
        })
        .catch(e => {
            res.json({ error: true, message: "not valid" });
        });
});

module.exports = router;
