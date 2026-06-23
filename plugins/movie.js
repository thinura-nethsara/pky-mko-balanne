const config = require('../config')
const { cmd, commands } = require('../command')
const axios = require('axios');
const sharp = require('sharp');
const Seedr = require("seedr");
const { getBuffer, getGroupAdmins, getRandom, h2k, isUrl, Json, runtime, sleep, fetchJson} = require('../lib/functions')
const fetch = (...args) => import("node-fetch").then(({ default: fetch }) => fetch(...args));
const { Buffer } = require('buffer'); 
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const fileType = require("file-type")
const l = console.log
const https = require("https")
const { URL } = require('url');
const { sizeFormatter} = require('human-readable');


cmd({
  pattern: "mv",
  react: "🔎",
  alias: ["movie", "film", "cinema"],
  desc: "all movie search",
  category: "movie",
  use: '.movie',
  filename: __filename
},
async (conn, mek, m, {
  from, prefix, l, quoted, q,
  isPre, isSudo, isOwner, isMe, reply
}) => {
  try {
    const pr = (await axios.get('https://mv-visper-full-db.pages.dev/Main/main_var.json')).data;
    const isFree = pr.mvfree === "true";

    // Premium check
    if (!isFree && !isMe && !isPre) {
      await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
      return await conn.sendMessage(from, {
        text: "*`You are not a premium user⚠️`*\n\n" +
              "*Send a message to one of the 2 numbers below and buy Lifetime premium 🎉.*\n\n" +
              "_Price : 200 LKR ✔️_\n\n" +
              "*👨‍💻Contact us : 0778500326 , 0722617699*"
      }, { quoted: mek });
    }

    // Block mode check
    if (config.MV_BLOCK === "true" && !isMe && !isSudo && !isOwner) {
      await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
      return await conn.sendMessage(from, {
        text: "*This command currently only works for the Bot owner. To disable it for others, use the .settings command 👨‍🔧.*"
      }, { quoted: mek });
    }

    if (!q) return await reply('*Enter movie name..🎬*');

    // Movie sources
    const sources = [
      { name: "CINESUBZ", cmd: "cine" },
      { name: "SINHALASUB", cmd: "sinhalasub" }

    ];


    let imageBuffer;
    try {
      const res = await axios.get('https://mv-visper-full-db.pages.dev/Data/visper_main.jpeg', {
        responseType: 'arraybuffer'
      });
      imageBuffer = Buffer.from(res.data, 'binary');
    } catch {
      imageBuffer = null; 
    }

    const caption = `_*VISPER SEARCH SYSTEM 🎬*_\n\n*\`🔰Input :\`* ${q}\n\n_*🌟 Select your preferred movie download site*_`;

    if (config.BUTTON === "true") {
     
      const listButtons = {
        title: "❯❯ Choose a movie source ❮❮",
        sections: [
          {
            title: "❯❯ Choose a movie source ❮❮",
            rows: sources.map(src => ({
              title: `${src.name} Results 🎬`,
              id: prefix + src.cmd + ' ' + q
            }))
          }
        ]
      };

      return await conn.sendMessage(from, {
        image: imageBuffer || { url: 'https://mv-visper-full-db.pages.dev/Data/visper_main.jpeg' },
        caption,
        footer: config.FOOTER,
        buttons: [
          {
            buttonId: "movie_menu_list",
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
  
      const buttons = sources.map(src => ({
        buttonId: prefix + src.cmd + ' ' + q,
        buttonText: { displayText: `_${src.name} Results 🍿_` },
        type: 1
      }));

      return await conn.buttonMessage2(from, {
        image: { url: 'https://mv-visper-full-db.pages.de/Data/visper_main.jpeg' },
        caption,
        footer: config.FOOTER,
        buttons,
        headerType: 4
      }, mek);
    }

  } catch (e) {
    reply('*❌ Error occurred*');
    l(e);
  }
});


//===================================================================================================================
// ============================================================
// CINESUBZ MOVIE PLUGIN – FULLY FIXED & TESTED
// ============================================================

// Helper: resize image
async function resizeImage(inputBuffer, width, height) {
    try {
        return await sharp(inputBuffer).resize(width, height).toBuffer();
    } catch (error) {
        console.error('Error resizing image:', error);
        return inputBuffer;
    }
}

// -----------------------------------------------------------------
// 1. SEARCH COMMAND (Unchanged - Works)
// -----------------------------------------------------------------
cmd({
    pattern: "cine",    
    react: '🔎',
    category: "movie",
    alias: ["sinhalafilm"],
    desc: "Search movies on CineSubz",
    use: ".pupilvideo <movie name>",
    filename: __filename
},
async (conn, m, mek, { from, q, prefix, isMe, isPre, isSudo, isOwner, reply }) => {
    try {
        const pr = (await axios.get('https://mv-visper-full-db.pages.dev/Main/main_var.json')).data;
        const isFree = pr.mvfree === "true";
        if (!isFree && !isMe && !isPre) {
            await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
            return await conn.sendMessage(from, {
                text: "*`You are not a premium user⚠️`*\n\n*Contact : 0778500326 , 0722617699*"
            }, { quoted: mek });
        }

        if (config.MV_BLOCK == "true" && !isMe && !isSudo && !isOwner) {
            return await conn.sendMessage(from, { text: "*This command only for owner.*" }, { quoted: mek });
        }

        if (!q) return await reply('*Please provide a movie name!*');

        const API_KEY = '50d7ce3f5137b97bc64d220a3f6a33ed';
        const searchUrl = `https://apis.sadas.dev/api/v1/movie/cinesubz/search?q=${encodeURIComponent(q)}&apiKey=${API_KEY}`;
        const response = await axios.get(searchUrl);
        const data = response.data;

        if (!data.status || !data.data || data.data.length === 0) {
            return await conn.sendMessage(from, { text: '*No results found ❌*' }, { quoted: mek });
        }

        const rows = data.data.map(movie => ({
            title: movie.title,
            description: movie.year || '',
            rowId: prefix + 'newdl ' + encodeURIComponent(movie.link || movie.url)
        }));

        const caption = `_*🎬 CINESUBZ SEARCH 🎬_*\n\n*Query : ${q}*`;

        const listButtons = {
            title: "Choose Movie",
            sections: [{ title: "Results", rows: data.data.map(m => ({
                title: m.title,
                id: prefix + `newdl ${encodeURIComponent(m.link || m.url)}`
            })) }]
        };

        if (config.BUTTON === "true") {
            await conn.sendMessage(from, {
                image: { url: config.LOGO },
                caption: caption,
                footer: config.FOOTER,
                buttons: [{
                    buttonId: "list",
                    buttonText: { displayText: "🎥 Select Movie" },
                    type: 4,
                    nativeFlowInfo: { name: "single_select", paramsJson: JSON.stringify(listButtons) }
                }],
                headerType: 1
            }, { quoted: mek });
        } else {
            await conn.listMessage(from, { text: caption, footer: config.FOOTER, title: "Results", buttonText: "Select", sections: [{title:"Movies", rows}] }, mek);
        }
    } catch (e) {
        console.error(e);
        await reply('🚩 *Search Error!*');
    }
});

// -----------------------------------------------------------------
// 2. NEWDL - INFO COMMAND (FIXED)
// -----------------------------------------------------------------
cmd({
    pattern: "newdl",	
    react: '🎥',
    desc: "Movie Info + Qualities",
    filename: __filename
},
async (conn, m, mek, { from, q, prefix, reply }) => {
    try {
        if (!q) return await reply('*Provide movie URL!*');

        const API_KEY = '50d7ce3f5137b97bc64d220a3f6a33ed';
        const movieUrl = decodeURIComponent(q);
        const infoUrl = `https://apis.sadas.dev/api/v1/movie/cinesubz/info?q=${encodeURIComponent(movieUrl)}&apiKey=${API_KEY}`;

        const response = await axios.get(infoUrl);
        const result = response.data;

        console.log('📄 Info Response:', JSON.stringify(result, null, 2)); // Debug

        if (!result.status || !result.data || !result.data.status) {
            return await reply('❌ Failed to load movie info.');
        }

        const movie = result.data;

        const title = movie.title || 'Unknown';
        const image = movie.poster || config.LOGO;
        const year = movie.year || 'N/A';
        const desc = movie.description || '';

        // FIXED: Correct path
        let downloads = movie.download_links || [];

        if (downloads.length === 0) {
            return await conn.sendMessage(from, {
                text: `*☘️ Title :* ${title}\n*📅 Year :* ${year}\n\n⚠️ No links found.\n🔗 ${movieUrl}`
            }, { quoted: mek });
        }

        let msg = `*☘️ Title :* ${title}\n`;
        msg += `*📅 Year :* ${year}\n`;
        if (desc) msg += `*📝 Desc :* ${desc.substring(0, 100)}...\n\n`;
        msg += `*Select Quality:*`;

        const qualityRows = downloads.map((dl, i) => ({
            title: dl.quality || `Quality ${i+1}`,
            id: prefix + `ndll ${encodeURIComponent(dl.final_link || dl.original_zt_link)}±${encodeURIComponent(title)}±${encodeURIComponent(image)}`
        }));

        const listButtons = {
            title: "Choose Quality",
            sections: [{ title: "Downloads", rows: qualityRows }]
        };

        await conn.sendMessage(from, {
            image: { url: image },
            caption: msg,
            footer: config.FOOTER,
            buttons: [{
                buttonId: "qualities",
                buttonText: { displayText: "🎬 Select Quality" },
                type: 4,
                nativeFlowInfo: {
                    name: "single_select",
                    paramsJson: JSON.stringify(listButtons)
                }
            }],
            headerType: 1,
            viewOnce: true
        }, { quoted: mek });

    } catch (e) {
        console.error('Newdl Error:', e);
        await reply('🚩 *Error loading movie details*');
    }
});

// -----------------------------------------------------------------
// 3. NDLL - DOWNLOAD (Improved)
// -----------------------------------------------------------------
cmd({
    pattern: "ndll",
    react: "⬇️",
    dontAddCommandList: true,
    filename: __filename
}, async (conn, mek, m, { from, q }) => {
    if (!q) return await reply('*Invalid data!*');

    try {
        const parts = q.split('±');
        const qualityUrl = decodeURIComponent(parts[0]);
        const title = decodeURIComponent(parts[1]);
        const imageUrl = decodeURIComponent(parts[2] || config.LOGO);

        await conn.sendMessage(from, { text: `*⬇️ Downloading...*` }, { quoted: mek });

        const API_KEY = '50d7ce3f5137b97bc64d220a3f6a33ed';
        const dlUrl = `https://apis.sadas.dev/api/v1/movie/cinesubz/dl?q=${encodeURIComponent(qualityUrl)}&apiKey=${API_KEY}`;

        const res = await axios.get(dlUrl);
        const dlData = res.data;

        if (!dlData.status || !dlData.data?.links?.length) {
            return await reply(`*⚠️ No direct link.*\n${qualityUrl}`);
        }

        let directLink = dlData.data.links.find(l => l.includes('.mp4') || l.includes('.mkv')) || dlData.data.links[0];

        const thumbRes = await fetch(imageUrl);
        const thumbBuf = await thumbRes.buffer();
        const thumb = await resizeImage(thumbBuf, 200, 200);

        await conn.sendMessage(from, { text: `*⬆️ Uploading...*` }, { quoted: mek });

        await conn.sendMessage(config.JID || from, {
            document: { url: directLink },
            caption: `*🎬 ${title}*\n\n${config.NAME}`,
            jpegThumbnail: thumb,
            mimetype: 'video/mp4',
            fileName: `${title}.mp4`
        });

        await conn.sendMessage(from, { react: { text: '✔️', key: mek.key } });
    } catch (e) {
        console.error(e);
        await reply('*Download Error!*');
    }
});

// -----------------------------------------------------------------
// 4. DUBDET - Details
// -----------------------------------------------------------------
cmd({
    pattern: "dubdet",	
    react: '🎥',
    filename: __filename
},
async (conn, m, mek, { from, q }) => {
    try {
        if (!q) return await reply('*Provide URL!*');

        const API_KEY = '50d7ce3f5137b97bc64d220a3f6a33ed';
        const movieUrl = decodeURIComponent(q);
        const infoUrl = `https://apis.sadas.dev/api/v1/movie/cinesubz/info?q=${encodeURIComponent(movieUrl)}&apiKey=${API_KEY}`;

        const res = await axios.get(infoUrl);
        const movie = res.data.data;

        if (!movie?.title) return await reply('Failed to load details.');

        const msg = `*☘️ Title :* ${movie.title}\n*📅 Year :* ${movie.year || 'N/A'}\n*Qualities :* ${movie.download_links?.map(d => d.quality).join(', ') || 'N/A'}\n\n> ${config.chlink || ''}`;

        await conn.sendMessage(config.JID || from, {
            image: { url: movie.poster || config.LOGO },
            caption: msg
        });
    } catch (e) {
        console.error(e);
        await reply('Details Error');
    }
});


