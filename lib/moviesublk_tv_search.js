const axios = require('axios');
const cheerio = require('cheerio');

/**
 * Search for TV series on MovieSubLK
 * @param {string} query - search term
 * @returns {Promise<Array>} array of { title, link }
 */
async function searchMoviesublk(query) {
    // Build the search URL dynamically
    const SEARCH_URL = `https://www.moviesublk.com/p/1.html?q=${encodeURIComponent(query)}&m=1`;

    const { data } = await axios.get(SEARCH_URL, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        timeout: 15000
    });

    const $ = cheerio.load(data);

    // --- Extract search results (EXACT same logic as original) ---
    const results = [];
    $('h2.post-title a').each((i, el) => {
        const title = $(el).text().trim();
        const link = $(el).attr('href');
        if (title && link) {
            results.push({ title, link });
        }
    });

    if (results.length === 0) {
        $('a[href*="/"]').each((i, el) => {
            const text = $(el).text().trim();
            const href = $(el).attr('href');
            if (text && href && href.startsWith('https://www.moviesublk.com/') && !href.includes('/p/')) {
                results.push({ title: text, link: href });
            }
        });
    }

    return results;
}

module.exports = { searchMoviesublk };
