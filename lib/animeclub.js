// lib/animeclub.js
const axios = require('axios');
const cheerio = require('cheerio');

const BASE_URL = 'https://animeclub2.com';

// ---------- SEARCH (your code) ----------
async function searchAnimeClub(query) {
  try {
    const searchUrl = `https://animeclub2.com/?s=${encodeURIComponent(query)}`;
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

// ---------- INFO & EPISODES (your code) ----------
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

    // ===== Title =====
    const title =
      $('h1.entry-title').text().trim() ||
      $('h1.Title').text().trim() ||
      $('h1.post-title').text().trim() ||
      $('h1[itemprop="name"]').text().trim() ||
      $('h1').first().text().trim() ||
      $('title').text().trim().replace(/\s*[|–-]\s*AnimeClub2.*$/, '');

    // ===== Poster =====
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

    // ===== Description =====
    let description =
      $('.entry-content p').first().text().trim() ||
      $('.wp-content p').first().text().trim() ||
      $('.sinopsis').text().trim() ||
      $('.description').text().trim() ||
      $('[itemprop="description"]').text().trim() ||
      $('meta[name="description"]').attr('content') ||
      'No description available';
    description = description.replace(/^Add\s+to\s+Wishlist\s*/i, '').replace(/\s+/g, ' ').trim();

    // ===== Episodes (via API) =====
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
      try {
        const apiUrl = `https://animeclub2.com/wp-json/dooplayer/v2/?post=${postId}&season=1`;
        const { data: apiData } = await axios.get(apiUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
        });
        if (apiData?.episodes) {
          episodes = apiData.episodes.map(ep => ({
            title: ep.title || ep.name || `Episode ${ep.number}`,
            url: ep.url || ep.link || '#'
          }));
        } else if (Array.isArray(apiData)) {
          episodes = apiData.map(ep => ({ title: ep.title, url: ep.url }));
        }
      } catch (_) {
        // fallback to static HTML if API fails
        $('.listaeps li a, .episodios li a, .capitulos li a').each((i, el) => {
          const epTitle = $(el).text().trim();
          const epUrl = $(el).attr('href');
          if (epTitle && epUrl) episodes.push({ title: epTitle, url: epUrl });
        });
      }
    } else {
      // no postId → try static links directly
      $('.listaeps li a, .episodios li a, .capitulos li a').each((i, el) => {
        const epTitle = $(el).text().trim();
        const epUrl = $(el).attr('href');
        if (epTitle && epUrl) episodes.push({ title: epTitle, url: epUrl });
      });
    }

    // Convert episode URLs to absolute
    episodes = episodes.map(ep => ({
      ...ep,
      url: ep.url.startsWith('http') ? ep.url : `${BASE_URL}${ep.url}`
    }));

    // Deduplicate episodes (by URL)
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

// ---------- DIRECT DOWNLOAD (your code) ----------
async function getEpisodeDownloads(episodeUrl) {
  try {
    const { data: html } = await axios.get(episodeUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5'
      }
    });

    const $ = cheerio.load(html);

    // ---------- Extract Title ----------
    const title =
      $('h1.entry-title').text().trim() ||
      $('h1.Title').text().trim() ||
      $('h1.post-title').text().trim() ||
      $('h1').first().text().trim() ||
      $('title').text().trim().replace(/\s*[|–-]\s*AnimeClub2.*$/, '');

    // ---------- Extract Poster ----------
    let poster =
      $('.poster img').attr('src') ||
      $('.poster img').attr('data-src') ||
      $('meta[property="og:image"]').attr('content') ||
      $('meta[itemprop="image"]').attr('content') ||
      $('link[rel="image_src"]').attr('href');
    if (poster && !poster.startsWith('http')) poster = `${BASE_URL}${poster}`;

    // ---------- Extract Description ----------
    let description =
      $('.entry-content p').first().text().trim() ||
      $('.sinopsis').text().trim() ||
      $('.description').text().trim() ||
      $('[itemprop="description"]').text().trim() ||
      $('meta[name="description"]').attr('content') ||
      'No description available';
    description = description.replace(/^Add\s+to\s+Wishlist\s*/i, '').replace(/\s+/g, ' ').trim();

    // ---------- Extract Season & Episode from URL or title ----------
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

    // ---------- Extract Intermediate Download Links ----------
    const intermediateLinks = [];

    // Search for <a> tags that point to /links/ and contain 'Telegram' or 'Drive'
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

    // If nothing found, try more generic: any link with /links/ that has a text like "Download"
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

    // ---------- Resolve each intermediate link to the final download URL ----------
    const downloadLinks = [];
    for (const item of intermediateLinks) {
      try {
        const { data: linkHtml } = await axios.get(item.intermediateUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
        });
        const $$ = cheerio.load(linkHtml);
        let finalUrl = $$('#link').attr('href');
        if (!finalUrl) {
          // try alternative selectors
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
            intermediateUrl: item.intermediateUrl,
            error: 'Failed to resolve final URL'
          });
        }
      } catch (e) {
        downloadLinks.push({
          platform: item.platform,
          quality: item.quality,
          finalUrl: null,
          intermediateUrl: item.intermediateUrl,
          error: e.message
        });
      }
    }

    return {
      title,
      poster,
      description,
      season,
      episode,
      downloadLinks
    };
  } catch (error) {
    return { error: error.message };
  }
}

// ---------- Direct Downloads for Movies/Specials (reuses episode logic) ----------
async function getDirectDownloads(pageUrl) {
  // same as getEpisodeDownloads but without extracting season/episode
  const result = await getEpisodeDownloads(pageUrl);
  if (result.error) return result;
  // Remove season/episode if not needed
  delete result.season;
  delete result.episode;
  result.isMovie = true;
  return result;
}

module.exports = {
  searchAnimeClub,
  getShowInfo,
  getEpisodeDownloads,
  getDirectDownloads
};
