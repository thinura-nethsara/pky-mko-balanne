const config = require('../config')
const axios = require('axios');
const fs = require('fs')
const file_size_url = (...args) => import('file_size_url')
.then(({ default: file_size_url }) => file_size_url(...args));
const cheerio = require('cheerio'); 
const { phsearch, phdl } = require('darksadas-yt-pornhub-scrape')
const { File } = require('megajs');
const fg = require('api-dylux');
const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const { igdl } = require('ruhend-scraper')
const { sizeFormatter} = require('human-readable');;
const { exec } = require('child_process');
const ffmpegPath = require('ffmpeg-static');
const { ytmp3, tiktok, facebook, instagram, twitter, ytmp4 } = require('sadaslk-dlcore');
const {
    getBuffer,
    getGroupAdmins,
    getRandom,
    getsize,
    h2k,
    isUrl,
    Json,
    runtime,
    sleep,
    fetchJson
} = require('../lib/functions')
const { search, download } = require('../lib/apkdl')

const {
    cmd,
    commands
} = require('../command')
const { getFbVideoInfo } =  require("fb-downloader-scrapper")
const https = require('https');
let wm = config.FOOTER
let newsize = config.MAX_SIZE * 1024 * 1024
var sizetoo =  "_This file size is too big_"
const yts = require("ytsearch-venom")
const g_i_s = require('g-i-s'); 
const fetch = (...args) => import("node-fetch").then(({ default: fetch }) => fetch(...args));
const sharp = require('sharp');

//===================================Sahrp funtion===============================================
async function resizeImage(inputBuffer, width, height) {
    try {
        return await sharp(inputBuffer).resize(width, height).toBuffer();
    } catch (error) {
        console.error('Error resizing image:', error);
        return inputBuffer; 
    }
}

//====================================Google Drive Dl Scrap==========================================






//=============================================== Filwe size checker=========================================

async function checkFileSize(url, maxMB = 150) {
    return new Promise((resolve, reject) => {
        let totalBytes = 0;
        https.get(url, res => {
            res.on('data', chunk => {
                totalBytes += chunk.length;
                const sizeMB = totalBytes / (1024 * 1024);
                if (sizeMB > maxMB) {
                    res.destroy(); // abort download
                    reject(new Error(`File exceeds ${maxMB} MB!`));
                }
            });
            res.on('end', () => resolve(totalBytes));
            res.on('error', err => rejepct(err));
        }).on('error', err => reject(err));
    });
}


  cmd({
    pattern: "gdrive",
    alias: ["gd"],
    react: '📑',
    desc: "Download Google Drive files.",
    category: "download",
    use: '.gdrive <googledrive link>',
    filename: __filename
},
async(conn, mek, m,{from, l, quoted, body, isCmd, command, args, q, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply}) => {
try {
  if (!q) return await reply('*Please give me a Google Drive URL !!*');
  
  // Use the new API
  const apiUrl = `https://www.ominisave.com/api/gdrive?url=${encodeURIComponent(q)}`;
  const response = await fetch(apiUrl);
  const data = await response.json();
  
  if (!data.status) throw new Error('API returned error');
  
  const { fileName, fileSize, download } = data.result;
  
  // Send info message
  await reply(`*🗃️ VISPER GDRIVE DOWNLOADER 🗃️*\n\n*📃 File name:* ${fileName}\n*💈 File Size:* ${fileSize || 'Unknown'}\n*🕹️ File type:* ${fileName.split('.').pop() || 'Unknown'}\n\n${config.FOOTER}`);
  
  // Send the file
  await conn.sendMessage(from, {
    document: { url: download },
    fileName: fileName,
    mimetype: 'application/octet-stream', // or detect from extension
    caption: fileName.replace('[Cinesubz.co]', '[visper-MOVIES.]') + '\n\n> *•ᴠɪsᴘᴇʀ-ᴍᴅ ᴡʜᴀᴛsᴀᴘᴘ ʙᴏᴛ•*'
  }, { quoted: mek });
  
} catch (e) {
  reply('*Error downloading file. Please check the URL and try again.*');
  console.error(e);
}
})






// ============================================================
// 🛠️ UNIQUE HELPER FUNCTIONS (prefixed with "song_")
// ============================================================

// Clean YouTube URL – remove tracking parameters
const song_cleanYtUrl = (url) => url.replace(/\?si=[^&]*/, '').split('&')[0];

// Fetch JSON from an API with error handling
const song_fetchJson = async (url) => {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
};

// Simple image resize stub (pass-through)
const song_resizeImage = async (buffer, width, height) => buffer;

// YouTube search wrapper using yt-search
const song_yts = async (query) => {
    const results = await ytSearch(query);
    return { videos: results.videos };
};

// ============================================================
// 🔍 MAIN SEARCH COMMAND
// ============================================================
cmd({
    pattern: "song",
    alias: ["ytsong"],
    use: '.song <query or url>',
    react: "🎧",
    desc: "Download high-quality songs from YouTube",
    category: "Download",
    filename: __filename
}, async (conn, mek, m, {
    from, prefix, q, reply
}) => {
    try {
        if (!q) return await reply('🔎 *Please provide a song name or YouTube link!*');

        const url = q.replace(/\?si=[^&]*/, '');
        const results = await song_yts(url);
        const result = results.videos[0];

        let caption = `*🎶VISPER MD SONG DOWNLODER🎶*

*☘️ Title :* *${result.title}*
*👁️ Views :* *${result.views}*
*⏰ Duration :* *${result.duration}*
*💃 Url :* *${result.url}*`;

        const buttons = [
            {
                buttonId: `${prefix}ytaa ${result.url}`,
                buttonText: { displayText: 'Audio Format 🎶' },
                type: 1
            },
            {
                buttonId: `${prefix}ytad ${result.url}`,
                buttonText: { displayText: 'Document Format 📂' },
                type: 1
            },
            {
                buttonId: `${prefix}ytaap ${result.url}`,
                buttonText: { displayText: 'Voice Format 🎤' },
                type: 1
            }
        ];

        const buttonMessage = {
            image: { url: result.thumbnail },
            caption: caption,
            buttons: buttons,
            headerType: 4
        };

        await conn.buttonMessage(from, buttonMessage, mek);

    } catch (e) {
        console.error(e);
        reply('❌ *Song not found or an error occurred.*');
    }
});

// ============================================================
// 🎶 AUDIO FORMAT (ytaa) – no size check
// ============================================================
cmd({
    pattern: "ytaa",
    react: "⬇️",
    dontAddCommandList: true,
    filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
    if (!q) return await reply('*Need a YouTube URL!*');

    try {
        const cleanUrl = song_cleanYtUrl(q);
        const encodedUrl = encodeURIComponent(cleanUrl);
        const apiUrl = `https://mr-thinuzz-api-build.zone.id/api/ytmp3/download?url=${encodedUrl}&apiKey=key_4797e0dcedd66cca`;

        console.log('➡️ Requesting API:', apiUrl);
        const prog = await song_fetchJson(apiUrl);

        console.log('📦 ytaa response:', JSON.stringify(prog, null, 2));

        if (!prog.status) {
            const errMsg = prog.message || 'Unknown API error';
            return reply(`❌ API error: ${errMsg}`);
        }

        if (!prog.data || !prog.data.links || !prog.data.links.audio) {
            throw new Error('Missing audio link in API response');
        }

        const audioUrl = prog.data.links.audio;

        await conn.sendMessage(from, { react: { text: '⬆️', key: mek.key } });

        await conn.sendMessage(
            from,
            { audio: { url: audioUrl }, mimetype: 'audio/mpeg' },
            { quoted: mek }
        );

        await conn.sendMessage(from, { react: { text: '✔️', key: mek.key } });

    } catch (e) {
        console.error('❌ ytaa error:', e);
        let msg = '❌ Download failed.';
        if (e.status === 404 || e.message.includes('404')) {
            msg = '❌ Video not found or unavailable. Please try another song.';
        } else if (e.status) {
            msg = `❌ HTTP error ${e.status}: ${e.message}`;
        } else {
            msg = `❌ Error: ${e.message || e}`;
        }
        reply(msg);
    }
});

// ============================================================
// 🎤 VOICE FORMAT (ytaap)
// ============================================================
cmd({
    pattern: "ytaap",
    react: "⬇️",
    dontAddCommandList: true,
    filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
    if (!q) return await reply('*Need a YouTube URL!*');

    try {
        const cleanUrl = song_cleanYtUrl(q);
        const encodedUrl = encodeURIComponent(cleanUrl);
        const apiUrl = `https://mr-thinuzz-api-build.zone.id/api/ytmp3/download?url=${encodedUrl}&apiKey=key_4797e0dcedd66cca`;

        console.log('➡️ Requesting API:', apiUrl);
        const prog = await song_fetchJson(apiUrl);

        console.log('📦 ytaap response:', JSON.stringify(prog, null, 2));

        if (!prog.status) {
            const errMsg = prog.message || 'Unknown API error';
            return reply(`❌ API error: ${errMsg}`);
        }

        if (!prog.data || !prog.data.links || !prog.data.links.audio) {
            throw new Error('Missing audio link in API response');
        }

        const audioUrl = prog.data.links.audio;

        await conn.sendMessage(from, { react: { text: '⬆️', key: mek.key } });

        const inputPath = `./temp_${Date.now()}.mp3`;
        const outputPath = `./temp_${Date.now()}.opus`;

        const res = await fetch(audioUrl);
        const arrayBuffer = await res.arrayBuffer();
        fs.writeFileSync(inputPath, Buffer.from(arrayBuffer));

        const ffmpegPath = 'ffmpeg'; // change if full path needed
        exec(`${ffmpegPath} -i ${inputPath} -c:a libopus -b:a 64k -vbr on -f ogg ${outputPath}`, async (error) => {
            if (error) {
                console.error('ffmpeg error:', error);
                return await reply('❌ Conversion error!');
            }

            const buffer = fs.readFileSync(outputPath);

            await conn.sendMessage(
                from,
                {
                    audio: buffer,
                    mimetype: 'audio/ogg; codecs=opus',
                    ptt: true
                },
                { quoted: mek }
            );

            // Clean up temp files
            if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
            if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);

            await conn.sendMessage(from, { react: { text: '✔️', key: mek.key } });
        });

    } catch (e) {
        console.error('❌ ytaap error:', e);
        let msg = '❌ Failed.';
        if (e.status === 404 || e.message.includes('404')) {
            msg = '❌ Video not found or unavailable. Please try another song.';
        } else if (e.status) {
            msg = `❌ HTTP error ${e.status}: ${e.message}`;
        } else {
            msg = `❌ Error: ${e.message || e}`;
        }
        await reply(msg);
    }
});

// ============================================================
// 📂 DOCUMENT FORMAT (ytad) – no footer
// ============================================================
cmd({
    pattern: "ytad",
    react: "⬇️",
    dontAddCommandList: true,
    filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
    try {
        if (!q) return await reply('*Need a YouTube URL!*');

        const cleanUrl = song_cleanYtUrl(q);
        const encodedUrl = encodeURIComponent(cleanUrl);
        const apiUrl = `https://mr-thinuzz-api-build.zone.id/api/ytmp3/download?url=${encodedUrl}&apiKey=key_4797e0dcedd66cca`;

        console.log('➡️ Requesting API:', apiUrl);
        const prog = await song_fetchJson(apiUrl);

        console.log('📦 ytad response:', JSON.stringify(prog, null, 2));

        if (!prog.status) {
            const errMsg = prog.message || 'Unknown API error';
            return reply(`❌ API error: ${errMsg}`);
        }

        if (!prog.data || !prog.data.links || !prog.data.links.audio) {
            throw new Error('Missing audio link in API response');
        }

        const audioUrl = prog.data.links.audio;
        const title = prog.data.title || 'audio';
        const thumbnailUrl = prog.data.thumbnail;

        let thumbnailBuffer = null;
        if (thumbnailUrl) {
            try {
                const thumbRes = await fetch(thumbnailUrl);
                const thumbArray = await thumbRes.arrayBuffer();
                thumbnailBuffer = Buffer.from(thumbArray);
                thumbnailBuffer = await song_resizeImage(thumbnailBuffer, 200, 200);
            } catch (e) {
                console.log('Thumbnail fetch error:', e);
            }
        }

        await conn.sendMessage(from, { react: { text: '⬆️', key: mek.key } });

        await conn.sendMessage(
            from,
            {
                document: { url: audioUrl },
                jpegThumbnail: thumbnailBuffer,
                mimetype: 'audio/mpeg',
                caption: `*${title}*`,
                fileName: `${title}.mpeg`
            },
            { quoted: mek }
        );

        await conn.sendMessage(from, { react: { text: '✔️', key: mek.key } });

    } catch (e) {
        console.error('❌ ytad error:', e);
        let msg = '❌ Error occurred.';
        if (e.status === 404 || e.message.includes('404')) {
            msg = '❌ Video not found or unavailable. Please try another song.';
        } else if (e.status) {
            msg = `❌ HTTP error ${e.status}: ${e.message}`;
        } else {
            msg = `❌ Error: ${e.message || e}`;
        }
        await reply(msg);
    }
});

// ============================================================
// ⬇️ DIRECT MP3 DOWNLOAD – no caption
// ============================================================
cmd({
    pattern: "directmp3",
    react: "⬇️",
    dontAddCommandList: true,
    filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
    try {
        if (!q) return await reply('*Need a youtube url!*');

        await conn.sendMessage(from, { react: { text: '⬆️', key: mek.key } });
        const up_mg = await conn.sendMessage(from, { text: `*Uploading request ..⬆️*` }, { quoted: mek });

        await conn.sendMessage(
            from,
            {
                audio: { url: q },
                mimetype: 'audio/mpeg',
                fileName: `test.mp3`
            }
        );
        await conn.sendMessage(from, { delete: up_mg.key });
        await conn.sendMessage(from, { react: { text: '✔️', key: mek.key } });
    } catch (e) {
        console.log(e);
        await reply('❌ Direct download failed.');
    }
});
      




// ---------- HELPER ----------
async function getYTVideo(url, quality) {
  // quality: '144','240','360','480','720','1080'
  const apiUrl = `${config.YT_API_BASE}?url=${encodeURIComponent(url)}&quality=${quality}p&apiKey=${config.YT_API_KEY}`;
  const res = await fetchJson(apiUrl);
  if (!res.status) throw new Error('API error: ' + JSON.stringify(res));
  return res.data; // { title, thumbnail, links: { video }, filename, ... }
}

// ---------- MAIN VIDEO COMMAND ----------
cmd({
  pattern: "video",
  alias: ["ytvideo"],
  use: '.video lelena',
  react: "📽️",
  desc: "Download videos",
  category: "download",
  filename: __filename
},
async (conn, mek, m, { from, prefix, q, reply }) => {
  try {
    if (!q) return await reply('*Please enter a query or a url!*');
    const url = q.replace(/\?si=[^&]*/, '');
    const results = await yts(url);
    const result = results.videos[0];

    const caption = `*🎥 VISPER VIDEO DOWNLOADER 🎥*
*┌─────────────────────┐*
*├ 📹 Title : ${result.title}* 
*├ 🐼 Views : ${result.views}*
*├ ⌛ Duration : ${result.duration}*
*├ 📎 URL : ${result.url}*
*└─────────────────────┘*`;

    const sections = [
      {
        title: "`Video type 📽️`",
        rows: [
          { title: '*144p Video*', rowId: prefix + `videodl144 ${result.url}` },
          { title: '*240p Video*', rowId: prefix + `videodl240 ${result.url}` },
          { title: '*360p Video*', rowId: prefix + `videodl360 ${result.url}` },
          { title: '*480p Video*', rowId: prefix + `videodl480 ${result.url}` },
          { title: '*720p Video*', rowId: prefix + `videodl720 ${result.url}` },
          { title: '*1080p Video*', rowId: prefix + `videodl1080 ${result.url}` }
        ]
      },
      {
        title: "`Document type 📁`",
        rows: [
          { title: '*144p Document*', rowId: prefix + `docdl144 ${result.url}` },
          { title: '*240p Document*', rowId: prefix + `docdl240 ${result.url}` },
          { title: '*360p Document*', rowId: prefix + `docdl360 ${result.url}` },
          { title: '*480p Document*', rowId: prefix + `docdl480 ${result.url}` },
          { title: '*720p Document*', rowId: prefix + `docdl720 ${result.url}` },
          { title: '*1080p Document*', rowId: prefix + `docdl1080 ${result.url}` }
        ]
      }
    ];

    const listMessage = {
      text: caption,
      image: { url: result.thumbnail },
      footer: config.FOOTER,
      title: '',
      buttonText: '*🔢 Reply below number*\n',
      sections
    };

    const listButtons = {
      title: "❯❯ Choose a video quality ❮❮",
      sections: [
        {
          title: "Video Type 📽️",
          rows: [
            { title: "144p Video", description: "144p quality download", id: prefix + `videodl144 ${result.url}` },
            { title: "240p Video", description: "240p quality download", id: prefix + `videodl240 ${result.url}` },
            { title: "360p Video", description: "360p quality download", id: prefix + `videodl360 ${result.url}` },
            { title: "480p Video", description: "480p quality download", id: prefix + `videodl480 ${result.url}` },
            { title: "720p Video", description: "720p quality download", id: prefix + `videodl720 ${result.url}` },
            { title: "1080p Video", description: "1080p quality download", id: prefix + `videodl1080 ${result.url}` }
          ]
        },
        {
          title: "Document Type 📁",
          rows: [
            { title: "144p Document", description: "144p quality download", id: prefix + `docdl144 ${result.url}` },
            { title: "240p Document", description: "240p quality download", id: prefix + `docdl240 ${result.url}` },
            { title: "360p Document", description: "360p quality download", id: prefix + `docdl360 ${result.url}` },
            { title: "480p Document", description: "480p quality download", id: prefix + `docdl480 ${result.url}` },
            { title: "720p Document", description: "720p quality download", id: prefix + `docdl720 ${result.url}` },
            { title: "1080p Document", description: "1080p quality download", id: prefix + `docdl1080 ${result.url}` }
          ]
        }
      ]
    };

    if (config.BUTTON === "true") {
      return await conn.sendMessage(from, {
        image: { url: result.thumbnail },
        caption,
        footer: config.FOOTER,
        buttons: [
          {
            buttonId: "Video quality list",
            buttonText: { displayText: "🎥 Select Option" },
            type: 4,
            nativeFlowInfo: {
              name: "single_select",
              paramsJson: JSON.stringify(listButtons)
            }
          }
        ],
        headerType: 1,
        viewOnce: true
      }, { quoted: mek });
    } else {
      await conn.listMessage4(from, listMessage, mek);
    }

  } catch (e) {
    reply('*Error !!*');
    console.log(e);
  }
});

// ---------- VIDEO DOWNLOADS (all qualities) ----------
cmd({ pattern: "videodl144", react: "⬇️", dontAddCommandList: true, filename: __filename },
async (conn, mek, m, { from, q, reply }) => {
  try {
    if (!q) return reply('*URL required*');
    const data = await getYTVideo(q, '144');
    await conn.sendMessage(from, { react: { text: '⬆️', key: mek.key } });
    await conn.sendMessage(from, {
      video: { url: data.links.video },
      caption: `${data.title}\n144p\n\n${config.FOOTER || ''}`
    }, { quoted: mek });
    await conn.sendMessage(from, { react: { text: '☑️', key: mek.key } });
  } catch (e) { console.error(e); reply('*Error*'); }
});

cmd({ pattern: "videodl240", react: "⬇️", dontAddCommandList: true, filename: __filename },
async (conn, mek, m, { from, q, reply }) => {
  try {
    if (!q) return reply('*URL required*');
    const data = await getYTVideo(q, '240');
    await conn.sendMessage(from, { react: { text: '⬆️', key: mek.key } });
    await conn.sendMessage(from, {
      video: { url: data.links.video },
      caption: `${data.title}\n240p\n\n${config.FOOTER || ''}`
    }, { quoted: mek });
    await conn.sendMessage(from, { react: { text: '☑️', key: mek.key } });
  } catch (e) { console.error(e); reply('*Error*'); }
});

cmd({ pattern: "videodl360", react: "⬇️", dontAddCommandList: true, filename: __filename },
async (conn, mek, m, { from, q, reply }) => {
  try {
    if (!q) return reply('*URL required*');
    const data = await getYTVideo(q, '360');
    await conn.sendMessage(from, { react: { text: '⬆️', key: mek.key } });
    await conn.sendMessage(from, {
      video: { url: data.links.video },
      caption: `${data.title}\n360p\n\n${config.FOOTER || ''}`
    }, { quoted: mek });
    await conn.sendMessage(from, { react: { text: '☑️', key: mek.key } });
  } catch (e) { console.error(e); reply('*Error*'); }
});

cmd({ pattern: "videodl480", react: "⬇️", dontAddCommandList: true, filename: __filename },
async (conn, mek, m, { from, q, reply }) => {
  try {
    if (!q) return reply('*URL required*');
    const data = await getYTVideo(q, '480');
    await conn.sendMessage(from, { react: { text: '⬆️', key: mek.key } });
    await conn.sendMessage(from, {
      video: { url: data.links.video },
      caption: `${data.title}\n480p\n\n${config.FOOTER || ''}`
    }, { quoted: mek });
    await conn.sendMessage(from, { react: { text: '☑️', key: mek.key } });
  } catch (e) { console.error(e); reply('*Error*'); }
});

cmd({ pattern: "videodl720", react: "⬇️", dontAddCommandList: true, filename: __filename },
async (conn, mek, m, { from, q, reply }) => {
  try {
    if (!q) return reply('*URL required*');
    const data = await getYTVideo(q, '720');
    await conn.sendMessage(from, { react: { text: '⬆️', key: mek.key } });
    await conn.sendMessage(from, {
      video: { url: data.links.video },
      caption: `${data.title}\n720p\n\n${config.FOOTER || ''}`
    }, { quoted: mek });
    await conn.sendMessage(from, { react: { text: '☑️', key: mek.key } });
  } catch (e) { console.error(e); reply('*Error*'); }
});

cmd({ pattern: "videodl1080", react: "⬇️", dontAddCommandList: true, filename: __filename },
async (conn, mek, m, { from, q, reply }) => {
  try {
    if (!q) return reply('*URL required*');
    const data = await getYTVideo(q, '1080');
    await conn.sendMessage(from, { react: { text: '⬆️', key: mek.key } });
    await conn.sendMessage(from, {
      video: { url: data.links.video },
      caption: `${data.title}\n1080p\n\n${config.FOOTER || ''}`
    }, { quoted: mek })
    await conn.sendMessage(from, { react: { text: '☑️', key: mek.key } });
  } catch (e) { console.error(e); reply('*Error*'); }
});

// ---------- DOCUMENT DOWNLOADS (all qualities) ----------
cmd({ pattern: "docdl144", react: "⬇️", dontAddCommandList: true, filename: __filename },
async (conn, mek, m, { from, q, reply }) => {
  try {
    if (!q) return reply('*URL required*');
    const data = await getYTVideo(q, '144');
    const thumbBuf = await fetch(data.thumbnail).then(r => r.buffer());
    const resized = await resizeImage(thumbBuf, 200, 200);
    await conn.sendMessage(from, { react: { text: '⬆️', key: mek.key } });
    await conn.sendMessage(from, {
      document: { url: data.links.video },
      jpegThumbnail: resized,
      caption: `144p\n${config.FOOTER || ''}`,
      mimetype: 'video/mp4',
      fileName: `${data.filename || data.title}.mp4`
    }, { quoted: mek });
    await conn.sendMessage(from, { react: { text: '☑️', key: mek.key } });
  } catch (e) { console.error(e); reply('*Error*'); }
});

cmd({ pattern: "docdl240", react: "⬇️", dontAddCommandList: true, filename: __filename },
async (conn, mek, m, { from, q, reply }) => {
  try {
    if (!q) return reply('*URL required*');
    const data = await getYTVideo(q, '240');
    const thumbBuf = await fetch(data.thumbnail).then(r => r.buffer());
    const resized = await resizeImage(thumbBuf, 200, 200);
    await conn.sendMessage(from, { react: { text: '⬆️', key: mek.key } });
    await conn.sendMessage(from, {
      document: { url: data.links.video },
      jpegThumbnail: resized,
      caption: `240p\n${config.FOOTER || ''}`,
      mimetype: 'video/mp4',
      fileName: `${data.filename || data.title}.mp4`
    }, { quoted: mek });
    await conn.sendMessage(from, { react: { text: '☑️', key: mek.key } });
  } catch (e) { console.error(e); reply('*Error*'); }
});

cmd({ pattern: "docdl360", react: "⬇️", dontAddCommandList: true, filename: __filename },
async (conn, mek, m, { from, q, reply }) => {
  try {
    if (!q) return reply('*URL required*');
    const data = await getYTVideo(q, '360');
    const thumbBuf = await fetch(data.thumbnail).then(r => r.buffer());
    const resized = await resizeImage(thumbBuf, 200, 200);
    await conn.sendMessage(from, { react: { text: '⬆️', key: mek.key } });
    await conn.sendMessage(from, {
      document: { url: data.links.video },
      jpegThumbnail: resized,
      caption: `360p\n${config.FOOTER || ''}`,
      mimetype: 'video/mp4',
      fileName: `${data.filename || data.title}.mp4`
    }, { quoted: mek });
    await conn.sendMessage(from, { react: { text: '☑️', key: mek.key } });
  } catch (e) { console.error(e); reply('*Error*'); }
});

cmd({ pattern: "docdl480", react: "⬇️", dontAddCommandList: true, filename: __filename },
async (conn, mek, m, { from, q, reply }) => {
  try {
    if (!q) return reply('*URL required*');
    const data = await getYTVideo(q, '480');
    const thumbBuf = await fetch(data.thumbnail).then(r => r.buffer());
    const resized = await resizeImage(thumbBuf, 200, 200);
    await conn.sendMessage(from, { react: { text: '⬆️', key: mek.key } });
    await conn.sendMessage(from, {
      document: { url: data.links.video },
      jpegThumbnail: resized,
      caption: `480p\n${config.FOOTER || ''}`,
      mimetype: 'video/mp4',
      fileName: `${data.filename || data.title}.mp4`
    }, { quoted: mek });
    await conn.sendMessage(from, { react: { text: '☑️', key: mek.key } });
  } catch (e) { console.error(e); reply('*Error*'); }
});

cmd({ pattern: "docdl720", react: "⬇️", dontAddCommandList: true, filename: __filename },
async (conn, mek, m, { from, q, reply }) => {
  try {
    if (!q) return reply('*URL required*');
    const data = await getYTVideo(q, '720');
    const thumbBuf = await fetch(data.thumbnail).then(r => r.buffer());
    const resized = await resizeImage(thumbBuf, 200, 200);
    await conn.sendMessage(from, { react: { text: '⬆️', key: mek.key } });
    await conn.sendMessage(from, {
      document: { url: data.links.video },
      jpegThumbnail: resized,
      caption: `720p\n${config.FOOTER || ''}`,
      mimetype: 'video/mp4',
      fileName: `${data.filename || data.title}.mp4`
    }, { quoted: mek });
    await conn.sendMessage(from, { react: { text: '☑️', key: mek.key } });
  } catch (e) { console.error(e); reply('*Error*'); }
});

cmd({ pattern: "docdl1080", react: "⬇️", dontAddCommandList: true, filename: __filename },
async (conn, mek, m, { from, q, reply }) => {
  try {
    if (!q) return reply('*URL required*');
    const data = await getYTVideo(q, '1080');
    const thumbBuf = await fetch(data.thumbnail).then(r => r.buffer());
    const resized = await resizeImage(thumbBuf, 200, 200);    await conn.sendMessage(from, { react: { text: '⬆️', key: mek.key } });
    await conn.sendMessage(from, {
      document: { url: data.links.video },
      jpegThumbnail: resized,
      caption: `1080p\n${config.FOOTER || ''}`,
      mimetype: 'video/mp4',
      fileName: `${data.filename || data.title}.mp4`
    }, { quoted: mek });
    await conn.sendMessage(from, { react: { text: '☑️', key: mek.key } });
  } catch (e) { console.error(e); reply('*Error*'); }
});




// ============================================================
// PLUGIN: Social Media Downloader (Facebook + JilHub)
// ============================================================
// Supports:
//   - Facebook videos (fbdl)
//   - JilHub videos (jilhub)
// ============================================================

// --------------------- Configuration -------------------------
const FB_BASE_URL = 'https://mr-thinuzz-api-build.zone.id/api/fbdown/';
const JIL_BASE_URL = 'https://mr-thinuzz-api-build.zone.id/api/jilhub/';
const API_KEY = 'key_4797e0dcedd66cca';

let isUploadingFb = false;
let isUploadingJil = false;

// ============================================================
// 1. FACEBOOK VIDEO DOWNLOADER
// ============================================================

cmd({
    pattern: 'fbdl',
    react: '📥',
    desc: 'Download Facebook videos',
    category: 'download',
    filename: __filename
},
async (conn, m, mek, { from, q, prefix, reply }) => {
    try {
        if (!q) {
            return await reply('*Please send a Facebook video link!* 📎\n\nExample:\n`' + prefix + 'fbdl https://www.facebook.com/share/v/18t6KjNmeK/`');
        }

        const urlMatch = q.match(/(https?:\/\/[^\s]+)/);
        if (!urlMatch) return await reply('*Invalid URL!*');
        const videoUrl = urlMatch[0];

        const apiUrl = `${FB_BASE_URL}download?url=${encodeURIComponent(videoUrl)}&apiKey=${API_KEY}`;
        const { data } = await axios.get(apiUrl, { timeout: 30000 });

        if (!data?.status || !data?.data) {
            return await reply('*Could not fetch video details. Please check the link.* ❌');
        }

        const videoData = data.data;
        const title = videoData.title || 'Facebook Video';
        const thumbnail = videoData.thumbnail || config.LOGO || 'https://via.placeholder.com/300';
        const duration = videoData.duration || 'N/A';
        const qualityFound = videoData.quality_found || 'N/A';
        const hdLink = videoData.links?.hd;
        const sdLink = videoData.links?.sd;

        if (!hdLink && !sdLink) {
            return await reply('*No download links found.* ❌');
        }

        let infoMessage = `*📹 𝗙𝗮𝗰𝗲𝗯𝗼𝗼𝗸 𝗩𝗶𝗱𝗲𝗼 𝗜𝗻𝗳𝗼*\n\n` +
                          `*📌 𝗧𝗶𝘁𝗹𝗲:* ${title}\n` +
                          `*⏱️ 𝗗𝘂𝗿𝗮𝘁𝗶𝗼𝗻:* ${duration}\n` +
                          `*🎞️ 𝗤𝘂𝗮𝗹𝗶𝘁𝘆 𝗙𝗼𝘂𝗻𝗱:* ${qualityFound}\n\n` +
                          `*Select a quality below to download:*`;

        let buttons = [];
        if (hdLink) {
            buttons.push({
                buttonId: `${prefix}fbget ${hdLink}±${title}±HD`,
                buttonText: { displayText: '📹 HD (High Quality)' },
                type: 1
            });
        }
        if (sdLink) {
            buttons.push({
                buttonId: `${prefix}fbget ${sdLink}±${title}±SD`,
                buttonText: { displayText: '🎬 SD (Standard Quality)' },
                type: 1
            });
        }

        await conn.buttonMessage(from, {
            image: { url: thumbnail },
            caption: infoMessage,
            footer: config.FOOTER || 'VISPER MD',
            buttons: buttons,
            headerType: 4
        }, mek);

    } catch (e) {
        console.error('fbdl error:', e);
        await reply('*An error occurred. Please try again.* 🚩');
    }
});

cmd({
    pattern: 'fbget',
    react: '⬇️',
    dontAddCommandList: true,
    filename: __filename
},
async (conn, m, mek, { from, q, reply }) => {
    if (isUploadingFb) {
        return await reply('*Another download is in progress. Please wait.* ⏳');
    }

    try {
        const [downloadUrl, title, quality] = q.split('±');
        if (!downloadUrl) return await reply('*Download link missing.* ❌');

        isUploadingFb = true;
        await reply(`*⬇️ Downloading ${title} (${quality})...*`);

        await conn.sendMessage(from, {
            document: { url: downloadUrl },
            fileName: `${title}_${quality}.mp4`,
            mimetype: 'video/mp4',
            caption: `*✅ Download Complete!*\n\n📹 *${title}*\n🎞️ *Quality:* ${quality}\n\n${config.FOOTER || 'VISPER MD'}`
        }, { quoted: mek });

        await conn.sendMessage(from, { react: { text: '✅', key: mek.key } });

    } catch (e) {
        console.error('fbget error:', e);
        await reply('*Failed to download. Please try again.* 🚩');
    } finally {
        isUploadingFb = false;
    }
});

// ============================================================
// 2. JILHUB VIDEO DOWNLOADER
// ============================================================





cmd({
    pattern: 'jilhub',
    alias: ['jilsearch'],
    react: '🔍',
    desc: 'Search JilHub videos',
    category: 'download',
    filename: __filename
},
async (conn, m, mek, { from, q, prefix, reply }) => {
    try {
        if (!q) {
            return await reply('*Please enter a search query!* 📝\n\nExample:\n`' + prefix + 'jilhub sri lankan`');
        }

        const searchUrl = `${JIL_BASE_URL}search?query=${encodeURIComponent(q)}&apiKey=${API_KEY}`;
        const { data } = await axios.get(searchUrl, { timeout: 30000 });

        // --- DEBUG: Uncomment the next line to see the full response in console ---
        // console.log(JSON.stringify(data, null, 2));

        // Check API status
        if (!data?.status) {
            return await reply('*API error: ' + (data?.message || 'Unknown') + '* ❌');
        }

        // Try to extract videos array from various possible structures
        let videos = [];
        if (Array.isArray(data.data)) {
            videos = data.data;
        } else if (data.data && Array.isArray(data.data.videos)) {
            videos = data.data.videos;
        } else if (data.data && Array.isArray(data.data.results)) {
            videos = data.data.results;
        } else if (data.data && typeof data.data === 'object') {
            // If data.data is an object with video properties, maybe it's a single result?
            // Try to see if it contains 'id' or 'title' – then treat as a single video
            if (data.data.id || data.data.title) {
                videos = [data.data];
            }
        }

        if (!videos.length) {
            return await reply('*No videos found for that query.* ❌');
        }

        // Limit to 10 results
        const results = videos.slice(0, 10);
        let rows = results.map(v => ({
            title: v.title || 'Untitled',
            rowId: `${prefix}jilvideo ${v.url}`
        }));

        await conn.listMessage(from, {
            text: `*🔎 JilHub Search Results*\n\n*Query:* ${q}\n*Found:* ${videos.length} videos\n\nSelect a video from the list below to get download options.`,
            footer: config.FOOTER || 'VISPER MD',
            title: 'Select Video',
            buttonText: '📋 View Results',
            sections: [{ title: 'Available Videos', rows }]
        }, mek);

    } catch (e) {
        console.error('jilhub search error:', e);
        await reply('*An error occurred while searching.* 🚩');
    }
});

// ============================================================
// JILVIDEO and JILDL commands (unchanged – they work)
// ============================================================

cmd({
    pattern: 'jilvideo',
    react: '🎬',
    dontAddCommandList: true,
    filename: __filename
},
async (conn, m, mek, { from, q, prefix, reply }) => {
    try {
        if (!q) {
            return await reply('*Video URL missing.*');
        }

        const urlMatch = q.match(/(https?:\/\/[^\s]+)/);
        if (!urlMatch) return await reply('*Invalid video URL.*');
        const videoUrl = urlMatch[0];

        const infoUrl = `${JIL_BASE_URL}video?url=${encodeURIComponent(videoUrl)}&apiKey=${API_KEY}`;
        const { data } = await axios.get(infoUrl, { timeout: 30000 });

        if (!data?.status || !data?.data) {
            return await reply('*Could not fetch video details. The link may be invalid.* ❌');
        }

        const video = data.data;
        const title = video.title || 'JilHub Video';
        const thumbnail = video.thumbnail || config.LOGO || 'https://via.placeholder.com/300';
        const duration = video.duration || 'N/A';
        const views = video.views || 'N/A';
        const rating = video.rating || 'N/A';
        const fileSize = video.file_size || 'N/A';

        // **********************************************
        // FIX: Prioritize final_download_url over download_url
        // **********************************************
        const downloadUrl = video.final_download_url || video.download_url;

        if (!downloadUrl) {
            return await reply('*No download link available.* ❌');
        }

        let caption = `*🎥 JilHub Video Details*\n\n` +
                      `*📌 Title:* ${title}\n` +
                      `*⏱️ Duration:* ${duration}\n` +
                      `*👁️ Views:* ${views}\n` +
                      `*⭐ Rating:* ${rating}\n` +
                      `*💾 Size:* ${fileSize}\n\n` +
                      `*Press the button below to download.*`;

        let buttons = [{
            buttonId: `${prefix}jildl ${downloadUrl}±${title}`,
            buttonText: { displayText: '⬇️ Download Video' },
            type: 1
        }];

        await conn.buttonMessage(from, {
            image: { url: thumbnail },
            caption: caption,
            footer: config.FOOTER || 'VISPER MD',
            buttons: buttons,
            headerType: 4
        }, mek);

    } catch (e) {
        console.error('jilvideo error:', e);
        await reply('*An error occurred while fetching video details.* 🚩');
    }
});

cmd({
    pattern: 'jildl',
    react: '⬇️',
    dontAddCommandList: true,
    filename: __filename
},
async (conn, m, mek, { from, q, reply }) => {
    if (isUploadingJil) {
        return await reply('*Another download is in progress. Please wait.* ⏳');
    }

    try {
        const [downloadUrl, title] = q.split('±');
        if (!downloadUrl) return await reply('*Download link missing.* ❌');

        isUploadingJil = true;
        await reply(`*⬇️ Downloading:* ${title} ...`);

        await conn.sendMessage(from, {
            document: { url: downloadUrl },
            fileName: `${title}.mp4`,
            mimetype: 'video/mp4',
            caption: `*✅ Download Complete!*\n\n📹 *${title}*\n\n${config.FOOTER || 'VISPER MD'}`
        }, { quoted: mek });

        await conn.sendMessage(from, { react: { text: '✅', key: mek.key } });

    } catch (e) {
        console.error('jildl error:', e);
        await reply('*Failed to download. Please try again.* 🚩');
    } finally {
        isUploadingJil = false;
    }
});
