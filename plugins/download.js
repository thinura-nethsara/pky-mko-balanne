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
            res.on('error', err => reject(err));
        }).on('error', err => reject(err));
    });
}
//.........................................APK DOWNLOAD.........................................
// ========== COMMAND 1: SEARCH ==========
cmd({
    pattern: "apk",
    react: '🔍',
    category: "downloader",
    alias: ["app","mobile"],
    desc: "Search for Android apps",
    use: ".apk app name",
    filename: __filename
},
async (conn, m, mek, { from, q, prefix, isSudo, isOwner, isMe, reply }) => {
    try {
        if (!q) return reply("*Please enter an app name to search!*\nEx: .apk free fire");

        const searchUrl = `https://mr-thinuzz-api-build.vercel.app/api/uptodown/search?query=${encodeURIComponent(q)}&apiKey=key_13be1374312cdd0a`;
        const { data: searchData } = await axios.get(searchUrl, { timeout: 30000 });

        if (!searchData?.status || !searchData?.data?.results?.length) {
            return reply("*No apps found. Try another name.*");
        }

        const results = searchData.data.results.slice(0, 30);
        let rows = [];

        results.forEach(app => {
            rows.push({
                title: app.title,
                rowId: `${prefix}apkinfo ${encodeURIComponent(app.url)}`
            });
        });

        const sections = [{
            title: `📦 Search Results 📦(${rows.length})`,
            rows
        }];

        await conn.listMessage(from, {
            text: `*📦VISPER MD APK SEARCH SYSTEM 📦*\n\n🔎 Query: *${q}*\n\n_Select an app below._`,
            footer: config.FOOTER || "ZEUS INC",
            title: "APK Downloader",
            buttonText: "📂 View Results",
            sections
        }, mek);

    } catch (e) {
        console.error(e);
        reply("*🚩 Search error!*");
    }
});


// ========== COMMAND 2: APP INFO & DOWNLOAD BUTTON ==========
cmd({
    pattern: "apkinfo",
    react: '📱',
    category: "downloader",
    alias: ["apkdl"],
    desc: "Get app details and download options",
    use: ".apkinfo <app_url>",
    filename: __filename
},
async (conn, m, mek, { from, q, prefix, reply }) => {
    try {
        if (!q) return reply("*Please provide the app URL from search results!*");

        const appUrl = decodeURIComponent(q);
        const infoUrl = `https://mr-thinuzz-api-build.vercel.app/api/uptodown/app?url=${encodeURIComponent(appUrl)}&apiKey=key_13be1374312cdd0a`;
        const { data: infoData } = await axios.get(infoUrl, { timeout: 30000 });

        if (!infoData?.status || !infoData?.data) {
            return reply("*Failed to fetch app details.*");
        }

        const app = infoData.data;
        const title = app.title || 'N/A';
        const version = app.version || 'N/A';
        const fileSize = app.file_size || 'N/A';
        const fileType = app.file_type || 'APK';
        const downloads = app.downloads || 'N/A';
        const rating = app.rating || 'N/A';
        const developer = app.developer || 'N/A';
        const description = app.description ? app.description.substring(0, 300) + '...' : 'No description available.';
        const icon = app.icon || 'https://i.imgur.com/8KmK9V8.jpeg';
        const downloadUrl = app.download_url;

        let msg = `*📦 ${title}*\n\n` +
                  `*👨‍💻 Developer:* ${developer}\n` +
                  `*📌 Version:* ${version}\n` +
                  `*💾 Size:* ${fileSize}\n` +
                  `*📁 Type:* ${fileType}\n` +
                  `*📥 Downloads:* ${downloads}\n` +
                  `*⭐ Rating:* ${rating}/5\n\n` +
                  `*📖 Description:*\n${description}\n\n` +
                  `_Click below to download:_`;

        const buttons = [{
            buttonId: `${prefix}apksend ${encodeURIComponent(downloadUrl)}±${title}±${version}±${fileSize}`,
            buttonText: { displayText: `⬇️ Download APK` },
            type: 1
        }];

        await conn.buttonMessage(from, {
            image: { url: icon },
            caption: msg,
            footer: config.FOOTER || "VISPER MD",
            buttons,
            headerType: 4
        }, mek);

    } catch (e) {
        console.error(e);
        reply("*🚩 Info error!*");
    }
});


// ========== COMMAND 3: SEND APK FILE ==========
cmd({
    pattern: "apksend",
    react: "⬇️",
    category: "downloader",
    dontAddCommandList: true,
    filename: __filename
},
async (conn, m, mek, { from, q, reply }) => {
    try {
        if (!q) return reply("*Please provide download details.*");

        const [encodedUrl, title, version, fileSize] = q.split("±");
        const directUrl = decodeURIComponent(encodedUrl);

        if (!directUrl) return reply("*Download URL missing.*");

        const loading = await conn.sendMessage(from, {
            text: "*Uploading APK... ⬆️*"
        }, { quoted: mek });

        // Optional: generate thumbnail from icon (you can add that if you want)
        // For now, we send without thumbnail

        await conn.sendMessage(from, {
            document: { url: directUrl },
            mimetype: "application/vnd.android.package-archive",
            fileName: `📚VISPER-MD📚${title.replace(/[^\w\s]/g, '')}_v${version}.apk`,
            caption: `*📦 ${title}*\n*📌 Version:* ${version}\n*💾 Size:* ${fileSize}\n\n${config.FOOTER || "VISPER MD"}`
        }, { quoted: mek });

        await conn.sendMessage(from, { delete: loading.key });
        await conn.sendMessage(from, { react: { text: "☑️", key: mek.key } });

    } catch (e) {
        console.error(e);
        reply("*❌ Download error:* " + e.message);
    }
});
//=================================================================================================================
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
        const results = await yts(url);
        const result = results.videos[0];
        const wm = config.FOOTER;

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
            footer: wm,
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
// 🎶 AUDIO FORMAT (ytaa) – with HTTP error handling
// ============================================================
cmd({
    pattern: "ytaa",
    react: "⬇️",
    dontAddCommandList: true,
    filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
    if (!q) return await reply('*Need a YouTube URL!*');

    try {
        const cleanUrl = cleanYtUrl(q);
        const encodedUrl = encodeURIComponent(cleanUrl);
        const apiUrl = `https://mr-thinuzz-api-build.zone.id/api/ytmp3/download?url=${encodedUrl}&apiKey=key_4797e0dcedd66cca`;

        console.log('➡️ Requesting API:', apiUrl);
        const prog = await fetchJson(apiUrl);

        console.log('📦 ytaa response:', JSON.stringify(prog, null, 2));

        if (!prog.status) {
            const errMsg = prog.message || 'Unknown API error';
            return reply(`❌ API error: ${errMsg}`);
        }

        if (!prog.data || !prog.data.links || !prog.data.links.audio) {
            throw new Error('Missing audio link in API response');
        }

        const audioUrl = prog.data.links.audio;

        // Optional file size check
        try {
            const bytes = await checkFileSize(audioUrl, config.MAX_SIZE);
            const sizeInMB = (bytes / (1024 * 1024)).toFixed(2);
            if (sizeInMB > config.MAX_SIZE) {
                return reply(`*⚠️ File too large!*\n\n*📌 Maximum allowed: \`${config.MAX_SIZE}\` MB*`);
            }
        } catch (err) {
            return reply(`*⚠️ File too large or cannot determine size!*\n\n*📌 Maximum allowed: \`${config.MAX_SIZE}\` MB*`);
        }

        await conn.sendMessage(from, { react: { text: '⬆️', key: mek.key } });

        await conn.sendMessage(
            from,
            { audio: { url: audioUrl }, mimetype: 'audio/mpeg' },
            { quoted: mek }
        );

        await conn.sendMessage(from, { react: { text: '✔️', key: mek.key } });

    } catch (e) {
        console.error('❌ ytaa error:', e);
        // Check if it's a 404/network error
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
// 🎤 VOICE FORMAT (ytaap) – with HTTP error handling
// ============================================================
cmd({
    pattern: "ytaap",
    react: "⬇️",
    dontAddCommandList: true,
    filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
    if (!q) return await reply('*Need a YouTube URL!*');

    try {
        const cleanUrl = cleanYtUrl(q);
        const encodedUrl = encodeURIComponent(cleanUrl);
        const apiUrl = `https://mr-thinuzz-api-build.zone.id/api/ytmp3/download?url=${encodedUrl}&apiKey=key_4797e0dcedd66cca`;

        console.log('➡️ Requesting API:', apiUrl);
        const prog = await fetchJson(apiUrl);

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
// 📂 DOCUMENT FORMAT (ytad) – with HTTP error handling
// ============================================================
cmd({
    pattern: "ytad",
    react: "⬇️",
    dontAddCommandList: true,
    filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
    try {
        if (!q) return await reply('*Need a YouTube URL!*');

        const cleanUrl = cleanYtUrl(q);
        const encodedUrl = encodeURIComponent(cleanUrl);
        const apiUrl = `https://mr-thinuzz-api-build.zone.id/api/ytmp3/download?url=${encodedUrl}&apiKey=key_4797e0dcedd66cca`;

        console.log('➡️ Requesting API:', apiUrl);
        const prog = await fetchJson(apiUrl);

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
                if (typeof resizeImage === 'function') {
                    thumbnailBuffer = await resizeImage(thumbnailBuffer, 200, 200);
                }
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
                caption: `*${title}*\n\n${config.FOOTER}`,
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
// ⬇️ DIRECT MP3 DOWNLOAD (unchanged)
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
                caption: config.FOOTER,
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

// ============================================================
//  FULLY FIXED VIDEO DOWNLOADER (uses Mr Thinuzz API)
//  All video/doc commands now use the new endpoint.
// ============================================================

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
    const resized = await resizeImage(thumbBuf, 200, 200);
    await conn.sendMessage(from, { react: { text: '⬆️', key: mek.key } });
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
    
