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
      }, { quoted: mek });    } else {
  
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



// ====================== CINESUBZ MOVIE PLUGIN ======================

cmd({
    pattern: "cinesubz",
    react: '🔎',
    category: "movie",
    desc: "Cinesubz movie search",
    use: ".cinesubz spider man",
    filename: __filename
}, async (conn, m, mek, { from, q, prefix, isMe, isPre, isSudo, isOwner, reply }) => {
    try {
        if (!q) return await reply('*Please give me a search term !*');

        // Premium Check
        const pr = (await axios.get('https://mv-visper-full-db.pages.dev/Main/main_var.json')).data;
        const isFree = pr.mvfree === "true";

        if (!isFree && !isMe && !isPre) {
            await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
            return await reply("*`You are not a premium user⚠️`*\n\n*Send a message to one of the 2 numbers below and buy Lifetime premium 🎉.*\n\n_Price : 200 LKR_\n\n*Contact : 0778500326 , 0722617699*");
        }

        if (config.MV_BLOCK == "true" && !isMe && !isSudo && !isOwner) {
            return await reply("*This command currently only works for the Bot owner.*");
        }

        await conn.sendMessage(from, { react: { text: '🔎', key: mek.key } });

        let search = await fetchJson(`https://apis.sadas.dev/api/v1/movie/cinesubz/search?q=${encodeURIComponent(q)}&apiKey=50d7ce3f5137b97bc64d220a3f6a33ed`);

        if (!search || !search.status || !search.data || search.data.length === 0) {
            await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
            return await reply('*No results found ❌*');
        }

        const rows = search.data.map((v, i) => ({
            title: v.title.replace(/Sinhala Subtitles|සිංහල උපසිරැසි සමඟ/gi, '').trim(),
            id: `${prefix}cinfo ${v.link}&${v.image || ''}`
        }));

        const listButtons = {
            title: "🎬 Choose a Movie",
            sections: [
                {
                    title: "Cinesubz Search Results",
                    rows: rows
                }
            ]
        };

        const caption = `*_CINESUBZ MOVIE SEARCH RESULT 🎬_*\n\n*Input :* ${q}`;

        if (config.BUTTON === "true") {
            await conn.sendMessage(from, {
                image: { url: config.LOGO },
                caption: caption,
                footer: config.FOOTER,
                buttons: [{
                    buttonId: "download_list",
                    buttonText: { displayText: "🎥 Select Movie" },
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
            const sections = [{ title: "cinesubz results", rows: rows.map(r => ({ title: r.title, rowId: r.id })) }];
            await conn.listMessage(from, {
                text: caption,
                footer: config.FOOTER,
                title: 'Search Results',
                buttonText: '*Reply Below Number 🔢*',
                sections
            }, mek);
        }

    } catch (e) {
        console.log(e);
        await reply('🚩 *Error !!*');
    }
});

// ====================== INFO COMMAND ======================
cmd({
    pattern: "cinfo",
    react: '🎥',
    dontAddCommandList: true,
    filename: __filename
}, async (conn, m, mek, { from, q, prefix, reply }) => {
    try {
        if (!q) return await reply('*Invalid format!*');

        const [url, img] = q.split("&");
        if (!url) return await reply('*Invalid movie link!*');

        let info = await fetchJson(`https://apis.sadas.dev/api/v1/movie/cinesubz/info?q=${encodeURIComponent(url)}&apiKey=50d7ce3f5137b97bc64d220a3f6a33ed`);

        if (!info?.status || !info?.data) {
            return await reply('*Failed to fetch movie details!*');
        }

        const d = info.data;
        let msg = `*☘️ Title :* ${d.title || 'N/A'}
*📅 Year :* ${d.year || 'N/A'}
*💃 IMDB :* ${d.imdb_rating || 'N/A'}
*🎞️ Quality :* ${d.quality || 'N/A'}

*📝 Description :*
${(d.description || 'No description').substring(0, 700)}${(d.description || '').length > 700 ? '...' : ''}

*🎭 Cast :*
${d.cast?.slice(0, 5).map(c => `• ${c.name}`).join('\n') || 'N/A'}`;

        const downloadRows = d.download_links?.map((link) => ({
            title: `${link.size} - ${link.quality}`,
            id: `${prefix}cdl ${img || d.poster}&${encodeURIComponent(link.final_link)}&${encodeURIComponent(d.title)}`
        })) || [];

        const listButtons = {
            title: "🎬 Choose Quality",
            sections: [{ title: "Available Downloads", rows: downloadRows }]
        };

        await conn.sendMessage(from, {
            image: { url: (img || d.poster).replace("-150x150", "") },
            caption: msg,
            footer: config.FOOTER,
            buttons: [{
                buttonId: "download_list",
                buttonText: { displayText: "⬇️ Select Quality" },
                type: 4,
                nativeFlowInfo: {
                    name: "single_select",
                    paramsJson: JSON.stringify(listButtons)
                }
            }],
            headerType: 1
        }, { quoted: mek });

    } catch (e) {
        console.log(e);
        await reply('❌ *Error fetching info!*');
    }
});

// ====================== DOWNLOAD COMMAND ======================
let isUploading = false;

cmd({
    pattern: "cdl",
    react: "⬇️",
    dontAddCommandList: true,
    filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
    if (isUploading) return await reply('*A movie is already being uploaded. Please wait...* ⏳');

    try {
        isUploading = true;

        const [img, finalLink, title] = q.split("&");
        if (!finalLink) return await reply('*Invalid download link!*');

        const decodedLink = decodeURIComponent(finalLink);
        const decodedTitle = decodeURIComponent(title || 'Movie');

        await conn.sendMessage(from, { react: { text: '⬆️', key: mek.key } });
        await conn.sendMessage(from, { text: '*Fetching direct link & uploading...*' });

        // Get direct download link
        let dlData = await fetchJson(`https://apis.sadas.dev/api/v1/movie/cinesubz/dl?q=${encodeURIComponent(decodedLink)}&apiKey=50d7ce3f5137b97bc64d220a3f6a33ed`);

        let directUrl = decodedLink; // fallback

        if (dlData?.status && dlData?.data?.links?.length > 0) {
            directUrl = dlData.data.links[0]; // Best working link
        }

        await conn.sendMessage(config.JID || from, {
            document: { url: directUrl },
            caption: `*🎬 ${decodedTitle}*\n\n${config.NAME || ''}`,
            mimetype: "video/mp4",
            jpegThumbnail: await (await fetch((img || '').replace("-150x150", ""))).buffer().catch(() => null),
            fileName: `${decodedTitle}.mp4`
        });

        await conn.sendMessage(from, { react: { text: '✅', key: mek.key } });
        await reply(`*✅ Successfully sent to ${config.JID ? 'JID' : 'chat'}!*`);

    } catch (e) {
        console.error(e);
        await reply('*Error while processing download!*');
    } finally {
        isUploading = false;
    }
});


