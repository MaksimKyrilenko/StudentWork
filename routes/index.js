var checkAuth = require("./../middleware/checkAuth.js")
const express = require('express');
const router = express.Router();
const db = require('../mySQLConnect.js');
const User = require('../routes/users');
const bcrypt = require('bcrypt');
const axios = require('axios');
const { getResponseFromYandexGPT } = require('../routes/gptService'); // Логика GPT
const { getBusinessesFromDB, saveBusinessToDB } = require('./dbService'); // Логика работы с БД

router.use((req, res, next) => {
  res.locals.user = req.session.user || null; // Сохраняем пользователя из сессии или null, если его нет
  next(); // Продолжаем выполнение запроса
});

router.get('/vacancies', (req, res, next) => {
  db.query('SELECT id, title, description, company, location, salary FROM vacancies', (err, vacancies) => {
    if (err) return next(err); // Обработка ошибок
    res.render('vacancies', { title: 'Список вакансий', vacancies: vacancies });
  });
});

router.get('/', async function(req, res, next) {
  try {
      // Получаем количество студентов
      const [studentCount] = await db.promise().query("SELECT COUNT(*) AS count FROM user WHERE role = 'student' AND userprofile_id IS NOT NULL");
      const [employerCount] = await db.promise().query("SELECT COUNT(*) AS count FROM user WHERE role = 'employer' AND employerprofile_id IS NOT NULL");
      
      // Получаем количество вакансий
      const [vacancyCount] = await db.promise().query("SELECT COUNT(*) AS count FROM vacancies");

      res.render('index', {
          title: 'Профиль пользователя',
          employerCount: employerCount[0].count,
          studentCount: studentCount[0].count,
          vacancyCount: vacancyCount[0].count, // добавляем количество вакансий в контекст рендеринга
          user: req.session.user // передаем user, который хранится в сессии
      });
  } catch (error) {
      console.error(error);
      res.status(500).send('Ошибка сервера');
  }
});




// Маршрут для страницы "Контакты"
router.get('/contact', function(req, res, next) {
  res.render('contact', { title: 'Контакты' });
});

// Маршрут для страницы "Политика конфидициальности"
router.get('/privacy', function(req, res, next) {
  res.render('privacy', { title: 'Политика конфидициальности' });
});

// Маршрут для страницы "Условия пользования"
router.get('/terms', function(req, res, next) {
  res.render('terms', { title: 'Условия использования' });
});

// Маршрут для страницы "Профиль работодателя"
router.get('/profile', function(req, res, next) {
  if (!req.session.user) {
    return res.redirect('/logreg'); // Если пользователь не авторизован, перенаправляем на страницу входа
  }

  // Получаем информацию о пользователе из базы данных
  db.query(`SELECT * FROM user WHERE id = ?`, [req.session.user], function(err, users) {
    if (err) return next(err);
    
    if (users.length > 0) {
      var user = users[0]; // Получаем данные пользователя
      if (user.role === 'employer') {
        // Получаем данные работодателя
        db.query(`SELECT * FROM employerprofile WHERE id = ?`, [user.employerprofile_id], function(err, employerProfiles) {
          if (err) return next(err);
          if (employerProfiles.length > 0) {
            var employerprofile = employerProfiles[0];
            // Убедитесь, что contactEmail присутствует в объекте employerprofile
            res.render('employerprofile', { title: 'Профиль работодателя', employerprofile: employerprofile });
          } else {
            res.render('error', { message: 'Профиль работодателя не найден.' });
          }
        });
      } else if (user.role === 'student') {
        // Получаем данные студента
        db.query(`SELECT * FROM userprofile WHERE id = ?`, [user.userprofile_id], function(err, userProfiles) {
          if (err) return next(err);
          if (userProfiles.length > 0) {
            var userprofile = userProfiles[0];
            res.render('userprofile', { title: 'Профиль студента', userprofile: userprofile });
          } else {
            res.render('error', { message: 'Профиль студента не найден.' });
          }
        });
      } else {
        res.render('error', { message: 'Неизвестная роль пользователя' });
      }
    } else {
      res.render('error', { message: 'Пользователь не найден' });
    }
  });
});


router.get('/about', function(req, res, next) {
  res.render('about', { title: 'О нас' });
});

// Маршрут для страницы "Создание объявления о работе"
router.get('/createjoblisting', function(req, res, next) {
  res.render('createjoblisting', { title: 'Создание объявления о работе' });
});

// Маршрут для страницы "Профиль работодателя" с передачей ID работодателя
router.get('/employerprofile/:id', function(req, res, next) {
  const employerprofile_id = req.params.id; // Получаем ID работодателя из URL
  
  // Если ID не передан или равен undefined
  if (!employerprofile_id) {
    return res.status(404).send('Профиль работодателя не найден.');
  }

  // Получаем информацию о работодателе из базы данных
  db.query(`SELECT * FROM employerprofile WHERE id = ?`, [employerprofile_id], function(err, employerProfiles) {
    if (err) return next(err);
    
    if (employerProfiles.length > 0) {
      var employerprofile = employerProfiles[0];
      res.render('employerprofile', { title: 'Профиль работодателя', employerprofile: employerprofile });
    } else {
      res.render('error', { message: 'Профиль работодателя не найден.' });
    }
  });
});



// Маршрут для страницы "Редактирование профиля работодателя"
router.get('/editprofileemployer', function(req, res, next) {
  if (!req.session.user) {
    return res.redirect('/logreg'); // Если пользователь не авторизован, перенаправляем на страницу входа
  }

  // Получаем информацию о пользователе из базы данных
  db.query(`SELECT * FROM user WHERE id = ?`, [req.session.user], function(err, users) {
    if (err) return next(err);
    
    if (users.length > 0) {
      var user = users[0]; // Получаем данные пользователя
      if (user.role === 'employer') {
        // Получаем данные работодателя
        db.query(`SELECT * FROM employerprofile WHERE id = ?`, [user.employerprofile_id], function(err, employerProfiles) {
          if (err) return next(err);
          if (employerProfiles.length > 0) {
            var employerprofile = employerProfiles[0];
            // Передаем переменную error как null
            res.render('editprofileemployer', { title: 'Редактировать профиль работодателя', employerprofile: employerprofile, error: null });
          } else {
            res.render('error', { message: 'Профиль работодателя не найден.' });
          }
        });
      } else {
        res.render('error', { message: 'Неизвестная роль пользователя' });
      }
    } else {
      res.render('error', { message: 'Пользователь не найден' });
    }
  });
});


router.post('/update-employer-profile', function(req, res, next) {
  const { 
    id, 
    company_name, 
    contactEmail, 
    company_description, 
    contactPhone, 
    location 
  } = req.body;

  // Проверяем, что все обязательные поля заполнены
  if (!id || !company_name || !contactEmail || !company_description || !contactPhone || !location) {
    return res.status(400).json({ error: 'Пожалуйста, заполните все обязательные поля!' });
  }

  // Обновляем данные в таблице employerprofile
  db.query(`UPDATE employerprofile SET company_name = ?, contactEmail = ?, company_description = ?, contactPhone = ?, location = ? WHERE id = ?`, 
    [company_name, contactEmail, company_description, contactPhone, location, id], function(err, result) {
      if (err) return next(err);

      // После успешного обновления, перенаправляем на страницу профиля
      res.redirect(`/employerprofile/${id}`);
  });
});



router.get('/userprofile/:id', function(req, res, next) {
  const userProfileId = req.params.id;
  
  // Получаем профиль студента из базы данных
  db.query(`SELECT * FROM userprofile WHERE id = ?`, [userProfileId], function(err, userProfiles) {
    if (err) return next(err);
    
    if (userProfiles.length > 0) {
      var userprofile = userProfiles[0];
      
      // Проверяем, есть ли объект user в сессии
      if (!req.session.user) {
        return res.redirect('/login');  // Если пользователь не авторизован, перенаправляем на страницу логина
      }

      // Передаем объект user вместе с профилем
      res.render('userprofile', {
        title: 'Профиль студента',
        userprofile: userprofile,
        user: req.session.user  // передаем user из сессии
      });
    } else {
      res.render('error', { message: 'Профиль студента не найден.' });
    }
  });
});



// Маршрут для страницы "Редактирование профиля"
router.get('/editprofileuser', function(req, res, next) {
  if (!req.session.user) {
    return res.redirect('/logreg'); // Если пользователь не авторизован, перенаправляем на страницу входа
  }

  // Получаем информацию о пользователе из базы данных
  db.query(`SELECT * FROM user WHERE id = ?`, [req.session.user], function(err, users) {
    if (err) return next(err);
    
    if (users.length > 0) {
      var user = users[0]; // Получаем данные пользователя
      if (user.role === 'student') {
        // Получаем данные студента
        db.query(`SELECT * FROM userprofile WHERE id = ?`, [user.userprofile_id], function(err, userProfiles) {
          if (err) return next(err);
          if (userProfiles.length > 0) {
            var userprofile = userProfiles[0];
            res.render('editprofileuser', { title: 'Редактировать профиль', userprofile: userprofile, error: null }); // Передаем error как null
          } else {
            res.render('error', { message: 'Профиль студента не найден.' });
          }
        });
      } else {
        res.render('error', { message: 'Неизвестная роль пользователя' });
      }
    } else {
      res.render('error', { message: 'Пользователь не найден' });
    }
  });
});

// Обработчик POST-запроса для обновления профиля студента
router.post('/update-user-profile', function(req, res, next) {
  const { id, name, email, university, skills, experience } = req.body;

  // Проверяем, что все необходимые поля заполнены
  if (!id || !name || !email || !university) {
    return res.status(400).json({ error: 'Пожалуйста, заполните все обязательные поля!' });
  }

  // Обновляем данные в таблице userprofile
  db.query(`UPDATE userprofile SET name = ?, email = ?, university = ?, skills = ?, experience = ? WHERE id = ?`, 
    [name, email, university, skills, experience, id], function(err, result) {
      if (err) return next(err);

      // После успешного обновления, перенаправляем на страницу профиля
      res.redirect(`/userprofile/${id}`);
  });
});

router.get('/jobdetail', function(req, res, next) {
  const jobId = req.query.id; // Получаем ID вакансии из параметров запроса

  // Логируем запрашиваемый ID вакансии
  console.log('Запрашиваемый ID вакансии:', jobId);

  // Проверка на наличие ID и его преобразование в число
  if (!jobId || isNaN(jobId)) {
      const error = new Error('Некорректный ID вакансии.');
      error.status = 400; // Устанавливаем статус ошибки 400 (Неверный запрос)
      return next(error);
  }

  const numericJobId = parseInt(jobId, 10); // Преобразуем в число

  // Запрос к базе данных для получения данных из таблиц vacancies и jobdetail
  db.query(`
    SELECT v.id, v.title, v.company, v.description, v.location, v.salary, v.user_id, v.employerprofile_id, v.jobdetail_id,
           j.requirements, j.responsibilities, j.employment_type
    FROM vacancies v
    LEFT JOIN jobdetail j ON v.jobdetail_id = j.id
    WHERE v.id = ?`, [numericJobId], function(err, results) {
      if (err) {
          console.error('Ошибка при выполнении запроса:', err); // Логируем ошибку
          return next(err); // Обработка ошибок
      }

      // Логируем результаты запроса
      console.log('Результаты запроса:', results);

      if (results.length > 0) {
          const vacancy = results[0]; // Получаем первую запись
          res.render('jobdetail', { title: 'Детали работы', vacancy }); // Передаем данные в шаблон
      } else {
          // Создаем объект ошибки для передачи в шаблон
          const error = new Error('Вакансия не найдена.');
          error.status = 404; // Устанавливаем статус ошибки
          return next(error); // Передаем ошибку в следующий обработчик
      }
  });
});


// Обработчик сброса пароля
router.post('/reset-password', (req, res) => {
  const { resetEmail, newPassword } = req.body;

  // Найти пользователя по email
  db.query('SELECT * FROM user WHERE email = ?', [resetEmail], (err, users) => {
      if (err) {
          console.error(err);
          return res.status(500).send('Ошибка при проверке пользователя.');
      }

      if (users.length === 0) {
          return res.status(404).send('Пользователь не найден с таким email.');
      }

      // Хешируем новый пароль
      bcrypt.hash(newPassword, 10, (err, hashedPassword) => {
          if (err) {
              console.error(err);
              return res.status(500).send('Ошибка при хешировании пароля.');
          }

          // Обновляем пароль пользователя
          db.query('UPDATE user SET password = ? WHERE email = ?', [hashedPassword, resetEmail], (err) => {
              if (err) {
                  console.error(err);
                  return res.status(500).send('Ошибка при обновлении пароля.');
              }

              // Отправляем успешный ответ
              res.redirect('/logreg');
          });
      });
  });
});

router.get('/logreg', async function(req, res, next) {
  res.render('logreg', { title: 'Вход', error: null });
});

router.post('/logreg', function(req, res, next) {
  var email = req.body.email;
  var password = req.body.password;

  // Проверяем, существует ли пользователь с введенным email
  db.query(`SELECT * FROM user WHERE email = ?`, [email], function(err, users) {
      if (err) return next(err);
      if (users.length > 0) {
          var user = users[0];
          // Проверяем пароль с хешем
          bcrypt.compare(password, user.password, (err, isMatch) => {
              if (err) return next(err);
              if (isMatch) {
                  // Обновляем сессию с ID пользователя
                  req.session.user = user.id;
                  console.log('ID пользователя в сессии:', req.session.user); // Проверка

                  // Перенаправление после успешного входа
                  if (email === 'admin@example.com') {
                      res.redirect('/admin');
                  } else {
                      res.redirect('/');
                  }
              } else {
                  // Неверный пароль
                  res.render('logreg', { title: 'Вход', error: "Неверный пароль!" });
              }
          });
      } else {
          // Пользователь не существует
          res.render('logreg', { title: 'Вход', error: "Вы не зарегистрированы, вход невозможен!" });
      }
  });
});

router.get('/registration', function(req, res, next) {
  res.render('registration', { title: 'Регистрация', error: null });
});

// Обработчик регистрации
router.post('/registration', function(req, res, next) {
  var password = req.body.password;
  var email = req.body.email;
  var role = req.body.role;

  // Проверяем, что все поля заполнены
  if (!password || !email || !role) {
      return res.render('registration', { title: 'Регистрация', error: 'Пожалуйста, заполните все поля!' });
  }

  // Проверяем, существует ли пользователь с введенным email
  db.query(`SELECT * FROM user WHERE email = ?`, [email], function(err, users) {
      if (err) {
          console.error(err);
          return next(err);
      }
      if (users.length > 0) {
          // Пользователь уже существует, отображаем сообщение об ошибке
          return res.render('registration', { title: 'Регистрация', error: 'Данный email уже зарегистрирован!' });
      } else {
          // Хешируем пароль перед сохранением
          bcrypt.hash(password, 10, (err, hashedPassword) => {
              if (err) {
                  console.error(err);
                  return next(err);
              }

              // Сначала добавляем пользователя в таблицу user
              db.query(`INSERT INTO user (password, email, role) VALUES (?, ?, ?)`, 
                  [hashedPassword, email, role], function(err, result) {
                  if (err) {
                      console.error(err);
                      return next(err);
                  }

                  // Получаем ID созданного пользователя
                  let userId = result.insertId;

                  // Проверяем роль и создаем записи в соответствующих таблицах
                  if (role === 'student') {
                      db.query(`INSERT INTO userprofile (id, email) VALUES (?, ?)`, 
                          [userId, email], function(err, profileResult) {
                          if (err) {
                              console.error(err);
                              return next(err);
                          }

                          db.query(`UPDATE user SET userprofile_id = ? WHERE id = ?`, 
                              [userId, userId], function(err, updateResult) {
                              if (err) {
                                  console.error(err);
                                  return next(err);
                              }
                              return res.redirect('/logreg');
                          });
                      });
                  } else if (role === 'employer') {
                      db.query(`INSERT INTO employerprofile (id, contactEmail) VALUES (?, ?)`, 
                          [userId, email], function(err, employerResult) {
                          if (err) {
                              console.error(err);
                              return next(err);
                          }

                          db.query(`UPDATE user SET employerprofile_id = ? WHERE id = ?`, 
                              [userId, userId], function(err, updateResult) {
                              if (err) {
                                  console.error(err);
                                  return next(err);
                              }
                              return res.redirect('/logreg');
                          });
                      });
                  } else {
                      return res.render('registration', { title: 'Регистрация', error: 'Некорректная роль!' });
                  }
              });
          });
      }
  });
});

router.post('/logout', function(req, res, next) {
  console.log('Выход из аккаунта');
  req.session.destroy(function(err) {
      if (err) {
          console.error('Ошибка при уничтожении сессии:', err);
          return next(err);
      }
      res.clearCookie('sid');
      console.log('Cookie очищено');
      res.redirect('/');
  });
});


// Обработчик для отображения формы добавления вакансии
router.get('/addvacancies', (req, res) => {
  const employerId = req.session.userId; // Предполагается, что id работодателя хранится в сессии
  res.render('addvacancies', { employerprofile: { id: employerId } });
});

router.post('/vacancies', (req, res) => {
  const { title, description, location, salary, company } = req.body;

  // Проверка данных
  if (!title || !description || !location || !salary || !company) {
    return res.status(400).send('Все поля обязательны для заполнения.');
  }

  // Получаем user_id из сессии
  const user_id = req.session.user; // Предполагается, что user_id хранится в сессии

  // Проверка на наличие user_id
  if (!user_id) {
    return res.status(400).send('Необходимо предоставить корректный user_id.');
  }

  // Логирование значений для отладки
  console.log('Values for insertion:', {
    title,
    description,
    company,
    location,
    salary,
    user_id
  });

  // SQL-запрос для добавления вакансии с employerprofile_id
  const vacancyQuery = `
    INSERT INTO vacancies (title, description, company, location, salary, user_id, employerprofile_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  // Получаем employerprofile_id через user_id
  const getEmployerProfileQuery = `
    SELECT employerprofile_id FROM user WHERE id = ?
  `;
  
  db.query(getEmployerProfileQuery, [user_id], (err, results) => {
    if (err) {
      console.error('Ошибка при получении профиля работодателя:', err);
      return res.status(500).send('Ошибка при получении профиля работодателя.');
    }

    if (results.length === 0) {
      return res.status(400).send('Профиль работодателя не найден.');
    }

    const employerprofile_id = results[0].employerprofile_id;
    const vacancyValues = [title, description, company, location, salary, user_id, employerprofile_id];

    db.query(vacancyQuery, vacancyValues, (err, vacancyResults) => {
      if (err) {
        console.error('Ошибка при добавлении вакансии:', err);
        return res.status(500).send('Ошибка при добавлении вакансии: ' + err.message);
      }

      // Получаем id только что добавленной вакансии
      const vacancyId = vacancyResults.insertId;

      // SQL-запрос для создания новой записи в таблице jobdetail
      const jobDetailQuery = `
        INSERT INTO jobdetail (id) VALUES (?)
      `;

      const jobDetailValues = [vacancyId];

      db.query(jobDetailQuery, jobDetailValues, (err) => {
        if (err) {
          console.error('Ошибка при добавлении записи в jobdetail:', err);
          return res.status(500).send('Ошибка при добавлении записи в jobdetail: ' + err.message);
        }

        // SQL-запрос для обновления вакансии с установкой jobdetail_id
        const updateQuery = `
          UPDATE vacancies SET jobdetail_id = ? WHERE id = ?
        `;

        db.query(updateQuery, [vacancyId, vacancyId], (err) => {
          if (err) {
            console.error('Ошибка при обновлении вакансии:', err);
            return res.status(500).send('Ошибка при обновлении вакансии: ' + err.message);
          }

          // Успешное добавление и обновление вакансии
          res.redirect('/vacancies'); // Перенаправление на страницу со списком вакансий
        });
      });
    });
  });
});

// Обработчик для страницы "Мои вакансии"
router.get('/myvacancies', (req, res) => {
  const userId = req.session.user; // Предполагается, что user id хранится в сессии

  // Проверка на наличие userId
  if (!userId) {
      return res.status(401).send('Вы не авторизованы.');
  }

  // SQL-запрос для получения вакансий конкретного работодателя
  const query = 'SELECT * FROM vacancies WHERE user_id = ?';
  
  db.query(query, [userId], (err, vacancies) => {
      if (err) {
          console.error('Ошибка при получении вакансий:', err);
          return res.status(500).send('Ошибка при получении вакансий: ' + err.message);
      }

      // Отправка данных на страницу myvacancies
      res.render('myvacancies', { vacancies });
  });
});

router.get('/editvacancies', (req, res) => {
  const vacancyId = req.query.id;
  const userId = req.session.user;

  console.log(`Vacancy ID: ${vacancyId}, User ID: ${userId}`); // Для отладки

  // Запрос к базе данных для получения вакансии и jobdetail
  db.query(`
    SELECT vacancies.*, jobdetail.requirements, jobdetail.responsibilities, jobdetail.employment_type
    FROM vacancies
    LEFT JOIN jobdetail ON vacancies.id = jobdetail.id
    WHERE vacancies.id = ? AND vacancies.user_id = ?
  `, [vacancyId, userId], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Ошибка при получении вакансии');
    }

    if (results.length > 0) {
      const vacancy = results[0];
      const jobdetail = {
        requirements: vacancy.requirements || '',
        responsibilities: vacancy.responsibilities || '',
        employment_type: vacancy.employment_type || ''
      };

      // Передаем данные вакансии и jobdetail в шаблон
      res.render('editvacancies', { vacancy, jobdetail });
    } else {
      res.status(404).send('Вакансия не найдена или у вас нет прав на её редактирование');
    }
  });
});


router.post('/editvacancies', (req, res) => {
  const vacancyId = req.body.vacancyId; // Получаем id вакансии из тела запроса
  const userId = req.session.user; // Получаем id пользователя из сессии
  const { title, description, company, location, salary, requirements, responsibilities, employment_type } = req.body;

  // Логируем полученные данные для отладки
  console.log(`Received vacancyId: ${vacancyId}, userId: ${userId}`);
  console.log(`Company: ${company}, Title: ${title}, Description: ${description}`); // Логируем только что переданные данные

  // Запрос для обновления данных вакансии в таблице vacancies
  db.query('UPDATE vacancies SET title = ?, description = ?, company = ?, location = ?, salary = ? WHERE id = ? AND user_id = ?', 
  [title, description, company, location, salary, vacancyId, userId], (err, result) => {
    if (err) {
      console.error('Error updating vacancy:', err);
      return res.status(500).send('Ошибка при обновлении вакансии');
    }

    if (result.affectedRows > 0) {
      // Проверяем, существует ли запись в таблице jobdetail для этой вакансии
      db.query('SELECT * FROM jobdetail WHERE id = ?', [vacancyId], (err, jobDetailResults) => {
        if (err) {
          console.error('Error fetching jobdetail:', err);
          return res.status(500).send('Ошибка при получении данных из jobdetail');
        }

        if (jobDetailResults.length > 0) {
          // Если запись существует, обновляем её
          db.query('UPDATE jobdetail SET requirements = ?, responsibilities = ?, employment_type = ? WHERE id = ?',
            [requirements, responsibilities, employment_type, vacancyId], (err) => {
              if (err) {
                console.error('Error updating jobdetail:', err);
                return res.status(500).send('Ошибка при обновлении данных в jobdetail');
              }

              res.redirect('/myvacancies');
            });
        } else {
          // Если записи нет, создаём новую в таблице jobdetail
          db.query('INSERT INTO jobdetail (id, requirements, responsibilities, employment_type) VALUES (?, ?, ?, ?)',
            [vacancyId, requirements, responsibilities, employment_type], (err) => {
              if (err) {
                console.error('Error inserting into jobdetail:', err);
                return res.status(500).send('Ошибка при добавлении данных в jobdetail');
              }

              res.redirect('/myvacancies');
            });
        }
      });
    } else {
      res.status(404).send('Вакансия не найдена или у вас нет прав на её редактирование');
    }
  });
});


// Обработчик удаления вакансии
router.post('/deletevacancy', (req, res) => {
  const vacancyId = req.body.vacancyId; // Получаем id вакансии из тела запроса
  const userId = req.session.user; // Получаем id пользователя из сессии

  // SQL-запрос для удаления вакансии, связанной с пользователем
  const sql = 'DELETE FROM vacancies WHERE id = ? AND user_id = ?'; // Убедитесь, что у вас есть поле user_id в таблице

  db.query(sql, [vacancyId, userId], (err, results) => {
      if (err) {
          console.error('Ошибка при удалении вакансии:', err);
          return res.status(500).send('Ошибка при удалении вакансии');
      }

      // Проверяем, была ли удалена хотя бы одна запись
      if (results.affectedRows === 0) {
          return res.status(404).send('Вакансия не найдена или у вас нет прав на её удаление');
      }

      res.redirect('/myvacancies'); // Перенаправление на страницу со списком вакансий
  });
});

router.get('/addresume', (req, res) => {
  const vacancyId = req.query.vacancyId; // Получаем из строки запроса
  console.log('vacancyId:', vacancyId); // Отладочное сообщение
  res.render('addresume', { vacancyId }); // Передаем vacancyId в шаблон
});


router.post('/submitresume', (req, res) => {
  const { objective, education, experience, skills, vacancies_id } = req.body;
  const userprofile_id = req.session.user; // Получаем user_id из сессии

  // Проверка данных
  if (!objective || !education || !experience || !skills || !vacancies_id) {
      return res.status(400).send('Все поля обязательны для заполнения.');
  }

  // SQL-запрос для добавления резюме
  const resumeQuery = `
      INSERT INTO resume (objective, education, experience, skills, userprofile_id, vacancies_id)
      VALUES (?, ?, ?, ?, ?, ?)
  `;

  const resumeValues = [objective, education, experience, skills, userprofile_id, vacancies_id];

  db.query(resumeQuery, resumeValues, (err) => {
      if (err) {
          console.error('Ошибка при добавлении резюме:', err);
          return res.status(500).send('Ошибка при добавлении резюме: ' + err.message);
      }

      // Успешное добавление резюме
      res.redirect('/vacancies'); // Перенаправление на страницу со списком вакансий
  });
});

router.get('/resources', function(req, res, next) {
  res.render('resources', { title: 'Ресурсы' });
});

router.get('/career-advice', function(req, res, next) {
  res.render('career-advice', { title: 'Советы по трудоустройству' });
});

router.get('/vacancy-types', function(req, res, next) {
  res.render('vacancy-types', { title: 'Типы вакансий' });
});

router.get('/faq', function(req, res, next) {
  res.render('faq', { title: 'faq' });
});

router.get('/submittedresumes', (req, res) => {
  const employerId = req.session.user; // Получаем id работодателя из сессии

  console.log(`Employer ID: ${employerId}`); // Для отладки

  // Шаг 1: Получаем все вакансии этого работодателя
  db.query('SELECT id FROM vacancies WHERE employerprofile_id = ?', [employerId], (err, vacancyResults) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Ошибка при получении вакансий');
    }

    if (vacancyResults.length === 0) {
      return res.render('submittedresumes', { submittedResumes: [] });
    }

    // Шаг 2: Получаем id вакансий этого работодателя
    const vacancyIds = vacancyResults.map(vacancy => vacancy.id);

    // Шаг 3: Получаем резюме, поданные на эти вакансии с данными вакансий
    db.query(`
      SELECT resume.*, vacancies.title AS vacancy_title
      FROM resume
      JOIN vacancies ON resume.vacancies_id = vacancies.id
      WHERE vacancies.id IN (?)
    `, [vacancyIds], (err, resumeResults) => {
      if (err) {
        console.error(err);
        return res.status(500).send('Ошибка при получении резюме');
      }

      if (resumeResults.length === 0) {
        return res.render('submittedresumes', { submittedResumes: [] });
      }

      // Шаг 4: Передаем резюме и данные о вакансиях на страницу
      res.render('submittedresumes', { submittedResumes: resumeResults });
    });
  });
});

router.get('/submittedresumesuser', function(req, res, next) {
  // Проверка на авторизацию пользователя
  if (!req.session.user) {
      return res.redirect('/logreg'); // Перенаправление на страницу входа, если пользователь не авторизован
  }

  // Получаем ID профиля текущего студента
  const userProfileId = req.session.user;

  // Запрос в базу данных для получения всех резюме пользователя
  db.query('SELECT * FROM resume WHERE userprofile_id = ?', [userProfileId], function(err, resumes) {
      if (err) {
          return next(err); // Обработка ошибок базы данных
      }

      // Рендерим страницу с поданными резюме, передаем список резюме
      res.render('submittedresumesuser', { 
          title: 'Мои поданные резюме', 
          resumes: resumes 
      });
  });
});

// Ваш API ключ для Яндекс.GPT
const API_KEY = 'AQVN3sUz5YGKbLpU1dwyrINyRxu3C1mBapkSAW1F';

// Страница чата (GET-запрос)
router.get('/chat', function(req, res, next) {
  res.render('chat', { title: 'Чат', responseText: '', errorText: '' });  // Передаем пустые строки для responseText и errorText
});

router.post('/submit-chat', async function(req, res, next) {
  const userMessage = req.body.userMessage;

  if (!userMessage || userMessage.trim() === '') {
    return res.render('chat', { title: 'Чат', responseText: '', errorText: 'Пожалуйста, введите сообщение!' });
  }

  try {
    const modelUri = 'gpt://b1gq26mnmggfv27t7ffq/yandexgpt-lite';
    const response = await axios.post(
      'https://llm.api.cloud.yandex.net/foundationModels/v1/completion',
      {
        modelUri: modelUri,
        completionOptions: {
          stream: false,
          temperature: 0.6,
          maxTokens: 2000
        },
        messages: [
          {
            role: 'system',
            text: 'Составь резюме, предоставив информацию по разделам: цель, образование, опыт работы, навыки. Ответ должен быть простым текстом, без использования списков, символов форматирования или других визуальных элементов. Каждое из этих полей должно быть представлено как отдельный абзац.'
          },
          {
            role: 'user',
            text: userMessage
          }
        ]
      },
      {
        headers: {
          Authorization: `Api-Key ${API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    let responseText = '';
    if (response.data && response.data.result && response.data.result.alternatives && response.data.result.alternatives.length > 0) {
      const alternative = response.data.result.alternatives[0];
      responseText = alternative.message.text.trim();

      responseText = responseText.replace(/\*\*(.*?)\*\*/g, '$1');
      responseText = responseText.replace(/\*([^*]+)\*/g, '$1');

      const sections = {
        goal: '',
        education: '',
        experience: '',
        skills: ''
      };

      sections.goal = (responseText.match(/Цель:[\s\S]*?(?=(Образование|$))/) || [])[0] || '';
      sections.education = (responseText.match(/Образование:[\s\S]*?(?=(Опыт работы|$))/) || [])[0] || '';
      sections.experience = (responseText.match(/Опыт работы:[\s\S]*?(?=(Навыки|$))/) || [])[0] || '';
      sections.skills = (responseText.match(/Навыки[\s\S]*?$/) || [])[0] || '';

      res.render('chat', {
        title: 'Чат',
        responseText: sections,
        errorText: ''
      });
    } else {
      responseText = 'Ошибка при получении ответа от Яндекс.GPT.';
      res.render('chat', { title: 'Чат', responseText: '', errorText: responseText });
    }

  } catch (error) {
    console.error('Ошибка при запросе к Яндекс.GPT:', error.message);
    res.render('chat', { title: 'Чат', responseText: '', errorText: 'Произошла ошибка при отправке запроса.' });
  }
});




module.exports = router;