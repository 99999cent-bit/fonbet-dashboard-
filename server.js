const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000; 

app.use(cors());
app.use(express.static(path.join(__dirname))); 

let cachedData = null;

// Корневой маршрут, чтобы Railway видел, что приложение живое
app.get('/', (req, res) => {
    res.send('Fonbet Parser Backend is running successfully!');
});

// Стабильный адрес линии Фонбета
const url = 'https://line.fon.bet/live/currentLine/ru';

async function fetchFonbetData() {
    try {
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/json, text/plain, */*',
                'Origin': 'https://www.fon.bet',
                'Referer': 'https://www.fon.bet/',
                'X-Requested-With': 'XMLHttpRequest'
            },
            timeout: 8000 
        });
        
        if (response.data && response.data.events) {
            cachedData = response.data;
            console.log(`[${new Date().toLocaleTimeString()}] УСПЕХ! Данные получены. Событий: ${cachedData.events.length}`);
        } else {
            console.log(`[${new Date().toLocaleTimeString()}] Сервер ответил, но структура данных пуста.`);
        }
    } catch (error) {
        console.log(`[ОШИБКА] ${error.message}`);
    }
}

fetchFonbetData();
setInterval(fetchFonbetData, 15000);

// Эндпоинт для вашего дашборда
app.get('/api/live-odds', (req, res) => {
    res.json(cachedData || { error: 'Идет загрузка линии с сервера...' });
});

app.listen(PORT, () => {
    console.log(`Парсер Фонбета успешно запущен на порту ${PORT}`);
});
