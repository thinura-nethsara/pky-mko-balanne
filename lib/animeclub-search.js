// lib/animeclub-search.js
const axios = require('axios');
const cheerio = require('cheerio');

const BASE_URL = 'https://animeclub2.com';

/**
 * Search plugin for animeclub2.com
 * Author: VISPER INC BY DCM
 */
async function searchAnimeClub(query) {
  try {
    const searchUrl = `${BASE_URL}/?s=${encodeURIComponent(query)}`;
    const { data: html } = await axios.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
      }
    });

    const $ = cheerio.load(html);
    const results = [];

    // Main result containers – adapt to Dooplay theme
    const items = $('.item, .post, .movie-item, .tv-item, article, .search-item');

    if (items.length === 0) {
      // Fallback: find any link that points to /tvshows/ or /movies/ and take its parent
      $('a[href*="/tvshows/"], a[href*="/movies/"]').each((i, el) => {
        const href = $(el).attr('href');
        if (href && !href.match(/\/tvshows\/$/) && !href.match(/\/movies\/$/)) {
          const parent = $(el).closest('.item, .post, article, div');
          if (parent.length) items.push(parent[0]);
        }
      });
    }

    // Deduplicate items (using a Set of outerHTML hashes – simpler: use URL)
    const uniqueItems = [];
    const seenUrls = new Set();
    items.each((i, el) => {
      const $el = $(el);
      const url = $el.find('a[href*="/tvshows/"], a[href*="/movies/"]').first().attr('href');
      if (url && !seenUrls.has(url) && url !== 'https://animeclub2.com/tvshows/' && url !== '/tvshows/') {
        seenUrls.add(url);
        uniqueItems.push(el);
      }
    });

    for (const el of uniqueItems) {
      const $el = $(el);

      // ---- Extract Title ----
      let title = $el.find('h2 a, h3 a, .post-title a, .entry-title a, .title a').first().text().trim();
      if (!title) {
        title = $el.find('h2, h3, .post-title, .entry-title, .title').first().text().trim();
      }
      if (!title) {
        // Try the alt attribute of the image
        const imgAlt = $el.find('img').first().attr('alt');
        if (imgAlt) title = imgAlt.trim();
      }
      if (!title) {
        // Fallback: get from link text (but avoid generic words like "Movie")
        const link = $el.find('a[href*="/tvshows/"], a[href*="/movies/"]').first();
        const linkText = link.text().trim();
        if (linkText && !['Movie', 'TV Shows', 'Anime'].includes(linkText)) {
          title = linkText;
        } else {
          // Finally, derive from URL slug
          const url = link.attr('href');
          if (url) {
            const slug = url.split('/').filter(Boolean).pop();
            title = slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
          }
        }
      }

      // ---- Extract URL ----
      const url = $el.find('a[href*="/tvshows/"], a[href*="/movies/"]').first().attr('href');
      if (!url) continue;

      // ---- Extract Description ----
      let description = $el.find('.excerpt, .description, .text, .content, p').first().text().trim();
      if (!description || description.length < 10) {
        description = $el.find('[itemprop="description"]').text().trim() ||
                      $el.find('meta[name="description"]').attr('content') ||
                      'No description available';
      }
      // Remove "Add to Wishlist" prefix
      description = description.replace(/^Add\s+to\s+Wishlist\s*/i, '').trim();
      // Clean whitespace
      description = description.replace(/\s+/g, ' ').trim();

      // ---- Skip if title is generic or empty ----
      if (!title || ['Movie', 'TV Shows', 'Anime', 'Untitled'].includes(title)) continue;

      // Convert URL to absolute
      const absoluteUrl = url.startsWith('http') ? url : `${BASE_URL}${url}`;
      results.push({ title, description: description || 'No description available', url: absoluteUrl });
    }

    return {
      author: 'VISPER INC BY DCM',
      query: query,
      totalResults: results.length,
      results
    };

  } catch (error) {
    return {
      author: 'VISPER INC BY DCM',
      error: error.message,
      query: query,
      results: []
    };
  }
}

module.exports = { searchAnimeClub };
