// lib/animeclub-info-episode.js
const axios = require('axios');
const cheerio = require('cheerio');

const BASE_URL = 'https://animeclub2.com';

async function getShowInfo(showUrl) {
  try {
    const { data: html } = await axios.get(showUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Referer': 'https://www.google.com/'
      }
    });

    const $ = cheerio.load(html);

    // ---- Title ----
    const title =
      $('h1.entry-title').text().trim() ||
      $('h1.Title').text().trim() ||
      $('h1.post-title').text().trim() ||
      $('h1[itemprop="name"]').text().trim() ||
      $('h1').first().text().trim() ||
      $('title').text().trim().replace(/\s*[|–-]\s*AnimeClub2.*$/, '');

    // ---- Poster ----
    let poster =
      $('.poster img').attr('src') ||
      $('.poster img').attr('data-src') ||
      $('.featured-image img').attr('src') ||
      $('.featured-image img').attr('data-src') ||
      $('img.wp-post-image').attr('src') ||
      $('img.wp-post-image').attr('data-src') ||
      $('meta[property="og:image"]').attr('content') ||
      $('meta[itemprop="image"]').attr('content') ||
      $('link[rel="image_src"]').attr('href');
    if (poster && !poster.startsWith('http')) poster = `${BASE_URL}${poster}`;

    // ---- Description ----
    let description =
      $('.entry-content p').first().text().trim() ||
      $('.wp-content p').first().text().trim() ||
      $('.sinopsis').text().trim() ||
      $('.description').text().trim() ||
      $('[itemprop="description"]').text().trim() ||
      $('meta[name="description"]').attr('content') ||
      'No description available';
    description = description.replace(/^Add\s+to\s+Wishlist\s*/i, '').replace(/\s+/g, ' ').trim();

    // ---- Episodes ----
    let episodes = [];
    let postId =
      $('.listaeps, .episodios, .capitulos').attr('data-post') ||
      $('.listaeps, .episodios, .capitulos').attr('data-id');

    if (!postId) {
      $('script').each((i, el) => {
        const scriptText = $(el).html() || '';
        const match = scriptText.match(/var\s+post_id\s*=\s*["']?(\d+)["']?/);
        if (match) postId = match[1];
      });
    }

    if (postId) {
      for (let season = 1; season <= 15; season++) {
        try {
          const apiUrl = `${BASE_URL}/wp-json/dooplayer/v2/?post=${postId}&season=${season}`;
          const { data: apiData } = await axios.get(apiUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
            timeout: 5000
          });
          if (apiData?.episodes && apiData.episodes.length > 0) {
            episodes = apiData.episodes.map(ep => ({
              title: ep.title || ep.name || `Season ${season} Episode ${ep.number || '?'}`,
              url: ep.url || ep.link || '#'
            }));
            break;
          }
        } catch (_) { /* ignore */ }
      }
    }

    // If API failed, try static fallback
    if (episodes.length === 0) {
      // All links containing "/episodes/"
      $('a[href*="/episodes/"]').each((i, el) => {
        const href = $(el).attr('href');
        const text = $(el).text().trim();
        if (href && !href.match(/\/episodes\/$/)) {
          let epTitle = text;
          if (!epTitle) {
            const parts = href.split('/').filter(Boolean);
            const last = parts[parts.length - 1];
            if (last) epTitle = last.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
          }
          const match = href.match(/(\d+)x(\d+)/);
          if (match && !epTitle) {
            epTitle = `Season ${match[1]} Episode ${match[2]}`;
          }
          if (epTitle) {
            const absoluteUrl = href.startsWith('http') ? href : `${BASE_URL}${href}`;
            if (!episodes.some(e => e.url === absoluteUrl)) {
              episodes.push({ title: epTitle, url: absoluteUrl });
            }
          }
        }
      });

      // Traditional list containers
      if (episodes.length === 0) {
        $('.listaeps li a, .episodios li a, .capitulos li a, .episode-list a, .episodelist a').each((i, el) => {
          const href = $(el).attr('href');
          const text = $(el).text().trim();
          if (href && text) {
            const absoluteUrl = href.startsWith('http') ? href : `${BASE_URL}${href}`;
            if (!episodes.some(e => e.url === absoluteUrl)) {
              episodes.push({ title: text, url: absoluteUrl });
            }
          }
        });
      }
    }

    // Deduplicate
    const seen = new Set();
    episodes = episodes.filter(ep => {
      if (seen.has(ep.url)) return false;
      seen.add(ep.url);
      return true;
    });

    return { title, poster, description, episodes };
  } catch (error) {
    return { error: error.message };
  }
}

module.exports = { getShowInfo };
