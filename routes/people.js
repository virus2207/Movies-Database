var express = require('express');
var router = express.Router();
const authorization = require('../Middleware/authorization');

router.get("/:id", function (req, res, next) {
    const id = req.params.id;
    req.db
        .select(
            'names.primaryName',
            'names.birthYear',
            'names.deathYear',
            'principals.category',
            'principals.characters',
            'basics.primaryTitle'
        )

        .from('names')
        .leftJoin('principals', 'names.nconst', 'principals.nconst')
        .leftJoin('basics', 'principals.tconst', 'basics.tconst')
        .where('names.nconst', '=', id)
        .then((results) => {
            if (results.length === 0) {
                return res.status(404).json({ error: true, message: "No record exists of a person with this ID" });
            } else {
                const people = results.map((actor) => ({

                    name: actor.primaryName,
                    birthYear: actor.birthYear,
                    deathYear: actor.deathYear,
                    category: actor.category,
                    characters: actor.characters,
                    primaryTitle: actor.primaryTitle



                }))
                res.status(200).json(people);
            }
        })
        .catch(e => {
            res.json({ error: true, message: e.message });
        });
});

module.exports = router;
