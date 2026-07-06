const axios = require('axios');
const cheerio = require('cheerio');

/**
 * Search for TV series on MovieSubLK using Blogger's search
 * @param {string} query - search term
 * @returns {Promise<Array>} array of unique { title, link }
 */
async function searchMoviesublk(query) {
    // ✅ FIXED: Use the actual Blogger search URL
    const SEARCH_URL = `https://www.moviesublk.com/search?q=${encodeURIComponent(query)}`;

    const { data } = await axios.get(SEARCH_URL, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        timeout: 15000
    });

    const $ = cheerio.load(data);

    // ----- EXACT SAME SCRAPING LOGIC (unchanged) -----
    const resultsMap = new Map();

    // Primary selector: h2.post-title a
    $('h2.post-title a').each((i, el) => {
        const title = $(el).text().trim();
        const link = $(el).attr('href');
        if (title && link && !resultsMap.has(link)) {
            resultsMap.set(link, { title, link });
        }
    });

    // Fallback (if primary fails)
    if (resultsMap.size === 0) {
        $('a[href*="/"]').each((i, el) => {
            const text = $(el).text().trim();
            const href = $(el).attr('href');
            if (text && href && href.startsWith('https://www.moviesublk.com/') && !href.includes('/p/')) {
                const skipItems = ['Posts (Atom)', 'MOVIESUB LK', 'Home', 'About', 'Contact', 'Privacy', 'Sitemap'];
                if (skipItems.includes(text)) return;
                if (text.length < 10 && !text.includes('S01') && !text.includes('S02') && !text.includes('Season')) return;
                if (!resultsMap.has(href)) {
                    resultsMap.set(href, { title: text, link: href });
                }
            }
        });
    }

    return Array.from(resultsMap.values());
}

module.exports = { searchMoviesublk };
