// CREDIT BY VISPER INC BY DCM 
// CREATED BY PATHUM RAJAPAKSHE 
// SEARCH / INFO /EPISODES/ DIRECT DOWNLOAD ALL IN ONE
const axios = require('axios');
const cheerio = require('cheerio');

const BASE_URL = 'https://animeclub2.com';

/**
 * Search for anime titles
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
    const items = $('.item, .post, .movie-item, .tv-item, article, .search-item');

    // If no items, fallback to any link to /tvshows/ or /movies/
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
      description = description.replace(/^Add\s+to\s+Wishlist\s*/i, '').replace(/\s+/g, ' ').trim();

      // Convert relative URL to absolute
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

/**
 * Get show info and episodes (using API or static HTML)
 */
async function getShowInfo(showUrl) {
  try {
    const { data: html } = await axios.get(showUrl, {
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

    const description =
      $('.entry-content p').first().text().trim() ||
      $('.wp-content p').first().text().trim() ||
      $('.sinopsis').text().trim() ||
      $('.description').text().trim() ||
      $('[itemprop="description"]').text().trim() ||
      $('meta[name="description"]').attr('content');

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
        const apiUrl = `${BASE_URL}/wp-json/dooplayer/v2/?post=${postId}&season=1`;
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
        // fallback to static HTML
        $('.listaeps li a, .episodios li a, .capitulos li a').each((i, el) => {
          const epTitle = $(el).text().trim();
          const epUrl = $(el).attr('href');
          if (epTitle && epUrl) episodes.push({ title: epTitle, url: epUrl });
        });
      }
    } else {
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

    // Convert poster to absolute
    const posterAbs = poster ? (poster.startsWith('http') ? poster : `${BASE_URL}${poster}`) : '';

    return { title, poster: posterAbs, description, episodes };
  } catch (error) {
    return { error: error.message };
  }
}

/**
 * Get episode download links (resolves intermediate links)
 */
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

    const description =
      $('.entry-content p').first().text().trim() ||
      $('.sinopsis').text().trim() ||
      $('.description').text().trim() ||
      $('[itemprop="description"]').text().trim() ||
      $('meta[name="description"]').attr('content');

    // Extract season/episode from URL or title
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

    // Collect intermediate download links
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

    // If none, fallback to any /links/ with text
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

    // Resolve each intermediate link to final download URL
    const downloadLinks = [];
    for (const item of intermediateLinks) {
      try {
        const { data: linkHtml } = await axios.get(item.intermediateUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
        });
        const $$ = cheerio.load(linkHtml);
        const finalUrl = $$('#link').attr('href');
        if (finalUrl) {
          downloadLinks.push({
            platform: item.platform,
            quality: item.quality,
            finalUrl: finalUrl.startsWith('http') ? finalUrl : `${BASE_URL}${finalUrl}`
          });
        } else {
          // If no #link, try other possible selectors
          const maybeLink = $$('a[href*=".mp4"], a[href*=".mkv"], a[href*=".avi"]').first().attr('href');
          if (maybeLink) {
            downloadLinks.push({
              platform: item.platform,
              quality: item.quality,
              finalUrl: maybeLink.startsWith('http') ? maybeLink : `${BASE_URL}${maybeLink}`
            });
          } else {
            downloadLinks.push({
              platform: item.platform,
              quality: item.quality,
              finalUrl: null,
              error: 'Failed to resolve final URL',
              intermediateUrl: item.intermediateUrl
            });
          }
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

    // Convert poster to absolute
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

module.exports = { searchAnimeClub, getShowInfo, getEpisodeDownloads };
