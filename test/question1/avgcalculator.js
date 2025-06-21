const express = require('express');
const axios = require('axios');

const app = express();
const PORT = 9876;

const WINDOW_SIZE = 10;
const ALLOWED_IDS = ['p', 'f', 'e', 'r'];
let windowStore = [];

require('dotenv').config();
const AUTH_TOKEN = process.env.AUTH_TOKEN;

const API_URLS = {
    p: 'http://20.244.56.144/evaluation-service/primes',
    f: 'http://20.244.56.144/evaluation-service/fibo',
    e: 'http://20.244.56.144/evaluation-service/even',
    r: 'http://20.244.56.144/evaluation-service/rand'
};

async function fetchNumbers(id) {
    const url = API_URLS[id];

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 500);

    try {
        const response = await axios.get(url, {
            headers: {
                Authorization: `Bearer ${AUTH_TOKEN}`
            },
            signal: controller.signal
        });

        clearTimeout(timeout);
        return response.data.numbers || [];
    } catch (error) {
        clearTimeout(timeout);
        console.error(`Failed to fetch ${id}:`, error.message);
        return [];
    }
}

app.get('/numbers/:numberid', async (req, res) => {
    const id = req.params.numberid;

    if (!ALLOWED_IDS.includes(id)) {
        return res.status(400).json({ error: "Invalid number ID" });
    }

    const prevState = [...windowStore];
    let fetchedNumbers = [];

    try {
        fetchedNumbers = await fetchNumbers(id);
    } catch {
        fetchedNumbers = [];
    }

    for (let num of fetchedNumbers) {
        if (!windowStore.includes(num)) {
            if (windowStore.length >= WINDOW_SIZE) {
                windowStore.shift();
            }
            windowStore.push(num);
        }
    }

    const avg = windowStore.length
        ? parseFloat((windowStore.reduce((a, b) => a + b, 0) / windowStore.length).toFixed(2))
        : 0;

    res.json({
        windowPrevState: prevState,
        windowCurrState: [...windowStore],
        numbers: fetchedNumbers,
        avg
    });
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
