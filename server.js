const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');

const app = express();
// Railway сам назначит нужный порт через переменную окружения
const PORT = process.env.PORT || 3000; 

app.use(cors());
app.use(express.static(path.join(__dirname))); 

let cachedData = null;

// Прямой адрес API Фонбета (на Railway нет провайдерских блокировок)
const url = 'https://clientsapi.fon.bet/live/currentLine/ru';

async function fetchFonbetData() {
    try {
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/json'
            },
            timeout: 5000 
        });
        
        if (response.data && response.data.events) {
            cachedData = response.data;
            console.log(`[${new Date().toLocaleTimeString()}] УСПЕХ! Данные получены. Событий: ${cachedData.events.length}`);
        }
    } catch (error) {
        console.log(`[ОШИБКА] ${error.message}`);
    }
}

fetchFonbetData();
// Обновляем линию каждые 15 секунд
setInterval(fetchFonbetData, 15000);

// Эндпоинт, к которому будет обращаться твой дашборд
app.get('/api/live-odds', (req, res) => res.json(cachedData || {error: 'Идет загрузка линии...'}));

app.listen(PORT, () => {
    console.log(`Парсер Фонбета успешно запущен на порту ${PORT}`);
});
