
//import the modules 
var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var moviesRouter = require('./routes/movies');
var usersRouter = require('./routes/user');
var peopleRouter = require('./routes/people')
require("dotenv").config();

var app = express();

const options = require('./knexfile.js');
const knex = require('knex')(options);
const cors = require('cors'); // cors enabled web server listening 
const exp = require('constants');
const swaggerUI = require('swagger-ui-express');
const swaggerDocument = require('./docs/swagger.json')//<----------

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

/*default morgan is set up to use the 'dev' format string
:method :url :status :response-time ms - :res[content-length]
Concise output colored by response status for development use. 
The :status token will be colored green for success codes, red for server error codes, 
yellow for client error codes, cyan for redirection codes, and uncolored for information codes.
*/
app.use(logger('dev'));

//used for prac 9 for body-prasing middleware 
//to parse bodies
app.use(express.json()); // looks for JSON data the request body (idenfitying by content-type header) and prase it
app.use(express.urlencoded({ extended: false })); // looks for URL-encoded data (identifying by content type) and parses it into req.body
//used for prac 9 
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use((req, res, next) => {
  req.db = knex
  next()
});

logger.token('res', (req, res) => {
  const headers = {};
  res.getHeaderNames().map(h => headers[h] = res.getHeader(h));
  return JSON.stringify(headers);
})

app.use('/user', usersRouter);
app.use('/movies', moviesRouter);
app.use('/people', peopleRouter);
app.use('/', swaggerUI.serve, swaggerUI.setup(swaggerDocument))


// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;