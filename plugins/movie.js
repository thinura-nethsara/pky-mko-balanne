const config = require('../config');
const { cmd, commands } = require('../command');
const axios = require('axios');
const sharp = require('sharp');
const { getBuffer, getGroupAdmins, getRandom, h2k, isUrl, Json, runtime, sleep, fetchJson } = require('../lib/functions');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const fileType = require('file-type');
const fg = require('api-dylux');
const { searchMoviesublk } = require('../lib/moviesublk_tv_search');
const { getMoviesublkInfo } = require('../lib/moviesublk_tv_info');
const { searchAnimeClub } = require('../lib/animeclub-search');
const { getShowInfo } = require('../lib/animeclub-info-episode');
const { getEpisodeDownloads, getDirectDownloads } = require('../lib/animeclub-dl');



// ==================== GLOBAL VARIABLES ====================
const API_KEY = config.APIKEY || 'key_13be1374312cdd0a';
const BASE_URL = 'https://mr-thinuzz-api-build.vercel.app/api/';
let isUploadingTv = false;
let isSubLkUploading = false;
let autoStatus = false; // ← declared globally

// ==================== HELPERS ====================
function cleanTitle(title) {
  return title
    .replace(/Sinhala Subtitles \|.*$/gi, '')
    .replace(/Sinhala Subtitle \|.*$/gi, '')
    .replace(/\| සිංහල.*$/gi, '')
    .trim();
}

async function getResizedThumb(url) {
  try {
    const response = await axios.get(url, { responseType: 'arraybuffer', timeout: 15000 });
    const buffer = Buffer.from(response.data, 'binary');
    return await sharp(buffer)
      .resize(200, 200, { fit: 'cover' })
      .jpeg({ quality: 80 })
      .toBuffer();
  } catch (e) {
    console.error('Sharp Error:', e.message);
    return null;
  }
}

// ============================================================
// COMMAND: mv – Movie search menu
// ============================================================
cmd({
  pattern: 'mv',
  react: '🔎',
  alias: ['movie', 'film', 'cinema'],
  desc: 'all movie search',
  category: 'movie',
  use: '.movie',
  filename: __filename
},
async (conn, mek, m, { from, prefix, q, isMe, isSudo, isOwner, reply }) => {
  try {
    if (config.MV_BLOCK === 'true' && !isMe && !isSudo && !isOwner) {
      await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
      return await conn.sendMessage(from, {
        text: '*This command currently only works for the Bot owner. To disable it for others, use the .settings command 👨‍🔧.*'
      }, { quoted: mek });
    }

    if (!q) return await reply('*Enter movie name..🎬*');

    const sources = [
      { name: 'CINESUBZ', cmd: 'cinesubz' },
      { name: 'CINESUBZ TV', cmd: 'cinetv' },
      { name: 'ANIMECLUB2TV', cmd: 'animeclub2tv' },
      { name: 'SINHALASUB', cmd: 'sinhalasub' },
      { name: 'SINHALASUB TV' , cmd: 'sinhalasubtv' },
      { name: 'SUBLK', cmd: 'sublk' },
      { name: 'MOVIEPRO', cmd: 'moviepro' },
      { name: 'SL SINHALA CARTOONS', cmd: 'sinhalacartoons' },
      { name: 'MOVIESUBLK TV', cmd: 'moviesublktv' },
      { name: 'SUBZLK', cmd: 'subzlk' }
    ];

    const caption = `_*VISPER MOVIE SYSTEM 🎬*_\n\n*\`🔍Input :\`* ${q}\n\n_*🌟 Select your preferred movie download site*_`;

    const buttons = sources.map(src => ({
      buttonId: prefix + src.cmd + ' ' + q,
      buttonText: { displayText: `_${src.name} Results 🍿_` },
      type: 1
    }));

    return await conn.buttonMessage(from, {
      image: { url: config.LOGO || 'https://via.placeholder.com/300' },
      caption,
      footer: config.FOOTER || 'VISPER MD',
      buttons,
      headerType: 4
    }, mek);

  } catch (e) {
    reply('*❌ Error occurred*');
    console.log(e);
  }
});

// ============================================================
// COMMAND: cinesubz – Search movies from Cinesubz
// ============================================================
cmd({
  pattern: 'cinesubz',
  react: '🔎',
  category: 'movie',
  alias: ['cz'],
  desc: 'cinesubz movie search',
  use: '.cine movie name',
  filename: __filename
},
async (conn, m, mek, { from, q, prefix, isSudo, isOwner, isMe, reply }) => {
  try {
    if (config.MV_BLOCK === 'true' && !isMe && !isSudo && !isOwner) {
      return reply('*This command currently only works for the Bot owner.*');
    }
    if (!q) return reply('*Please give me a movie name 🎬*');

    const apiUrl = `https://apis.sadas.dev/api/v1/movie/cinesubz/search?q=${q}&apiKey=ea4d57a2a2db72e0bb3ba58f56b1ff9b`;
    const { data: result } = await axios.get(apiUrl);

    if (!result.status || !result.data?.length) {
      return reply('*No results found ❌*');
    }

    let srh = [];
    result.data.slice(0, 30).forEach((movie) => {
      const cleanTitle = movie.title
        .replace(/Sinhala Subtitles \| සිංහල උපසිරැසි සමඟ/gi, '')
        .replace(/Sinhala Subtitle \| සිංහල උපසිරැසි සමඟ/gi, '')
        .trim();
      srh.push({
        title: cleanTitle,
        rowId: `${prefix}cinedl2 ${movie.link}`
      });
    });

    const sections = [{
      title: `Search Results (${srh.length})`,
      rows: srh
    }];

    const listMessage = {
      text: `🎬 *CINESUBZ SEARCH*\n\n🔎 Query: *${q}*\n\n_Select a movie or series below._`,
      footer: config.FOOTER || 'VISPER MD',
      title: 'Cinesubz Downloader',
      buttonText: '📂 View Results',
      sections
    };

    await conn.listMessage(from, listMessage, mek);
  } catch (e) {
    console.log(e);
    reply('*🚩 Error occurred while fetching data!*');
  }
});

// ============================================================
// COMMAND: cinedl2 – Movie info & download buttons
// ============================================================
cmd({
  pattern: 'cinedl2',
  react: '🎥',
  desc: 'movie downloader info',
  filename: __filename
},
async (conn, m, mek, { from, q, prefix, reply }) => {
  try {
    if (!q) return reply('*Please provide a link!*');

    const apiUrl = `https://apis.sadas.dev/api/v1/movie/cinesubz/info?q=${q}&apiKey=ea4d57a2a2db72e0bb3ba58f56b1ff9b`;
    const { data: res } = await axios.get(apiUrl);

    if (!res.status || !res.data) {
      return reply('*🚩 Movie details not found!*');
    }

    const movie = res.data;

    let msg = `*▫🍿 𝗧𝗶𝘁𝗹𝗲 ➮* *_${movie.title}_*

*▫📅 𝗥𝗲𝗹𝗲𝗮𝘀𝗲𝗱 𝗗𝗮𝘁𝗲 ➮* _${movie.year}_
*▫🌎 𝗖𝗼𝘂𝗻𝘁𝗿𝘆 ➮* _N/A_
*▫💃 𝗥𝗮𝘁𝗶𝗻𝗴 ➮* _${movie.imdb_rating}_
*▫⏰ 𝗤𝘂𝗮𝗹𝗶𝘁𝘆 ➮* _${movie.quality}_
*▫🎭 𝗖𝗮𝘀𝘁 ➮* ${movie.cast?.slice(0, 5).map(c => `• ${c.name} (${c.role})`).join('\n') || 'N/A'}
*▫🕵️‍♀️ 𝗗𝗲𝘀𝗰𝗿𝗶𝗽𝘁𝗶𝗼𝗻 ➮* _${movie.description?.slice(0, 300) || 'No description'}..._\n\n*➟➟➟➟➟➟➟➟➟➟➟➟➟➟➟*\n*👥 𝙵𝙾𝙻𝙻𝙾𝚆 𝙾𝚄𝚁 𝙲𝙷𝙰𝙽𝙽𝙴𝙻 ➟* https://whatsapp.com/channel/0029Vb8JZnfA89MqNc8hLb18\n*➟➟➟➟➟➟➟➟➟➟➟➟➟➟➟*

${config.DCARD}`;


    let buttons = [];

    buttons.push({
      buttonId: `${prefix}cdetails ${q}`,
      buttonText: { displayText: 'Details Card 📄' },
      type: 1
    });

    if (movie.download_links && movie.download_links.length > 0) {
      movie.download_links.forEach(dl => {
        buttons.push({
          buttonId: `${prefix}nadeendl ${dl.final_link}±${movie.title}±${movie.poster}±${dl.quality}`,
          buttonText: {
            displayText: `${dl.quality} - ${dl.size}`
          },
          type: 1
        });
      });
    }

    const buttonMessage = {
      image: { url: movie.poster },
      caption: msg,
      footer: config.FOOTER || 'VISPER MD',
      buttons,
      headerType: 4
    };

    await conn.buttonMessage(from, buttonMessage, mek);
  } catch (e) {
    console.log(e);
    reply('*🚩 Error occurred!*');
  }
});

// ============================================================
// COMMAND: nadeendl – Final download for Cinesubz
// ============================================================
// ============================================================
// COMMAND: nadeendl – Final download for Cinesubz (updated)
// ============================================================
cmd({
  pattern: 'nadeendl',
  react: '⬇️',
  dontAddCommandList: true,
  filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
  try {
    if (!q) return reply('*📍 Please provide link!*');

    const [movieUrl, movieName, thumbUrl, quality] = q.split('±');
    if (!movieUrl) return reply('*⚠️ Invalid input!*');

    const api = `https://apis.sadas.dev/api/v1/movie/cinesubz/dl?q=${movieUrl}&apiKey=ea4d57a2a2db72e0bb3ba58f56b1ff9b`;
    const { data: res } = await axios.get(api);

    if (!res.status || !res.data?.links?.length) {
      return reply('*❌ Download link not found!*');
    }

    // direct link only (no pixeldrain / no telegram)
    const directLink = res.data.links.find(link =>
      link.includes('.mp4') &&
      !link.includes('pixeldrain') &&
      !link.includes('t.me')
    );

    if (!directLink) return reply('*❌ Direct file unavailable!*');

    const loading = await conn.sendMessage(from, {
      text: '*Uploading movie... ⬆️*'
    }, { quoted: mek });

    let thumb = null;
    if (thumbUrl) {
      try {
        const response = await axios.get(thumbUrl, { responseType: 'arraybuffer' });
        thumb = await sharp(Buffer.from(response.data))
          .resize(300, 300, { fit: 'cover' })
          .jpeg({ quality: 80 })
          .toBuffer();
      } catch (e) {
        console.log(e);
      }
    }

    // ----- NEW SEND METHOD WITH CONFIG.JID SUPPORT -----
    const targetJid = config.JID || from;  // forward to configured JID if set

    const caption = `*🎬 ${movieName}*\n\n*\`${quality || res.data.size}\`*\n\n${config.NAME || 'VISPER MD'}`;

    await conn.sendMessage(targetJid, {
      document: { url: directLink },
      mimetype: 'video/mp4',
      fileName: `${config.TITLE}${movieName.replace(/[^\w\s]/g, '').trim()}.mp4`,
      jpegThumbnail: thumb,
      caption: caption
    });
    // ----------------------------------------------------

    // Delete loading message and react (only if sent to the same chat, optional)
    if (targetJid === from) {
      await conn.sendMessage(from, { delete: loading.key });
      await conn.sendMessage(from, { react: { text: '☑️', key: mek.key } });
    } else {
      // If forwarded to another JID, we can still react on original chat
      await conn.sendMessage(from, { react: { text: '☑️', key: mek.key } });
      await conn.sendMessage(from, { delete: loading.key });
    }
  } catch (e) {
    console.log(e);
    reply('*❌ Error:* ' + e.message);
  }
});
// ============================================================
// COMMAND: cinetv – TV series search
// ============================================================
cmd({
  pattern: 'cinetv',
  alias: ['ctztv', 'cztv', 'cinesubztv'],
  react: '🔎',
  category: 'tv',
  filename: __filename
},
async (conn, m, mek, { from, q, prefix, reply }) => {
  try {
    if (!q) return await reply('*Please enter a TV series name! 📺*');

    const searchUrl = `${BASE_URL}cinesubz/search?query=${encodeURIComponent(q)}&apiKey=${config.APIKEY}`;
    const { data } = await axios.get(searchUrl, { timeout: 30000 });

    if (!data?.status || !data?.data?.all?.length) {
      return await reply('*No results found ❌*');
    }

    const tvShows = data.data.all.filter(item => item.type === 'TV');
    if (tvShows.length === 0) {
      return await reply('*No TV series found for that query.*');
    }

    const results = tvShows.slice(0, 10);
    let srh = results.map(v => ({
      title: v.title.replace(/Sinhala Subtitles\s*\|?\s*සිංහල උපසිරසි.*/gi, '').trim(),
      rowId: `${prefix}tvinfo ${v.link}`
    }));

    await conn.listMessage(from, {
      text: `_CINESUBZ TV SERIES SEARCH RESULTS 📺_\n\n*🔎 Input:* ${q}\n\n*Select a series from the list below to view episodes.*`,
      footer: config.FOOTER || 'Cinesubz Downloader',
      title: '',
      buttonText: 'Click to View Results 🎬',
      sections: [{ title: 'Available TV Series', rows: srh }]
    }, mek);
  } catch (e) {
    console.error(e);
    reply('🚩 *Error during search!*');
  }
});

// ============================================================
// COMMAND: tvinfo – TV series episodes listing
// ============================================================
cmd({
  pattern: 'tvinfo',
  react: '📺',
  filename: __filename
},
async (conn, m, mek, { from, q, prefix, reply }) => {
  try {
    const infoUrl = `${BASE_URL}cinesubz/tvshow?url=${encodeURIComponent(q)}&apiKey=${config.APIKEY}`;
    const { data } = await axios.get(infoUrl, { timeout: 30000 });

    const series = data.data;
    if (!series) return await reply("*Couldn't find TV series info!*");

    const title = series.maintitle || 'N/A';
    const imdb = series.imdb || 'N/A';
    const posterUrl = series.mainImage || config.LOGO || 'https://via.placeholder.com/300';
    const seasons = series.episodesDetails || [];

    if (seasons.length === 0) {
      return await reply('*No seasons/episodes found for this series.*');
    }

    for (let i = 0; i < seasons.length; i++) {
      const season = seasons[i];
      const seasonNum = season.season;
      const episodes = season.episodes || [];

      let rows = [];

      rows.push({
        buttonId: `${prefix}tvallquality ${q}±${posterUrl}±${title}±${seasonNum}`,
        buttonText: { displayText: `📥 Download All S${seasonNum}` },
        type: 1
      });

      if (i === 0) {
        rows.push({
          buttonId: `${prefix}ctvdetails ${q}`,
          buttonText: { displayText: 'View Details Card 📋' },
          type: 1
        });
      }

      episodes.forEach(ep => {
        const epTitle = `S${String(seasonNum).padStart(2, '0')} E${String(ep.number).padStart(2, '0')}`;
        rows.push({
          buttonId: `${prefix}tvquality ${ep.url}±${posterUrl}±${title} ${epTitle}±${q}`,
          buttonText: { displayText: epTitle },
          type: 1
        });
      });

      const captionText = i === 0
        ? `*🍿 𝗧ɪ𝗧ʟ𝗲 ➮* *_${title}_*\n*⭐ 𝗜𝗠𝗗𝗯 ➮* _${imdb}_\n\n*Select an Episode from Season ${seasonNum} below:*`
        : `*📂 Season ${seasonNum} Episodes - ${title}*`;

      await conn.buttonMessage(from, {
        image: { url: posterUrl },
        caption: captionText,
        footer: config.FOOTER || 'Cinesubz Downloader',
        buttons: rows,
        headerType: 4
      }, mek);

      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  } catch (e) {
    console.error(e);
    reply('🚩 *Error fetching episodes!*');
  }
});

// ============================================================
// COMMAND: ctvdetails – TV series details card
// ============================================================
cmd({
  pattern: 'ctvdetails',
  react: '📋',
  desc: 'Rich TV info card',
  filename: __filename
},
async (conn, m, mek, { from, q, reply }) => {
  try {
    const infoUrl = `${BASE_URL}cinesubz/tvshow?url=${encodeURIComponent(q)}&apiKey=${config.APIKEY}`;
    const { data } = await axios.get(infoUrl, { timeout: 30000 });

    const movie = data.data;
    let details = { mvchlink: 'https://whatsapp.com/channel/yourchannel' };
    try {
      details = (await axios.get('https://mv-visper-full-db.pages.dev/Main/main_var.json')).data;
    } catch (e) { /* ignore */ }

    const title = movie.maintitle || 'N/A';
    const imdb = movie.imdb || 'N/A';
    const genres = movie.category?.join(', ') || 'N/A';
    const cast = movie.cast?.slice(0, 5).map(c => c.actor.name).join(', ') || 'N/A';

    let msg = `*✨ 𝐓ᴠ 𝐒ᴇʀɪᴇ𝐬 𝐃ᴇᴛᴀɪʟ𝐬 ✨*\n\n` +
      `*🍿 𝐓ɪ𝐓ʟ𝐄 ➮* *_${title}_*\n` +
      `*⭐ 𝐈𝐌𝐃𝐛 ➮* _${imdb}_\n` +
      `*🎭 𝐆𝐞𝐧𝐫𝐞𝐬 ➮* _${genres}_\n` +
      `*👥 𝐂𝐚𝐬𝐭 ➮* _${cast}_\n\n` +
      `✨ *Follow us:* ${details.mvchlink}\n\n*➟➟➟➟➟➟➟➟➟➟➟➟➟➟➟*\n*👥 𝙵𝙾𝙻𝙻𝙾𝚆 𝙾𝚄𝚁 𝙲𝙷𝙰𝙽𝙽𝙴𝙻 ➟* https://whatsapp.com/channel/0029Vb8JZnfA89MqNc8hLb18\n*➟➟➟➟➟➟➟➟➟➟➟➟➟➟➟*
      
      ${config.DCARD}`;


    await conn.sendMessage(from, {
      image: { url: movie.mainImage || config.LOGO || 'https://via.placeholder.com/300' },
      caption: msg
    }, { quoted: mek });
    await conn.sendMessage(from, { react: { text: '✔️', key: mek.key } });
  } catch (e) {
    console.error('Error in ctvdetails command:', e);
    reply('🚩 *Error fetching details card!*');
  }
});

// ============================================================
// COMMAND: tvquality – Quality selection for a single episode
// ============================================================
cmd({
  pattern: 'tvquality',
  react: '🎥',
  dontAddCommandList: true,
  filename: __filename
},
async (conn, m, mek, { from, q, prefix, reply }) => {
  try {
    const [epUrl, imgLink, title, mainUrl] = q.split('±');

    const epInfoUrl = `${BASE_URL}cinesubz/episode?url=${encodeURIComponent(epUrl)}&apiKey=${config.APIKEY}`;
    const { data: convData } = await axios.get(epInfoUrl, { timeout: 30000 });

    if (!convData?.status || !convData?.data?.downloadUrl?.length) {
      return await reply('*No download links found for this episode.*');
    }

    let rows = convData.data.downloadUrl.map(dl => ({
      buttonId: `${prefix}tvdl ${dl.link}±${imgLink}±${title}±${mainUrl}±${dl.quality}`,
      buttonText: { displayText: `${dl.quality} (${dl.size})` },
      type: 1
    }));

    await conn.buttonMessage(from, {
      image: { url: imgLink },
      caption: `*🎥 Select Quality for:* \n_${title}_`,
      footer: config.FOOTER || 'Cinesubz Downloader',
      buttons: rows,
      headerType: 4
    }, mek);
  } catch (e) {
    console.error(e);
    reply('🚩 *Error fetching qualities!*');
  }
});

// ============================================================
// COMMAND: tvallquality – Quality selection for all episodes
// ============================================================
cmd({
  pattern: 'tvallquality',
  react: '📑',
  dontAddCommandList: true,
  filename: __filename
},
async (conn, m, mek, { from, q, prefix, reply }) => {
  try {
    const [mainUrl, imgLink, title, seasonNum] = q.split('±');

    const seriesUrl = `${BASE_URL}cinesubz/tvshow?url=${encodeURIComponent(mainUrl)}&apiKey=${config.APIKEY}`;
    const { data: seriesData } = await axios.get(seriesUrl, { timeout: 30000 });

    const targetSeason = seriesData.data.episodesDetails.find(s => s.season.toString() === seasonNum.toString());
    if (!targetSeason || !targetSeason.episodes || targetSeason.episodes.length === 0) {
      return await reply('*No episodes found for this season.*');
    }
    const firstEpUrl = targetSeason.episodes[0].url;

    const epInfoUrl = `${BASE_URL}cinesubz/episode?url=${encodeURIComponent(firstEpUrl)}&apiKey=${config.APIKEY}`;
    const { data: convData } = await axios.get(epInfoUrl, { timeout: 30000 });

    if (!convData?.status || !convData?.data?.downloadUrl?.length) {
      return await reply('*No quality options available.*');
    }

    let rows = convData.data.downloadUrl.map(dl => ({
      buttonId: `${prefix}tvdlall ${mainUrl}±${imgLink}±${title}±${dl.quality}±${seasonNum}`,
      buttonText: { displayText: dl.quality },
      type: 1
    }));

    await conn.buttonMessage(from, {
      image: { url: imgLink },
      caption: `*📥 DOWNLOAD ALL - SEASON ${seasonNum}*\n\n*Series:* ${title}\n*Select the quality for all episodes in Season ${seasonNum}:*`,
      footer: config.FOOTER || 'Cinesubz Downloader',
      buttons: rows,
      headerType: 4
    }, mek);
  } catch (e) {
    console.error(e);
    reply('🚩 *Error fetching quality list!*');
  }
});

// ============================================================
// COMMAND: tvdlall – Download all episodes of a season
// ============================================================
cmd({
  pattern: 'tvdlall',
  react: '⏳',
  dontAddCommandList: true,
  filename: __filename
},
async (conn, m, mek, { from, q, reply }) => {
  if (isUploadingTv) return await reply('*Another process is running. Please wait ⏳*');
  try {
    const [mainUrl, imgLink, title, selectedQuality, seasonNum] = q.split('±');
    isUploadingTv = true;
    await reply(`*🚀 Starting download all episodes of Season ${seasonNum} in ${selectedQuality}...*`);

    const seriesUrl = `${BASE_URL}cinesubz/tvshow?url=${encodeURIComponent(mainUrl)}&apiKey=${config.APIKEY}`;
    const { data: seriesData } = await axios.get(seriesUrl, { timeout: 30000 });

    const targetSeason = seriesData.data.episodesDetails.find(s => s.season.toString() === seasonNum.toString());
    if (!targetSeason || !targetSeason.episodes) {
      throw new Error('Season not found');
    }

    for (const ep of targetSeason.episodes) {
      try {
        const epTitle = `${title} S${String(seasonNum).padStart(2, '0')}E${String(ep.number).padStart(2, '0')}`;

        // ✅ FIXED: correct endpoint
        const epInfoUrl = `${BASE_URL}cinesubz/episode?url=${encodeURIComponent(ep.url)}&apiKey=${config.APIKEY}`;
        const { data: qData } = await axios.get(epInfoUrl, { timeout: 30000 });

        if (!qData?.status || !qData?.data?.downloadUrl?.length) continue;

        const matchingDl = qData.data.downloadUrl.find(d => d.quality.trim() === selectedQuality.trim()) || qData.data.downloadUrl[0];

        const dlUrl = `${BASE_URL}cinesubz/download?url=${encodeURIComponent(matchingDl.link)}&apiKey=${config.APIKEY}`;
        const { data: apiRes } = await axios.get(dlUrl, { timeout: 60000 });

        if (!apiRes?.status || !apiRes?.data?.downloadUrls?.length) continue;

        let finalUrl = null;
        for (const item of apiRes.data.downloadUrls) {
          if (item.url && !item.url.includes('t.me') && !item.url.includes('start=')) {
            finalUrl = item.url;
            break;
          }
        }
        if (!finalUrl) finalUrl = apiRes.data.downloadUrls[0].url;

        const resizedThumb = await getResizedThumb(imgLink);
        const caption = `🎬 *𝗡𝗮𝗺𝗲 :* ${epTitle}\n\n\`[${selectedQuality.trim()}]\` \n\n${config.NAME || 'VISPER MD'}`;

        const targetJid = config.JID || from;
        await conn.sendMessage(targetJid, {
          document: { url: finalUrl },
          fileName: `${config.TITLE} ${epTitle}.mkv`,
          mimetype: 'video/mp4',
          jpegThumbnail: resizedThumb,
          caption: caption
        });
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (err) {
        console.error(`Error downloading episode ${ep.number}:`, err);
      }
    }
    await reply(`*☑️ All episodes of Season ${seasonNum} have been sent!*`);
  } catch (e) {
    console.error(e);
    reply('*Critical error in Download All!*');
  } finally {
    isUploadingTv = false;
  }
});

// ============================================================
// COMMAND: tvdl – Final individual download
// ============================================================
cmd({
  pattern: 'tvdl',
  react: '⬇️',
  dontAddCommandList: true,
  filename: __filename
},
async (conn, m, mek, { from, q, reply }) => {
  if (isUploadingTv) return await reply('*Another episode is uploading. Please wait ⏳*');
  try {
    const [processedUrl, imgLink, title, mainUrl, quality] = q.split('±');

    const dlUrl = `${BASE_URL}cinesubz/download?url=${encodeURIComponent(processedUrl)}&apiKey=${config.APIKEY}`;
    const { data: apiRes } = await axios.get(dlUrl, { timeout: 60000 });

    if (!apiRes?.status || !apiRes?.data?.downloadUrls?.length) {
      return await reply('⚠️ No working link found.');
    }

    let finalUrl = null;
    for (const item of apiRes.data.downloadUrls) {
      if (item.url && !item.url.includes('t.me') && !item.url.includes('start=')) {
        finalUrl = item.url;
        break;
      }
    }
    if (!finalUrl) finalUrl = apiRes.data.downloadUrls[0].url;

    isUploadingTv = true;
    await conn.sendMessage(from, { react: { text: '⬆️', key: mek.key } });

    const resizedThumb = await getResizedThumb(imgLink);
    const qText = quality ? quality.trim() : 'Unknown';
    const caption = `🎬 *𝗡𝗮𝗺𝗲 :* ${title}\n\n\`[ ${qText} ]\`\n\n${config.NAME || 'VISPER MD'}`;

    const targetJid = config.JID || from;
    await conn.sendMessage(targetJid, {
      document: { url: finalUrl },
      fileName: `${config.TITLE} ${title}.mkv`,
      mimetype: 'video/mp4',
      jpegThumbnail: resizedThumb,
      caption: caption
    });
    await conn.sendMessage(from, { react: { text: '☑️', key: mek.key } });
  } catch (e) {
    console.error(e);
    reply('*Download Error !!*');
  } finally {
    isUploadingTv = false;
  }
});









// In-memory stores
const episodeStore = new Map();   // chatId -> { urls: [], type: 'episode'|'movie', title, poster, description }
const downloadStore = new Map();  // chatId -> { links: [], title, poster, description }

const STORE_TTL = 5 * 60 * 1000; // 5 minutes

// ============================================================
// COMMAND: anime – search
// ============================================================
cmd({
  pattern: 'animeclub2tv',
  react: '🔍',
  category: 'anime',
  alias: ['anim'],
  desc: 'Search anime on AnimeClub2',
  use: '.anime <title>',
  filename: __filename
},
async (conn, m, mek, { from, q, prefix, reply }) => {
  try {
    if (!q) return reply('*Please provide an anime name to search 🎬*');

    const result = await searchAnimeClub(q);
    if (result.error) return reply(`*🚩 Search error:* ${result.error}`);
    if (!result.results || result.results.length === 0) return reply('*No results found ❌*');

    const rows = result.results.slice(0, 30).map(item => ({
      title: item.title,
      rowId: `${prefix}animeinfo ${item.url}`
    }));

    const sections = [{
      title: `📺 Search Results (${rows.length})`,
      rows
    }];

    const listMessage = {
      text: `🎌 *ANIMECLUB2 SEARCH*\n\n🔎 Query: *${q}*\n\n_Select an anime to see episodes._`,
      footer: config.FOOTER || 'VISPER MD',
      title: 'AnimeClubTV Downloader',
      buttonText: '📂 View Results',
      sections
    };

    await conn.listMessage(from, listMessage, mek);
  } catch (e) {
    console.error(e);
    reply('*🚩 Error occurred while searching!*');
  }
});

// ============================================================
// COMMAND: animeinfo – show poster + episode list (or movie)
// ============================================================
cmd({
  pattern: 'animeinfo',
  react: '📺',
  desc: 'Show anime info and episode list',
  filename: __filename
},
async (conn, m, mek, { from, q, prefix, reply }) => {
  try {
    if (!q) return reply('*Please provide a valid anime URL!*');

    const data = await getShowInfo(q);
    if (data.error || !data.title) {
      return reply(`*🚩 Could not fetch anime details:* ${data.error || 'Unknown error'}`);
    }

    // ---- Send poster + info ----
    let caption = `*🎬 ${data.title}*\n\n`;
    if (data.description) caption += `${data.description.slice(0, 300)}...\n\n`;

    if (data.episodes && data.episodes.length > 0) {
      caption += `_Total Episodes: ${data.episodes.length}_\n\n📌 Reply with the episode number to get download links.`;

      // Send poster
      if (data.poster) {
        await conn.sendMessage(from, {
          image: { url: data.poster },
          caption,
          footer: config.FOOTER || 'VISPER MD'
        }, { quoted: mek });
      } else {
        await reply(caption);
      }

      // Store episode URLs
      const urls = data.episodes.map(ep => ep.url);
      episodeStore.set(from, {
        type: 'episode',
        urls,
        title: data.title,
        poster: data.poster,
        description: data.description,
        timestamp: Date.now()
      });

      // Send numbered episode list
      const listItems = data.episodes.slice(0, 50).map((ep, i) => `${i + 1}. ${ep.title}`).join('\n');
      const listMsg = `📺 *Episodes*\n\n${listItems}\n\n_Reply with the number (e.g., \`1\`) to get download links._\n\n${config.FOOTER || 'VISPER MD'}`;
      await conn.sendMessage(from, { text: listMsg }, { quoted: mek });

    } else {
      // No episodes – try direct downloads (movie/special)
      const movieData = await getDirectDownloads(q);
      if (movieData.error || !movieData.downloadLinks || movieData.downloadLinks.length === 0) {
        return reply('*🚩 No episodes or download links found for this title.*');
      }

      caption += `_This appears to be a movie or special._\n\n📌 Reply with the number to get download links.`;

      // Send poster
      if (movieData.poster) {
        await conn.sendMessage(from, {
          image: { url: movieData.poster },
          caption,
          footer: config.FOOTER || 'VISPER MD'
        }, { quoted: mek });
      } else {
        await reply(caption);
      }

      // Store movie download links
      episodeStore.set(from, {
        type: 'movie',
        urls: [q], // store the show URL
        title: movieData.title,
        poster: movieData.poster,
        description: movieData.description,
        timestamp: Date.now()
      });

      // Send "Reply 1" message
      const listMsg = `📺 *Movie / Special*\n\nThis title has no episodes.\n\nReply with \`1\` to get download links.\n\n${config.FOOTER || 'VISPER MD'}`;
      await conn.sendMessage(from, { text: listMsg }, { quoted: mek });
    }
  } catch (e) {
    console.error(e);
    reply('*🚩 Error fetching anime details!*');
  }
});

// ============================================================
// COMMAND: ep – reply with number to get download links
// ============================================================
cmd({
  pattern: 'ep',
  react: '🔢',
  desc: 'Get download links for an episode (use after .animeinfo)',
  use: '.ep <number>',
  filename: __filename
},
async (conn, m, mek, { from, q, prefix, reply }) => {
  try {
    if (!q || isNaN(q)) return reply('*Please provide a valid number.*');

    const num = parseInt(q, 10);
    const store = episodeStore.get(from);
    if (!store) {
      return reply('*No episode list found. Please use `.animeinfo` first.*');
    }
    if (Date.now() - store.timestamp > STORE_TTL) {
      episodeStore.delete(from);
      return reply('*Episode list expired. Please search again.*');
    }

    let downloadLinks = [];
    let title = store.title;
    let poster = store.poster;
    let description = store.description;

    if (store.type === 'episode') {
      const urls = store.urls;
      if (num < 1 || num > urls.length) {
        return reply(`*Invalid number. Please choose between 1 and ${urls.length}.*`);
      }
      const epUrl = urls[num - 1];
      const data = await getEpisodeDownloads(epUrl);
      if (data.error || !data.downloadLinks || data.downloadLinks.length === 0) {
        return reply(`*🚩 No download links found for this episode.*\n${data.error || ''}`);
      }
      downloadLinks = data.downloadLinks;
      title = data.title || title;
      poster = data.poster || poster;
      description = data.description || description;
    } else if (store.type === 'movie') {
      if (num !== 1) return reply('*For movies, please reply with 1.*');
      const movieUrl = store.urls[0];
      const data = await getDirectDownloads(movieUrl);
      if (data.error || !data.downloadLinks || data.downloadLinks.length === 0) {
        return reply(`*🚩 No download links found for this movie.*\n${data.error || ''}`);
      }
      downloadLinks = data.downloadLinks;
      title = data.title || title;
      poster = data.poster || poster;
      description = data.description || description;
    } else {
      return reply('*Unknown type. Please search again.*');
    }

    // Filter valid links
    const validLinks = downloadLinks.filter(link => link.finalUrl);
    if (validLinks.length === 0) {
      return reply('*No valid download links (all failed to resolve).*');
    }

    // Store in downloadStore for the next step
    downloadStore.set(from, {
      links: validLinks,
      title,
      poster,
      description,
      timestamp: Date.now()
    });

    // Build numbered download list
    const listItems = validLinks.map((link, i) =>
      `${i + 1}. ${link.platform || 'Download'} – ${link.quality || 'Unknown'}`
    ).join('\n');

    const msg = `*🎬 ${title}*\n\n📝 ${description ? description.slice(0, 200) + '...' : ''}\n\n*Download Options*\n\n${listItems}\n\n_Reply with the number to download._\n\n${config.FOOTER || 'VISPER MD'}`;

    if (poster) {
      await conn.sendMessage(from, {
        image: { url: poster },
        caption: msg,
        footer: config.FOOTER || 'VISPER MD'
      }, { quoted: mek });
    } else {
      await reply(msg);
    }
  } catch (e) {
    console.error(e);
    reply('*🚩 Error fetching download links!*');
  }
});

// ============================================================
// COMMAND: dl – reply with number to download file
// ============================================================
cmd({
  pattern: 'dl',
  react: '⬇️',
  desc: 'Download the selected file (use after .ep)',
  use: '.dl <number>',
  filename: __filename
},
async (conn, m, mek, { from, q, reply }) => {
  try {
    if (!q || isNaN(q)) return reply('*Please provide a valid number.*');

    const num = parseInt(q, 10);
    const store = downloadStore.get(from);
    if (!store) {
      return reply('*No download list found. Please use `.ep` first.*');
    }
    if (Date.now() - store.timestamp > STORE_TTL) {
      downloadStore.delete(from);
      return reply('*Download list expired. Please search again.*');
    }

    const links = store.links;
    if (num < 1 || num > links.length) {
      return reply(`*Invalid number. Please choose between 1 and ${links.length}.*`);
    }

    const link = links[num - 1];
    if (!link.finalUrl) {
      return reply('*This link is invalid. Try another number.*');
    }

    const loading = await conn.sendMessage(from, {
      text: '*📤 Uploading... Please wait.*'
    }, { quoted: mek });

    let thumb = null;
    if (store.poster && store.poster !== 'undefined') {
      try {
        const response = await axios.get(store.poster, { responseType: 'arraybuffer' });
        thumb = await sharp(Buffer.from(response.data))
          .resize(300, 300, { fit: 'cover' })
          .jpeg({ quality: 80 })
          .toBuffer();
      } catch (_) {}
    }

    const fileName = `${store.title || 'anime'} - ${link.quality || 'unknown'}.mp4`
      .replace(/[^\w\s.-]/g, '');

    const targetJid = config.JID || from;

    await conn.sendMessage(targetJid, {
      document: { url: link.finalUrl },
      mimetype: 'video/mp4',
      fileName: fileName,
      jpegThumbnail: thumb,
      caption: `*🎬 ${store.title || 'Anime'}*\n\n📦 *${link.platform || 'Download'}* – *${link.quality || 'Unknown'}*\n\n${config.NAME || 'VISPER MD'}`
    });

    // Clean up
    if (targetJid === from) {
      await conn.sendMessage(from, { delete: loading.key });
      await conn.sendMessage(from, { react: { text: '☑️', key: mek.key } });
    } else {
      await conn.sendMessage(from, { react: { text: '☑️', key: mek.key } });
      await conn.sendMessage(from, { delete: loading.key });
    }

    // Optionally clear stores
    downloadStore.delete(from);
    episodeStore.delete(from);
  } catch (e) {
    console.error(e);
    reply('*❌ Error while sending file:* ' + e.message);
  }
});

// Keep old commands for backward compatibility
cmd({
  pattern: 'animedl',
  react: '⬇️',
  desc: 'Get download links for an episode (direct URL)',
  filename: __filename
},
async (conn, m, mek, { from, q, prefix, reply }) => {
  // redirect to .ep? But we keep it simple
  if (!q) return reply('*Please provide an episode URL!*');
  // Just show info
  const data = await getEpisodeDownloads(q);
  if (data.error || !data.downloadLinks || data.downloadLinks.length === 0) {
    return reply(`*🚩 No download links found.*\n${data.error || ''}`);
  }
  const caption = `*🎬 ${data.title}*\n\n📅 Season ${data.season || '?'} – Episode ${data.episode || '?'}\n\n📝 ${data.description ? data.description.slice(0, 200) + '...' : ''}\n\n*Choose your download option below.*`;
  const buttons = data.downloadLinks.filter(l => l.finalUrl).map(l => ({
    buttonId: `${prefix}animeget ${l.finalUrl}±${data.title}±${data.poster}±${l.quality}±${l.platform}`,
    buttonText: { displayText: `${l.platform} - ${l.quality}` },
    type: 1
  }));
  if (buttons.length === 0) return reply('*No valid download links.*');
  const buttonMessage = {
    image: { url: data.poster || 'https://via.placeholder.com/300x450?text=No+Poster' },
    caption,
    footer: config.FOOTER || 'VISPER MD',
    buttons,
    headerType: 4
  };
  await conn.buttonMessage(from, buttonMessage, mek);
});

cmd({
  pattern: 'animeget',
  react: '📥',
  dontAddCommandList: true,
  filename: __filename
},
async (conn, m, mek, { from, q, reply }) => {
  // This is kept for compatibility with old buttons
  try {
    if (!q) return reply('*📍 Invalid request!*');
    const [fileUrl, title, poster, quality, platform] = q.split('±');
    if (!fileUrl) return reply('*⚠️ Invalid download URL!*');
    const loading = await conn.sendMessage(from, { text: '*📤 Uploading...*' }, { quoted: mek });
    let thumb = null;
    if (poster && poster !== 'undefined') {
      try {
        const response = await axios.get(poster, { responseType: 'arraybuffer' });
        thumb = await sharp(Buffer.from(response.data)).resize(300, 300, { fit: 'cover' }).jpeg({ quality: 80 }).toBuffer();
      } catch (_) {}
    }
    const fileName = `${title || 'anime'} - ${quality || 'unknown'}.mp4`.replace(/[^\w\s.-]/g, '');
    const targetJid = config.JID || from;
    await conn.sendMessage(targetJid, {
      document: { url: fileUrl },
      mimetype: 'video/mp4',
      fileName,
      jpegThumbnail: thumb,
      caption: `*🎬 ${title || 'Anime'}*\n\n📦 *${platform || 'Download'}* – *${quality || 'Unknown'}*\n\n${config.NAME || 'VISPER MD'}`
    });
    if (targetJid === from) {
      await conn.sendMessage(from, { delete: loading.key });
      await conn.sendMessage(from, { react: { text: '☑️', key: mek.key } });
    } else {
      await conn.sendMessage(from, { react: { text: '☑️', key: mek.key } });
      await conn.sendMessage(from, { delete: loading.key });
    }
  } catch (e) {
    console.error(e);
    reply('*❌ Error:* ' + e.message);
  }
});





// ============================================================
// COMMAND: sinhalasub – Search from sinhalasub.lk
// ============================================================
cmd({
  pattern: 'sinhalasub',
  react: '🔎',
  category: 'movie',
  desc: 'sinhalasub.lk movie search',
  use: '.cine 2025',
  filename: __filename
},
async (conn, m, mek, { from, q, prefix, isPre, isSudo, isOwner, isMe, reply }) => {
  try {
    // Premium check
    const pr = (await axios.get('https://visper-full-db.pages.dev/Main/main_var.json')).data;
    const isFree = pr.mvfree === 'true';

    if (!isFree && !isMe && !isPre) {
      await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
      return await conn.sendMessage(from, {
        text: '*`You are not a premium user⚠️`*\n\n' +
          '*Send a message to one of the 2 numbers below and buy Lifetime premium 🎉.*\n\n' +
          '_Price : 200 LKR ✔️_\n\n' +
          '*👨‍💻Contact us : 0778500326 , 0722617699*'
      }, { quoted: mek });
    }

    if (config.MV_BLOCK === 'true' && !isMe && !isSudo && !isOwner) {
      await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
      return await conn.sendMessage(from, {
        text: '*This command currently only works for the Bot owner.*'
      }, { quoted: mek });
    }

    if (!q) return await reply('*Please give me a movie name 🎬*');

    const apiUrl = `https://apis.sadas.dev/api/v1/movie/sinhalasub/search?q=${q}&apiKey=sadasggggg`;
    const response = await axios.get(apiUrl);
    const result = response.data;

    if (!result.status || !result.data || result.data.length === 0) {
      await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
      return await conn.sendMessage(from, { text: '*No results found ❌*' }, { quoted: mek });
    }

    let srh = [];
    result.data.forEach((movie) => {
      const cleanTitle = movie.Title
        .replace('Sinhala Subtitles | සිංහල උපසිරැසි සමඟ', '')
        .replace('Sinhala Subtitle | සිංහල උපසිරැසි සමඟ', '')
        .trim();
      srh.push({
        title: cleanTitle,
        rowId: `${prefix}sinhalasubinfo ${movie.Link}`
      });
    });

    const sections = [{
      title: 'Sinhalasub.lk Search Results',
      rows: srh
    }];

    const listMessage = {
      text: `_*SINHALASUB MOVIE SEARCH RESULTS 🎬*_\n\n*\`Input :\`* ${q}\n\n*Select a movie from the list below to download.*`,
      footer: config.FOOTER || 'VISPER MD',
      title: 'Sinhalasub Movie Downloader',
      buttonText: 'Click here to view',
      sections
    };

    await conn.listMessage(from, listMessage, mek);
  } catch (e) {
    console.log(e);
    await conn.sendMessage(from, { text: '🚩 *Error occurred while fetching data!*' }, { quoted: mek });
  }
});

// ============================================================
// COMMAND: sinhalasubinfo – Movie info & download buttons
// ============================================================
cmd({
  pattern: 'sinhalasubinfo',
  react: '🎥',
  desc: 'movie downloader info',
  filename: __filename
},
async (conn, m, mek, { from, q, prefix, reply }) => {
  try {
    if (!q) return await reply('*Please provide a link!*');

    const apiUrl = `https://apis.sadas.dev/api/v1/movie/sinhalasub/infodl?q=${q}&apiKey=sadasggggg`;
    const res = await axios.get(apiUrl);
    const sadas = res.data;

    if (!sadas.status || !sadas.data) {
      return await conn.sendMessage(from, { text: '🚩 *Error fetching movie details!*' }, { quoted: mek });
    }

    const movie = sadas.data;
    let msg = `*🍿 𝗧ɪᴛʟᴇ ➮* *_${sadas.data.title || 'N/A'}_*

*📅 𝗥ᴇʟᴇꜱᴇᴅ ᴅᴀᴛᴇ ➮* _${sadas.data.date || 'N/A'}_
*🌎 𝗖ᴏᴜɴᴛʀʏ ➮* _${sadas.data.country || 'N/A'}_
*💃 𝗥ᴀᴛɪɴɢ ➮* _${sadas.data.rating || 'N/A'}_
*⏰ 𝗗ᴜʀᴀᴛɪᴏɴ ➮* _${sadas.data.duration || 'N/A'}_
*💁 𝗦ᴜʙᴛɪᴛʟᴇ ʙʏ ➮* _${sadas.data.subtitles || 'N/A'}_
*🎭 𝗗ᴇꜱᴄʀɪᴘᴛɪᴏɴ ➮* _${sadas.data.description ? sadas.data.description.substring(0, 100) + '...' : 'N/A'}_\n\n*➟➟➟➟➟➟➟➟➟➟➟➟➟➟➟*\n*👥 𝙵𝙾𝙻𝙻𝙾𝚆 𝙾𝚄𝚁 𝙲𝙷𝙰𝙽𝙽𝙴𝙻 ➟* https://whatsapp.com/channel/0029Vb8JZnfA89MqNc8hLb18\n*➟➟➟➟➟➟➟➟➟➟➟➟➟➟➟*

${config.DCARD}`;


    let rows = [];
    rows.push({
      buttonId: prefix + 'sinhalasubdetails ' + `${q}`,
      buttonText: { displayText: 'Details Card\n' },
      type: 1
    });

    if (sadas.data.downloadLinks && sadas.data.downloadLinks.length > 0) {
      sadas.data.downloadLinks.forEach((dl) => {
        if (dl.server === 'Pixeldrain') {
          rows.push({
            buttonId: `${prefix}sinhalasubdl ${dl.link}±${sadas.data.title}±${sadas.data.images[0]}±${dl.quality}`,
            buttonText: {
              displayText: `${dl.size} - ${dl.quality}`
            },
            type: 1
          });
        }
      });
    }

    const buttonMessage = {
      image: { url: movie.images[0] || config.LOGO || 'https://via.placeholder.com/300' },
      caption: msg,
      footer: config.FOOTER || 'VISPER MD',
      buttons: rows,
      headerType: 4
    };

    return await conn.buttonMessage(from, buttonMessage, mek);
  } catch (e) {
    console.log(e);
    await conn.sendMessage(from, { text: '🚩 *Error !!*' }, { quoted: mek });
  }
});

// ============================================================
// COMMAND: sinhalasubdl – Final download (Pixeldrain direct)
// ============================================================
// ============================================================
// COMMAND: sinhalasubdl – Final download (Pixeldrain direct) with JID forward
// ============================================================
cmd({
  pattern: 'sinhalasubdl',
  react: '⬇️',
  dontAddCommandList: true,
  filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
  try {
    if (!q) return await reply('*📍 Please provide the movie link!*');

    const [movieUrl, movieName, thumbUrl, quality] = q.split('±');
    if (!movieUrl || !movieName) return await reply('*⚠️ Invalid Format!*');

    const original_link = movieUrl;
    const direct_link = original_link.replace('/u/', '/api/file/');

    let resizedThumb = null;
    if (thumbUrl) {
      try {
        const response = await axios.get(thumbUrl, { responseType: 'arraybuffer' });
        resizedThumb = await sharp(Buffer.from(response.data))
          .resize(300, 300, { fit: 'cover' })
          .jpeg({ quality: 80 })
          .toBuffer();
      } catch (e) {
        console.log('Thumb error skipped');
      }
    }

    // ----- යවන ලිපිනය තීරණය කරන්න -----
    const targetJid = config.JID || from; // JID පිහිටුවා ඇත්නම් එතැනට, නැතිනම් කතාබස් කරන තැනට

    // පූරණ පණිවිඩය (විකල්ප)
    const loading = await conn.sendMessage(from, {
      text: '*Uploading movie... ⬆️*'
    }, { quoted: mek });

    // චිත්‍රපටය යවන්න
    await conn.sendMessage(targetJid, {
      document: { url: direct_link },
      mimetype: 'video/mp4',
      fileName: `${config.TITLE} ${movieName}.mp4`,
      caption: `*🎬 Name :* *${movieName}*\n\n*\`${quality}\`*\n\n${config.NAME || 'VISPER MD'}`,
      jpegThumbnail: resizedThumb
    }, { quoted: mek });

    // පූරණ පණිවිඩය මකා දමන්න (මුල් කතාබස් එකෙන්)
    await conn.sendMessage(from, { delete: loading.key });

    // ප්‍රතික්‍රියාව එක් කරන්න (මුල් කතාබස් එකේ)
    await conn.sendMessage(from, { react: { text: '☑️', key: mek.key } });
  } catch (e) {
    console.log('Error Log:', e);
    await reply(`*❌ Error:* ${e.message}`);
    await conn.sendMessage(from, { react: { text: '⚠️', key: mek.key } });
  }
});
// ============================================================
// COMMAND: cdetails – Cinesubz details card
// ============================================================
cmd({
  pattern: 'cdetails',
  react: '🎬',
  desc: 'Movie details sender from Cinesubz',
  filename: __filename
},
async (conn, m, mek, { from, q, reply }) => {
  try {
    if (!q) return reply('*Please provide a link!*');

    const apiUrl = `https://apis.sadas.dev/api/v1/movie/cinesubz/info?q=${q}&apiKey=ea4d57a2a2db72e0bb3ba58f56b1ff9b`;
    const { data: res } = await axios.get(apiUrl);

    if (!res.status || !res.data) {
      return reply('*🚩 Movie details not found!*');
    }

    const movie = res.data;

    let msg = `*▫🍿 𝗧𝗶𝘁𝗹𝗲 ➮* *_${movie.title}_*

*▫📅 𝗥𝗲𝗹𝗲𝗮𝘀𝗲𝗱 𝗗𝗮𝘁𝗲 ➮* _${movie.year}_
*▫🌎 𝗖𝗼𝘂𝗻𝘁𝗿𝘆 ➮* _N/A_
*▫⭐ 𝗥𝗮𝘁𝗶𝗻𝗴 ➮* _${movie.imdb_rating}_
*▫🔮 𝗤𝘂𝗮𝗹𝗶𝘁𝘆 ➮* _${movie.quality}_
*▫🎭 𝗖𝗮𝘀𝘁 ➮* ${movie.cast?.slice(0, 5).map(c => `• ${c.name} (${c.role})`).join('\n') || 'N/A'}
*▫🕵️‍♀️ 𝗗𝗲𝘀𝗰𝗿𝗶𝗽𝘁𝗶𝗼𝗻 ➮* _${movie.description?.slice(0, 300) || 'No description'}..._\n\n*➟➟➟➟➟➟➟➟➟➟➟➟➟➟➟*\n*👥 𝙵𝙾𝙻𝙻𝙾𝚆 𝙾𝚄𝚁 𝙲𝙷𝙰𝙽𝙽𝙴𝙻 ➟* https://whatsapp.com/channel/0029Vb8JZnfA89MqNc8hLb18\n*➟➟➟➟➟➟➟➟➟➟➟➟➟➟➟*

${config.DCARD}`;

    await conn.sendMessage(config.JID || from, {
      image: { url: movie.poster },
      caption: msg
    });
  } catch (error) {
    console.error('Error:', error);
    await conn.sendMessage(from, '⚠️ *An error occurred while fetching details.*', { quoted: mek });
  }
});

// ============================================================
// COMMAND: sinhalasubdetails – SinhalaSub details card
// ============================================================
cmd({
  pattern: 'sinhalasubdetails',
  react: '🎬',
  desc: 'Movie details sender from SinhalaSub',
  filename: __filename
},
async (conn, m, mek, { from, q, reply }) => {
  try {
    if (!q)
      return await reply('⚠️ *Please provide the movie search query!*');

    let apiUrl = `https://apis.sadas.dev/api/v1/movie/sinhalasub/infodl?q=${q}&apiKey=sadasggggg`;
    let sadas = await fetchJson(apiUrl);

    if (!sadas || !sadas.status || !sadas.data) {
      return await conn.sendMessage(from, { text: '🚩 *Error: Could not find movie details!*' }, { quoted: mek });
    }

    const movie = sadas.data;
    let details = { mvchlink: 'https://whatsapp.com/channel/yourchannel' };
    try {
      details = (await axios.get('https://mv-visper-full-db.pages.dev/Main/main_var.json')).data;
    } catch (e) { /* ignore */ }

    let msg = `*🎬 𝗧ɪᴛʟᴇ ➮* *_${movie.title || 'N/A'}_*

*📅 𝗬ᴇᴀʀ ➮* _${movie.date || 'N/A'}_
*🌟 𝗥ᴀᴛɪɴɢ ➮* _${movie.rating || 'N/A'}_
*⏰ 𝗗ᴜʀᴀᴛɪᴏɴ ➮* _${movie.duration || 'N/A'}_
*🌍 𝗖ᴏᴜɴᴛʀʏ ➮* _${movie.country || 'N/A'}_
*✍️ 𝗔ᴜᴛʜᴏʀ ➮* _${movie.author || 'N/A'}_
*📂 𝗦ᴜʙᴛɪᴛʟᴇꜱ ➮* _${movie.subtitles || 'N/A'}_
*📝 𝗗ᴇsᴄʀɪᴘᴛɪᴏɴ ➮*
_${movie.description || 'N/A'}_
\n\n*➟➟➟➟➟➟➟➟➟➟➟➟➟➟➟*\n*👥 𝙵𝙾𝙻𝙻𝙾𝚆 𝙾𝚄𝚁 𝙲𝙷𝙰𝙽𝙽𝙴𝙻 ➟* https://whatsapp.com/channel/0029Vb8JZnfA89MqNc8hLb18\n*➟➟➟➟➟➟➟➟➟➟➟➟➟➟➟*

${config.DCARD}`;

    await conn.sendMessage(from, {
      image: { url: movie.images[0] || config.LOGO || 'https://via.placeholder.com/300' },
      caption: msg
    }, { quoted: mek });

    await conn.sendMessage(from, { react: { text: '✔️', key: mek.key } });
  } catch (error) {
    console.error('Error:', error);
    await conn.sendMessage(from, { text: '⚠️ *An error occurred while fetching details.*' }, { quoted: mek });
  }
});

// ============================================================
// COMMAND: imdb – IMDb movie info
// ============================================================
cmd({
  pattern: 'imdb',
  alias: ['mvinfo', 'filminfo'],
  desc: 'Fetch detailed information about a movie.',
  category: 'movie',
  react: '🎬',
  use: '.movieinfo < Movie Name >',
  filename: __filename
},
async (conn, mek, m, { from, q, reply }) => {
  try {
    if (!q) return await reply('*Please give a movie name!*');

    const apiUrl = `http://www.omdbapi.com/?t=${encodeURIComponent(q)}&apikey=76cb7f39`;
    const response = await axios.get(apiUrl);
    const data = response.data;

    const movieInfo = `*☘️ 𝗧ɪᴛʟᴇ ➮* ${data.Title}

*📅 𝗥ᴇʟᴇꜱᴇᴅ ᴅᴀᴛᴇ ➮* ${data.Released}
*⏰ 𝗥ᴜɴᴛɪᴍᴇ ➮* ${data.Runtime}
*🎭 𝗚ᴇɴᴀʀᴇꜱ ➮* ${data.Genre}
*💁‍♂️ 𝗦ᴜʙᴛɪᴛʟᴇ ʙʏ ➮* ${data.Director}
*🌎 𝗖ᴏᴜɴᴛʀʏ ➮* ${data.Country}
*💃 𝗥ᴀᴛɪɴɢ ➮* ${data.imdbRating}

\n\n*➟➟➟➟➟➟➟➟➟➟➟➟➟➟➟*\n*👥 𝙵𝙾𝙻𝙻𝙾𝚆 𝙾𝚄𝚁 𝙲𝙷𝙰𝙽𝙽𝙴𝙻 ➟* https://whatsapp.com/channel/0029Vb8JZnfA89MqNc8hLb18\n*➟➟➟➟➟➟➟➟➟➟➟➟➟➟➟*

${config.DCARD}`;

    const imageUrl = data.Poster && data.Poster !== 'N/A' ? data.Poster : config.LOGO || 'https://via.placeholder.com/300';

    await conn.sendMessage(from, {
      image: { url: imageUrl },
      caption: movieInfo
    });
  } catch (e) {
    await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
    console.log(e);
    reply(`❌ *Error Accurated !!*\n\n${e}`);
  }
});

// ============================================================
// COMMAND: sublk – Search from SubzLK (new API)
// ============================================================
cmd({
  pattern: 'sublk',
  react: '🔎',
  category: 'movie',
  desc: 'Search movies from SubzLK (new API)',
  use: '.sublk movie name',
  filename: __filename
},
async (conn, m, mek, { from, q, prefix, isSudo, isOwner, isMe, reply }) => {
  try {
    if (config.MV_BLOCK === 'true' && !isMe && !isSudo && !isOwner) {
      return reply('*This command currently only works for the Bot owner.*');
    }

    if (!q) return reply('*Please give me a movie name 🎬*');

    const searchUrl = `${BASE_URL}lksubs/search?q=${encodeURIComponent(q)}&apiKey=${config.APIKEY}`;
    const { data: result } = await axios.get(searchUrl, { timeout: 30000 });

    if (!result.status || !result.results?.length) {
      return reply('*No results found ❌*');
    }

    const rows = result.results.slice(0, 30).map(movie => ({
      title: cleanTitle(movie.title),
      rowId: `${prefix}sublkinfo ${movie.url}`
    }));

    const listMessage = {
      text: `🎬 *SUBZLK SEARCH (NEW API)*\n\n🔎 Query: *${q}*\n\n_Select a movie below._`,
      footer: config.FOOTER || 'VISPER MD',
      title: 'SubzLK Downloader',
      buttonText: '📂 View Results',
      sections: [{ title: `Results (${rows.length})`, rows }]
    };

    await conn.listMessage(from, listMessage, mek);
  } catch (e) {
    console.log(e);
    reply('*🚩 Error occurred while fetching data!*');
  }
});

// ============================================================
// COMMAND: sublkinfo – SubzLK info & download buttons
// ============================================================
cmd({
  pattern: 'sublkinfo',
  react: '🎥',
  desc: 'SubzLK movie info & download options',
  filename: __filename
},
async (conn, m, mek, { from, q, prefix, reply }) => {
  try {
    if (!q) return reply('*Please provide a movie link!*');

    const infoUrl = `${BASE_URL}lksubs/info?url=${encodeURIComponent(q)}&apiKey=${config.APIKEY}`;
    const { data: res } = await axios.get(infoUrl, { timeout: 30000 });

    if (!res.status || !res.data) {
      return reply('*🚩 Movie details not found!*');
    }

    const movie = res.data;
    const cleanTitleStr = cleanTitle(movie.title);
    const poster = movie.thumbnail || config.LOGO || 'https://via.placeholder.com/300';

    const caption = `*▫🍿 𝗧𝗶𝘁𝗹𝗲 ➮* *_${cleanTitleStr}_*

*▫📅 𝗬𝗲𝗮𝗿 ➮* _${movie.year || 'N/A'}_
*▫⭐ 𝗥𝗮𝘁𝗶𝗻𝗴 ➮* _${movie.rating || 'N/A'}/10_
*▫🎭 𝗚𝗲𝗻𝗿𝗲𝘀 ➮* _${movie.genres?.join(', ') || 'N/A'}_
*▫🎬 𝗤𝘂𝗮𝗹𝗶𝘁𝘆 ➮* _${movie.quality || 'N/A'}_
*▫👁️ 𝗩𝗶𝗲𝘄𝘀 ➮* _${movie.views || 'N/A'}_
*▫🌍 𝗖𝗼𝘂𝗻𝘁𝗿𝘆 ➮* _${movie.country || 'N/A'}_
*▫🎥 𝗗𝗶𝗿𝗲𝗰𝘁𝗼𝗿 ➮* _${movie.director || 'N/A'}_
*▫👥 𝗖𝗮𝘀𝘁 ➮* _${movie.cast?.slice(0, 3).join(', ') || 'N/A'}_\n\n*➟➟➟➟➟➟➟➟➟➟➟➟➟➟➟*\n*👥 𝙵𝙾𝙻𝙻𝙾𝚆 𝙾𝚄𝚁 𝙲𝙷𝙰𝙽𝙽𝙴𝙻 ➟* https://whatsapp.com/channel/0029Vb8JZnfA89MqNc8hLb18\n*➟➟➟➟➟➟➟➟➟➟➟➟➟➟➟*

${config.DCARD}`;


    let buttons = [];

    buttons.push({
      buttonId: `${prefix}sublkdetails ${q}`,
      buttonText: { displayText: '📄 Full Details' },
      type: 1
    });

    if (movie.download_links && movie.download_links.length) {
      movie.download_links.forEach(dl => {
        const isSub = dl.quality && (dl.quality.toLowerCase().includes('subtitle') || dl.quality.toLowerCase().includes('sub'));
        const label = isSub ? `📝 ${dl.quality} (${dl.size})` : `⬇️ ${dl.quality} (${dl.size})`;
        buttons.push({
          buttonId: `${prefix}sublkdl ${dl.redirect_url}±${cleanTitleStr}±${poster}±${dl.quality}±${isSub ? 'sub' : 'video'}`,
          buttonText: { displayText: label },
          type: 1
        });
      });
    }

    if (buttons.length === 1) {
      buttons.push({
        buttonId: `${prefix}sublkdl ${q}±${cleanTitleStr}±${poster}±N/A±video`,
        buttonText: { displayText: '⬇️ Download (direct)' },
        type: 1
      });
    }

    await conn.buttonMessage(from, {
      image: { url: poster },
      caption: caption,
      footer: config.FOOTER || 'VISPER MD',
      buttons: buttons,
      headerType: 4
    }, mek);
  } catch (e) {
    console.log(e);
    reply('*🚩 Error occurred while fetching movie info!*');
  }
});

// ============================================================
// COMMAND: sublkdetails – Full details card
// ============================================================
cmd({
  pattern: 'sublkdetails',
  react: '📄',
  desc: 'Full movie details from SubzLK',
  filename: __filename
},
async (conn, m, mek, { from, q, reply }) => {
  try {
    if (!q) return reply('*Please provide a link!*');

    const infoUrl = `${BASE_URL}lksubs/info?url=${encodeURIComponent(q)}&apiKey=${config.APIKEY}`;
    const { data: res } = await axios.get(infoUrl, { timeout: 30000 });

    if (!res.status || !res.data) {
      return reply('*🚩 Movie details not found!*');
    }

    const movie = res.data;
    const cleanTitleStr = cleanTitle(movie.title);

    let msg = `*▫🍿 𝗧𝗶𝘁𝗹𝗲 ➮* *_${cleanTitleStr}_*

*▫📅 𝗥𝗲𝗹𝗲𝗮𝘀𝗲𝗱 𝗬𝗲𝗮𝗿 ➮* _${movie.year || 'N/A'}_
*▫🌎 𝗖𝗼𝘂𝗻𝘁𝗿𝘆 ➮* _${movie.country || 'N/A'}_
*▫🎬 𝗤𝘂𝗮𝗹𝗶𝘁𝘆 ➮* _${movie.quality || 'N/A'}_
*▫⭐ 𝗥𝗮𝘁𝗶𝗻𝗴 ➮* _${movie.rating || 'N/A'}/10_
*▫👁️ 𝗩𝗶𝗲𝘄𝘀 ➮* _${movie.views || 'N/A'}_

*▫🎥 𝗗𝗶𝗿𝗲𝗰𝘁𝗼𝗿 ➮* _${movie.director || 'N/A'}_
*▫🎭 𝗚𝗲𝗻𝗿𝗲𝘀 ➮* _${movie.genres?.join(', ') || 'N/A'}_

*▫👥 𝗖𝗮𝘀𝘁 ➮*
${movie.cast?.map(c => `• ${c}`).join('\n') || 'N/A'}

*📝 𝗗𝗲𝘀𝗰𝗿𝗶𝗽𝘁𝗶𝗼𝗻:*
${movie.description || 'No description available.'}


*➟➟➟➟➟➟➟➟➟➟➟➟➟➟➟*
*👥 𝙵𝙾𝙻𝙻𝙾𝚆 𝙾𝚄𝚁 𝙲𝙷𝙰𝙽𝙽𝙴𝙻 ➟* https://whatsapp.com/channel/0029Vb8JZnfA89MqNc8hLb18
*➟➟➟➟➟➟➟➟➟➟➟➟➟➟➟*

${config.DCARD}`;

    await conn.sendMessage(config.JID || from, {
      image: { url: movie.thumbnail || config.LOGO || 'https://via.placeholder.com/300' },
      caption: msg
    }, { quoted: mek });
  } catch (error) {
    console.error('Error:', error);
    reply('⚠️ *An error occurred while fetching details.*');
  }
});

// ============================================================
// COMMAND: sublkdl – Download video or subtitle
// ============================================================
cmd({
  pattern: 'sublkdl',
  react: '⬇️',
  dontAddCommandList: true,
  filename: __filename
},
async (conn, m, mek, { from, q, reply }) => {
  if (isSubLkUploading) {
    return await reply('*A download is already in progress. Please wait ⏳*');
  }

  try {
    const [linkUrl, title, img, quality, type] = q.split('±');
    if (!linkUrl) return reply('⚠️ *Invalid download link.*');

    isSubLkUploading = true;

    if (type === 'sub') {
      const dlUrl = `${BASE_URL}lksubs/download?link_url=${encodeURIComponent(linkUrl)}&apiKey=${config.APIKEY}`;
      const { data: dlRes } = await axios.get(dlUrl, { timeout: 30000 });

      if (!dlRes.status || !dlRes.data || !dlRes.data.final_url) {
        return reply('❌ *Failed to get subtitle download link.*');
      }

      const finalUrl = dlRes.data.final_url;
      const fileName = `${cleanTitle(title)}.srt`;

      await conn.sendMessage(config.JID || from, {
        document: { url: finalUrl },
        mimetype: 'text/srt',
        fileName: fileName,
        caption: `📝 *Subtitle for:* ${title}\n\n${config.NAME || 'VISPER MD'}`
      }, { quoted: mek });

      await conn.sendMessage(from, { react: { text: '☑️', key: mek.key } });
      return;
    }

    // Video download
    const dlUrl = `${BASE_URL}lksubs/download?link_url=${encodeURIComponent(linkUrl)}&apiKey=${config.APIKEY}`;
    const { data: dlRes } = await axios.get(dlUrl, { timeout: 30000 });

    if (!dlRes.status || !dlRes.data || !dlRes.data.final_url) {
      return reply('❌ *No direct download link found.*');
    }

    const finalUrl = dlRes.data.final_url;
    const fileInfo = dlRes.data.file_info || {};
    const fileName = `${config.TITLE}${cleanTitle(title)}.mkv`;

    const thumb = await getResizedThumb(img);
    const caption = `🎬 *${cleanTitle(title)}*\n\n*${quality || 'Movie'}*\n\n${config.NAME || 'VISPER MD'}`;

    await conn.sendMessage(config.JID || from, {
      document: { url: finalUrl },
      mimetype: 'video/mp4',
      fileName: fileName,
      jpegThumbnail: thumb,
      caption: caption
    }, { quoted: mek });

    await conn.sendMessage(from, { react: { text: '☑️', key: mek.key } });
  } catch (e) {
    console.error('sublkdl error:', e);
    reply('🚫 *Error Occurred !!*\n\n' + e.message);
  } finally {
    isSubLkUploading = false;
  }
});



// ============================================================
// COMMAND: moviepro – Search
// ============================================================
cmd({
  pattern: 'moviepro',
  react: '🔎',
  category: 'movie',
  alias: ['mp','mvpro','mvp','moviepro'],
  desc: 'moviepro search',
  use: '.moviepro movie name',
  filename: __filename
},
async (conn, m, mek, { from, q, prefix, isSudo, isOwner, isMe, reply }) => {
  try {
    if (config.MV_BLOCK === 'true' && !isMe && !isSudo && !isOwner) {
      return reply('*This command currently only works for the Bot owner.*');
    }

    if (!q) return reply('*Please give movie or tv name 🎬*');

    const api = `https://mr-thinuzz-api-build.zone.id/api/moviepro/search?keyword=${encodeURIComponent(q)}&apiKey=${config.APIKEY}`;
    const { data: result } = await axios.get(api);

    if (!result.status || !result.results?.length) {
      return reply('*No results found ❌*');
    }

    let rows = [];
    result.results.slice(0, 30).forEach(movie => {
      rows.push({
        title: movie.title,
        rowId: `${prefix}movieprodl ${movie.id}`
      });
    });

    const sections = [{
      title: `Search Results (${rows.length})`,
      rows
    }];

    await conn.listMessage(from, {
      text: `🎬 *MOVIEPRO SEARCH*\n\n🔎 Query: *${q}*\n\n_Select movie below._`,
      footer: config.FOOTER || 'VISPER MD',
      title: 'MoviePro Downloader',
      buttonText: '📂 View Results',
      sections
    }, mek);
  } catch (e) {
    console.log(e);
    reply('*🚩 Search error!*');
  }
});

// ============================================================
// COMMAND: movieprodl – Info & download buttons (with Details Card)
// ============================================================
cmd({
  pattern: 'movieprodl',
  react: '🎥',
  desc: 'movie info',
  filename: __filename
},
async (conn, m, mek, { from, q, prefix, reply }) => {
  try {
    if (!q) return reply('*Please provide movie id!*');

    const api = `https://mr-thinuzz-api-build.zone.id/api/moviepro/info?id=${q}&apiKey=${config.APIKEY}`;
    const { data: res } = await axios.get(api);

    if (!res.status || !res.movie) {
      return reply('*🚩 Movie details not found!*');
    }

    const movie = res.movie;

    let msg = `*▫🍿 𝗧𝗶𝘁𝗹𝗲 ➮* *_${movie.title}_*

*▫📅 𝗥𝗲𝗹𝗲𝗮𝘀𝗲𝗱 ➮* _${movie.releaseDate || 'N/A'}_
*▫🌎 𝗖𝗼𝘂𝗻𝘁𝗿𝘆 ➮* _${movie.country || 'N/A'}_
*▫🎭 𝗚𝗲𝗻𝗿𝗲 ➮* _${Array.isArray(movie.genre) ? movie.genre.join(', ') : movie.genre || 'N/A'}_
*▫⭐ 𝗜𝗠𝗗𝗕 ➮* _${movie.imdbRating || 'N/A'}_\n\n*➟➟➟➟➟➟➟➟➟➟➟➟➟➟➟*\n*👥 𝙵𝙾𝙻𝙻𝙾𝚆 𝙾𝚄𝚁 𝙲𝙷𝙰𝙽𝙽𝙴𝙻 ➟* https://whatsapp.com/channel/0029Vb8JZnfA89MqNc8hLb18\n*➟➟➟➟➟➟➟➟➟➟➟➟➟➟➟*

${config.DCARD}`;

    let buttons = [];

    // Details Card button (always show)
    buttons.push({
      buttonId: `${prefix}movieprodetails ${q}`,
      buttonText: { displayText: '📄 Details Card' },
      type: 1
    });

    // Download buttons
    if (res.download_links && res.download_links.length > 0) {
      res.download_links.forEach(dl => {
        const downloadUrl = dl.stream_url || dl.original_url;
        if (downloadUrl) {
          buttons.push({
            buttonId: `${prefix}movieprosend ${downloadUrl}±${movie.title}±${movie.image}±${dl.quality}`,
            buttonText: {
              displayText: `${dl.quality} - ${dl.size}`
            },
            type: 1
          });
        }
      });
    }

    if (buttons.length === 0) {
      return reply('*🚩 No download links available for this movie!*');
    }

    await conn.buttonMessage(from, {
      image: { url: movie.image || 'https://via.placeholder.com/300x400?text=No+Image' },
      caption: msg,
      footer: config.FOOTER || 'VISPER MD',
      buttons,
      headerType: 4
    }, mek);
  } catch (e) {
    console.log(e);
    reply('*🚩 Info error!*');
  }
});

// ============================================================
// COMMAND: movieprodetails – Detailed info card
// ============================================================
cmd({
  pattern: 'movieprodetails',
  react: '📄',
  dontAddCommandList: true,
  filename: __filename
},
async (conn, m, mek, { from, q, reply }) => {
  try {
    if (!q) return reply('*Please provide a link!*');

    const api = `https://mr-thinuzz-api-build.zone.id/api/moviepro/info?id=${q}&apiKey=${config.APIKEY}`;
    const { data: res } = await axios.get(api);

    if (!res.status || !res.movie) {
      return reply('*🚩 Movie details not found!*');
    }

    const movie = res.movie;
    
    let msg = `*▫🍿 𝗧𝗶𝘁𝗹𝗲 ➮* *_${movie.title}_*

*▫📅 𝗥𝗲𝗹𝗲𝗮𝘀𝗲𝗱 𝗗𝗮𝘁𝗲 ➮* _${movie.releaseDate}_
*▫🌎 𝗖𝗼𝘂𝗻𝘁𝗿𝘆 ➮* _${movie.country || 'N/A'}_
*▫⭐ 𝗥𝗮𝘁𝗶𝗻𝗴 ➮* _${movie.imdbRating || 'N/A'}_
*▫🔮 𝗤𝘂𝗮𝗹𝗶𝘁𝘆 ➮* _${movie.quality || 'N/A'}_
*▫🎭 𝗖𝗮𝘀𝘁 ➮* ${Array.isArray(movie.cast) ? movie.cast.join(', ') : movie.cast || 'N/A'}\n\n
*▫🕵️‍♀️ 𝗗𝗲𝘀𝗰𝗿𝗶𝗽𝘁𝗶𝗼𝗻 ➮* _${movie.description || 'No description available.'}..._\n\n*➟➟➟➟➟➟➟➟➟➟➟➟➟➟➟*\n*👥 𝙵𝙾𝙻𝙻𝙾𝚆 𝙾𝚄𝚁 𝙲𝙷𝙰𝙽𝙽𝙴𝙻 ➟* https://whatsapp.com/channel/0029Vb8JZnfA89MqNc8hLb18\n*➟➟➟➟➟➟➟➟➟➟➟➟➟➟➟*

${config.DCARD}`;

    await conn.sendMessage(config.JID || from, {
      image: { url: movie.image || 'https://via.placeholder.com/300x400?text=No+Image' },
      caption: msg
    });
  } catch (error) {
    console.error('Error:', error);
    await conn.sendMessage(from, '⚠️ *An error occurred while fetching details.*', { quoted: mek });
  }
});


// ============================================================
// COMMAND: movieprosend – Final download with JID forward
// ============================================================
cmd({
  pattern: 'movieprosend',
  react: '⬇️',
  dontAddCommandList: true,
  filename: __filename
},
async (conn, mek, m, { from, q, reply }) => {
  try {
    if (!q) return reply('*📍 Please provide link!*');

    const [directUrl, movieName, thumbUrl, quality] = q.split('±');

    const loading = await conn.sendMessage(from, {
      text: '*Uploading movie... ⬆️*'
    }, { quoted: mek });

    let thumb = null;
    if (thumbUrl) {
      try {
        const response = await axios.get(thumbUrl, { responseType: 'arraybuffer' });
        thumb = await sharp(Buffer.from(response.data))
          .resize(300, 300, { fit: 'cover' })
          .jpeg({ quality: 80 })
          .toBuffer();
      } catch (e) {
        console.log(e);
      }
    }

    // ----- JID Forward Support -----
    const targetJid = config.JID || from;

    await conn.sendMessage(targetJid, {
      document: { url: directUrl },
      mimetype: 'video/mp4',
      fileName: `${config.TITLE || 'Movie'} ${movieName}.mkv`,
      jpegThumbnail: thumb,
      caption: `*🎬 ${movieName}*\n\n*\`${quality || 'HD'}\`*\n\n${config.NAME || 'VISPER MD'}`
    }, { quoted: mek });

    await conn.sendMessage(from, { delete: loading.key });
    await conn.sendMessage(from, { react: { text: '☑️', key: mek.key } });
  } catch (e) {
    console.log(e);
    reply('*❌ Error:* ' + e.message);
  }
});
// ============================================================
// COMMAND: sinhalacartoons – Search Sinhala cartoons
// ============================================================
cmd({
  pattern: 'sinhalacartoons',
  react: '🎬',
  category: 'movie',
  alias: ['sc'],
  desc: 'Search Sinhala dubbed cartoons & movies',
  use: '.sinhalacartoons movie name',
  filename: __filename
},
async (conn, m, mek, { from, q, prefix, isSudo, isOwner, isMe, reply }) => {
  try {
    if (config.MV_BLOCK === 'true' && !isMe && !isSudo && !isOwner) {
      return reply('*This command currently only works for the Bot owner.*');
    }
    if (!q) return reply('*Please give a movie or cartoon name 🎬*');

    const api = `https://mr-thinuzz-api-build.zone.id/api/sincartoons/search?query=${encodeURIComponent(q)}&apiKey=${config.APIKEY}`;
    const { data: result } = await axios.get(api);

    if (!result.status || !result.data?.all?.length) {
      return reply('*No results found ❌*');
    }

    let rows = [];
    result.data.all.slice(0, 30).forEach(item => {
      rows.push({
        title: item.title,
        rowId: `${prefix}scdl ${encodeURIComponent(item.url)}`
      });
    });

    const sections = [{
      title: `🔍 Search Results (${result.total_results || rows.length})`,
      rows
    }];

    await conn.listMessage(from, {
      text: `🎬 *SINHALA CARTOONS SEARCH*\n\n🔎 Query: *${q}*\n📂 Source: ${result.service || 'Sinhala Cartoons'}\n\n_Select a movie below to get download links._`,
      footer: config.FOOTER || 'VISPER MD',
      title: 'Sinhala Cartoons Downloader',
      buttonText: '📂 View Results',
      sections
    }, mek);
  } catch (e) {
    console.log(e);
    reply('*🚩 Search error!*');
  }
});

// ============================================================
// COMMAND: scdl – Cartoon info & download button
// ============================================================
cmd({
  pattern: 'scdl',
  react: '🎥',
  desc: 'Get download links for Sinhala cartoon',
  filename: __filename
},
async (conn, m, mek, { from, q, prefix, reply }) => {
  try {
    if (!q) return reply('*Please provide the movie URL!*');

    const movieUrl = decodeURIComponent(q);

    const api = `https://mr-thinuzz-api-build.zone.id/api/sincartoons/movie?url=${encodeURIComponent(movieUrl)}&apiKey=${config.APIKEY}`;
    const { data: res } = await axios.get(api);

    if (!res.status) {
      return reply('*🚩 Movie details not found!*');
    }

    const movie = res.data || {};

    let msg = `*▫🍿 𝗧𝗶𝘁𝗹𝗲 ➮* *_${movie.title || 'N/A'}_*\n`;
    if (movie.year) msg += `*▫📅 𝗬𝗲𝗮𝗿 ➮* _${movie.year}_\n`;
    if (movie.director) msg += `*▫🎬 𝗗𝗶𝗿𝗲𝗰𝘁𝗼𝗿 ➮* _${movie.director}_\n`;
    if (movie.imdb_rating) msg += `*▫⭐ 𝗜𝗠𝗗𝗕 ➮* _${movie.imdb_rating}_\n`;
    if (movie.quality) msg += `*▫📊 𝗤𝘂𝗮𝗹𝗶𝘁𝘆 ➮* _${movie.quality}_\n`;
    if (movie.description) msg += `\n*▫📝 𝗗𝗲𝘀𝗰𝗿𝗶𝗽𝘁𝗶𝗼𝗻 ➮* _${movie.description.substring(0, 200)}${movie.description.length > 200 ? '...' : ''}_\n`;

    if (movie.cast && movie.cast.length > 0) {
      msg += `\n*▫🎭 𝗖𝗮𝘀𝘁 ➮* _`;
      const castNames = movie.cast.slice(0, 3).map(c => c.name).join(', ');
      msg += `${castNames}${movie.cast.length > 3 ? '...' : ''}_\n\n*➟➟➟➟➟➟➟➟➟➟➟➟➟➟➟*\n*👥 𝙵𝙾𝙻𝙻𝙾𝚆 𝙾𝚄𝚁 𝙲𝙷𝙰𝙽𝙽𝙴𝙻 ➟* https://whatsapp.com/channel/0029Vb8JZnfA89MqNc8hLb18\n*➟➟➟➟➟➟➟➟➟➟➟➟➟➟➟*\n\n${config.DCARD}`;

    }

    msg += `\n\n_⬇️ Click the button below to download._`;

    const videoUrl = movie.video_url;
    if (!videoUrl) {
      return reply('*🚩 No download link available for this movie!*');
    }

    let buttons = [{
      buttonId: `${prefix}scsend ${videoUrl}±${movie.title || 'Movie'}±${movie.poster || ''}±${movie.quality || 'HD'}`,
      buttonText: {
        displayText: `⬇️ Download ${movie.quality || 'HD'}`
      },
      type: 1
    }];

    await conn.buttonMessage(from, {
      image: { url: movie.poster || 'https://via.placeholder.com/300x400?text=No+Image' },
      caption: msg,
      footer: config.FOOTER || 'VISPER MD',
      buttons,
      headerType: 4
    }, mek);
  } catch (e) {
    console.log(e);
    reply('*🚩 Info error!*');
  }
});

// ============================================================
// COMMAND: scsend – Final download for cartoons
// ============================================================
cmd({
  pattern: 'scsend',
  react: '⬇️',
  dontAddCommandList: true,
  filename: __filename
},
async (conn, mek, m, { from, q, reply }) => {
  try {
    if (!q) return reply('*📍 Please provide link!*');

    const [directUrl, movieName, thumbUrl, quality] = q.split('±');

    const loading = await conn.sendMessage(from, {
      text: '*Uploading movie... ⬆️*'
    }, { quoted: mek });

    let thumb = null;
    if (thumbUrl && thumbUrl !== 'undefined') {
      try {
        const response = await axios.get(thumbUrl, { responseType: 'arraybuffer' });
        thumb = await sharp(Buffer.from(response.data))
          .resize(300, 300, { fit: 'cover' })
          .jpeg({ quality: 80 })
          .toBuffer();
      } catch (e) {
        console.log(e);
      }
    }

    await conn.sendMessage(from, {
      document: { url: directUrl },
      mimetype: 'video/mp4',
      fileName: `${config.TITLE}${movieName}.mkv`,
      jpegThumbnail: thumb,
      caption: `*🎬 ${movieName}*\n\n*\`${quality || 'N/A'}\`*\n\n${config.NAME || 'VISPER MD'}`
    }, { quoted: mek });

    await conn.sendMessage(from, { delete: loading.key });
    await conn.sendMessage(from, { react: { text: '☑️', key: mek.key } });
  } catch (e) {
    console.log(e);
    reply('*❌ Error:* ' + e.message);
  }
});



// ----- Command: moviestv (search) -----
cmd({
    pattern: 'moviesublktv',
    alias: ['mstv'],
    react: '🔍',
    desc: 'Search TV series on MovieSubLK',
    category: 'download',
    filename: __filename
},
async (conn, m, mek, { from, q, prefix, reply }) => {
    try {
        if (!q) {
            return await reply('*Please enter a TV series name to search!* 📺\n\nExample:\n`' + prefix + 'moviestv The Husband`');
        }

        const results = await searchMoviesublk(q);
        if (!results.length) {
            return await reply('*No TV series found for that query.* ❌');
        }

        const sliced = results.slice(0, 10);
        const rows = sliced.map(item => ({
            title: item.title,
            rowId: `${prefix}mstvinfo ${item.link}`
        }));

        await conn.listMessage(from, {
            text: `*🔎 MovieSubLK TV Search Results*\n\n*Query:* ${q}\n*Found:* ${results.length} series\n\nSelect a series to view details and episodes.`,
            footer: config.FOOTER || 'VISPER MD',
            title: 'Select TV Series',
            buttonText: '📋 View Series',
            sections: [{ title: 'Available Series', rows }]
        }, mek);

    } catch (e) {
        console.error('moviestv error:', e);
        await reply('*An error occurred during search. Please try again later.* 🚩');
    }
});

// ----- Command: mstvinfo (show info card + button for episodes) -----
cmd({
    pattern: 'mstvinfo',
    react: '📺',
    dontAddCommandList: true,
    filename: __filename
},
async (conn, m, mek, { from, q, prefix, reply }) => {
    try {
        if (!q) {
            return await reply('*Series URL missing.*');
        }

        const seriesUrl = q.trim();
        const info = await getMoviesublkInfo(seriesUrl);

        if (!info.downloadLinks || info.downloadLinks.length === 0) {
            return await reply('*No episodes found for this series.* ❌');
        }

        // Get unique episode names
        const episodes = [...new Set(info.downloadLinks.map(item => item.episode))].sort();

        // Build the info card caption
        let caption = `*🎬 ${info.title || 'TV Series'}*\n\n`;
        if (info.description) {
            caption += `*📖 Description:* ${info.description}\n\n*➟➟➟➟➟➟➟➟➟➟➟➟➟➟➟*\n*👥 𝙵𝙾𝙻𝙻𝙾𝚆 𝙾𝚄𝚁 𝙲𝙷𝙰𝙽𝙽𝙴𝙻 ➟* https://whatsapp.com/channel/0029Vb8JZnfA89MqNc8hLb18\n*➟➟➟➟➟➟➟➟➟➟➟➟➟➟➟*\n\n${config.DCARD}`;
        }
        caption += `*📦 Total Episodes:* ${episodes.length}\n\n`;
        caption += `*Tap the button below to see the episode list.*`;

        // Send as button message: image + caption + "View Episodes" button
        await conn.buttonMessage(from, {
            image: { url: info.image || config.LOGO || 'https://via.placeholder.com/300' },
            caption: caption,
            footer: config.FOOTER || 'VISPER MD',
            buttons: [{
                buttonId: `${prefix}mstepisodes ${seriesUrl}`,
                buttonText: { displayText: '📺 View Episodes' },
                type: 1
            }],
            headerType: 4
        }, mek);

    } catch (e) {
        console.error('mstvinfo error:', e);
        await reply('*Error fetching series details. Please check the URL or try again later.* 🚩');
    }
});

// ----- Command: mstepisodes (show episode list) -----
cmd({
    pattern: 'mstepisodes',
    react: '📋',
    dontAddCommandList: true,
    filename: __filename
},
async (conn, m, mek, { from, q, prefix, reply }) => {
    try {
        if (!q) {
            return await reply('*Series URL missing.*');
        }

        const seriesUrl = q.trim();
        const info = await getMoviesublkInfo(seriesUrl);

        if (!info.downloadLinks || info.downloadLinks.length === 0) {
            return await reply('*No episodes found for this series.* ❌');
        }

        const episodes = [...new Set(info.downloadLinks.map(item => item.episode))].sort();
        const rows = episodes.map(ep => ({
            title: `Episode ${ep}`,
            rowId: `${prefix}mstepisode ${seriesUrl}±${ep}`
        }));

        await conn.listMessage(from, {
            text: `*📋 Episodes of ${info.title || 'this series'}*`,
            footer: config.FOOTER || 'VISPER MD',
            title: 'Select Episode',
            buttonText: '📺 View Episodes',
            sections: [{ title: 'Episodes', rows }]
        }, mek);

    } catch (e) {
        console.error('mstepisodes error:', e);
        await reply('*Error fetching episode list.* 🚩');
    }
});

// ----- Command: mstepisode (show download buttons for a specific episode) -----
cmd({
    pattern: 'mstepisode',
    react: '🎯',
    dontAddCommandList: true,
    filename: __filename
},
async (conn, m, mek, { from, q, prefix, reply }) => {
    try {
        const parts = q.split('±');
        if (parts.length < 2) {
            return await reply('*Invalid episode selection.*');
        }
        const seriesUrl = parts[0];
        const episodeKey = parts[1];

        const info = await getMoviesublkInfo(seriesUrl);
        if (!info.downloadLinks) {
            return await reply(`*No download links for ${episodeKey}.*`);
        }

        const epLinks = info.downloadLinks.filter(item => item.episode === episodeKey);
        if (epLinks.length === 0) {
            return await reply(`*No links found for ${episodeKey}.*`);
        }

        const buttons = epLinks.map(link => ({
            buttonId: `${prefix}msdown ${link.url}±${link.type}±${info.title} ${episodeKey}`,
            buttonText: { displayText: `📥 ${link.type}` },
            type: 1
        }));

        const caption = `*📺 ${info.title} - ${episodeKey}*\n\nSelect a download source:`;

        await conn.buttonMessage(from, {
            image: { url: info.image || config.LOGO || 'https://via.placeholder.com/300' },
            caption: caption,
            footer: config.FOOTER || 'VISPER MD',
            buttons: buttons,
            headerType: 4
        }, mek);

    } catch (e) {
        console.error('mstepisode error:', e);
        await reply('*Error fetching episode details.* 🚩');
    }
});


// ----- Command: msdown (final download) -----
cmd({
    pattern: 'msdown',
    react: '⬇️',
    dontAddCommandList: true,
    filename: __filename
},
async (conn, m, mek, { from, q, reply }) => {
    try {
        const parts = q.split('±');
        if (parts.length < 3) {
            return await reply('*Invalid download request.*');
        }
        let url = parts[0];
        const type = parts[1];
        const title = parts[2];

        // Handle subtitle separately
        if (type.toLowerCase() === 'subtitle') {
            await conn.sendMessage(from, {
                text: `*📄 Subtitle for ${title}*\n\nLink: ${url}\n\n*Download manually or use a downloader.*`
            }, { quoted: mek });
            return;
        }

        // ---------- Google Drive resolver ----------
        if (url.includes('drive.google.com') || url.includes('drive.usercontent.google.com')) {
            await reply(`*🔗 Resolving Google Drive link...*`);
            try {
                const apiUrl = `https://www.ominisave.com/api/gdrive?url=${encodeURIComponent(url)}`;
                const response = await axios.get(apiUrl);
                const data = response.data;

                if (data.status && data.result && data.result.download) {
                    url = data.result.download; // replace with temporary direct link
                    await reply(`*✅ Direct link obtained! Sending file...*`);
                } else {
                    await reply(`*⚠️ Could not resolve GDrive link. Falling back to original URL.*`);
                }
            } catch (apiErr) {
                console.error('GDrive API error:', apiErr);
                await reply(`*⚠️ Error resolving GDrive link. Trying original URL...*`);
                // continue with original URL
            }
        }

        // Send the file
        await reply(`*⬇️ Downloading ${title} (${type})...*`);

        await conn.sendMessage(from, {
            document: { url: url },
            fileName: `${config.TITLE}${title}.mp4`,
            mimetype: 'video/mp4',
            caption: `*☑️ Download Complete!*\n\n📹 *${title}*\n📦 *Source:* ${type}\n\n${config.FOOTER || 'VISPER MD'}`
        }, { quoted: mek });

        await conn.sendMessage(from, { react: { text: '☑️', key: mek.key } });

    } catch (e) {
        console.error('msdown error:', e);
        await reply('*Failed to download. The link may be invalid or require authentication.* 🚩');
    }
});



// ============================================================
// COMMAND: subz – Search movies on subz.lk
// ============================================================
// ============================================================
// COMMAND: subz – Search movies on subz.lk
// ============================================================
cmd({
  pattern: 'subzlk',
  react: '🔍',
  category: 'movie',
  alias: ['sz'],
  desc: 'Search movies on subz.lk',
  use: '.subz movie name',
  filename: __filename
},
async (conn, m, mek, { from, q, prefix, isSudo, isOwner, isMe, reply }) => {
  try {
    if (config.MV_BLOCK === 'true' && !isMe && !isSudo && !isOwner) {
      return reply('*This command currently only works for the Bot owner.*');
    }
    if (!q) return reply('*Please give me a movie name 🎬*');

    const apiUrl = `https://mr-thinuzz-api-build.zone.id/api/subzlk/search?query=${encodeURIComponent(q)}&apiKey=${config.APIKEY}`;
    const { data: result } = await axios.get(apiUrl);

    if (!result.status || !result.data?.length) {
      return reply('*No results found ❌*');
    }

    let srh = [];
    result.data.slice(0, 30).forEach((movie) => {
      // 🔧 FIX: use 'link' instead of 'url'
      let url = movie.link || movie.url || '';
      if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://subz.lk' + (url.startsWith('/') ? '' : '/') + url;
      }
      srh.push({
        title: movie.title,
        rowId: `${prefix}subzinfo ${url}`
      });
    });

    const sections = [{
      title: `Search Results (${srh.length})`,
      rows: srh
    }];

    const listMessage = {
      text: `🎬 *SUBZ.LK SEARCH*\n\n🔎 Query: *${q}*\n\n_Select a movie below._`,
      footer: config.FOOTER || 'VISPER MD',
      title: 'Subz.lk Downloader',
      buttonText: '📂 View Results',
      sections
    };

    await conn.listMessage(from, listMessage, mek);
  } catch (e) {
    console.error('subz error:', e.message);
    reply('*🚩 Error occurred while searching!*');
  }
});

// ============================================================
// COMMAND: subzinfo – Movie info & quality buttons
// ============================================================
cmd({
  pattern: 'subzinfo',
  react: '🎥',
  desc: 'Get movie details and download options',
  filename: __filename
},
async (conn, m, mek, { from, q, prefix, reply }) => {
  try {
    if (!q) return reply('*Please provide a movie URL!*');

    // 🔧 Ensure URL is absolute
    let movieUrl = q.trim();
    if (movieUrl && !movieUrl.startsWith('http://') && !movieUrl.startsWith('https://')) {
      movieUrl = 'https://subz.lk' + (movieUrl.startsWith('/') ? '' : '/') + movieUrl;
    }

    const apiUrl = `https://mr-thinuzz-api-build.zone.id/api/subzlk/movie?url=${encodeURIComponent(movieUrl)}&apiKey=${config.APIKEY}`;
    const { data: res } = await axios.get(apiUrl);

    // 🧪 Validate response
    if (!res || !res.status || !res.data) {
      console.error('Invalid API response:', res);
      return reply('*🚩 Could not fetch movie details. The movie might not exist on subz.lk.*');
    }

    const movie = res.data;

    // ✅ Safe access to all fields
    const title = movie.title || 'N/A';
    const year = movie.year || 'N/A';
    const country = movie.country || 'N/A';
    const imdbRating = movie.imdb_rating || movie.rating || 'N/A';
    const quality = movie.quality || 'N/A';
    const description = movie.description || movie.overview || 'No description available.';
    const poster = movie.poster || movie.thumbnail || '';

    // Cast - safely map
    let castText = 'N/A';
    if (Array.isArray(movie.cast) && movie.cast.length > 0) {
      castText = movie.cast.slice(0, 5).map(c => `• ${c.name || 'Unknown'} (${c.role || 'Actor'})`).join('\n');
    }

    // Build caption
    let msg = `*▫🍿 𝗧𝗶𝘁𝗹𝗲 ➮* *_${title}_*

*▫📅 𝗥𝗲𝗹𝗲𝗮𝘀𝗲𝗱 𝗗𝗮𝘁𝗲 ➮* _${year}_
*▫🌎 𝗖𝗼𝘂𝗻𝘁𝗿𝘆 ➮* _${country}_
*▫💃 𝗥𝗮𝘁𝗶𝗻𝗴 ➮* _${imdbRating}_
*▫⏰ 𝗤𝘂𝗮𝗹𝗶𝘁𝘆 ➮* _${quality}_
*▫🎭 𝗖𝗮𝘀𝘁 ➮* ${castText}
*▫🕵️‍♀️ 𝗗𝗲𝘀𝗰ʀɪᴘᴛɪᴏɴ ➮* _${description.slice(0, 300)}${description.length > 300 ? '...' : ''}_

*➟➟➟➟➟➟➟➟➟➟➟➟➟➟➟*
*👥 𝙵𝙾𝙻𝙻𝙾𝚆 𝙾𝚄𝚁 𝙲𝙷𝙰𝙽𝙽𝙴𝙻 ➟* https://whatsapp.com/channel/0029Vb8JZnfA89MqNc8hLb18
*➟➟➟➟➟➟➟➟➟➟➟➟➟➟➟*

${config.DCARD}`;

    // 🔧 Get download links safely
    let downloadLinks = [];
    if (movie.download_links && Array.isArray(movie.download_links)) {
      downloadLinks = movie.download_links;
    } else if (movie.downloads && Array.isArray(movie.downloads)) {
      // Some APIs use "downloads" key
      downloadLinks = movie.downloads;
    }

    if (downloadLinks.length === 0) {
      return reply('*No download links available for this movie.*');
    }

    // Prepare buttons
    let buttons = [];
    downloadLinks.forEach(dl => {
      const link = dl.link || dl.url || '';
      const qualityLabel = dl.quality || 'Unknown';
      const size = dl.size || '';
      buttons.push({
        buttonId: `${prefix}subzget ${link}±${title}±${poster}±${qualityLabel}`,
        buttonText: { displayText: `${qualityLabel}${size ? ' - ' + size : ''}` },
        type: 1
      });
    });

    // If no buttons created (should not happen)
    if (buttons.length === 0) {
      return reply('*No download links available for this movie.*');
    }

    const buttonMessage = {
      image: { url: poster || 'https://via.placeholder.com/300x400?text=No+Poster' },
      caption: msg,
      footer: config.FOOTER || 'VISPER MD',
      buttons,
      headerType: 4
    };

    await conn.buttonMessage(from, buttonMessage, mek);
  } catch (e) {
    console.error('subzinfo error:', e.message, e.response?.data || '');
    reply('*🚩 Error occurred while fetching movie info! Please try again later.*');
  }
});

// ============================================================
// COMMAND: subzget – Final download via GDrive → direct CDN
// ============================================================
cmd({
  pattern: 'subzget',
  react: '⬇️',
  dontAddCommandList: true,
  filename: __filename
},
async (conn, mek, m, { from, q, reply }) => {
  try {
    if (!q) return reply('*📍 Please provide the required data!*');

    const parts = q.split('±');
    if (parts.length < 2) return reply('*⚠️ Invalid input!*');

    const [linkUrl, movieName, thumbUrl, quality] = parts;
    if (!linkUrl) return reply('*⚠️ Invalid download link!*');

    // Step 1: Get GDrive URL from subzlk download API
    const dlApi = `https://mr-thinuzz-api-build.zone.id/api/subzlk/download?link_url=${encodeURIComponent(linkUrl)}&apiKey=${config.APIKEY}`;
    const { data: dlRes } = await axios.get(dlApi);
    if (!dlRes || !dlRes.status || !dlRes.data?.download_url) {
      console.error('Download API response:', dlRes);
      return reply('*❌ Failed to retrieve download link from subz.lk*');
    }
    const gdriveUrl = dlRes.data.download_url;

    // Step 2: Get direct CDN link from ominisave
    const gdriveApi = `https://www.ominisave.com/api/gdrive?url=${encodeURIComponent(gdriveUrl)}`;
    const { data: gdriveRes } = await axios.get(gdriveApi);
    if (!gdriveRes || !gdriveRes.status || !gdriveRes.result?.download) {
      console.error('Ominisave API response:', gdriveRes);
      return reply('*❌ Failed to get direct download link from GDrive*');
    }
    const directUrl = gdriveRes.result.download;
    const fileName = gdriveRes.result.fileName || `${comfig.TITLE}${movieName || 'movie'}.mp4`;

    // Step 3: Send the file
    const loading = await conn.sendMessage(from, {
      text: '*Uploading movie... ⬆️*'
    }, { quoted: mek });

    // Prepare thumbnail
    let thumb = null;
    if (thumbUrl && thumbUrl.startsWith('http')) {
      try {
        const response = await axios.get(thumbUrl, { responseType: 'arraybuffer', timeout: 10000 });
        thumb = await sharp(Buffer.from(response.data))
          .resize(300, 300, { fit: 'cover' })
          .jpeg({ quality: 80 })
          .toBuffer();
      } catch (e) {
        console.warn('Thumbnail download error:', e.message);
      }
    }

    await conn.sendMessage(from, {
      document: { url: directUrl },
      mimetype: 'video/mp4',
      fileName: fileName,
      jpegThumbnail: thumb,
      caption: `*🎬 ${movieName || 'Movie'}*\n\n*\`${quality || 'Movie'}\`*\n\n${config.NAME || 'VISPER MD'}`
    }, { quoted: mek });

    // Clean up and react
    await conn.sendMessage(from, { delete: loading.key });
    await conn.sendMessage(from, { react: { text: '☑️', key: mek.key } });
  } catch (e) {
    console.error('subzget error:', e.message, e.response?.data || '');
    reply('*❌ Error:* ' + (e.message || 'Unknown error'));
  }
});
