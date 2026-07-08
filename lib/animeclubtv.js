// lib/animeclub.js
const axios = require('axios');
const cheerio = require('cheerio');

const BASE_URL = 'https://animeclub2.com';

function cleanDescription(text) {
  if (!text) return '';
  return text
    .replace(/^Add\s+to\s+Wishlist\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// ------------------------------
// SEARCH
// ------------------------------
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
    const items = $('.item, .post, .movie-item, .tv-item, article, .search-item');

    if (items.length === 0) {
      $('a[href*="/tvshows/"], a[href*="/movies/"]').each((i, el) => {
        const href = $(el).attr('href');
        if (href && !href.match(/\/tvshows\/$/) && !href.match(/\/movies\/$/)) {
          const parent = $(el).closest('.item, .post, article, div');
          if (parent.length) items.push(parent[0]);
        }
      });
    }

    const seenUrls = new Set();
    items.each((i, el) => {
      const $el = $(el);
      const link = $el.find('a[href*="/tvshows/"], a[href*="/movies/"]').first();
      const url = link.attr('href');
      if (!url || seenUrls.has(url) || url === `${BASE_URL}/tvshows/` || url === '/tvshows/') return;
      seenUrls.add(url);

      let title = $el.find('h2 a, h3 a, .post-title a, .entry-title a, .title a').first().text().trim();
      if (!title) title = $el.find('h2, h3, .post-title, .entry-title, .title').first().text().trim();
      if (!title) title = $el.find('img').first().attr('alt') || '';
      if (!title) {
        const linkText = link.text().trim();
        if (linkText && !['Movie', 'TV Shows', 'Anime'].includes(linkText)) title = linkText;
        else {
          const slug = url.split('/').filter(Boolean).pop();
          title = slug ? slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : '';
        }
      }
      if (!title || ['Movie', 'TV Shows', 'Anime', 'Untitled'].includes(title)) return;

      let description = $el.find('.excerpt, .description, .text, .content, p').first().text().trim();
      if (!description || description.length < 10) {
        description = $el.find('[itemprop="description"]').text().trim() ||
                      $el.find('meta[name="description"]').attr('content') ||
                      'No description available';
      }
      description = cleanDescription(description);

      const absoluteUrl = url.startsWith('http') ? url : `${BASE_URL}${url}`;
      results.push({ title, description, url: absoluteUrl });
    });

    return {
      author: 'VISPER INC BY DCM',
      query,
      totalResults: results.length,
      results
    };
  } catch (error) {
    return { author: 'VISPER INC BY DCM', error: error.message, query, results: [] };
  }
}

// ------------------------------
// GET SHOW INFO (EPISODES)
// ------------------------------
async function getShowInfo(showUrl) {
  try {
    const { data: html } = await axios.get(showUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
      }
    });

    const $ = cheerio.load(html);

    // --- Metadata ---
    const title =
      $('h1.entry-title').text().trim() ||
      $('h1.Title').text().trim() ||
      $('h1.post-title').text().trim() ||
      $('h1[itemprop="name"]').text().trim() ||
      $('h1').first().text().trim() ||
      $('title').text().trim().replace(/\s*[|–-]\s*AnimeClub2.*$/, '');

    const poster =
      $('.poster img').attr('src') ||
      $('.poster img').attr('data-src') ||
      $('.featured-image img').attr('src') ||
      $('.featured-image img').attr('data-src') ||
      $('img.wp-post-image').attr('src') ||
      $('img.wp-post-image').attr('data-src') ||
      $('meta[property="og:image"]').attr('content') ||
      $('meta[itemprop="image"]').attr('content') ||
      $('link[rel="image_src"]').attr('href');

    let description =
      $('.entry-content p').first().text().trim() ||
      $('.wp-content p').first().text().trim() ||
      $('.sinopsis').text().trim() ||
      $('.description').text().trim() ||
      $('[itemprop="description"]').text().trim() ||
      $('meta[name="description"]').attr('content') ||
      'No description available';
    description = cleanDescription(description);

    // --- Episodes extraction ---
    let episodes = [];

    // 1) Try API with post_id
    let postId = $('.listaeps, .episodios, .capitulos').attr('data-post') ||
                 $('.listaeps, .episodios, .capitulos').attr('data-id');
    if (!postId) {
      $('script').each((i, el) => {
        const scriptText = $(el).html() || '';
        const match = scriptText.match(/var\s+post_id\s*=\s*["']?(\d+)["']?/);
        if (match) postId = match[1];
      });
    }

    if (postId) {
      for (let season = 1; season <= 20; season++) {
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

    // 2) Static HTML fallback
    if (episodes.length === 0) {
      // 2a) All links containing "/episodes/"
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

      // 2b) Traditional episode list containers
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

      // 2c) Any link with "episode" in href
      if (episodes.length === 0) {
        $('a[href*="episode"]').each((i, el) => {
          const href = $(el).attr('href');
          const text = $(el).text().trim();
          if (href && !href.match(/\/episode\/?$/)) {
            let epTitle = text || href.split('/').filter(Boolean).pop() || 'Episode';
            const absoluteUrl = href.startsWith('http') ? href : `${BASE_URL}${href}`;
            if (!episodes.some(e => e.url === absoluteUrl)) {
              episodes.push({ title: epTitle, url: absoluteUrl });
            }
          }
        });
      }
    }

    // 3) Try JSON-LD if present
    if (episodes.length === 0) {
      $('script[type="application/ld+json"]').each((i, el) => {
        try {
          const json = JSON.parse($(el).html());
          const findEpisodes = (obj) => {
            if (!obj) return;
            if (Array.isArray(obj)) {
              for (let item of obj) {
                if (item.episode) {
                  const ep = item.episode;
                  if (ep.url && ep.name) {
                    if (!episodes.some(e => e.url === ep.url)) {
                      episodes.push({ title: ep.name, url: ep.url });
                    }
                  }
                }
                findEpisodes(item);
              }
            } else if (typeof obj === 'object') {
              for (let key in obj) {
                findEpisodes(obj[key]);
              }
            }
          };
          findEpisodes(json);
        } catch (_) {}
      });
    }

    // Deduplicate
    const seen = new Set();
    episodes = episodes.filter(ep => {
      if (seen.has(ep.url)) return false;
      seen.add(ep.url);
      return true;
    });

    // Convert poster URL to absolute
    const posterAbs = poster ? (poster.startsWith('http') ? poster : `${BASE_URL}${poster}`) : '';

    return { title, poster: posterAbs, description, episodes };
  } catch (error) {
    return { error: error.message };
  }
}

// ------------------------------
// GET EPISODE DOWNLOADS
// ------------------------------
async function getEpisodeDownloads(episodeUrl) {
  try {
    const { data: html } = await axios.get(episodeUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
      }
    });

    const $ = cheerio.load(html);

    const title =
      $('h1.entry-title').text().trim() ||
      $('h1.Title').text().trim() ||
      $('h1.post-title').text().trim() ||
      $('h1').first().text().trim() ||
      $('title').text().trim().replace(/\s*[|–-]\s*AnimeClub2.*$/, '');

    const poster =
      $('.poster img').attr('src') ||
      $('.poster img').attr('data-src') ||
      $('meta[property="og:image"]').attr('content') ||
      $('meta[itemprop="image"]').attr('content') ||
      $('link[rel="image_src"]').attr('href');

    let description =
      $('.entry-content p').first().text().trim() ||
      $('.sinopsis').text().trim() ||
      $('.description').text().trim() ||
      $('[itemprop="description"]').text().trim() ||
      $('meta[name="description"]').attr('content') ||
      'No description available';
    description = cleanDescription(description);

    let season = null, episode = null;
    const urlMatch = episodeUrl.match(/[-\/](\d+)x(\d+)/);
    if (urlMatch) {
      season = urlMatch[1];
      episode = urlMatch[2];
    } else {
      const titleMatch = title.match(/(\d+)x(\d+)/);
      if (titleMatch) {
        season = titleMatch[1];
        episode = titleMatch[2];
      }
    }

    const intermediateLinks = [];
    $('a[href*="/links/"]').each((i, el) => {
      const href = $(el).attr('href');
      const linkText = $(el).text().trim().toLowerCase();
      if (linkText.includes('telegram') || linkText.includes('drive') || href.includes('telegram') || href.includes('drive')) {
        const qualityMatch = linkText.match(/(\d{3,4}p)/i);
        const quality = qualityMatch ? qualityMatch[1] : 'Unknown';
        const platform = linkText.includes('telegram') ? 'Telegram' :
                         linkText.includes('drive') ? 'Drive' : 'Other';
        const intermediateUrl = href.startsWith('http') ? href : `${BASE_URL}${href}`;
        intermediateLinks.push({ platform, quality, intermediateUrl });
      }
    });

    if (intermediateLinks.length === 0) {
      $('a[href*="/links/"]').each((i, el) => {
        const href = $(el).attr('href');
        const linkText = $(el).text().trim();
        if (linkText) {
          let platform = 'Download';
          if (linkText.toLowerCase().includes('telegram')) platform = 'Telegram';
          else if (linkText.toLowerCase().includes('drive')) platform = 'Drive';
          else if (linkText.toLowerCase().includes('google')) platform = 'Drive';
          const qualityMatch = linkText.match(/(\d{3,4}p)/i);
          const quality = qualityMatch ? qualityMatch[1] : 'Unknown';
          const intermediateUrl = href.startsWith('http') ? href : `${BASE_URL}${href}`;
          intermediateLinks.push({ platform, quality, intermediateUrl });
        }
      });
    }

    const downloadLinks = [];
    for (const item of intermediateLinks) {
      try {
        const { data: linkHtml } = await axios.get(item.intermediateUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
        });
        const $$ = cheerio.load(linkHtml);
        let finalUrl = $$('#link').attr('href');
        if (!finalUrl) {
          finalUrl = $$('a[href*=".mp4"], a[href*=".mkv"], a[href*=".avi"]').first().attr('href');
        }
        if (finalUrl) {
          downloadLinks.push({
            platform: item.platform,
            quality: item.quality,
            finalUrl: finalUrl.startsWith('http') ? finalUrl : `${BASE_URL}${finalUrl}`
          });
        } else {
          downloadLinks.push({
            platform: item.platform,
            quality: item.quality,
            finalUrl: null,
            error: 'Failed to resolve',
            intermediateUrl: item.intermediateUrl
          });
        }
      } catch (e) {
        downloadLinks.push({
          platform: item.platform,
          quality: item.quality,
          finalUrl: null,
          error: e.message,
          intermediateUrl: item.intermediateUrl
        });
      }
    }

    const posterAbs = poster ? (poster.startsWith('http') ? poster : `${BASE_URL}${poster}`) : '';
    return {
      title,
      poster: posterAbs,
      description,
      season,
      episode,
      downloadLinks
    };
  } catch (error) {
    return { error: error.message };
  }
}

// ------------------------------
// GET DIRECT DOWNLOADS (for movies/specials)
// ------------------------------
async function getDirectDownloads(pageUrl) {
  try {
    const { data: html } = await axios.get(pageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
      }
    });
    const $ = cheerio.load(html);

    const title =
      $('h1.entry-title').text().trim() ||
      $('h1.Title').text().trim() ||
      $('h1.post-title').text().trim() ||
      $('h1').first().text().trim() ||
      $('title').text().trim().replace(/\s*[|–-]\s*AnimeClub2.*$/, '');

    const poster =
      $('.poster img').attr('src') ||
      $('.poster img').attr('data-src') ||
      $('meta[property="og:image"]').attr('content') ||
      $('meta[itemprop="image"]').attr('content') ||
      $('link[rel="image_src"]').attr('href');

    let description =
      $('.entry-content p').first().text().trim() ||
      $('.sinopsis').text().trim() ||
      $('.description').text().trim() ||
      $('[itemprop="description"]').text().trim() ||
      $('meta[name="description"]').attr('content') ||
      'No description available';
    description = cleanDescription(description);

    // Extract intermediate links (same as episode)
    const intermediateLinks = [];
    $('a[href*="/links/"]').each((i, el) => {
      const href = $(el).attr('href');
      const linkText = $(el).text().trim().toLowerCase();
      if (linkText.includes('telegram') || linkText.includes('drive') || href.includes('telegram') || href.includes('drive')) {
        const qualityMatch = linkText.match(/(\d{3,4}p)/i);
        const quality = qualityMatch ? qualityMatch[1] : 'Unknown';
        const platform = linkText.includes('telegram') ? 'Telegram' :
                         linkText.includes('drive') ? 'Drive' : 'Other';
        const intermediateUrl = href.startsWith('http') ? href : `${BASE_URL}${href}`;
        intermediateLinks.push({ platform, quality, intermediateUrl });
      }
    });

    if (intermediateLinks.length === 0) {
      $('a[href*="/links/"]').each((i, el) => {
        const href = $(el).attr('href');
        const linkText = $(el).text().trim();
        if (linkText) {
          let platform = 'Download';
          if (linkText.toLowerCase().includes('telegram')) platform = 'Telegram';
          else if (linkText.toLowerCase().includes('drive')) platform = 'Drive';
          else if (linkText.toLowerCase().includes('google')) platform = 'Drive';
          const qualityMatch = linkText.match(/(\d{3,4}p)/i);
          const quality = qualityMatch ? qualityMatch[1] : 'Unknown';
          const intermediateUrl = href.startsWith('http') ? href : `${BASE_URL}${href}`;
          intermediateLinks.push({ platform, quality, intermediateUrl });
        }
      });
    }

    const downloadLinks = [];
    for (const item of intermediateLinks) {
      try {
        const { data: linkHtml } = await axios.get(item.intermediateUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
        });
        const $$ = cheerio.load(linkHtml);
        let finalUrl = $$('#link').attr('href');
        if (!finalUrl) {
          finalUrl = $$('a[href*=".mp4"], a[href*=".mkv"], a[href*=".avi"]').first().attr('href');
        }
        if (finalUrl) {
          downloadLinks.push({
            platform: item.platform,
            quality: item.quality,
            finalUrl: finalUrl.startsWith('http') ? finalUrl : `${BASE_URL}${finalUrl}`
          });
        } else {
          downloadLinks.push({
            platform: item.platform,
            quality: item.quality,
            finalUrl: null,
            error: 'Failed to resolve',
            intermediateUrl: item.intermediateUrl
          });
        }
      } catch (e) {
        downloadLinks.push({
          platform: item.platform,
          quality: item.quality,
          finalUrl: null,
          error: e.message,
          intermediateUrl: item.intermediateUrl
        });
      }
    }

    const posterAbs = poster ? (poster.startsWith('http') ? poster : `${BASE_URL}${poster}`) : '';
    return {
      title,
      poster: posterAbs,
      description,
      downloadLinks,
      isMovie: true
    };
  } catch (error) {
    return { error: error.message };
  }
}

module.exports = {
  searchAnimeClub,
  getShowInfo,
  getEpisodeDownloads,
  getDirectDownloads
};
