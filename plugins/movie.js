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
        image: { url: 'https://mv-visper-full-db.pages.dev/Data/visper_main.jpeg' },
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



// =======================================================
// CINESUBZ MOVIE PLUGIN – Replace the existing code
// =======================================================

// Helper: resize image (keep your existing function)
async function resizeImage(inputBuffer, width, height) {
    try {
        return await sharp(inputBuffer).resize(width, height).toBuffer();
    } catch (error) {
        console.error('Error resizing image:', error);
        return inputBuffer;
    }
}

// -----------------------------------------------------------------
// 1. SEARCH COMMAND
// -----------------------------------------------------------------
cmd({
    pattern: "pupilvideo",    
    react: '🔎',
    category: "movie",
    alias: ["sinhalafilm"],
    desc: "Search movies on CineSubz",
    use: ".pupilvideo <movie name>",
    filename: __filename
},
async (conn, m, mek, { from, q, prefix, isMe, isPre, isSudo, isOwner, reply }) => {
    try {
        // Premium check
        const pr = (await axios.get('https://mv-visper-full-db.pages.dev/Main/main_var.json')).data;
        const isFree = pr.mvfree === "true";
        if (!isFree && !isMe && !isPre) {
            await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
            return await conn.sendMessage(from, {
                text: "*`You are not a premium user⚠️`*\n\n" +
                      "*Send a message to one of the 2 numbers below and buy Lifetime premium 🎉.*\n\n" +
                      "_Price : 200 LKR ✔️_\n\n" +
                      "*👨‍💻Contact us : 0778500326 , 0722617699*"
            }, { quoted: mek });
        }

        // Block check
        if (config.MV_BLOCK == "true" && !isMe && !isSudo && !isOwner) {
            await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
            return await conn.sendMessage(from, { text: "*This command currently only works for the Bot owner. To disable it for others, use the .settings command 👨‍🔧.*" }, { quoted: mek });
        }

        if (!q) return await reply('*Please provide a movie name!*');

        const API_KEY = '50d7ce3f5137b97bc64d220a3f6a33ed';
        const searchUrl = `https://apis.sadas.dev/api/v1/movie/cinesubz/search?q=${encodeURIComponent(q)}&apiKey=${API_KEY}`;
        const response = await axios.get(searchUrl);
        const data = response.data;

        if (!data.status || !data.data || data.data.length === 0) {
            await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
            return await conn.sendMessage(from, { text: '*No results found ❌*' }, { quoted: mek });
        }

        // Build rows for list
        const rows = data.data.map(movie => ({
            title: movie.title,
            description: movie.year || '',
            rowId: prefix + 'newdl ' + encodeURIComponent(movie.url)
        }));

        const sections = [{
            title: "CineSubz Results",
            rows: rows
        }];

        const listMessage = {
            text: `_*🎬 CINESUBZ MOVIE SEARCH 🎬_*\n\n*Movie Search : ${q} 🔎*`,
            footer: config.FOOTER,
            title: 'Search Results',
            buttonText: '*Select a Movie*',
            sections
        };

        const caption = `_*🎬 CINESUBZ MOVIE SEARCH 🎬_*\n\n*Movie Search : ${q} 🔎*`;

        // Button mode rows
        const rowss = data.data.map(movie => ({
            title: movie.title,
            id: prefix + `newdl ${encodeURIComponent(movie.url)}`
        }));

        const listButtons = {
            title: "Choose a Movie",
            sections: [{
                title: "Available Movies",
                rows: rowss
            }]
        };

        if (config.BUTTON === "true") {
            await conn.sendMessage(from, {
                image: { url: config.LOGO },
                caption: caption,
                footer: config.FOOTER,
                buttons: [{
                    buttonId: "download_list",
                    buttonText: { displayText: "🎥 Select Option" },
                    type: 4,
                    nativeFlowInfo: {
                        name: "single_select",
                        paramsJson: JSON.stringify(listButtons)
                    }
                }],
                headerType: 1,
                viewOnce: true
            }, { quoted: mek });
        } else {
            await conn.listMessage(from, listMessage, mek);
        }
    } catch (e) {
        console.log(e);
        await conn.sendMessage(from, { text: '🚩 *Error occurred!!*' }, { quoted: mek });
    }
});

// -----------------------------------------------------------------
// 2. INFO & QUALITIES COMMAND
// -----------------------------------------------------------------
cmd({
    pattern: "newdl",	
    react: '🎥',
    desc: "Fetch movie details and download links",
    filename: __filename
},
async (conn, m, mek, { from, q, prefix, reply }) => {
    try {
        if (!q) return await reply('*Please provide a movie URL!*');

        const API_KEY = '50d7ce3f5137b97bc64d220a3f6a33ed';
        const movieUrl = decodeURIComponent(q);
        const infoUrl = `https://apis.sadas.dev/api/v1/movie/cinesubz/info?q=${encodeURIComponent(movieUrl)}&apiKey=${API_KEY}`;
        const response = await axios.get(infoUrl);
        const info = response.data;

        if (!info.status || !info.data) {
            return await conn.sendMessage(from, { text: '❌ Failed to fetch movie info.' }, { quoted: mek });
        }

        const { title, image, year, downloads } = info.data;

        let msg = `*☘️ Title :* ${title || 'N/A'}\n`;
        msg += `*📅 Year :* ${year || 'N/A'}\n\n`;
        msg += `*Select a quality to download:*`;

        if (!downloads || downloads.length === 0) {
            return await conn.sendMessage(from, { text: '❌ No download links available for this movie.' }, { quoted: mek });
        }

        // Build quality rows
        const rows = downloads.map((dl, index) => ({
            buttonId: prefix + `ndll ${encodeURIComponent(dl.url)}±${encodeURIComponent(title)}±${encodeURIComponent(image)}`,
            buttonText: { displayText: dl.quality || `Quality ${index+1}` },
            type: 1
        }));

        const rowss = downloads.map((dl, index) => ({
            title: dl.quality || `Quality ${index+1}`,
            id: prefix + `ndll ${encodeURIComponent(dl.url)}±${encodeURIComponent(title)}±${encodeURIComponent(image)}`
        }));

        const listButtons = {
            title: "🎬 Choose Download Quality",
            sections: [{
                title: "Available Qualities",
                rows: rowss
            }]
        };

        const detailsButton = {
            buttonId: prefix + 'dubdet ' + encodeURIComponent(movieUrl),
            buttonText: { displayText: "📄 Details Send" },
            type: 1
        };

        if (config.BUTTON === "true") {
            await conn.sendMessage(from, {
                image: { url: image || config.LOGO },
                caption: msg,
                footer: config.FOOTER,
                buttons: [
                    detailsButton,
                    {
                        buttonId: "download_list",
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
            const buttonMessage = {
                image: { url: image || config.LOGO },
                caption: msg,
                footer: config.FOOTER,
                buttons: rows,
                headerType: 4
            };
            return await conn.buttonMessage(from, buttonMessage, mek);
        }
    } catch (e) {
        console.log(e);
        await conn.sendMessage(from, { text: '🚩 *Error fetching movie info!*' }, { quoted: mek });
    }
});

// -----------------------------------------------------------------
// 3. DOWNLOAD COMMAND (Resolve & Send)
// -----------------------------------------------------------------
cmd({
    pattern: "ndll",
    react: "⬇️",
    dontAddCommandList: true,
    filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
    if (!q) {
        return await reply('*Please provide a valid quality URL!*');
    }

    try {
        const parts = q.split('±');
        if (parts.length < 3) return await reply('*Invalid data format!*');
        const qualityUrl = decodeURIComponent(parts[0]);
        const title = decodeURIComponent(parts[1]);
        const imageUrl = decodeURIComponent(parts[2]);

        await conn.sendMessage(from, { text: `*Downloading your movie..⬇️*` }, { quoted: mek });

        const API_KEY = '50d7ce3f5137b97bc64d220a3f6a33ed';
        const dlUrl = `https://apis.sadas.dev/api/v1/movie/cinesubz/dl?q=${encodeURIComponent(qualityUrl)}&apiKey=${API_KEY}`;
        const response = await axios.get(dlUrl);
        const dlData = response.data;

        if (!dlData.status || !dlData.data || !dlData.data.links || dlData.data.links.length === 0) {
            // Fallback: send the qualityUrl as text
            await conn.sendMessage(from, { text: `*⚠️ No direct download link found. Try opening this URL manually:*\n${qualityUrl}` }, { quoted: mek });
            return;
        }

        // Find a direct link (prefer .mp4)
        let directLink = null;
        for (let link of dlData.data.links) {
            if (!link.includes('t.me') && (link.includes('.mp4') || link.includes('.mkv') || link.includes('download'))) {
                directLink = link;
                break;
            }
        }
        if (!directLink) directLink = dlData.data.links[0];

        // Prepare thumbnail
        const botimgResponse = await fetch(imageUrl || config.LOGO);
        const botimgBuffer = await botimgResponse.buffer();
        const resizedBotImg = await resizeImage(botimgBuffer, 200, 200);

        const message = {
            document: { url: directLink },
            caption: `*🎬 Name :* ${title}\n\n${config.NAME}`,
            jpegThumbnail: resizedBotImg,
            mimetype: "video/mp4",
            fileName: `${title}.mp4`
        };

        await conn.sendMessage(from, { react: { text: '⬆️', key: mek.key } });
        await conn.sendMessage(from, { text: `*Uploading your movie..⬆️*` }, { quoted: mek });

        await conn.sendMessage(config.JID || from, message);
        await conn.sendMessage(from, { react: { text: '✔️', key: mek.key } });
        await conn.sendMessage(from, { text: `*Movie sent successfully to ${config.JID || 'this chat'} ✔*` }, { quoted: mek });
    } catch (error) {
        console.error('Error fetching or sending', error);
        await conn.sendMessage(from, { text: '*Error fetching or sending the movie.*' }, { quoted: mek });
    }
});

// -----------------------------------------------------------------
// 4. DETAILS TO JID COMMAND
// -----------------------------------------------------------------
cmd({
    pattern: "dubdet",	
    react: '🎥',
    desc: "Send movie details to configured JID",
    filename: __filename
},
async (conn, m, mek, { from, q, reply }) => {
    try {
        if (!q) return await reply('*Please provide a movie URL!*');

        const API_KEY = '50d7ce3f5137b97bc64d220a3f6a33ed';
        const movieUrl = decodeURIComponent(q);
        const infoUrl = `https://apis.sadas.dev/api/v1/movie/cinesubz/info?q=${encodeURIComponent(movieUrl)}&apiKey=${API_KEY}`;
        const response = await axios.get(infoUrl);
        const info = response.data;

        if (!info.status || !info.data) {
            return await conn.sendMessage(from, { text: '❌ Failed to fetch movie info.' }, { quoted: mek });
        }

        const { title, image, year, downloads } = info.data;
        let msg = `*☘️ Title :* ${title || 'N/A'}\n`;
        msg += `*📅 Year :* ${year || 'N/A'}\n`;
        if (downloads && downloads.length > 0) {
            msg += `*🎬 Qualities:* ${downloads.map(d => d.quality || 'N/A').join(', ')}\n`;
        }
        msg += `\n> 🌟 Follow us : *${config.chlink || 'https://t.me/yourchannel'}*\n`;
        msg += `> _*VISPER MD MULTIDEVICE*_`;

        await conn.sendMessage(config.JID || from, { image: { url: image || config.LOGO }, caption: msg });
        await conn.sendMessage(from, { react: { text: '✔️', key: mek.key } });
    } catch (error) {
        console.error('Error fetching or sending details', error);
        await conn.sendMessage(from, { text: '*Error fetching movie details.*' }, { quoted: mek });
    }
});
