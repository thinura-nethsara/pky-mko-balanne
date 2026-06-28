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

//===============================================================================================

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


cmd({
    pattern: "mega",
    react: "🍟",
    alias: ["megadl", "meganz"],
    desc: "Download files from Mega.nz",
    category: "download",
    use: ".mega <mega.nz URL>",
    filename: __filename
},
async (conn, mek, m, { from, q, reply }) => {
    try {
        if (!q) return await reply("⚠️ Please provide a Mega.nz URL!");

        const { File } = require('megajs');
        const file = File.fromURL(q);
        await file.loadAttributes();

        const fileName = file.name;
        const fileSize = file.size;
        const fileSizeMB = (fileSize / (1024 * 1024)).toFixed(2);

        await reply(
            `⏳ *Downloading from Mega.nz...*\n\n` +
            `📄 *File:* ${fileName}\n` +
            `📁 *Size:* ${fileSizeMB} MB`
        );

        // 🔥 STREAM එක BUFFER එකට CONVERT කරන්න
        const stream = file.download();
        const chunks = [];
        for await (const chunk of stream) {
            chunks.push(chunk);
        }
        const buffer = Buffer.concat(chunks);

        // Mimetype හඳුනාගැනීම
        const ext = fileName.split('.').pop().toLowerCase();
        const mimeTypes = {
            mp4: "video/mp4", pdf: "application/pdf", zip: "application/zip",
            rar: "application/x-rar-compressed", "7z": "application/x-7z-compressed",
            jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png",
            mp3: "audio/mpeg", mkv: "video/x-matroska",
            apk: "application/vnd.android.package-archive"
        };
        const mimetype = mimeTypes[ext] || "application/octet-stream";

        // BUFFER එක එවන්න
        await conn.sendMessage(
            from,
            {
                document: buffer,
                fileName: fileName,
                mimetype: mimetype,
                caption:
                    `*Name:* ${fileName}\n` +
                    `*Size:* ${fileSizeMB} MB\n` +
                    `*Type:* ${mimetype}\n\n` +
                    `${config.FOOTER}`
            },
            { quoted: mek }
        );

        await conn.sendMessage(from, {
            react: { text: "✅", key: mek.key }
        });

    } catch (e) {
        console.error(e);
        await reply(`❌ *Error occurred:* ${e.message || 'Invalid Mega URL or network issue.'}`);
    }
});



function ytreg(url) {
    const ytIdRegex = /(?:http(?:s|):\/\/|)(?:(?:www\.|)youtube(?:\-nocookie|)\.com\/(?:watch\?.*(?:|\&)v=|embed|shorts\/|v\/)|youtu\.be\/)([-_0-9A-Za-z]{11})/
    return ytIdRegex.test(url);
}
cmd({
    pattern: "yts",
    alias: ["ytsearch"],
    use: ".yts <song name or URL>",
    react: "🔎",
    desc: "Search songs on YouTube",
    category: "search",
    filename: __filename
},
async (conn, mek, m, { from, q, reply, isCmd, command, l }) => {
    try {
        if (!q) {
            return await reply("*⚠️ Please provide a search term or URL!*");
        }

        // Check if input is a URL but not a valid YouTube URL
        if (isUrl(q) && !ytreg(q)) {
            return await reply("*⚠️ Invalid YouTube URL!*");
        }

        // Import ytsearch-venom dynamically
        let yts;
        try {
            yts = require("ytsearch-venom");
        } catch (err) {
            l(err);
            return await reply("*❌ ytsearch-venom module is missing!*");
        }

        // Perform search
        let arama;
        try {
            arama = await yts(q);
        } catch (err) {
            l(err);
            return await reply("*❌ Error while searching YouTube!*");
        }

        // Format search results
        if (!arama.all || arama.all.length === 0) {
            return await reply("*⚠️ No results found!*");
        }

        let mesaj = '';
        arama.all.map((video, index) => {
            mesaj += `*${index + 1}. ${video.title}*\n🔗 ${video.url}\n\n`;
        });

        await conn.sendMessage(from, { text: mesaj }, { quoted: mek });

    } catch (err) {
        l(err);
        await reply("*❌ Unexpected error occurred!*");
    }
});




function cleanYtUrl(url) {
    try {
        const u = new URL(url);
        // Remove 'si' and other common tracking params
        u.searchParams.delete('si');
        u.searchParams.delete('feature');
        u.searchParams.delete('utm_source');
        return u.toString();
    } catch {
        return url; // fallback
    }
}

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
                fileName: `${title}.mp3`
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



    

cmd({
    pattern: "tiktok",    
  alias: ["tt","ttdl","tiktokdl"],
    react: '🎩',
    desc: "Download tiktok videos",
    category: "download",
    use: '.tiktok < tiktok url >',
    filename: __filename
},
async(conn, mek, m,{from, l, prefix, quoted, body, isCmd, command, args, q, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply}) => {
try{
  
  
  if (!q) return await reply('TEXT') 
      if (!q.includes('tiktok')) return await reply('valid_url') 


const mov = await fetchJson(`https://darksadasyt-tiktokdl.vercel.app/api/tiktok?q=${q}`)

let caption = `*🪺 VISPER TIK TOK DOWNLODER 🪺*

*┌──────────────────*
*├ 🎩 Title :* ${mov.title}
*├ 🎃 Region :* ${mov.regions}
*├ ⏰ Duration :* ${mov.runtime}
*├ 🔗 Url :* ${q}
*└──────────────────*
${config.FOOTER}
`



const buttons = [
  {buttonId: prefix + 'ttdl1 ' + mov.no_watermark, buttonText: {displayText: '*Video No Watermark 📼*'}, type: 1},
  {buttonId: prefix + 'ttdl2 ' + mov.watermark, buttonText: {displayText: '*Video Watermark 📼*'}, type: 1},
  {buttonId: prefix + 'ttdl3 ' + mov.music, buttonText: {displayText: '*Audio 🎶*'}, type: 1}
 
]
const buttonMessage = {
    image: {url: mov.thumbnail},
    caption: caption,
    footer: config.FOOTER,
    buttons: buttons,
    headerType: 4
}

const listButtons = {
  title: "❯❯ Choose a video Format ❮❮",
  sections: [
    {
      title: "Tiktok Video Type 📽️",
      rows: [
        { title: "Video No Watermark", "description":"No Watermark", id: prefix + 'ttdl1 ' + mov.no_watermark },
        { title: "Video Watermark",  "description":"With Watermark",id: prefix + 'ttdl2 ' + mov.watermark},
        { title: "Audio", "description":"Only Mp3", id: prefix + 'ttdl3 ' + mov.music }
      ]
    }
  ]
};

    // Sending logic based on config.BUTTON
    if (config.BUTTON === "true") {
      return await conn.sendMessage(from, {
        image: {url: mov.thumbnail },
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

} else if (config.BUTTON === 'false') {
  
await conn.buttonMessage(from, buttonMessage, mek)

}

} catch (e) {
  reply(`Error !!\n\n*${e}*`)
  console.log(e)
}
})


cmd({
    pattern: "ttdl1",
    react: '⬇️',
    dontAddCommandList: true,
    filename: __filename
},
  
async(conn, mek, m,{from, l, quoted, body, isCmd, command, args, q, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply}) => {
try{

await conn.sendMessage(from, { react: { text: '⬆️', key: mek.key } });	
conn.sendMessage(from, { video: { url: q }, mimetype: "video/mp4", caption: `${config.FOOTER}` }, { quoted: mek })
  await conn.sendMessage(from, { react: { text: `✔️`, key: mek.key } })
} catch (e) {
console.log(e)
reply(`Error !!\n\n*${e}*`)
}
})

cmd({
    pattern: "ttdl2",
    react: '⬇️',
    dontAddCommandList: true,
    filename: __filename
},
  
async(conn, mek, m,{from, l, quoted, body, isCmd, command, args, q, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply}) => {
try{

await conn.sendMessage(from, { react: { text: '⬆️', key: mek.key } });	
conn.sendMessage(from, { video: { url: q }, mimetype: "video/mp4", caption: `${config.FOOTER}` }, { quoted: mek })
  await conn.sendMessage(from, { react: { text: `✔️`, key: mek.key } })
} catch (e) {
console.log(e)
reply(`Error !!\n\n*${e}*`)
}
})

cmd({
    pattern: "ttdl3",
    react: '⬇️',
    dontAddCommandList: true,
    filename: __filename
},
  
async(conn, mek, m,{from, l, quoted, body, isCmd, command, args, q, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply}) => {
try{

	await conn.sendMessage(from, { react: { text: '⬆️', key: mek.key } });
conn.sendMessage(from, { audio: { url: q }, mimetype: "audio/mpeg", caption: `${config.FOOTER}` }, { quoted: mek })
  await conn.sendMessage(from, { react: { text: `✔️`, key: mek.key } })
} catch (e) {
console.log(e)
reply(`Error !!\n\n*${e}*`)
}
})


cmd({
    pattern: "ttdl4",
    react: '⬇️',
    dontAddCommandList: true,
    filename: __filename
},
  
async(conn, mek, m,{from, l, quoted, body, isCmd, command, args, q, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply}) => {
try{
await conn.sendMessage(from, { react: { text: '⬆️', key: mek.key } });
conn.sendMessage(from, { audio: { url: q }, mimetype: "audio/mpeg", caption: `${config.FOOTER}` }, { quoted: mek })
  await conn.sendMessage(from, { react: { text: `✔️`, key: mek.key } })
} catch (e) {
console.log(e)
reply(`Error !!\n\n*${e}*`)
}
})

cmd({
    pattern: "fb",
    alias: ["facebook"],
    use: '.fb <facebook url>',
    react: "🏮",
    desc: 'Download videos from Facebook',
    category: "download",
    filename: __filename
}, async (conn, m, mek, { from, prefix, q, reply }) => {
    try {
        if (!q || !q.includes('facebook.com')) {
            return await reply('*❌ Please enter a valid Facebook URL!*');
        }

        const apiURL = `https://apis.prexzyvilla.site/download/facebook?url=${encodeURIComponent(q)}`;
        console.log('🌐 FB API URL:', apiURL);

        let sadas;
        try {
            const res = await axios.get(apiURL, {
                headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
                    "Accept": "application/json",
                    "Referer": "https://www.facebook.com/"
                }
            });
            sadas = res.data;
            console.log('📦 API DATA:', JSON.stringify(sadas, null, 2));
        } catch (err) {
            console.error("❌ AXIOS ERROR:", err.response?.data || err.message);
            return reply('*⚠️ Failed to fetch data from Facebook API. Check console for details.*');
        }

        if (!sadas.status || !sadas.data) {
            return reply('*❌ No downloadable data found. Try another video.*');
        }

        const data = sadas.data;
        const hdUrl = data.hd;
        const sdUrl = data.sd;
        let thumb = data.thumbnail;

        // ✅ Use fallback or proxy for thumbnail
        if (!thumb || !thumb.startsWith('http')) {
            thumb = 'https://i.imgur.com/qNQv8Ru.jpeg';
        } else {
            thumb = `https://images.weserv.nl/?url=${encodeURIComponent(thumb.replace(/^https?:\/\//, ''))}`;
        }

        const duration = 'Unknown'; // Not available in new API
        const title = data.title || 'Facebook video';

        const caption = `*🏮 VISPER FB DOWNLOADER 🏮*
         *┌──────────────────*
         *├ 🐼 Title:* ${title}
         *├ ⏱️ Duration:* ${duration}
         *├ 🔗 Url:* ${q}
         *└──────────────────*
		 ${config.FOOTER}`;

        const buttons = [];

        if (hdUrl) {
            buttons.push({
                buttonId: prefix + 'downfb ' + hdUrl,
                buttonText: { displayText: '*HD Quality*' },
                type: 1
            });
        }

        if (sdUrl) {
            buttons.push({
                buttonId: prefix + 'downfb ' + sdUrl,
                buttonText: { displayText: '*SD Quality*' },
                type: 1
            });
        }

        if (buttons.length === 0) {
            return reply('*❌ No video formats found.*');
        }

        const buttonMessage = {
            image: { url: thumb },
            caption: caption,
            footer: config.FOOTER,
            buttons: buttons,
            headerType: 4
        };




            await conn.buttonMessage(from, buttonMessage, mek);


    } catch (e) {
        console.error('❌ Unexpected Error:', e);
        return reply('*⚠️ An unexpected error occurred. Try again later.*');
    }
});




cmd({
  pattern: "downfb",
  react: "🎥",
  dontAddCommandList: true,
  filename: __filename
},
async (conn, mek, m, { from, q, reply }) => {
  try {
    if (!q || !q.includes('fbcdn')) return await reply('*❌ Invalid Facebook CDN video URL!*');

    reply('⏳ *Downloading Facebook video...*');

 const response = await axios.get(q, {
  responseType: 'arraybuffer',
  headers: {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    "Accept": "*/*",
    "Accept-Encoding": "identity",
    "Referer": "https://fdown.net/",
    "Origin": "https://fdown.net"
  }
});


    const videoBuffer = Buffer.from(response.data, 'binary');

    await conn.sendMessage(from, {
      video: videoBuffer,
      mimetype: 'video/mp4',
      caption: '✅ *Facebook video downloaded successfully!*'
    }, { quoted: mek });

    await conn.sendMessage(from, { react: { text: '✔️', key: mek.key } });

  } catch (error) {
    console.log("❌ Facebook video download error:", error);
    reply('*❌ Failed to download. The video might be geo-blocked or expired.*');
  }
});








cmd({
    pattern: "img",
    alias: ["googleimg"],
    //react: "🌅",
    desc: "Search for images on Google",
    category: "download",
    use: '.imgsearch <query>',
    filename: __filename
},

async(conn, mek, m,{from, l, quoted, body, isCmd, command, args, q, isGroup, prefix, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply}) => {
try{
if (!q) return reply('*Please provide a search query!*')


var rows = [];  	
rows.push(
    { buttonId: prefix + 'imgdlm ' + q, buttonText: { displayText: '*Normal Type 🎑*' }, type: 1 },
    { buttonId: prefix + 'imgdld ' + q, buttonText: { displayText: '*Document Type 🎑*' }, type: 1 }
);

 const caption = `*🦊 Choose Image Download Type..*
 `
const buttonMessage = {
 

  caption: caption,
  footer: config.FOOTER,
  buttons: rows,
  headerType: 1
}
 if (config.BUTTON === "true") {
conn.sendMessage(from, {
    
    text: caption,
    footer: config.FOOTER,
    buttons: [
        {
            buttonId: prefix + 'imgdlm ' + q,
            buttonText: { displayText: "Normal Type" },
            type: 1
        },
        {
            buttonId: prefix + 'imgdld ' + q,
            buttonText: { displayText: "Document Type" },
            type: 1
        }
    ],
    headerType: 1,
    viewOnce: true
}, { quoted: mek });

} else if (config.BUTTON === 'false') {

	
return await conn.buttonMessage(from, buttonMessage, mek)

}
} catch (e) {
   reply('🚫 *Error Accurated !!*\n\n' + e )
console.log(e)
}
})







cmd({
    pattern: "imgdlm",
    //alias: ["googleimg"],
    react: "🌅",
    //desc: "Search for images on Google",
    //category: "search",
    use: '.imgsearch <query>',
    filename: __filename
},
async(conn, mek, m, { from, reply, q }) => {
    try {
        if (!q) return await reply("Please provide a search query!");

        g_i_s(q, (error, result) => {
            if (error || !result.length) return reply("No images found!");

            // Send the first 5 images
            const imageUrls = result.slice(0, 5).map(img => img.url);
            imageUrls.forEach(async (url) => {
               await conn.sendMessage(from, 
    { 
        image: { url }, 
        caption: config.FOOTER 
    }, 
    { quoted: mek }
);

            });
        });

    } catch (error) {
        console.error(error);
        reply('An error occurred while processing your request. Please try again later.');
    }
});

cmd({
    pattern: "imgdld",
    //alias: ["googleimg"],
    react: "🌅",
    //desc: "Search for images on Google",
    //category: "search",
    use: '.imgsearch <query>',
    filename: __filename
},
async(conn, mek, m, { from, reply, q }) => {
    try {
        if (!q) return await reply("Please provide a search query!");

        g_i_s(q, (error, result) => {
            if (error || !result.length) return reply("No images found!");

            // Send the first 5 images
            const imageUrls = result.slice(0, 5).map(img => img.url);
            imageUrls.forEach(async (url) => {
                await conn.sendMessage(from, { 
            document: { url: url },
            caption: config.FOOTER,
            mimetype: "image/jpeg",
            
            fileName: `${q}.jpeg`
        });


            });
        });

    } catch (error) {
        console.error(error);
        reply('An error occurred while processing your request. Please try again later.');
    }
});


cmd({
    pattern: "ig",
    desc: "To download Instagram videos/reels.",
    react: "🎀",
    use: '.ig < Link >',
    category: "download",
    filename: __filename
},

async(conn, mek, m, {from, quoted, body, isCmd, command, args, q, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply}) => {

try {
    if (!q) return m.reply(`Please Give Me a valid Instagram Link...`);
    
    // Initial reaction
    m.react('⬇️');

    // Fetching from your new API
    let res = await fetchJson(`https://sadaslk-apis.vercel.app/api/v1/download/inster?q=${q}&apiKey=sadasggggg`);

    if (!res.status || !res.data || !res.data.links) {
        return m.reply("Error: Could not fetch the video. Please check the link or API status.");
    }

    // Getting the first link (usually the video/high quality link)
    let downloadUrl = res.data.links[0];

    m.react('⬆️');

    // Sending the video
    await conn.sendMessage(from, { 
        video: { url: downloadUrl }, 
        mimetype: "video/mp4", 
        caption: "*💃 VISPER MD IG DOWNLODER 💃*\n\n" + config.FOOTER 
    }, { quoted: mek });

    m.react('✔️');

} catch (e) {
    console.log(e);
    m.reply("An error occurred while processing your request.");
}
})


cmd({

    pattern: "twitter",
    alias: ["tw"],
    desc: "To get the instragram.",
    react: "❄️",
    use: '.twitter < Link >',
    category: "download",
    filename: __filename

},

async(conn, mek, m,{from, quoted, body, isCmd, command, args, q, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply}) => {

try{
    
if (!q) return m.reply(`Please Give Me a vaild Link...`);
m.react('⬇️')

         let res = await fetchJson(`https://darksadasyt-twiterdl.vercel.app/api/download?url=${q}`);
        
     
             m.react('⬆️')
            await conn.sendMessage(from,{video: {url: res.videos[0].url },mimetype:"video/mp4",caption: config.FOOTER},{quoted:mek})
             m.react('✔️')
       

}catch(e){
console.log(e)
}
})





















cmd({
    pattern: "apk",
    react: "🗃️",
    alias: ["findapk","playstore"],
    category: "download",
    use: '.apk whatsapp',
    filename: __filename
},
async(conn, mek, m,{from, q, reply}) => {
  try {
    await conn.sendMessage(from, { react: { text: '⬇️', key: mek.key }})

    if(!q) return reply('*🗃️ Enter apk name...*') 

    const data = await download(q)
    if (!data || !data.dllink) return reply("❌ APK not found!")

    let listdata = `*🗃️ VISPER APK DOWNLOADER 🗃️*

*┌──────────────────╮*
*├ 📚 Name :* ${data.name}
*├ 📦 Package :* ${data.package}
*├ ⬆️ Last update :* ${data.lastup}
*├ 📥 Size :* ${data.size}
*└──────────────────╯*

${config.FOOTER}`
    // send info + footer
    await conn.sendMessage(from, { image: { url: data.icon }, caption: listdata }, { quoted: mek })

    // send apk file
    let sendapk = await conn.sendMessage(from , { 
        document : { url : data.dllink }, 
        mimetype : 'application/vnd.android.package-archive', 
        fileName : data.name + '.apk',
        caption: config.FOOTER
    }, { quoted: mek })

    // reactions
    await conn.sendMessage(from, { react: { text: '📁', key: sendapk.key }})
    await conn.sendMessage(from, { react: { text: '✔', key: mek.key }})
    
  } catch (e) {
    console.log("APK CMD ERROR:", e)
    reply('❌ ERROR while downloading APK!')
  }
})





              


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
    await conn.sendMessage(from, { react: { text: '✔️', key: mek.key } });
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
    await conn.sendMessage(from, { react: { text: '✔️', key: mek.key } });
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
    await conn.sendMessage(from, { react: { text: '✔️', key: mek.key } });
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
    await conn.sendMessage(from, { react: { text: '✔️', key: mek.key } });
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
    await conn.sendMessage(from, { react: { text: '✔️', key: mek.key } });
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
    }, { quoted: mek });
    await conn.sendMessage(from, { react: { text: '✔️', key: mek.key } });
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
    await conn.sendMessage(from, { react: { text: '✔️', key: mek.key } });
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
    await conn.sendMessage(from, { react: { text: '✔️', key: mek.key } });
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
    await conn.sendMessage(from, { react: { text: '✔️', key: mek.key } });
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
    await conn.sendMessage(from, { react: { text: '✔️', key: mek.key } });
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
    await conn.sendMessage(from, { react: { text: '✔️', key: mek.key } });
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
    await conn.sendMessage(from, { react: { text: '✔️', key: mek.key } });
  } catch (e) { console.error(e); reply('*Error*'); }
});













cmd({
    pattern: "mediafire",
    react: "🔥",
    alias: ["mfire","mfdl"],
    category: "download",
    use: '.mediafire < link >',
    filename: __filename
},
async(conn, mek, m,{from, l, quoted, body, isCmd, command, args, q, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply}) => {
try{
await conn.sendMessage(from, { react: { text: '⬇️', key: mek.key }})
if(!q) return await conn.sendMessage(from , { text: '*🔥 Enter mediafire link...*' }, { quoted: mek } ) 
const data = await fetchJson(`https://mfire-dl.vercel.app/mfire?url=${q}`)
let listdata = `*🔥VISPER MEDIAFIRE DOWNLODER 🔥*

*┌──────────────────╮*
*├ 🔥 Name :* ${data.fileName}
*├ ⏩ Type :* ${data.fileType}
*├ 📁 Size :* ${data.size}
*├ 📅 Date :* ${data.date}
*└──────────────────╯*\n ${config.FOOTER}`

	
reply(listdata)
//if (data.size.includes('GB')) return await conn.sendMessage(from , { text: 'File size is too big...' }, { quoted: mek } )
//if (data.size.includes('MB') && data.size.replace(' MB','') > config.MAX_SIZE) return await conn.sendMessage(from , { text: 'File size is too big...' }, { quoted: mek } )
let sendapk = await conn.sendMessage(from, {
    document: {
        url: data.dl_link
    },
    mimetype: `${data.type}`,
    fileName: `${data.fileName}`,
    caption: `*${data.fileName}*\n\n ${config.FOOTER}`
}, { quoted: mek });

await conn.sendMessage(from, { react: { text: '📁', key: sendapk.key }})
await conn.sendMessage(from, { react: { text: '✔', key: mek.key }})
} catch (e) {
    reply('ERROR !!')
    console.log(e)
}
})
async function xnxxs(query) {
  return new Promise((resolve, reject) => {
    const baseurl = 'https://www.xnxx.com';
    fetch(`${baseurl}/search/${query}/${Math.floor(Math.random() * 3) + 1}`, {method: 'get'}).then((res) => res.text()).then((res) => {
      const $ = cheerio.load(res, {xmlMode: false});
      const title = [];
      const url = [];
      const desc = [];
      const results = [];
      $('div.mozaique').each(function(a, b) {
        $(b).find('div.thumb').each(function(c, d) {
          url.push(baseurl + $(d).find('a').attr('href').replace('/THUMBNUM/', '/'));
        });
      });
      $('div.mozaique').each(function(a, b) {
        $(b).find('div.thumb-under').each(function(c, d) {
          desc.push($(d).find('p.metadata').text());
          $(d).find('a').each(function(e, f) {
            title.push($(f).attr('title'));
          });
        });
      });
      for (let i = 0; i < title.length; i++) {
        results.push({title: title[i], info: desc[i], link: url[i]});
      }
      resolve({status: true, result: results});
    }).catch((err) => reject({status: false, result: err}));
  });
}

cmd({
    pattern: "xnxx",	
    react: '🔎',
    category: "download",
    desc: "xnxx download",
    use: ".xnxx new",
    
    filename: __filename
},
async (conn, m, mek, { from, q, isSudo, isOwner, prefix, isMe, reply }) => {
try{

if( config.XNXX_BLOCK == "true" && !isMe && !isSudo && !isOwner ) {
	await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
            return await conn.sendMessage(from, { text: "*This command currently only works for the Bot owner. To disable it for others, use the .settings command 👨‍🔧.*" }, { quoted: mek });

}
if (!q) return reply('🚩 *Please give me words to search*')
let res = await xnxxs(q)
const data = res.result

var srh = [];  
for (var i = 0; i < res.result.length; i++) {
srh.push({
title: res.result[i].title,
description: '',
rowId: prefix + `xnxxdown ${res.result[i].link}}`
});
}

const sections = [{
title: "xnxx results",
rows: srh
}	  
]
const listMessage = {
text: `*VISPER XNXX SEARCH 🔞*

*\`Input :\`* ${q}`,
footer: config.FOOTER,
title: 'xnxx results',
buttonText: '*Reply Below Number 🔢*',
sections
}

const caption = `*_XNXX SEARCH RESULT 🔞_*

*\`Input :\`* ${q}`
	
const listButtons = {
  title: "🔞 XNXX Search Results",
  sections: [
    {
      title: "🔍 Search Results",
      rows: res.result.map(video => ({
        title: video.title,
        description: "", // Optional: can add duration or views here
        id: prefix + `xnxxdown ${video.link}`
      }))
    }
  ]
};

 if (config.BUTTON === "true") {
      return await conn.sendMessage(from, {
        image: {url: config.LOGO },
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

} else if (config.BUTTON === 'false') {

	
await conn.listMessage(from, listMessage,mek)

 }
} catch (e) {
    console.log(e)
  await conn.sendMessage(from, { text: '🚩 *Error !!*' }, { quoted: mek } )
}
})





async function xdl(URL) {
  return new Promise((resolve, reject) => {
    fetch(`${URL}`, {method: 'get'}).then((res) => res.text()).then((res) => {
      const $ = cheerio.load(res, {xmlMode: false});
      const title = $('meta[property="og:title"]').attr('content');
      const duration = $('meta[property="og:duration"]').attr('content');
      const image = $('meta[property="og:image"]').attr('content');
      const videoType = $('meta[property="og:video:type"]').attr('content');
      const videoWidth = $('meta[property="og:video:width"]').attr('content');
      const videoHeight = $('meta[property="og:video:height"]').attr('content');
      const info = $('span.metadata').text();
      const videoScript = $('#video-player-bg > script:nth-child(6)').html();
      const files = {
        low: (videoScript.match('html5player.setVideoUrlLow\\(\'(.*?)\'\\);') || [])[1],
        high: videoScript.match('html5player.setVideoUrlHigh\\(\'(.*?)\'\\);' || [])[1],
        HLS: videoScript.match('html5player.setVideoHLS\\(\'(.*?)\'\\);' || [])[1],
        thumb: videoScript.match('html5player.setThumbUrl\\(\'(.*?)\'\\);' || [])[1],
        thumb69: videoScript.match('html5player.setThumbUrl169\\(\'(.*?)\'\\);' || [])[1],
        thumbSlide: videoScript.match('html5player.setThumbSlide\\(\'(.*?)\'\\);' || [])[1],
        thumbSlideBig: videoScript.match('html5player.setThumbSlideBig\\(\'(.*?)\'\\);' || [])[1]};
      resolve({status: true, result: {title, URL, duration, image, videoType, videoWidth, videoHeight, info, files}});
    }).catch((err) => reject({status: false, result: err}));
  });
}

cmd({
    pattern: "xnxxdown",
    alias: ["dlxnxx","xnxxdl"],
    react: '🔞',
    dontAddCommandList: true,
    filename: __filename
},
async(conn, mek, m,{from, l, quoted, body, isCmd, command, args, q, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply}) => {
try{
 //if (!isMe) return await reply('🚩 You are not a premium user\nbuy via message to owner!!')
 if (!q) return reply('*Please give me instagram url !!*')
  let res = await xdl(q)
  let title = res.result.title
  await conn.sendMessage(from, { video: { url: res.result.files.high }, caption: title}, { quoted: mek })
} catch (e) {
reply('*Error !!*')
console.log(e)
}
})


async (conn, mek, m, { from, q, reply }) => {
  if (!q) return await reply('*Need a download URL!*');
  try {
    await conn.sendMessage(from, { react: { text: '⬆️', key: mek.key } });
    await conn.sendMessage(from, { 
      audio: { url: q }, 
      mimetype: 'audio/mpeg' 
    }, { quoted: mek });
    await conn.sendMessage(from, { react: { text: '✔️', key: mek.key } });
  } catch (e) {
    console.log(e);
    reply('*Error sending audio*');
  }
});


// ==============================================================
//  SPOTIFY MODULE – VISPER BOT
//  Features:
//   - Search by song name
//   - Direct download by Spotify URL
//   - Audio & Document types
//   - No viewOnce (image stays visible)
// ==============================================================

// ---------- SPOTIFY SEARCH ----------
cmd({
  pattern: "spotify",	
  react: '🎶',
  category: "download",
  desc: "Spotify search or direct download",
  use: ".spotify <song name or spotify url>",
  filename: __filename
},
async (conn, m, mek, { from, q, prefix, reply }) => {
  try {
    if (!q) return reply('🚩 *Please give me a song name or a Spotify track URL*');

    // --- Check if input is a Spotify track URL ---
    const spotifyTrackRegex = /^(https?:\/\/)?(open|play)\.spotify\.com\/(intl-[a-z]{2}\/)?track\//;
    if (spotifyTrackRegex.test(q)) {
      // Direct download flow
      try {
        const apiUrl = `https://mr-thinuzz-api-build.zone.id/api/spotify?url=${encodeURIComponent(q)}&apiKey=${config.YT_API_KEY || 'key_4797e0dcedd66cca'}`;
        const response = await fetchJson(apiUrl);

        if (!response.status || !response.data) {
          return await reply('❌ Failed to retrieve song data. Please check the URL.');
        }

        const data = response.data;
        const caption = `*\`🎼 🅅🄸🅂🄿🄴🅁 🅂🄿🄾🅃🄸🄵🄸🅈 🄳🄾🅆🄽🄻🄾🄰🄳🄴🅁 🎼\`*
*┌──────────────────╮*
*├ \`🎶 Title:\`* ${data.track_name}
*├ \`🧑‍🎤 Artist:\`* ${data.artist}
*├ \`⏱️ Duration:\`* ${data.duration}
*├ \`🔗 URL:\`* ${q}
*└──────────────────╯*`;

        const buttons = [
          {
            buttonId: prefix + 'spa ' + data.download_url,
            buttonText: { displayText: 'Audio Type 🎶' },
            type: 1
          },
          {
            buttonId: prefix + `spad ${data.download_url}&${data.cover_art}&${data.track_name}`,
            buttonText: { displayText: 'Document Type 📂' },
            type: 1
          }
        ];

        await conn.sendMessage(from, {
          image: { url: data.cover_art },
          caption: caption,
          footer: config.FOOTER,
          buttons: buttons,
          headerType: 4
          // viewOnce removed – image stays visible
        }, { quoted: mek });

      } catch (e) {
        console.error('Error in direct Spotify download:', e);
        await reply('❌ An error occurred while fetching the song. Please try again later.');
      }
      return;
    }

    // --- Search flow (if input is not a URL) ---
    let res = await fetchJson(`https://darksadasyt-spotify-search.vercel.app/search?query=${q}`);
    if (!res || res.length === 0) {
      return reply('🚩 *No results found for your query.*');
    }

    var srh = [];
    for (var i = 0; i < res.length; i++) {
      srh.push({
        title: res[i].song_name,
        description: '',
        rowId: prefix + `spotifydl ${res[i].track_url}`
      });
    }

    const sections = [{
      title: "open.spotify.com",
      rows: srh
    }];

    const listMessage = {
      text: `*SPOTIFY SEARCH RESULT 🎶*\n\n*\`Input :\`* ${q}`,
      footer: config.FOOTER,
      title: 'open.spotify.com',
      buttonText: '*Reply Below Number 🔢*',
      sections
    };

    await conn.listMessage(from, listMessage, mek);

  } catch (e) {
    console.log(e);
    await conn.sendMessage(from, { text: '🚩 *Error !!*' }, { quoted: mek });
  }
});

// ---------- SPOTIFY DOWNLOAD (triggered from search results) ----------
cmd({
  pattern: "spotifydl",
  alias: ["ytsong"],
  use: '.song lelena',
  react: "🎧",
  desc: "Download songs from Spotify",
  filename: __filename
},
async (conn, mek, m, { from, prefix, q, reply }) => {
  try {
    if (!q) return await reply('*Please enter a Spotify track URL!*');

    const apiUrl = `https://mr-thinuzz-api-build.zone.id/api/spotify?url=${encodeURIComponent(q)}&apiKey=${config.YT_API_KEY || 'key_4797e0dcedd66cca'}`;
    const response = await fetchJson(apiUrl);

    if (!response.status || !response.data) {
      return await reply('❌ Failed to retrieve song data. Please check the URL.');
    }

    const data = response.data;
    const caption = `*\`🎼 🅅🄸🅂🄿🄴🅁 🅂🄿🄾🅃🄸🄵🄸🅈 🄳🄾🅆🄽🄻🄾🄰🄳🄴🅁 🎼\`*
*┌──────────────────╮*
*├ \`🎶 Title:\`* ${data.track_name}
*├ \`🧑‍🎤 Artist:\`* ${data.artist}
*├ \`⏱️ Duration:\`* ${data.duration}
*├ \`🔗 URL:\`* ${q}
*└──────────────────╯*`;

    const buttons = [
      {
        buttonId: prefix + 'spa ' + data.download_url,
        buttonText: { displayText: 'Audio Type 🎶' },
        type: 1
      },
      {
        buttonId: prefix + `spad ${data.download_url}&${data.cover_art}&${data.track_name}`,
        buttonText: { displayText: 'Document Type 📂' },
        type: 1
      }
    ];

    await conn.sendMessage(from, {
      image: { url: data.cover_art },
      caption: caption,
      footer: config.FOOTER,
      buttons: buttons,
      headerType: 4
      // viewOnce removed – image stays visible
    }, { quoted: mek });

  } catch (e) {
    console.error('Error in spotifydl:', e);
    await reply('❌ An error occurred. Please try again later.');
  }
});

// ---------- SPA – Send as Audio ----------
cmd({
  pattern: "spa",
  react: "⬇️",
  dontAddCommandList: true,
  filename: __filename
},
async (conn, mek, m, { from, q, reply }) => {
  if (!q) return await reply('*Need a download URL!*');
  try {
    await conn.sendMessage(from, { react: { text: '⬆️', key: mek.key } });
    await conn.sendMessage(from, {
      audio: { url: q },
      mimetype: 'audio/mpeg'
    }, { quoted: mek });
    await conn.sendMessage(from, { react: { text: '✔️', key: mek.key } });
  } catch (e) {
    console.log(e);
    reply('*Error sending audio*');
  }
});

// ---------- SPAD – Send as Document with thumbnail ----------
cmd({
  pattern: "spad",
  react: "⬇️",
  dontAddCommandList: true,
  filename: __filename
},
async (conn, mek, m, { from, q, reply }) => {
  try {
    if (!q) return await reply('*Need a download URL!*');
    
    const parts = q.split("&");
    const downloadUrl = parts[0];
    const coverUrl = parts[1];
    const title = parts[2] || 'audio';

    // Fetch and resize thumbnail
    const imgResponse = await fetch(coverUrl);
    const imgBuffer = await imgResponse.buffer();
    const resizedImg = await resizeImage(imgBuffer, 200, 200);

    await conn.sendMessage(from, { react: { text: '⬆️', key: mek.key } });

    await conn.sendMessage(from, {
      document: { url: downloadUrl },
      jpegThumbnail: resizedImg,
      caption: config.FOOTER || '',
      mimetype: 'audio/mpeg',
      fileName: `${title}.mp3`
    }, { quoted: mek });

    await conn.sendMessage(from, { react: { text: '✔️', key: mek.key } });
  } catch (e) {
    console.log(e);
    reply('*Error sending document*');
  }
});

