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
    const pr = (await axios.get('https://visper-database.vercel.app/Main/main_var.json')).data;
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
      { name: "CINESUBZ", cmd: "cinesubz" },
      { name: "SINHALASUB", cmd: "sinhalasub" }

    ];


    let imageBuffer;
    try {
      const res = await axios.get('https://files.catbox.moe/f3nwkv.png', {
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
        image: imageBuffer || { url: 'https://files.catbox.moe/f3nwkv.png' },
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
        image: { url: 'https://files.catbox.moe/f3nwkv.png' },
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
    alias: ["cz"],
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



// ====================== INFO COMMAND - SINGLE CARD ONLY ======================
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

        // Exact Info Format
        let caption = `\`☘️ Tɪᴛʟᴇ: ${d.title || 'N/A'}\`
\`📅 Yᴇᴀʀ : ${d.year || 'N/A'}\`
\`💃 Iᴍᴅʙ : ${d.imdb_rating || 'N/A'}\`
\`🎞️ Qᴜʟɪᴛʏ : ${d.quality || 'N/A'}\`

\`🎭 ᴄᴀsᴛ:\`
${d.cast?.slice(0, 4).map(c => `*• ${c.name}*`).join('\n') || '*• No cast available*'}

*📝 Full Description :*\n${d.description || 'N/A'}`;

        // Download Options
        const downloadRows = d.download_links?.slice(0, 3).map((link) => ({
            title: `${link.size} - ${link.quality}`,
            rowId: `${prefix}cdl ${encodeURIComponent(img || d.poster || '')}&${encodeURIComponent(link.final_link)}&${encodeURIComponent(d.title)}`
        })) || [];


        const listMessage = {
            text: caption,
            footer: "*• ᴠɪꜱᴘᴇʀ ᴍᴅ ᴡᴀ ʙᴏᴛ •*",
            title: "Available Qualities",
            buttonText: "*Reply Below Number 🔢*",
            sections: [{
                title: "Download Options",
                rows: downloadRows
            }]
        };

        // =============== ONLY ONE MESSAGE ===============
        await conn.sendMessage(from, {
            image: { url: posterUrl },
            caption: caption,
            footer: "*• ᴠɪꜱᴘᴇʀ ᴍᴅ ᴡᴀ ʙᴏᴛ •*"
        }, { quoted: mek });

        // Numbered Download List (Second message - but without repeating full info)
        await conn.listMessage(from, {
            footer: "*• ᴠɪꜱᴘᴇʀ ᴍᴅ ᴡᴀ ʙᴏᴛ •*",
            title: "Available Qualities",
            buttonText: "*Reply Below Number 🔢*",
            sections: [{ title: "Download Options", rows: downloadRows }]
        }, mek);

        await conn.sendMessage(from, { react: { text: '☑️', key: mek.key } });

    } catch (e) {
        console.log(e);
        await reply('❌ *Error fetching info!*');
    }
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
        await conn.sendMessage(from, { text: '*Uploading Your Movie...*' });

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
            fileName: `🎬VISPER-MD🎬${decodedTitle}.mkv`
        });

        await conn.sendMessage(from, { react: { text: '☑️', key: mek.key } });
        await reply(`*✅ Movie sent successfully!*`);

    } catch (e) {
        console.error(e);
        await reply('*Error while processing download!*');
    } finally {
        isUploading = false;
    }
});
            



// ======================================================================
//                      MOVIEPRO PLUGIN (Full Browser)
// ======================================================================

// -------------------- MOVIEPRO SEARCH --------------------
cmd({
    pattern: "moviepro",
    alias: ["mp", "mpro"],
    react: "🎬",
    category: "movie",
    desc: "Search movies using MoviePro API",
    use: ".moviepro avengers",
    filename: __filename
}, async (conn, m, mek, { from, q, prefix, isMe, isPre, isSudo, isOwner, reply }) => {
    try {
        if (!q) return await reply('*Please enter a movie name!*');

        // Premium & block checks
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

        const searchUrl = `https://mr-thinuzz-api-build.vercel.app/api/moviepro/search?keyword=${encodeURIComponent(q)}&apiKey=key_4797e0dcedd66cca`;
        const searchRes = await fetchJson(searchUrl);

        if (!searchRes?.status || !searchRes?.results?.length) {
            await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
            return await reply('*No movies found for that query.*');
        }

        const results = searchRes.results.slice(0, 10);
        const rows = results.map(movie => ({
            title: `${movie.title} ${movie.rating > 0 ? `⭐ ${movie.rating}` : ''}`.substring(0, 60),
            rowId: `${prefix}mpinfo ${encodeURIComponent(movie.id)}`
        }));

        const caption = `*🎬 MOVIEPRO SEARCH RESULTS*\n\n*Query:* ${q}\n*Found:* ${results.length} movies`;

        if (config.BUTTON === "true") {
            const listButtons = {
                title: "🎥 Select a Movie",
                sections: [{ title: "Results", rows: rows.map(r => ({ title: r.title, id: r.rowId })) }]
            };
            await conn.sendMessage(from, {
                image: { url: config.LOGO },
                caption: caption,
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
            const listMessage = {
                text: caption,
                footer: config.FOOTER,
                title: "Movies",
                buttonText: "*Reply Below Number 🔢*",
                sections: [{ title: "Available Movies", rows }]
            };
            await conn.listMessage(from, listMessage, mek);
        }

        await conn.sendMessage(from, { react: { text: '✅', key: mek.key } });

    } catch (e) {
        console.error(e);
        await reply('❌ *Error searching movies!*');
    }
});

// -------------------- MOVIEPRO INFO + QUALITIES --------------------
cmd({
    pattern: "mpinfo",
    react: "📋",
    dontAddCommandList: true,
    filename: __filename
}, async (conn, m, mek, { from, q, prefix, reply }) => {
    try {
        if (!q) return await reply('*Invalid movie ID!*');

        const movieId = decodeURIComponent(q);
        const infoUrl = `https://mr-thinuzz-api-build.vercel.app/api/moviepro/info?id=${encodeURIComponent(movieId)}&apiKey=key_4797e0dcedd66cca`;
        const info = await fetchJson(infoUrl);

        if (!info?.status || !info?.movie) {
            return await reply('*Failed to fetch movie details!*');
        }

        const movie = info.movie;
        const downloadLinks = info.download_links || [];

        // Send movie poster + details
        const poster = movie.image || config.LOGO;
        const caption = `*🎬 ${movie.title}*\n\n` +
                        `📅 *Release:* ${movie.releaseDate || 'N/A'}\n` +
                        `🎭 *Genre:* ${movie.genre?.join(', ') || 'N/A'}\n` +
                        `🌍 *Country:* ${movie.country || 'N/A'}\n` +
                        `⭐ *IMDb:* ${movie.imdbRating || 'N/A'}\n\n` +
                        `_Select a quality below to download._`;

        await conn.sendMessage(from, {
            image: { url: poster },
            caption: caption,
            footer: config.FOOTER
        }, { quoted: mek });

        if (downloadLinks.length === 0) {
            await conn.sendMessage(from, { react: { text: '⚠️', key: mek.key } });
            return await reply('*No download links available for this movie.*');
        }

        // Build quality rows
        const rows = downloadLinks.map(link => ({
            title: `${link.quality} (${link.size})`,
            rowId: `${prefix}mpdl ${encodeURIComponent(link.original_url)}&${encodeURIComponent(movie.title)}&${encodeURIComponent(poster)}&${encodeURIComponent(link.quality)}`
        }));

        const listMessage = {
            text: `*${movie.title}* - Available qualities:`,
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
                image: { url: poster },
                caption: `*${movie.title}* - Available qualities:`,
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
        console.error(e);
        await reply('❌ *Error fetching movie details!*');
    }
});

// -------------------- MOVIEPRO DOWNLOAD --------------------
let isMovieUploading = false;

cmd({
    pattern: "mpdl",
    react: "⬇️",
    dontAddCommandList: true,
    filename: __filename
}, async (conn, m, mek, { from, q, reply }) => {
    if (isMovieUploading) return await reply('*A movie is already being uploaded. Please wait...* ⏳');

    try {
        isMovieUploading = true;

        const [encodedUrl, encodedTitle, encodedPoster, quality] = q.split("&");
        const url = decodeURIComponent(encodedUrl);
        const title = decodeURIComponent(encodedTitle || 'Movie');
        const poster = decodeURIComponent(encodedPoster || '');
        const qlty = decodeURIComponent(quality || '');

        await conn.sendMessage(from, { react: { text: '⬆️', key: mek.key } });
        await conn.sendMessage(from, { text: '*Fetching download link...*' });

        // Prepare thumbnail
        let thumb = null;
        if (poster) {
            try {
                const imgRes = await axios.get(poster, { responseType: 'arraybuffer', timeout: 15000 });
                thumb = await sharp(imgRes.data).resize(320, 320).jpeg({ quality: 70 }).toBuffer();
            } catch (e) { console.warn('Thumb error:', e.message); }
        }

        const fileName = `🎬${config.TITLE}${title.replace(/[^\w\s]/g, '').substring(0, 40)}.mp4`;

        await conn.sendMessage(config.JID || from, {
            document: { url: url },
            mimetype: 'video/mp4',
            fileName: fileName,
            caption: `*🎬 𝗧ɪᴛʟᴇ : ${title}*\n\n\`[${qlty}]\`\n\n${config.FOOTER || ''}`,
            jpegThumbnail: thumb
        });

        await conn.sendMessage(from, { react: { text: '☑️', key: mek.key } });
        await reply(`*☑️ Movie sent successfully!*\n\n > *Download by VISPER MD*`);

    } catch (e) {
        console.error(e);
        await reply(`*Error while downloading:* ${e.message}`);
    } finally {
        isMovieUploading = false;
    }
});
