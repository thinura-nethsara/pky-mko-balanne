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
  pattern: "tv",
  react: "🔎",
  alias: ["movie", "film", "cinema"],
  desc: "all tv series search",
  category: "tv",
  use: '.tv',
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
      { name: "CINESUBZ TV SERIES ", cmd: "cztv" },
      { name: "SINHALASUB TV SERIES ", cmd: "sinhalasub" }

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

// ====================== CINESUBZ TV SERIES PLUGIN ======================

cmd({
    pattern: "cztv",
    alias: ["cinesubztv","cinetv"],
    react: '📺',
    category: "tv",
    desc: "Cinesubz TV series search",
    use: ".ctv money heist",
    filename: __filename
}, async (conn, m, mek, { from, q, prefix, isMe, isPre, isSudo, isOwner, reply }) => {
    try {
        if (!q) return await reply('*Please give a TV show name !*');

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

        const searchUrl = `https://mr-thinuzz-api-build.vercel.app/api/cinesubz/search?query=${encodeURIComponent(q)}&apiKey=key_13be1374312cdd0a`;
        const searchRes = await fetchJson(searchUrl);

        if (!searchRes?.status || !searchRes?.data?.all?.length) {
            await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
            return await reply('*No results found ❌*');
        }

        const tvShows = searchRes.data.all.filter(item => item.type === 'TV');
        if (tvShows.length === 0) {
            return await reply('*No TV series found for that query.*');
        }

        const results = tvShows.slice(0, 10);
        const rows = results.map((v) => ({
            title: v.title.substring(0, 60),
            rowId: `${prefix}ctvinfo ${encodeURIComponent(v.link)}&${encodeURIComponent(v.image || '')}`
        }));

        const listMessage = {
            text: `*📺 CINESUBZ TV SERIES SEARCH RESULT*\n\n*Input :* ${q}\n*Found :* ${results.length} series`,
            footer: config.FOOTER,
            title: "TV Series Results",
            buttonText: "*Reply Below Number 🔢*",
            sections: [{ title: "Available Series", rows }]
        };

        if (config.BUTTON === "true") {
            const listButtons = {
                title: "📺 Choose a Series",
                sections: [{ title: "Results", rows: rows.map(r => ({ title: r.title, id: r.rowId })) }]
            };
            await conn.sendMessage(from, {
                image: { url: config.LOGO },
                caption: `*📺 CINESUBZ TV SERIES SEARCH RESULT*\n\n*Input :* ${q}\n*Found :* ${results.length} series`,
                footer: config.FOOTER,
                buttons: [{
                    buttonId: "list",
                    buttonText: { displayText: "Select Series" },
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

// ====================== TV INFO + EPISODE LIST ======================
cmd({
    pattern: "ctvinfo",
    react: '🎥',
    dontAddCommandList: true,
    filename: __filename
}, async (conn, m, mek, { from, q, prefix, reply }) => {
    try {
        if (!q) return await reply('*Invalid format!*');

        const [url, img] = q.split("&");
        if (!url) return await reply('*Invalid series link!*');

        const infoUrl = `https://mr-thinuzz-api-build.vercel.app/api/cinesubz/tvshow?url=${encodeURIComponent(url)}&apiKey=key_13be1374312cdd0a`;
        const info = await fetchJson(infoUrl);

        if (!info?.status || !info?.data) {
            return await reply('*Failed to fetch series details!*');
        }

        const d = info.data;
        const poster = (img || d.mainImage || config.LOGO).replace("-150x150", "");

        // Clean details caption (used for both image and "Details Card" row)
        const cleanDetails = `*☘️ 𝗧ɪᴛʟᴇ : ${d.maintitle || 'N/A'}*

*▫️🥇 𝗜ᴍᴅʙ 𝗩ᴏᴛᴇꜱ ➟* ${d.imdb || 'N/A'}
*▫️🎭 𝗚ᴇɴʀᴇꜱ ➟* ${d.category?.join(', ') || 'N/A'}
*▫️🕵️‍♂️ 𝗖ᴀsᴛ ➟* ${d.cast?.slice(0, 5).map(c => c.actor.name).join(', ') || 'N/A'}

*➟➟➟➟➟➟➟➟➟➟➟➟➟➟➟*
*👥 𝙵𝙾𝙻𝙻𝙾𝚆 𝙾𝚄𝚁 𝙲𝙷𝙰𝙽𝙽𝙴𝙻 ➟* https://whatsapp.com/channel/0029VbCe8YW84OmKiJkDfk3o
*➟➟➟➟➟➟➟➟➟➟➟➟➟➟➟*`;

        // Send series poster + details
        await conn.sendMessage(from, {
            image: { url: poster },
            caption: `╭━━━〔 📺 TV SERIES DETAILS 〕━━━⬣

🎬 *Title:* ${d.maintitle || 'N/A'}
⭐ *IMDb:* ${d.imdb || 'N/A'}
🎭 *Genres:* ${d.category?.join(', ') || 'N/A'}
👥 *Cast:* ${d.cast?.slice(0, 5).map(c => c.actor.name).join(', ') || 'N/A'}

╰━━━━━━━━━━━━━━━━━━⬣
${config.FOOTER || ''}`,
            footer: config.FOOTER
        }, { quoted: mek });

        // Build episode list (flatten all seasons)
        let episodes = [];
        if (d.episodesDetails && Array.isArray(d.episodesDetails)) {
            d.episodesDetails.forEach(season => {
                if (season.episodes && Array.isArray(season.episodes)) {
                    season.episodes.forEach(ep => {
                        episodes.push({
                            ...ep,
                            season: season.season
                        });
                    });
                }
            });
        }

        if (episodes.length === 0) {
            await conn.sendMessage(from, { react: { text: '⚠️', key: mek.key } });
            return await reply('*No episodes found for this series.*');
        }

        // Limit episodes to avoid huge list (max 20)
        const epRows = episodes.slice(0, 20).map((ep) => ({
            title: `S${ep.season}E${ep.number} - ${ep.title || 'Episode ' + ep.number}`.substring(0, 60),
            rowId: `${prefix}ctvep ${encodeURIComponent(ep.url)}&${encodeURIComponent(poster)}&${encodeURIComponent(d.maintitle || 'TV Show')}`
        }));

        // Add a "Details Card" row (clean details)
        epRows.push({
            title: "📄 Details Card",
            rowId: `${prefix}ctvdetails ${encodeURIComponent(url)}&${encodeURIComponent(poster)}`
        });

        const listMessage = {
            text: `*📺 ${d.maintitle || 'TV Series'} - Episodes*\n\nSelect an episode to get download links.`,
            footer: config.FOOTER,
            title: "Episodes",
            buttonText: "*Reply Below Number 🔢*",
            sections: [{ title: "Available Episodes", rows: epRows }]
        };

        if (config.BUTTON === "true") {
            const listButtons = {
                title: "📺 Choose Episode",
                sections: [{ title: "Episodes", rows: epRows.map(r => ({ title: r.title, id: r.rowId })) }]
            };
            await conn.sendMessage(from, {
                image: { url: poster },
                caption: `*📺 ${d.maintitle || 'TV Series'} - Episodes*\n\nSelect an episode to get download links.`,
                footer: config.FOOTER,
                buttons: [{
                    buttonId: "list",
                    buttonText: { displayText: "Select Episode" },
                    type: 4,
                    nativeFlowInfo: { name: "single_select", paramsJson: JSON.stringify(listButtons) }
                }],
                headerType: 1
            }, { quoted: mek });
        } else {
            await conn.listMessage(from, listMessage, mek);
        }

        await conn.sendMessage(from, { react: { text: '☑️', key: mek.key } });

    } catch (e) {
        console.log(e);
        await reply('❌ *Error fetching info!*');
    }
});

// ====================== TV DETAILS CARD (clean details) ======================
cmd({
    pattern: "ctvdetails",
    react: '📋',
    dontAddCommandList: true,
    filename: __filename
}, async (conn, m, mek, { from, q, reply }) => {
    try {
        const [url, img] = q.split("&");
        const infoUrl = `https://mr-thinuzz-api-build.vercel.app/api/cinesubz/tvshow?url=${encodeURIComponent(url)}&apiKey=key_13be1374312cdd0a`;
        const info = await fetchJson(infoUrl);
        if (!info?.status || !info?.data) return await reply('*Failed to fetch details!*');

        const d = info.data;
        const poster = (img || d.mainImage || config.LOGO).replace("-150x150", "");
        const cleanDetails = `*☘️ 𝗧ɪᴛʟᴇ : ${d.maintitle || 'N/A'}*

*▫️🥇 𝗜ᴍᴅʙ 𝗩ᴏᴛᴇꜱ ➟* ${d.imdb || 'N/A'}
*▫️🎭 𝗚ᴇɴʀᴇꜱ ➟* ${d.category?.join(', ') || 'N/A'}
*▫️🕵️‍♂️ 𝗖ᴀsᴛ ➟* ${d.cast?.slice(0, 5).map(c => c.actor.name).join(', ') || 'N/A'}

*➟➟➟➟➟➟➟➟➟➟➟➟➟➟➟*
*👥 𝙵𝙾𝙻𝙻𝙾𝚆 𝙾𝚄𝚁 𝙲𝙷𝙰𝙽𝙽𝙴𝙻 ➟* https://whatsapp.com/channel/0029VbCe8YW84OmKiJkDfk3o
*➟➟➟➟➟➟➟➟➟➟➟➟➟➟➟*`;

        await conn.sendMessage(from, {
            image: { url: poster },
            caption: cleanDetails,
            footer: config.FOOTER
        }, { quoted: mek });

    } catch (e) { console.log(e); }
});

// ====================== EPISODE QUALITY SELECTION ======================
cmd({
    pattern: "ctvep",
    react: '⬇️',
    dontAddCommandList: true,
    filename: __filename
}, async (conn, m, mek, { from, q, prefix, reply }) => {
    try {
        if (!q) return await reply('*Invalid format!*');

        const [epUrl, poster, title] = q.split("&");
        if (!epUrl) return await reply('*Invalid episode link!*');

        const epInfoUrl = `https://mr-thinuzz-api-build.vercel.app/api/cinesubz/episode?url=${encodeURIComponent(epUrl)}&apiKey=key_13be1374312cdd0a`;
        const epInfo = await fetchJson(epInfoUrl);

        if (!epInfo?.status || !epInfo?.data?.downloadUrl?.length) {
            return await reply('*No download links found for this episode.*');
        }

        const qualities = epInfo.data.downloadUrl;
        const displayTitle = decodeURIComponent(title || 'Episode');

        const rows = qualities.map((q, i) => ({
            title: `${q.quality} (${q.size})`,
            rowId: `${prefix}ctvdl ${encodeURIComponent(q.link)}&${encodeURIComponent(poster || '')}&${encodeURIComponent(displayTitle)}&${encodeURIComponent(q.quality)}`
        }));

        const listMessage = {
            text: `*📺 ${displayTitle}*\n\n*Available qualities:*`,
            footer: config.FOOTER,
            title: "Download Options",
            buttonText: "*Reply Below Number 🔢*",
            sections: [{ title: "Qualities", rows }]
        };

        if (config.BUTTON === "true") {
            const listButtons = {
                title: "⬇️ Choose Quality",
                sections: [{ title: "Qualities", rows: rows.map(r => ({ title: r.title, id: r.rowId })) }]
            };
            await conn.sendMessage(from, {
                image: { url: poster || config.LOGO },
                caption: `*📺 ${displayTitle}*\n\n*Available qualities:*`,
                footer: config.FOOTER,
                buttons: [{
                    buttonId: "list",
                    buttonText: { displayText: "Select Quality" },
                    type: 4,
                    nativeFlowInfo: { name: "single_select", paramsJson: JSON.stringify(listButtons) }
                }],
                headerType: 1
            }, { quoted: mek });
        } else {
            await conn.listMessage(from, listMessage, mek);
        }

        await conn.sendMessage(from, { react: { text: '✅', key: mek.key } });

    } catch (e) {
        console.log(e);
        await reply('❌ *Error fetching episode links!*');
    }
});

// ====================== TV EPISODE DOWNLOAD ======================
let isTvUploading = false;

cmd({
    pattern: "ctvdl",
    react: "⬇️",
    dontAddCommandList: true,
    filename: __filename
}, async (conn, m, mek, { from, q, reply }) => {
    if (isTvUploading) return await reply('*A movie is already being uploaded. Please wait...* ⏳');

    try {
        isTvUploading = true;

        const [link, poster, title, quality] = q.split("&");
        const decodedLink = decodeURIComponent(link);
        const decodedTitle = decodeURIComponent(title || 'Episode');
        const decodedPoster = decodeURIComponent(poster || '');
        const decodedQuality = decodeURIComponent(quality || '');

        await conn.sendMessage(from, { react: { text: '⬆️', key: mek.key } });
        await conn.sendMessage(from, { text: '*Fetching direct download link...*' });

        // Resolve final download URL
        const dlUrl = `https://mr-thinuzz-api-build.vercel.app/api/cinesubz/download?url=${encodeURIComponent(decodedLink)}&apiKey=key_13be1374312cdd0a`;
        const dlRes = await fetchJson(dlUrl);

        if (!dlRes?.status || !dlRes?.data?.downloadUrls?.length) {
            throw new Error('No direct download URL');
        }

        // Pick a link that is not t.me or contains 'start='
        let finalUrl = null;
        for (const item of dlRes.data.downloadUrls) {
            if (item.url && !item.url.includes('t.me') && !item.url.includes('start=')) {
                finalUrl = item.url;
                break;
            }
        }
        if (!finalUrl) finalUrl = dlRes.data.downloadUrls[0].url;

        // Prepare thumbnail
        let thumb = null;
        if (decodedPoster) {
            try {
                const imgRes = await axios.get(decodedPoster.replace("-150x150", ""), { responseType: 'arraybuffer', timeout: 15000 });
                thumb = await sharp(imgRes.data).resize(320, 320).jpeg({ quality: 70 }).toBuffer();
            } catch (e) { console.warn('Thumb error:', e.message); }
        }

        const fileName = `🎬${config.TITLE}${decodedTitle.replace(/[^\w\s]/g, '').substring(0, 40)}.mkv`;

        await conn.sendMessage(config.JID || from, {
            document: { url: finalUrl },
            mimetype: 'video/mp4',
            fileName: fileName,
            caption: `*𝗧ɪᴛʟᴇ : ${decodedTitle}*\n\n\`[${decodedQuality}]\`\n\n${config.FOOTER || ''}`,
            jpegThumbnail: thumb
        });

        await conn.sendMessage(from, { react: { text: '☑️', key: mek.key } });
        await reply(`*☑️ Episode sent successfully!*\n\n > *Download by VISPER MD*`);

    } catch (e) {
        console.error(e);
        await reply(`*Error while downloading:* ${e.message}`);
    } finally {
        isTvUploading = false;
    }
});



