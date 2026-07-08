// lib/animeclub-dl.js
const axios = require('axios');
const cheerio = require('cheerio');

const BASE_URL = 'https://animeclub2.com';

/**
 * Helper to fetch the final URL from an intermediate /links/ page
 */
async function resolveIntermediateLink(intermediateUrl) {
  try {
    const { data: html } = await axios.get(intermediateUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    const $ = cheerio.load(html);
    let finalUrl = $('#link').attr('href');
    if (!finalUrl) {
      // Try alternative selectors
      finalUrl = $('a[href*=".mp4"], a[href*=".mkv"], a[href*=".avi"]').first().attr('href');
    }
    return finalUrl || null;
  } catch (error) {
    return null;
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
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5'
      }
    });

    const $ = cheerio.load(html);

    // ---------- Extract metadata ----------
    const title =
      $('h1.entry-title').text().trim() ||
      $('h1.Title').text().trim() ||
      $('h1.post-title').text().trim() ||
      $('h1').first().text().trim() ||
      $('title').text().trim().replace(/\s*[|–-]\s*AnimeClub2.*$/, '');

    let poster =
      $('.poster img').attr('src') ||
      $('.poster img').attr('data-src') ||
      $('meta[property="og:image"]').attr('content') ||
      $('meta[itemprop="image"]').attr('content') ||
      $('link[rel="image_src"]').attr('href');
    if (poster && !poster.startsWith('http')) poster = `${BASE_URL}${poster}`;

    let description =
      $('.entry-content p').first().text().trim() ||
      $('.sinopsis').text().trim() ||
      $('.description').text().trim() ||
      $('[itemprop="description"]').text().trim() ||
      $('meta[name="description"]').attr('content') ||
      'No description available';
    description = description.replace(/^Add\s+to\s+Wishlist\s*/i, '').replace(/\s+/g, ' ').trim();

    // ---------- Extract Season & Episode ----------
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

    // ---------- Resolve each intermediate link ----------
    const downloadLinks = [];
    for (const item of intermediateLinks) {
      const finalUrl = await resolveIntermediateLink(item.intermediateUrl);
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

/**
 * Direct downloads for movies/specials (reuses episode logic)
 */
async function getDirectDownloads(pageUrl) {
  const result = await getEpisodeDownloads(pageUrl);
  if (result.error) return result;
  delete result.season;
  delete result.episode;
  result.isMovie = true;
  return result;
}

module.exports = { getEpisodeDownloads, getDirectDownloads };
