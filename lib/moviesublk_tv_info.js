const axios = require('axios');
const cheerio = require('cheerio');

// Simple in‑memory cache
const cache = {};

/**
 * Get detailed info for a specific TV series page
 * @param {string} url - full URL of the series page
 * @returns {Promise<Object>} { title, image, description, downloadLinks }
 */
async function getMoviesublkInfo(url) {
    if (cache[url]) {
        return cache[url];
    }

    const { data } = await axios.get(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        timeout: 15000
    });

    const $ = cheerio.load(data);

    // ----- 1. Title (EXACT same logic) -----
    const title = $('meta[property="og:title"]').attr('content') || 
                  $('h1.post-title').text().trim() || null;

    // ----- 2. Image (Full quality) -----
    let image = $('meta[property="og:image"]').attr('content');
    if (image && image.includes('s72')) {
        image = image.replace('s72', 's0');
    }
    if (!image) {
        image = $('.post-body img').first().attr('src') || null;
    }

    // ----- 3. Description (Sinhala text only) -----
    let description = '';
    $('.post-body p').each((i, el) => {
        const text = $(el).text().trim();
        if (/[\u0D80-\u0DFF]/.test(text)) {
            description += text + ' ';
        }
    });
    description = description.trim();
    if (!description) {
        description = $('.post-body').text().trim() || 
                      $('meta[property="og:description"]').attr('content') || null;
        if (description) {
            description = description.replace(/\s+/g, ' ').trim();
        }
    }

    // ----- 4. Extract episodeData and build downloadLinks -----
    let episodeData = null;
    const scriptTags = $('script').toArray();
    for (let el of scriptTags) {
        const html = $(el).html();
        if (html && html.includes('const episodeData = {')) {
            const match = html.match(/const episodeData = (\{[\s\S]*?\n\s*\};)/);
            if (match) {
                try {
                    episodeData = new Function(`return ${match[1]}`)();
                } catch (e) {
                    // fallback
                }
                break;
            }
        }
    }

    const downloadLinks = [];
    if (episodeData) {
        Object.keys(episodeData).forEach(ep => {
            const epObj = episodeData[ep];
            if (epObj.gd) downloadLinks.push({ episode: ep, type: 'G-Drive', url: epObj.gd });
            if (epObj.tg) downloadLinks.push({ episode: ep, type: 'Telegram', url: epObj.tg });
            if (epObj.sb) downloadLinks.push({ episode: ep, type: 'Subtitle', url: epObj.sb });
        });
    }

    // ----- 5. Final result (same structure as original, but no creator field) -----
    const result = {
        title,
        image,
        description,
        downloadLinks: downloadLinks.length > 0 ? downloadLinks : null
    };

    cache[url] = result;
    return result;
}

module.exports = { getMoviesublkInfo };
