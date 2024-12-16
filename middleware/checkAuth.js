module.exports = function(req, res, next) {
    if (!req.session.user) {
        // Установка сообщения об ошибке в объекте res.locals
        res.locals.errorMessage = "Пожалуйста, войдите в систему";
        // Редирект на главную страницу
        return res.redirect("/");
    }
    next();
}