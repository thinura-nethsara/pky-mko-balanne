// lib/animeclub-dl.js
const axios = require('axios');
const cheerio = require('cheerio');

const BASE_URL = 'https://animeclub2.com';

async function resolveIntermediateLink(intermediateUrl) {
  try {
    const { data: html } = await axios.get(intermediateUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    });
    const $ = cheerio.load(html);
    let finalUrl = $('#link').attr('href');
    if (!finalUrl) {
      finalUrl = $('a[href*=".mp4"], a[href*=".mkv"], a[href*=".avi"]').first().attr('href');
    }
    return finalUrl || null;
  } catch (_) {
    return null;
  }
}

/**
 * Extract download links from any page (episode or movie)
 */
async function extractDownloadLinks(html, pageUrl) {
  const $ = cheerio.load(html);
  const intermediateLinks = [];

  // Look for /links/ links with Telegram/Drive
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

  // Fallback: any /links/ link
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

  // Resolve each intermediate link
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
        error: 'Failed to resolve',
        intermediateUrl: item.intermediateUrl
      });
    }
  }

  return downloadLinks;
}

/**
 * Get episode downloads (for episode pages)
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

    const downloadLinks = await extractDownloadLinks(html, episodeUrl);

    return { title, poster, description, season, episode, downloadLinks };
  } catch (error) {
    return { error: error.message };
  }
}

/**
 * Get direct downloads for movie/show pages (no episode)
 */
async function getDirectDownloads(pageUrl) {
  try {
    const { data: html } = await axios.get(pageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5'
      }
    });

    const $ = cheerio.load(html);

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

    const downloadLinks = await extractDownloadLinks(html, pageUrl);

    return { title, poster, description, downloadLinks, isMovie: true };
  } catch (error) {
    return { error: error.message };
  }
}

module.exports = { getEpisodeDownloads, getDirectDownloads };
