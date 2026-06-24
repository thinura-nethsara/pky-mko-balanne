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
    use: ".cinesubz razor",
    filename: __filename
}, async (conn, m, mek, { from, q, prefix, isMe, isPre, isSudo, isOwner, reply }) => {
    try {
        if (!q) return await reply('*Please give me a search term !*');

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

        if (!search?.status || !search?.data?.length) {
            await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
            return await reply('*No results found ❌*');
        }

        const rows = search.data.map((v) => ({
            title: v.title.replace(/Sinhala Subtitles|සිංහල උපසිරැසි සමඟ/gi, '').trim(),
            rowId: `${prefix}cinfo ${v.link}&${v.image || v.poster || ''}`
        }));

        const listMessage = {
            text: `*_CINESUBZ MOVIE SEARCH RESULT 🎬_*\n\n*Input :* ${q}`,
            footer: config.FOOTER,
            title: "Search Results",
            buttonText: "*Reply Below Number 🔢*",
            sections: [{ title: "Available Movies", rows }]
        };

        if (config.BUTTON === "true") {
            const listButtons = {
                title: "🎬 Choose a Movie",
                sections: [{ title: "Results", rows: rows.map(r => ({ title: r.title, id: r.rowId })) }]
            };
            await conn.sendMessage(from, {
                image: { url: config.LOGO },
                caption: `*_CINESUBZ MOVIE SEARCH RESULT 🎬_*\n\n*Input :* ${q}`,
                footer: config.FOOTER,
                buttons: [{
                    buttonId: "list",
                    buttonText: { displayText: "Select Movie" },
                    type: 4,
                    nativeFlowInfo: { name: "single_select", paramsJson: JSON.stringify(listButtons) }
                }],
                headerType: 1
            }, { quoted: mek });
        } else {
            await conn.listMessage(from, listMessage, mek);
        }

    } catch (e) {
        console.log(e);
        await reply('🚩 *Error !!*');
    }
});


// ====================== INFO COMMAND - UNIFIED SINGLE CARD (No View Once) ======================
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
        const posterUrl = (img || d.poster || config.LOGO).replace("-150x150", "");

        // Info Text
        let caption = `\`☘️ Tɪᴛʟᴇ: ${d.title || 'N/A'}\`
\`📅 Yᴇᴀʀ : ${d.year || 'N/A'}\`
\`💃 Iᴍᴅʙ : ${d.imdb_rating || 'N/A'}\`
\`🎞️ Qᴜʟɪᴛʏ : ${d.quality || 'N/A'}\`

\`🎭 ᴄᴀsᴛ:\`
${d.cast?.slice(0, 4).map(c => `*• ${c.name}*`).join('\n') || '*• No cast available*'}

*Reply Below Number 🔢*,
*Available Qualities*`;

        // Download Options
        const downloadRows = d.download_links?.slice(0, 3).map((link) => ({
            title: `${link.size} - ${link.quality}`,
            id: `${prefix}cdl ${encodeURIComponent(img || d.poster || '')}&${encodeURIComponent(link.final_link)}&${encodeURIComponent(d.title)}`
        })) || [];

        downloadRows.push({
            title: "GET INFO",
            id: `${prefix}bdetails ${url}&${img || d.poster || ''}`
        });

        const listButtons = {
            title: "🎬 Choose Download Quality",
            sections: [{
                title: "Available Downloads",
                rows: downloadRows
            }]
        };

        // Single Normal Message (View Once Removed)
        await conn.sendMessage(from, {
            image: { url: posterUrl },
            caption: caption,
            footer: "*• ᴠɪꜱᴘᴇʀ ᴍᴅ ᴡᴀ ʙᴏᴛ •*",
            buttons: [{
                buttonId: "select_quality",
                buttonText: { displayText: "⬇️ Select Option" },
                type: 4,
                nativeFlowInfo: {
                    name: "single_select",
                    paramsJson: JSON.stringify(listButtons)
                }
            }],
            headerType: 1
            // viewOnce: true  ← Removed
        }, { quoted: mek });

        await conn.sendMessage(from, { react: { text: '✅', key: mek.key } });

    } catch (e) {
        console.log(e);
        await reply('❌ *Error fetching info!*');
    }
});

// ====================== DETAILS & DOWNLOAD ======================
cmd({
    pattern: "bdetails",
    react: '📄',
    dontAddCommandList: true,
    filename: __filename
}, async (conn, m, mek, { from, q }) => {
    try {
        const [url, img] = q.split("&");
        let info = await fetchJson(`https://apis.sadas.dev/api/v1/movie/cinesubz/info?q=${encodeURIComponent(url)}&apiKey=50d7ce3f5137b97bc64d220a3f6a33ed`);
        const d = info.data;

        let fullMsg = `*☘️ Title :* ${d.title}\n\n*📝 Full Description :*\n${d.description || 'N/A'}`;

        await conn.sendMessage(config.JID || from, {
            image: { url: (img || d.poster || '').replace("-150x150", "") },
            caption: fullMsg
        });
    } catch (e) {}
});

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
        const decodedLink = decodeURIComponent(finalLink);
        const decodedTitle = decodeURIComponent(title || 'Movie');
        const decodedImg = decodeURIComponent(img || '');

        await conn.sendMessage(from, { react: { text: '⬆️', key: mek.key } });
        await conn.sendMessage(from, { text: '*Fetching direct link & uploading...*' });

        let dlData = await fetchJson(`https://apis.sadas.dev/api/v1/movie/cinesubz/dl?q=${encodeURIComponent(decodedLink)}&apiKey=50d7ce3f5137b97bc64d220a3f6a33ed`);

        let directUrl = decodedLink;
        if (dlData?.status && dlData?.data?.links?.length > 0) {
            directUrl = dlData.data.links[0];
        }

        await conn.sendMessage(config.JID || from, {
            document: { url: directUrl },
            caption: `*🎬 ${decodedTitle}*\n\n${config.FOOTER || ''}`,
            mimetype: "video/mp4",
            jpegThumbnail: decodedImg ? await (await fetch(decodedImg.replace("-150x150", ""))).buffer().catch(() => null) : null,
            fileName: `${decodedTitle}.mp4`
        });

        await conn.sendMessage(from, { react: { text: '✅', key: mek.key } });
        await reply(`*✅ Movie sent successfully!*`);

    } catch (e) {
        console.error(e);
        await reply('*Error while processing download!*');
    } finally {
        isUploading = false;
    }
});
            

