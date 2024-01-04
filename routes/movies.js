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
    const currentPage = page ? parseInt(page) : 1;
    const from = (currentPage - 1) * perPage;
    const to = from + perPage;

    // Add title search condition if provided
    let query = req.db.from("basics").select("*")

    // Add title and year conditions if provided
    if (title && year) {
        if (!/^\d{4}$/.test(year)) {
            return res.status(400).json({ erro: true, message: "Invalid year format. Format must be yyyy." })
        }
        query = query.where('primaryTitle', 'like', `%${title}`).andWhere('year', "=", year);
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

    // Execute the query
    query.then(movies => {

        return req.db('basics').count('* as total').then(() => {
            const formattedMovies = movies.map(movie => ({
                title: movie.primaryTitle,
                year: movie.year,
                imdbID: movie.tconst,
                imdbRating: parseFloat(movie.imdbRating),
                rottenTomatoesRating: parseFloat(movie.rottentomatoesRating),
                metacriticRating: parseFloat(movie.metacriticRating),
                classification: movie.rated
            }))

            // use totalMovies for pagination purpose 
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
                    previousPage: currentPage > (Math.ceil(totalMovies / perPage)) ? currentPage - 1 : null,
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

    // check if imdbID is in 4 digits 
    const yearRegex = /^\d{4}$/;

    if (yearRegex.test(imdbID)) {
        return res.status(400).json({
            error: true,
            message: "Invalid query parameters: year.Query parameters are not permitted"
        });
    }

    //join basics and  pricipals table by tconst 

    req.db
        .from("basics")
        .leftJoin("principals", "basics.tconst", "principals.tconst")
        .leftJoin("ratings", "basics.tconst", "ratings.tconst") // Joining the ratings table
        .where("basics.tconst", "=", imdbID)
        .then((movies) => {
            //check if the database contatins the serach movies 
            if (movies.length === 0) {
                // Movie not found
                res.status(404).json({ error: true, message: "The requested movie could not be found" });
            }
            else {
                const ratings = [];
                const seenSources = new Set();

                movies.forEach((movie) => {
                    const { source, value } = movie;
                    if (!seenSources.has(source)) {
                        ratings.push({
                            source,
                            value: parseFloat(value)
                        });
                        seenSources.add(source);
                    }
                });

                res.json({
                    title: movies[0].originalTitle, // only chose the first data from the respond as there are duplicate data because of lefjoin 
                    year: movies[0].year,
                    runtime: movies[0].runtimeMinutes,
                    genres: movies[0].genres.split(","),
                    country: movies[0].country,
                    principals: movies.map((movie) => ({
                        id: movie.nconst,
                        category: movie.category,
                        name: movie.name,
                        characters: movie.characters !== "" ? [movie.characters.replace(/[\[\]"]/g, "")] : [] // strip off [] and ""
                    })),
                    rating: ratings,
                    boxoffice: movies[0].boxoffice,
                    poster: movies[0].poster,
                    plot: movies[0].plot

                });
            }
        })
        .catch((error) => {

            res.status(400).json({ error: true, message: "Invalid query parameters", details: err.message });
        });

})

module.exports = router;
