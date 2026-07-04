const config = require('../config');
const { cmd, commands } = require('../command');
const axios = require('axios');
const sharp = require('sharp');
const { getBuffer, getGroupAdmins, getRandom, h2k, isUrl, Json, runtime, sleep, fetchJson } = require('../lib/functions');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const fileType = require('file-type');
const fg = require('api-dylux');

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
      { name: 'CINESUBZTV', cmd: 'cinetv' },
      { name: 'SINHALASUB', cmd: 'sinhalasub' },
      { name: 'SUBLK', cmd: 'sublk' },
      { name: 'MOVIEPRO', cmd: 'moviepro' },
      { name: 'SINHALACARTOONS', cmd: 'sinhalacartoons' }
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

    let msg = `*▫🍿 𝗧ɪᴛʟᴇ ➮* *_${movie.title}_*

*▫📅 𝗥𝗲𝗹𝗲𝗮𝘀𝗲𝗱 𝗗𝗮𝘁𝗲 ➮* _${movie.year}_
*▫🌎 𝗖𝗼𝘂𝗻𝘁𝗿𝘆 ➮* _N/A_
*▫💃 𝗥𝗮𝘁𝗶𝗻𝗴 ➮* _${movie.imdb_rating}_
*▫⏰ 𝗤𝘂𝗮𝗹𝗶𝘁𝘆 ➮* _${movie.quality}_
*▫🎭 𝗖𝗮𝘀𝘁 ➮* ${movie.cast?.slice(0, 5).map(c => `• ${c.name} (${c.role})`).join('\n') || 'N/A'}
*▫🕵️‍♀️ 𝗗𝗲𝘀𝗰𝗿𝗶𝗽𝘁𝗶𝗼𝗻 ➮* _${movie.description?.slice(0, 300) || 'No description'}..._`;

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

    await conn.sendMessage(from, {
      document: { url: directLink },
      mimetype: 'video/mp4',
      fileName: `${config.TITLE}${movieName}.mp4`,
      jpegThumbnail: thumb,
      caption: `*🎬 ${movieName}*\n\n*\`${quality || res.data.size}\`*\n\n${config.NAME || 'VISPER MD'}`
    }, { quoted: mek });

    await conn.sendMessage(from, { delete: loading.key });
    await conn.sendMessage(from, { react: { text: '✅', key: mek.key } });
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

    const searchUrl = `${BASE_URL}cinesubz/search?query=${encodeURIComponent(q)}&apiKey=${API_KEY}`;
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
    const infoUrl = `${BASE_URL}cinesubz/tvshow?url=${encodeURIComponent(q)}&apiKey=${API_KEY}`;
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
    const infoUrl = `${BASE_URL}cinesubz/tvshow?url=${encodeURIComponent(q)}&apiKey=${API_KEY}`;
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
      `✨ *Follow us:* ${details.mvchlink}`;

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

    const epInfoUrl = `${BASE_URL}cinesubz/episode?url=${encodeURIComponent(epUrl)}&apiKey=${API_KEY}`;
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

    const seriesUrl = `${BASE_URL}cinesubz/tvshow?url=${encodeURIComponent(mainUrl)}&apiKey=${API_KEY}`;
    const { data: seriesData } = await axios.get(seriesUrl, { timeout: 30000 });

    const targetSeason = seriesData.data.episodesDetails.find(s => s.season.toString() === seasonNum.toString());
    if (!targetSeason || !targetSeason.episodes || targetSeason.episodes.length === 0) {
      return await reply('*No episodes found for this season.*');
    }
    const firstEpUrl = targetSeason.episodes[0].url;

    const epInfoUrl = `${BASE_URL}cinesubz/episode?url=${encodeURIComponent(firstEpUrl)}&apiKey=${API_KEY}`;
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

    const seriesUrl = `${BASE_URL}cinesubz/tvshow?url=${encodeURIComponent(mainUrl)}&apiKey=${API_KEY}`;
    const { data: seriesData } = await axios.get(seriesUrl, { timeout: 30000 });

    const targetSeason = seriesData.data.episodesDetails.find(s => s.season.toString() === seasonNum.toString());
    if (!targetSeason || !targetSeason.episodes) {
      throw new Error('Season not found');
    }

    for (const ep of targetSeason.episodes) {
      try {
        const epTitle = `${title} S${String(seasonNum).padStart(2, '0')}E${String(ep.number).padStart(2, '0')}`;

        const epInfoUrl = `${BASE_URL}/episode?url=${encodeURIComponent(ep.url)}&apiKey=${API_KEY}`;
        const { data: qData } = await axios.get(epInfoUrl, { timeout: 30000 });

        if (!qData?.status || !qData?.data?.downloadUrl?.length) continue;

        const matchingDl = qData.data.downloadUrl.find(d => d.quality.trim() === selectedQuality.trim()) || qData.data.downloadUrl[0];

        const dlUrl = `${BASE_URL}cinesubz/download?url=${encodeURIComponent(matchingDl.link)}&apiKey=${API_KEY}`;
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

    const dlUrl = `${BASE_URL}cinesubz/download?url=${encodeURIComponent(processedUrl)}&apiKey=${API_KEY}`;
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
*🎭 𝗗ᴇꜱᴄʀɪᴘᴛɪᴏɴ ➮* _${sadas.data.description ? sadas.data.description.substring(0, 100) + '...' : 'N/A'}_`;

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

    await conn.sendMessage(from, {
      document: { url: direct_link },
      mimetype: 'video/mp4',
      fileName: `${config.TITLE} ${movieName}.mp4`,
      caption: `*🎬 Name :* *${movieName}*\n\n*\`${quality}\`*\n\n${config.NAME || 'VISPER MD'}`,
      jpegThumbnail: resizedThumb
    }, { quoted: mek });

    await conn.sendMessage(from, { react: { text: '✅', key: mek.key } });
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

    let msg = `*▫🍿 𝗧ɪᴛʟᴇ ➮* *_${movie.title}_*

*▫📅 𝗥𝗲𝗹𝗲𝗮𝘀𝗲𝗱 𝗗𝗮𝘁𝗲 ➮* _${movie.year}_
*▫🌎 𝗖𝗼𝘂𝗻𝘁𝗿𝘆 ➮* _N/A_
*▫⭐ 𝗥𝗮𝘁𝗶𝗻𝗴 ➮* _${movie.imdb_rating}_
*▫🔮 𝗤𝘂𝗮𝗹𝗶𝘁𝘆 ➮* _${movie.quality}_
*▫🎭 𝗖𝗮𝘀𝘁 ➮* ${movie.cast?.slice(0, 5).map(c => `• ${c.name} (${c.role})`).join('\n') || 'N/A'}
*▫🕵️‍♀️ 𝗗𝗲𝘀𝗰𝗿𝗶𝗽𝘁𝗶𝗼𝗻 ➮* _${movie.description?.slice(0, 300) || 'No description'}..._\n⇛⇛⇛⇛⇛⇛⇛⇛⇛⇛⇛\n🪀Follow us : https://whatsapp.com/channel/0029Vb8NvTj5K3zbmo1MCo35\n⇛⇛⇛⇛⇛⇛⇛⇛⇛⇛⇛\n\n\`𝕲𝖔𝖑𝖉𝖊𝖓 𝕾𝖈𝖗𝖊𝖊𝖓 🎬💛✨\``;

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
\n⇛⇛⇛⇛⇛⇛⇛⇛⇛⇛⇛\n🪀Follow us : https://whatsapp.com/channel/0029Vb8NvTj5K3zbmo1MCo35\n⇛⇛⇛⇛⇛⇛⇛⇛⇛⇛⇛\n\n${config.NAME || 'VISPER MD'}`;

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

\n⇛⇛⇛⇛⇛⇛⇛⇛⇛⇛⇛\n🪀Follow us : https://whatsapp.com/channel/0029Vb8NvTj5K3zbmo1MCo35\n⇛⇛⇛⇛⇛⇛⇛⇛⇛⇛⇛\n*\n ${config.NAME || 'VISPER MD'}`;

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

    const searchUrl = `${BASE_URL}lksubs/search?q=${encodeURIComponent(q)}&apiKey=${API_KEY}`;
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

    const infoUrl = `${BASE_URL}lksubs/info?url=${encodeURIComponent(q)}&apiKey=${API_KEY}`;
    const { data: res } = await axios.get(infoUrl, { timeout: 30000 });

    if (!res.status || !res.data) {
      return reply('*🚩 Movie details not found!*');
    }

    const movie = res.data;
    const cleanTitleStr = cleanTitle(movie.title);
    const poster = movie.thumbnail || config.LOGO || 'https://via.placeholder.com/300';

    const caption = `*▫🍿 𝗧ɪᴛʟᴇ ➮* *_${cleanTitleStr}_*

*▫📅 𝗬𝗲𝗮𝗿 ➮* _${movie.year || 'N/A'}_
*▫⭐ 𝗥𝗮𝘁𝗶𝗻𝗴 ➮* _${movie.rating || 'N/A'}/10_
*▫🎭 𝗚𝗲𝗻𝗿𝗲𝘀 ➮* _${movie.genres?.join(', ') || 'N/A'}_
*▫🎬 𝗤𝘂𝗮𝗹𝗶𝘁𝘆 ➮* _${movie.quality || 'N/A'}_
*▫👁️ 𝗩𝗶𝗲𝘄𝘀 ➮* _${movie.views || 'N/A'}_
*▫🌍 𝗖𝗼𝘂𝗻𝘁𝗿𝘆 ➮* _${movie.country || 'N/A'}_
*▫🎥 𝗗𝗶𝗿𝗲𝗰𝘁𝗼𝗿 ➮* _${movie.director || 'N/A'}_
*▫👥 𝗖𝗮𝘀𝘁 ➮* _${movie.cast?.slice(0, 3).join(', ') || 'N/A'}_`;

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

    const infoUrl = `${BASE_URL}lksubs/info?url=${encodeURIComponent(q)}&apiKey=${API_KEY}`;
    const { data: res } = await axios.get(infoUrl, { timeout: 30000 });

    if (!res.status || !res.data) {
      return reply('*🚩 Movie details not found!*');
    }

    const movie = res.data;
    const cleanTitleStr = cleanTitle(movie.title);

    let msg = `*▫🍿 𝗧ɪᴛʟᴇ ➮* *_${cleanTitleStr}_*

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

⇛⇛⇛⇛⇛⇛⇛⇛⇛⇛⇛
🪀 Follow us : https://whatsapp.com/channel/0029Vb8NvTj5K3zbmo1MCo35
⇛⇛⇛⇛⇛⇛⇛⇛⇛⇛⇛

${config.NAME || 'VISPER MD'}`;

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
      const dlUrl = `${BASE_URL}lksubs/download?link_url=${encodeURIComponent(linkUrl)}&apiKey=${API_KEY}`;
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

      await conn.sendMessage(from, { react: { text: '✅', key: mek.key } });
      return;
    }

    // Video download
    const dlUrl = `${BASE_URL}lksubs/download?link_url=${encodeURIComponent(linkUrl)}&apiKey=${API_KEY}`;
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

    await conn.sendMessage(from, { react: { text: '✅', key: mek.key } });
  } catch (e) {
    console.error('sublkdl error:', e);
    reply('🚫 *Error Occurred !!*\n\n' + e.message);
  } finally {
    isSubLkUploading = false;
  }
});

// ============================================================
// COMMAND: moviepro – Search from moviepro
// ============================================================
cmd({
  pattern: 'moviepro',
  react: '🔎',
  category: 'movie',
  alias: ['mp'],
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

    const api = `https://mr-thinuzz-api-build.zone.id/api/moviepro/search?keyword=${encodeURIComponent(q)}&apiKey=key_4797e0dcedd66cca`;
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
// COMMAND: movieprodl – Info & download buttons
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

    const api = `https://mr-thinuzz-api-build.zone.id/api/moviepro/info?id=${q}&apiKey=key_4797e0dcedd66cca`;
    const { data: res } = await axios.get(api);

    if (!res.status || !res.movie) {
      return reply('*🚩 Movie details not found!*');
    }

    const movie = res.movie;

    let msg = `*▫🍿 𝗧ɪᴛʟᴇ ➮* *_${movie.title}_*

*▫📅 𝗥𝗲𝗹𝗲𝗮𝘀𝗲𝗱 ➮* _${movie.releaseDate || 'N/A'}_
*▫🌎 𝗖𝗼𝘂𝗻𝘁𝗿𝘆 ➮* _${movie.country || 'N/A'}_
*▫🎭 𝗚𝗲𝗻𝗿𝗲 ➮* _${Array.isArray(movie.genre) ? movie.genre.join(', ') : movie.genre || 'N/A'}_
*▫⭐ 𝗜𝗠𝗗𝗕 ➮* _${movie.imdbRating || 'N/A'}_`;

    let buttons = [];

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
// COMMAND: movieprosend – Final download
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

    await conn.sendMessage(from, {
      document: { url: directUrl },
      mimetype: 'video/mp4',
      fileName: `${config.TITLE}${movieName}.mkv`,
      jpegThumbnail: thumb,
      caption: `*🎬 ${movieName}*\n\n*\`${quality}\`*\n\n${config.NAME || 'VISPER MD'}`
    }, { quoted: mek });

    await conn.sendMessage(from, { delete: loading.key });
    await conn.sendMessage(from, { react: { text: '✅', key: mek.key } });
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

    const api = `https://mr-thinuzz-api-build.zone.id/api/sincartoons/search?query=${encodeURIComponent(q)}&apiKey=key_4797e0dcedd66cca`;
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

    const api = `https://mr-thinuzz-api-build.zone.id/api/sincartoons/movie?url=${encodeURIComponent(movieUrl)}&apiKey=key_4797e0dcedd66cca`;
    const { data: res } = await axios.get(api);

    if (!res.status) {
      return reply('*🚩 Movie details not found!*');
    }

    const movie = res.data || {};

    let msg = `*▫🍿 𝗧ɪᴛʟᴇ ➮* *_${movie.title || 'N/A'}_*\n`;
    if (movie.year) msg += `*▫📅 𝗬𝗲𝗮𝗿 ➮* _${movie.year}_\n`;
    if (movie.director) msg += `*▫🎬 𝗗𝗶𝗿𝗲𝗰𝘁𝗼𝗿 ➮* _${movie.director}_\n`;
    if (movie.imdb_rating) msg += `*▫⭐ 𝗜𝗠𝗗𝗕 ➮* _${movie.imdb_rating}_\n`;
    if (movie.quality) msg += `*▫📊 𝗤𝘂𝗮𝗹𝗶𝘁𝘆 ➮* _${movie.quality}_\n`;
    if (movie.description) msg += `\n*▫📝 𝗗𝗲𝘀𝗰𝗿𝗶𝗽𝘁𝗶𝗼𝗻 ➮* _${movie.description.substring(0, 200)}${movie.description.length > 200 ? '...' : ''}_\n`;

    if (movie.cast && movie.cast.length > 0) {
      msg += `\n*▫🎭 𝗖𝗮𝘀𝘁 ➮* _`;
      const castNames = movie.cast.slice(0, 3).map(c => c.name).join(', ');
      msg += `${castNames}${movie.cast.length > 3 ? '...' : ''}_`;
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
    await conn.sendMessage(from, { react: { text: '✅', key: mek.key } });
  } catch (e) {
    console.log(e);
    reply('*❌ Error:* ' + e.message);
  }
});

// ============================================================
// (REMOVED) cineauto & stopauto – They caused errors due to missing functions/variables.
// If you still need them, please implement the missing helpers first.
// ============================================================
