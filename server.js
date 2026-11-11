// Версия 3.0 — Динамическое получение зеркал Фонбета + принудительный Google/Yandex DNS
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const dns = require('dns');
const path = require('path');

// Принудительно ставим публичные DNS (Яндекс + Google + Cloudflare), 
// чтобы обойти DNS-блокировки внутри сети Railway
try {
    dns.setServers([
        '77.88.8.8',   // Яндекс.DNS (отлично знает все российские домены)
        '77.88.8.1',
        '8.8.8.8',     // Google DNS
        '1.1.1.1'      // Cloudflare DNS
    ]);
} catch (e) {
    console.log('Не удалось сменить DNS:', e.message);
}

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.static(path.join(__dirname)));

let cachedData = null;
let lastError = 'Идет первичная загрузка...';

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
    'Origin': 'https://www.fon.bet',
    'Referer': 'https://www.fon.bet/'
};

// Базовые точки входа для поиска актуальных серверов линии + прямые серверы
const FALLBACK_HOSTS = [
    'https://line01w.bk6bba-resources.com',
    'https://line02w.bk6bba-resources.com',
    'https://line03w.bk6bba-resources.com',
    'https://line04w.bk6bba-resources.com',
    'https://line05w.bk6bba-resources.com',
    'https://line01.bk6bba-resources.com',
    'https://line02.bk6bba-resources.com',
    'https://line31.bk6bba-resources.com',
    'https://line32.bk6bba-resources.com',
    'https://line51.bk6bba-resources.com',
    'https://clientsapi01w.bk6bba-resources.com',
    'https://clientsapi02w.bk6bba-resources.com',
    'https://clientsapi03w.bk6bba-resources.com'
];

// Функция автоматического поиска живых серверов через конфиг Фонбета
async function getDynamicLineHosts() {
    const configUrls = [
        'https://www.fon.bet/urls.json',
        'https://fon.bet/urls.json',
        'https://www.fonbet.ru/urls.json',
        'https://fonbet.by/urls.json',
        'https://www.fonbet.kz/urls.json'
    ];

    for (const configUrl of configUrls) {
        try {
            const res = await axios.get(configUrl, { headers: HEADERS, timeout: 5000 });
            if (res.data && Array.isArray(res.data.line) && res.data.line.length > 0) {
                console.log(`[КОНФИГ] Получены актуальные зеркала с ${configUrl}`); return res.data.line.map(h => h.startsWith('http') ? h : `https:${h}`);
            }
        } catch (e) {
            // Пробуем следующий конфиг
        }
    }
    return FALLBACK_HOSTS;
}

async function fetchFonbetData() {
    const hosts = await getDynamicLineHosts();
    
    // Эндпоинты получения лайв-линии
    const paths = [
        '/live/currentLine/ru',
        '/events/list?lang=ru&version=0&scopeMarket=1600'
    ];

    for (const host of hosts) {
        for (const endpoint of paths) {
            const fullUrl = `${host.replace(/\/$/, '')}${endpoint}`; try { const response = await axios.get(fullUrl, { headers: HEADERS, timeout: 7000 });  if (response.data && Array.isArray(response.data.events)) { cachedData = response.data; lastError = null; console.log(`[УСПЕХ] Линия загружена с ${fullUrl}! Событий: ${cachedData.events.length}`); return; } } catch (error) { lastError = `${fullUrl} -> ${error.message}`; console.log(`[ПОПЫТКА] ${lastError}`);
            }
        }
    }
    console.log('[ОШИБКА] Не удалось пробиться ни к одному зеркалу. Повтор через 15 сек...');
}

fetchFonbetData();
setInterval(fetchFonbetData, 15000);

app.get('/', (req, res) => {
    res.send(`Fonbet Parser v3.0 Active. Events cached: ${cachedData ? cachedData.events.length : 0}. Last status: ${lastError || 'OK'}`);
});

app.get('/api/live-odds', (req, res) => {
    if (cachedData) {
        res.json(cachedData);
    } else {
        res.json({ error: `Загрузка линии...
