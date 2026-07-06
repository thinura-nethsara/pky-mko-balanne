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

    // ----- PRIMARY SELECTOR: h2.post-title a (the correct one) -----
    $('h2.post-title a').each((i, el) => {
        const title = $(el).text().trim();
        const link = $(el).attr('href');
        if (title && link && !resultsMap.has(link)) {
            resultsMap.set(link, { title, link });
        }
    });

    // ----- If PRIMARY found results, return them immediately (no fallback) -----
    if (resultsMap.size > 0) {
        return Array.from(resultsMap.values());
    }

    // ----- FALLBACK: Only if primary returned nothing -----
    $('a[href*="/"]').each((i, el) => {
        const text = $(el).text().trim();
        const href = $(el).attr('href');
        
        // Filter out non-result links
        if (text && href && href.startsWith('https://www.moviesublk.com/') && !href.includes('/p/')) {
            // Skip unwanted items
            const skipItems = ['Posts (Atom)', 'MOVIESUB LK', 'Home', 'About', 'Contact', 'Privacy', 'Sitemap'];
            if (skipItems.includes(text)) {
                return;
            }
            // Skip if title looks like navigation or meta
            if (text.length < 10 && !text.includes('S01') && !text.includes('S02') && !text.includes('Season')) {
                return;
            }
            if (!resultsMap.has(href)) {
                resultsMap.set(href, { title: text, link: href });
            }
        }
    });

    return Array.from(resultsMap.values());
}

module.exports = { searchMoviesublk };
