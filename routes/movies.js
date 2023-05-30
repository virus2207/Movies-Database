var express = require('express');
var router = express.Router();



/* GET users listing. */
router.get('/', function (req, res, next) {
    res.send('respond with a resource');
});


router.get('/search', function (req, res, next) {
    //Extract query parameters
    const { title, year, page } = req.query;
    const perPage = 100;
    const currentPage = parseInt(page) || 1;
    const from = (currentPage - 1) * perPage;
    const to = from + perPage;



    // Add title search condition if provided


    let query = req.db.from("basics").select("*")

    // Add title and year conditions if provided
    if (title && year) {
        if (!/^\d{4}$/.test(year)) {
            return res.status(400).json({ erro: true, message: "Invalid year format. Format must be yyyy." })
        }
        query = query.where('primaryTitle', 'like', `%${title}%`).andWhere('year', "=", year);
    } else if (title) {
        query = query.where('primaryTitle', 'like', `%${title}%`);
    } else if (year) {
        if (!/^\d{4}$/.test(year)) {
            return res.status(400).json({ erro: true, message: "Invalid year format. Format must be yyyy." })
        }

        query = query.where('year', '=', year);
    }

    // Check if no title or year is provided
    if (!title && !year) {
        query = query.whereRaw('1 = 1');
    }
    // Add pagination
    //query = query.limit(perPage).offset(from);

    // Execute the query
    query.then(movies => {

        return req.db('basics').count('* as total').then(() => {
            const formattedMovies = movies.map(movie => ({
                title: movie.primaryTitle,
                year: movie.year,
                imdbID: movie.tconst,
                imdbRating: movie.imdbRating,
                rottenTomatoesRating: movie.rottentomatoesRating,
                metacriticRating: movie.metacriticRating,
                classification: movie.rated
            }))
            const totalMovies = movies.length;

            // Send the response
            res.status(200).json({
                data: formattedMovies,
                pagination: {
                    total: totalMovies,
                    lastPage: Math.ceil(totalMovies / perPage),
                    perPage: perPage,
                    currentPage: currentPage,
                    from: from,
                    to: to > totalMovies ? totalMovies : to,
                    previousPage: currentPage > 1 ? currentPage - 1 : null,
                    nextPage: currentPage < (Math.ceil(totalMovies / perPage)) ? currentPage + 1 : null
                }

            })

        })
    }).catch(e => {
        res.status(500).json({ erro: true, message: "Internal Server issues" })
    })
}
)

router.get("/data/:imdbID", function (req, res, next) {
    const imdbID = req.params.imdbID

    req.db
        .from("basics")
        .leftJoin("principals", "basics.tconst", "principals.tconst")
        .where("basics.tconst", "=", imdbID)
        .then((movies) => {
            if (movies.length === 0) {
                // Movie not found
                res.status(404).json({ error: true, message: "The requested movie could not be found" });
            }
            else {
                res.json({
                    title: movies[0].primaryTitle,
                    year: movies[0].year,
                    runtime: movies[0].runtimeMinutes,
                    genres: movies[0].genres.split(","),
                    country: movies[0].country,
                    principals: movies.map((movie) => ({
                        id: movie.nconst,
                        category: movie.category,
                        name: movie.name,
                        characters: movie.characters !== "" ? [movie.characters.replace(/[\[\]"]/g, "")] : []
                    })),
                    rating: [{
                        source: "Internet Movie Database",
                        value: parseFloat(movies[0].imdbRating)
                    }],
                    boxoffice: movies[0].boxoffice,
                    poster: movies[0].poster,
                    plot: movies[0].plot

                });
            }
        })
        .catch((error) => {
            console.error(error);
            res.status(400).json({ error: true, message: "Invalid query parameters", details: err.message });
        });

})






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
