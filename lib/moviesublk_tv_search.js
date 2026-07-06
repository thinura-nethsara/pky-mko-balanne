const axios = require('axios');
const cheerio = require('cheerio');

/**
 * Search for TV series on MovieSubLK
 * @param {string} query - search term
 * @returns {Promise<Array>} array of unique { title, link }
 */
async function searchMoviesublk(query) {
    const SEARCH_URL = `https://www.moviesublk.com/p/1.html?q=${encodeURIComponent(query)}&m=1`;

    const { data } = await axios.get(SEARCH_URL, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        timeout: 15000
    });

    const $ = cheerio.load(data);

    // Use a Map to deduplicate by link
    const resultsMap = new Map();

    // 1. Primary selector: h2.post-title a
    $('h2.post-title a').each((i, el) => {
        const title = $(el).text().trim();
        const link = $(el).attr('href');
        if (title && link && !resultsMap.has(link)) {
            resultsMap.set(link, { title, link });
        }
    });

    // 2. Fallback selector (only if no results found yet)
    if (resultsMap.size === 0) {
        $('a[href*="/"]').each((i, el) => {
            const text = $(el).text().trim();
            const href = $(el).attr('href');
            // Filter out non-result links (navigation, footer, etc.)
            if (text && href && href.startsWith('https://www.moviesublk.com/') && !href.includes('/p/')) {
                if (!resultsMap.has(href)) {
                    resultsMap.set(href, { title: text, link: href });
                }
            }
        });
    }

    // Convert map values to array
    return Array.from(resultsMap.values());
}

module.exports = { searchMoviesublk };
