// Версия 2.0 - Обход блокировок и автоперебор зеркал Фонбета
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.static(path.join(__dirname)));

let cachedData = null;

// Список рабочих зеркал API Фонбета (без заблокированного clientsapi)
const API_URLS = [
    'https://line.fon.bet/live/currentLine/ru',
    'https://line11.bkfon-resources.com/live/currentLine/ru',
    'https://line12.bkfon-resources.com/live/currentLine/ru',
    'https://line01.bkfon-resources.com/live/currentLine/ru'
];

// Проверка статуса сервера для Railway
app.get('/', (req, res) => {
    res.send('Fonbet Parser v2.0 is running!');
});

async function fetchFonbetData() {
    for (const url of API_URLS) {
        try {
            const response = await axios.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                    'Accept': 'application/json, text/plain, */*',
                    'Origin': 'https://www.fon.bet',
                    'Referer': 'https://www.fon.bet/'
                },
                timeout: 8000
            });

            if (response.data && Array.isArray(response.data.events)) {
                cachedData = response.data;
                console.log(`[УСПЕХ] Линия загружена с ${url}. Событий: ${cachedData.events.length}`);
                return; // Выходим из цикла, как только нашли рабочее зеркало
            }
        } catch (error) {
            console.log(`[ПОПЫТКА] Не удалось загрузить с ${url}: ${error.message}`);
        }
    }
    console.log('[ОШИБКА] Все зеркала временно недоступны, пробуем снова через 15 секунд...');
}

// Запускаем сбор данных сразу и далее каждые 15 секунд
fetchFonbetData();
setInterval(fetchFonbetData, 15000);

// Эндпоинт для дашборда
app.get('/api/live-odds', (req, res) => {
    if (cachedData) {
        res.json(cachedData);
    } else {
        res.json({ error: 'Идет загрузка линии с сервера...' });
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Парсер Фонбета v2.0 успешно запущен на порту ${PORT}`);
});
