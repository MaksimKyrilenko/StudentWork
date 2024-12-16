// routes/gptService.js
const express = require('express');
const axios = require('axios');
const router = express.Router();

const API_KEY = 'AQVN3sUz5YGKbLpU1dwyrINyRxu3C1mBapkSAW1F';

async function getResponseFromYandexGPT(prompt) {
  try {
    const url = 'https://llm.api.cloud.yandex.net/foundationModels/v1/completion';
    const response = await axios.post(url, {
      modelUri: 'gpt://b1gq26mnmggfv27t7ffq/yandexgpt-lite',
      completionOptions: {
        stream: false,
        temperature: 0.7,
        maxTokens: 2000
      },
      messages: [
        { role: 'system', text: 'На основе предоставленных данных составь профессиональное резюме. Ответ должен быть в виде простого текста, без форматирования, списков и других визуальных элементов. Используйте только текст для описания каждого из разделов резюме: контактная информация, цель, образование, опыт работы, навыки, достижения, личные качества и дополнительная информация. Ответ должен быть легко воспринимаемым текстом без лишних символов и маркеров.' },
        { role: 'user', text: prompt }
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

router.post('/submit-chat', async (req, res) => {
  const { userMessage } = req.body;
  try {
    const responseText = await getResponseFromYandexGPT(userMessage);
    res.json({ responseText });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при отправке запроса' });
  }
});

module.exports = router;
