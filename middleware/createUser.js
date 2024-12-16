var db = require('../mySQLConnect.js');

module.exports = function(req, res, next) {
    res.locals.user = null; // Инициализируем как null
    console.log('Проверяем сессию');
    console.log(req.session.user);

    if (!req.session.user) {
        return next();
    }

    db.query('SELECT * FROM user WHERE id = ?', [req.session.user], (err, users) => {
        if (err) {
            console.error('Ошибка при запросе в базу данных:', err);
            return next(err);
        }

        if (users.length > 0) {
            res.locals.user = users[0]; // Сохраняем пользователя в res.locals
        }
        next(); // Двигаемся дальше
    });
};
