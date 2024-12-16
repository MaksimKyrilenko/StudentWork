// routes/dbService.js
const express = require('express');
const axios = require('axios');
const db = require('../mySQLConnect.js');  // Подключение к базе данных
const router = express.Router();  // Создание роутера

// API ключ для Яндекс.GPT
const API_KEY = 'AQVN3sUz5YGKbLpU1dwyrINyRxu3C1mBapkSAW1F';

// Функция для работы с Яндекс.GPT
async function getResponseFromYandexGPT(prompt) {
  try {
    const modelUri = 'gpt://b1gq26mnmggfv27t7ffq/yandexgpt-lite';

    const response = await axios.post('https://llm.api.cloud.yandex.net/foundationModels/v1/completion', {
      modelUri: modelUri,
      completionOptions: {
        stream: false,
        temperature: 0.,
        maxTokens: 2000
      },
      messages: [
        { role: "system", text: "На основе предоставленных данных составь профессиональное резюме. Ответ должен быть в виде простого текста, без форматирования, списков и других визуальных элементов. Используйте только текст для описания каждого из разделов резюме: контактная информация, цель, образование, опыт работы, навыки, достижения, личные качества и дополнительная информация. Ответ должен быть легко воспринимаемым текстом без лишних символов и маркеров." },
        { role: "user", text: prompt }
      ]
    }, {
      headers: {
        Authorization: `Api-Key ${API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.data && response.data.result && response.data.result.alternatives && response.data.result.alternatives.length > 0) {
      const alternative = response.data.result.alternatives[0];
      return alternative.message.text.trim();
    } else {
      throw new Error('Ошибка в ответе Яндекс.GPT');
    }
  } catch (error) {
    console.error('Ошибка при запросе к Яндекс.GPT:', error.message);
    throw error;
  }
}

// Роут для получения данных о бизнесах
router.get('/businesses', async (req, res) => {
  try {
    const promiseDb = db.promise();
    const [rows] = await promiseDb.query('SELECT * FROM businesses');
    res.json({ businesses: rows });
  } catch (error) {
    console.error('Ошибка при получении данных о бизнесах:', error.message);
    res.status(500).json({ error: 'Не удалось получить данные о бизнесах' });
  }
});

module.exports = router;
