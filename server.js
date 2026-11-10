// update force
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000; 

app.use(cors());
app.use(express.static(path.join(__dirname))); 

let cachedData = { events: [] };

// Главная страница для Railway Health Check
app.get('/', (req, res) => {
    res.send('Fonbet Parser is running!');
});

// Прямой запрос к линии через надежный домен
const url = 'https://line.fon.bet/live/currentLine/ru';

async function fetchFonbetData() {
    try {
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/json, text/plain, */*',
                'Origin': 'https://www.fon.bet',
                'Referer': 'https://www.fon.bet/'
            },
            timeout: 10000 
        });
        
        if (response.data && response.data.events) {
            cachedData = response.data;
            console.log(`[УСПЕХ] Загружено событий: ${cachedData.events.length}`);
        }
    } catch (error) {
        console.log(`[ОШИБКА парсера] ${error.message}`);
    }
}

// Запускаем сразу и обновляем каждые 15 секунд
fetchFonbetData();
setInterval(fetchFonbetData, 15000);

app.get('/api/live-odds', (req, res) => {
    res.json(cachedData);
});

app.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
});
