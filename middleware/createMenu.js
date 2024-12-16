const db = require('./../mySQLConnect');

module.exports = function(req, res, next) {
  res.locals.nav = [];
  db.query('SELECT id FROM vacancies', function(err, result) { // Изменено на vacancies
      if (err) throw err;
      res.locals.nav = result; // Результаты запроса теперь будут из таблицы vacancies
      next();
  });
};
