// app.js
var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var bodyParser = require('body-parser');
var session = require("express-session");
var mysql2 = require('mysql2/promise');
var MySQLStore = require('express-mysql-session')(session);

// Подключаем маршруты
var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var dbServiceRouter = require('./routes/dbService');
var gptServiceRouter = require('./routes/gptService');

var app = express();

var options = {
  host: '127.0.0.1',
  port: '3306',
  user: 'root',
  password: 'qwertzxc228',
  database: 'studentwork1'
};
var connection = mysql2.createPool(options);
var sessionStore = new MySQLStore(options, connection);

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.engine('ejs', require('ejs-locals'));

app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }
}));

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(function (req, res, next) {
  req.session.counter = req.session.counter + 1 || 1;
  next();
});

// Подключаем маршруты
app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/dbService', dbServiceRouter);
app.use('/gptService', gptServiceRouter);

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  res.status(err.status || 500);
  res.render('error', { title: "Error 500" });
});

module.exports = app;
