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
const fg = require('api-dylux');
const { Octokit } = require("@octokit/rest");



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

if (!isFree && !isMe && !isPre) {
await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
return await conn.sendMessage(from, {
text: "*`You are not a premium user⚠️`*\n\n" +
"*Send a message to one of the 2 numbers below and buy Lifetime premium 🎉.*\n\n" +
"_Price : 200 LKR ✔️_\n\n" +
"*👨‍💻Contact us : 0778500326 , 0722617699*"
}, { quoted: mek });
}

    if (config.MV_BLOCK === "true" && !isMe && !isSudo && !isOwner) {
      await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
      return await conn.sendMessage(from, {
        text: "*This command currently only works for the Bot owner. To disable it for others, use the .settings command 👨‍🔧.*"
      }, { quoted: mek });
    }

    if (!q) return await reply('*Enter movie name..🎬*');

    const sources = [
      { name: "CINESUBZ", cmd: "cine" },
      { name: "SINHALASUB", cmd: "sinhalasub" },
     
	  { name: "SUBLK", cmd: "sublk" }
		
	 
    ];


    let imageBuffer;
    try {
      const res = await axios.get('https://nadeen-botzdatabse.vercel.app/MovieZoneX.png', {
        responseType: 'arraybuffer'
      });
      imageBuffer = Buffer.from(res.data, 'binary');
    } catch {
      imageBuffer = null; 
    }

    const caption = `_*VISPER MOVIE SYSTEM 🎬*_\n\n*\`🔍Input :\`* ${q}\n\n_*🌟 Select your preferred movie download site*_`;

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
        image: imageBuffer || { url: 'https://nadeen-botzdatabse.vercel.app/MovieZoneX.png' },
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
        image: { url: 'https://nadeen-botzdatabse.vercel.app/MovieZoneX.png' },
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





// ==========================================
// 1. MOVIE SEARCH COMMAND
// ==========================================
// ==========================================
// 1. SEARCH COMMAND (CineSubz)
// ==========================================
cmd({
    pattern: "cinesubz",
    react: '🔎',
    category: "movie",
    alias: ["cs", "cssearch"],
    desc: "Search movies on CineSubz",
    use: ".cinesubz avatar",
    filename: __filename
},
async (conn, m, mek, { from, q, prefix, isPre, isSudo, isOwner, isMe, reply }) => {
    try {
        const pr = (await axios.get('https://raw.githubusercontent.com/Nadeenpoorna-app/main-data/refs/heads/main/master.json')).data;
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

        if (config.MV_BLOCK === "true" && !isMe && !isSudo && !isOwner) {
            await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
            return await conn.sendMessage(from, { text: "*This command currently only works for the Bot owner.*" }, { quoted: mek });
        }

        if (!q) return await reply('*Please give me a movie name 🎬*');

        const apiUrl = `https://pathum-x-apis.zone.id/api/cinesubz/search?q=${encodeURIComponent(q)}&apikey=dm_c4f5bc413ac3c91ad4450331d0217b80`;
        const response = await axios.get(apiUrl);
        const result = response.data;

        if (!result.status || !result.results || result.results.length === 0) {
            await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
            return await conn.sendMessage(from, { text: '*No results found ❌*' }, { quoted: mek });
        }

        let srh = [];
        result.results.forEach((movie) => {
            srh.push({
                title: `🎬 ${movie.title}`, 
                description: `📅 Year: ${movie.year || 'N/A'}`,
                rowId: `${prefix}cinesubzinfo ${encodeURIComponent(movie.url)}`
            });
        });

        const sections = [{
            title: "▬▬▬ 🍿 CINESUBZ MOVIES ▬▬▬", 
            rows: srh
        }];

        const listMessage = {
            text:        `╔═══════════════════════════╗\n` +
                         `  🎬  *𝗖𝗜𝗡𝗘𝗦𝗨𝗕𝗭  𝗦𝗘𝗔𝗥𝗖𝗛*  🚀\n` +
                         `╚═══════════════════════════╝\n\n` +
                         `⚝ *\`Search Keyword :\`* ${q.toUpperCase()}\n\n` +
                         `■■■■■■■■■■■■■■■■■■■■`,
            footer: config.FOOTER,
            sections
        };

        await conn.listMessage(from, listMessage, mek);
    } catch (e) {
        console.log(e);
        await conn.sendMessage(from, { text: '🚩 *Error occurred while fetching data!*' }, { quoted: mek });
    }
});

// ==========================================
// 2. INFO & DOWNLOAD BUTTONS (CineSubz)
// ==========================================
cmd({
    pattern: "cinesubzinfo",
    react: '🎥',
    desc: "Get CineSubz movie details and download links",
    alias: ["csinfo"],
    filename: __filename
},
async (conn, m, mek, { from, q, isMe, prefix, reply }) => {
    try {
        if (!q) return await reply('*Please provide a movie URL!*');

        const apiUrl = `https://pathum-x-apis.zone.id/api/cinesubz/info?url=${decodeURIComponent(q)}&apikey=dm_c4f5bc413ac3c91ad4450331d0217b80`;
        const res = await axios.get(apiUrl);
        const sadas = res.data;

        if (!sadas.status || !sadas.data || !sadas.data.data) {
            return await conn.sendMessage(from, { text: '🚩 *Error fetching movie details!*' }, { quoted: mek });
        }

        const movie = sadas.data.data;
        const links = movie.downloadLinks || [];

        let msg = `*🍿 𝗧ɪᴛʟᴇ ➮* *_${movie.title || 'N/A'}_*

*📅 𝗥ᴇʟᴇᴀꜱᴇ ᴅᴀᴛᴇ ➮* _${movie.year || 'N/A'}_
*💃 𝗥ᴀᴛɪɴɢ ➮* _${movie.imdbRating || 'N/A'}_
*🎭 𝗚ᴇɴʀᴇ ➮* _${Array.isArray(movie.genres) ? movie.genres.join(', ') : 'N/A'}_`

        let rows = [];

        // Details Card Button
        rows.push({
            buttonId: prefix + 'cinesubzdetails ' + `${encodeURIComponent(q)}`, 
            buttonText: { displayText: '📋 Details Card' }, 
            type: 1 
        });

        // Download Buttons – pass the finalUrl to the dl command
        if (links.length > 0) {
            links.forEach((dl) => {
                let quality = dl.details || dl.quality || 'Download';
                rows.push({
                    buttonId: `${prefix}cinesubzdl ${encodeURIComponent(dl.finalUrl)}±${encodeURIComponent(movie.title)}±${encodeURIComponent(movie.image)}±${encodeURIComponent(quality)}`,
                    buttonText: { 
                        displayText: `⬇️ ${quality}` 
                    },
                    type: 1
                });
            });
        }

        const buttonMessage = {
            image: { url: movie.image }, 
            caption: msg,
            footer: config.FOOTER,
            buttons: rows,
            headerType: 4
        };

        return await conn.buttonMessage(from, buttonMessage, mek);

    } catch (e) {
        console.log(e);
        await conn.sendMessage(from, { text: '🚩 *Error !!*' }, { quoted: mek });
    }
});

// ==========================================
// 3. DOWNLOAD COMMAND (uses /dl endpoint)
// ==========================================
cmd({
    pattern: "cinesubzdl",
    react: "⬇️",
    alias: ["csdl"],
    dontAddCommandList: true,
    filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
    try {
        if (!q) return reply("*📍 Please provide the download link!*");

        // Decode parameters
        const [finalUrl, movieName, thumbUrl, quality] = q.split("±").map(decodeURIComponent);

        const loading = await conn.sendMessage(from, {
            text: "*Fetching download link... ⬆️*"
        }, { quoted: mek });

        // Call the CineSubz dl endpoint to get the actual download URL
        const dlApi = `https://pathum-x-apis.zone.id/api/cinesubz/dl?url=${encodeURIComponent(finalUrl)}&apikey=dm_c4f5bc413ac3c91ad4450331d0217b80`;
        const dlRes = await axios.get(dlApi);
        // Assume the response contains a field "downloadUrl" or the direct link
        // Adjust based on actual response structure
        let downloadUrl = dlRes.data.downloadUrl || dlRes.data.url || dlRes.data;

        // If it's a string, use it; otherwise try to extract
        if (typeof downloadUrl !== 'string') {
            downloadUrl = dlRes.data.link || dlRes.data.download_link || finalUrl; // fallback
        }

        // If the response is a redirect, we might need to follow; but we'll just use the link

        let thumb = null;
        if (thumbUrl) {
            try {
                const response = await axios.get(thumbUrl, { responseType: "arraybuffer" });
                thumb = await sharp(Buffer.from(response.data))
                    .resize(300, 300, { fit: "cover" })
                    .jpeg({ quality: 80 })
                    .toBuffer();
            } catch (e) {
                console.log(e);
            }
        }

        await conn.sendMessage(from, { 
            document: { url: downloadUrl },
            mimetype: 'video/mp4',
            fileName: `🎬 ${movieName}.mp4`,
            jpegThumbnail: thumb,
            caption: `*🎬 Name :* *${movieName}*\n\n*\`${quality}\`*\n\n${config.NAME}`
        });

        await conn.sendMessage(from, { delete: loading.key });
        await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });

    } catch (e) {
        console.log(e);
        reply("*❌ Error:* " + e.message);
    }
});

// ==========================================
// 4. DETAILS CARD COMMAND (CineSubz)
// ==========================================
cmd({
    pattern: "cinesubzdetails",
    react: '🎬',
    alias: ["csdetails"],
    desc: "Show full movie details from CineSubz",
    filename: __filename
},
async (conn, m, mek, { from, q, isMe, reply }) => {
    try {
        if (!q) return await reply('⚠️ *Please provide the movie URL!*');

        const apiUrl = `https://pathum-x-apis.zone.id/api/cinesubz/info?url=${decodeURIComponent(q)}&apikey=dm_c4f5bc413ac3c91ad4450331d0217b80`;
        let sadas = await fetchJson(apiUrl);

        if (!sadas || !sadas.status || !sadas.data || !sadas.data.data) {
            return await conn.sendMessage(from, { text: '🚩 *Error: Could not find movie details!*' }, { quoted: mek });
        }

        const movie = sadas.data.data;
        let details = (await axios.get('https://mv-visper-full-db.pages.dev/Main/main_var.json')).data;

        let msg = `*🎬 𝗧ɪᴛʟᴇ ➮* *_${movie.title || 'N/A'}_*

*📅 𝗥ᴇʟᴇᴀꜱ𝗲 𝗗𝗮𝘁𝗲 ➮* _${movie.year || 'N/A'}_
*🌟 𝗥ᴀᴛɪɴɢ ➮* _${movie.imdbRating || 'N/A'}_
*🎭 𝗚ᴇɴʀᴇ ➮* _${Array.isArray(movie.genres) ? movie.genres.join(', ') : 'N/A'}_
*📝 𝗗𝗲𝘀𝗰𝗿𝗶𝗽𝘁𝗶𝗼𝗻 ➮* _${movie.description || 'N/A'}_

✨ *Follow us:* ${details.mvchlink || ''}`;

        await conn.sendMessage(from, {
            image: { url: movie.image },
            caption: msg
        }, { quoted: mek });

        await conn.sendMessage(from, { react: { text: '✔️', key: mek.key } });

    } catch (error) {
        console.error('Error:', error);
        await conn.sendMessage(from, { text: '⚠️ *An error occurred while fetching details.*' }, { quoted: mek });
    }
});


// Define API key (can be moved to config)
const CINESUBZ_API_KEY = '50d7ce3f5137b97bc64d220a3f6a33ed';

cmd({
    pattern: "cine",	
    react: '🔎',
    category: "movie",
    desc: "Baiscopes.lk movie search",
    use: ".baiscopes 2025",
    filename: __filename
},
async (conn, m, mek, { from, isPre, q, prefix, isMe,isSudo, isOwner, reply }) => {
try {
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

    if( config.MV_BLOCK == "true" && !isMe && !isSudo && !isOwner ) {
        await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
        return await conn.sendMessage(from, { text: "*This command currently only works for the Bot owner. To disable it for others, use the .settings command 👨‍🔧.*" }, { quoted: mek });
    }

    if(!q) return await reply('*please give me text !..*');

    // NEW SEARCH API
    let url = await fetchJson(`https://apis.sadas.dev/api/v1/movie/cinesubz/search?q=${encodeURIComponent(q)}&apiKey=${CINESUBZ_API_KEY}`);

    if (!url || !url.data || url.data.length === 0) {
        await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
        return await conn.sendMessage(from, { text: '*No results found ❌*' }, { quoted: mek });
    }

    var srh = [];  
    for (var i = 0; i < url.data.length; i++) {
        srh.push({
            title: url.data[i].title,
            description: '',
            rowId: prefix + `bdl ${url.data[i].link}&${url.data[i].year}`
        });
    }

    const sections = [{
        title: "cinesubz.co results",
        rows: srh
    }];

    const listMessage = {
        text: `*_BAISCOPES MOVIE SEARCH RESULT 🎬_*\n\n*\`Input :\`* ${q}`,
        footer: config.FOOTER,
        title: 'cinesubz.co results',
        buttonText: '*Reply Below Number 🔢*',
        sections
    };

    const caption = `*_BAISCOPES MOVIE SEARCH RESULT 🎬_*\n\n*\`Input :\`* ${q}`;

    const rowss = url.data.map((v, i) => {
        const cleanText = `${url.data[i].title}`
            .replace(/WEBDL|WEB DL|BluRay HD|BluRay SD|BluRay FHD|Telegram BluRay SD|Telegram BluRay HD|Direct BluRay SD|Direct BluRay HD|Direct BluRay FHD|FHD|HD|SD|Telegram BluRay FHD/gi, "")
            .trim() || "No info";
        return {
            title: cleanText,
            id: prefix + `bdl ${url.data[i].link}&${url.data[i].year}`
        };
    });

    const listButtons = {
        title: "Choose a Movie :)",
        sections: [{
            title: "Available Links",
            rows: rowss
        }]
    };

    if (config.BUTTON === "true") {
        await conn.sendMessage(from, {
            image: { url: config.LOGO },
            caption: caption,
            footer: config.FOOTER,
            buttons: [
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
        await conn.listMessage(from, listMessage, mek);
    }

} catch (e) {
    console.log(e);
    await conn.sendMessage(from, { text: '🚩 *Error !!*' }, { quoted: mek });
}
});

cmd({
    pattern: "bdl",	
    react: '🎥',
    desc: "moive downloader",
    filename: __filename
},
async (conn, m, mek, { from, q, isMe, isSudo, isOwner, prefix, reply }) => {
try {
    const urll = q.split("&")[0];
    const im = q.split("&")[1];

    // NEW INFO API
    let sadas = await fetchJson(`https://apis.sadas.dev/api/v1/movie/cinesubz/info?q=${encodeURIComponent(urll)}&apiKey=${CINESUBZ_API_KEY}`);

    let msg = `*☘️ 𝗧ɪᴛʟᴇ ➮* *_${sadas.data.title   || 'N/A'}_*\n\n` +
              `*📅 𝗥ᴇʟᴇꜱᴇᴅ ᴅᴀᴛᴇ ➮* _${sadas.data.date   || 'N/A'}_\n` +
              `*💃 𝗥ᴀᴛɪɴɢ ➮* _${sadas.data.imdb  || 'N/A'}_\n` +
              `*⏰ 𝗥ᴜɴᴛɪᴍᴇ ➮* _${sadas.data.runtime   || 'N/A'}_\n` +
              `*💁‍♂️ 𝗦ᴜʙᴛɪᴛʟᴇ ʙʏ ➮* _${sadas.data.subtitle_author   || 'N/A'}_\n` +
              `*🎭 𝗚ᴇɴᴀʀᴇꜱ ➮* ${sadas.data.genres ? sadas.data.genres.join(', ') : 'N/A'}\n`;

    if (sadas.length < 1) return await conn.sendMessage(from, { text: 'erro !' }, { quoted: mek });

    var rows = [];  
    rows.push({
        buttonId: prefix + `bdetails ${urll}&${im}`,
        buttonText: { displayText: 'Details send' },
        type: 1
    });

    sadas.dl_links.map((v) => {
        rows.push({
            buttonId: prefix + `cdl ${im}±${v.link}±${sadas.data.title}\n\n*\`[ ${v.quality} ]\`*`,
            buttonText: { displayText: `${v.size} - ${v.quality}` },
            type: 1
        });
    });

    const buttonMessage = {
        image: { url: im.replace("-150x150", "") },	
        caption: msg,
        footer: config.FOOTER,
        buttons: rows,
        headerType: 4
    };

    const rowss = sadas.dl_links.map((v, i) => {
        const cleanText = `${v.size} (${v.quality})`
            .replace(/WEBDL|WEB DL|BluRay HD|BluRay SD|BluRay FHD|Telegram BluRay SD|Telegram BluRay HD|Direct BluRay SD|Direct BluRay HD|Direct BluRay FHD|FHD|HD|SD|Telegram BluRay FHD/gi, "")
            .trim() || "No info";
        return {
            title: cleanText,
            id: prefix + `cdl ${im}±${v.link}±${sadas.data.title}\n\n*\`[ ${v.quality} ]\`*`
        };
    });

    const listButtons = {
        title: "🎬 Choose a download link :)",
        sections: [{
            title: "Available Links",
            rows: rowss
        }]
    };

    if (config.BUTTON === "true") {
        await conn.sendMessage(from, {
            image: { url: im.replace("-150x150", "") },
            caption: msg,
            footer: config.FOOTER,
            buttons: [
                {
                    buttonId: prefix + `bdetails ${urll}&${im}`,
                    buttonText: { displayText: "Details Send" },
                    type: 1
                },
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
        return await conn.buttonMessage(from, buttonMessage, mek);
    }

} catch (e) {
    console.log(e);
    await conn.sendMessage(from, { text: '🚩 *Error !!*' }, { quoted: mek });
}
});

let isUploading = false;

cmd({
    pattern: "cdl",
    react: "⬇️",
    dontAddCommandList: true,
    filename: __filename
},
async (conn, mek, m, { from, q, isMe, reply }) => {
    if (!q) {
        return await reply('*Please provide a direct URL!*');
    }

    if (isUploading) {
        return await conn.sendMessage(from, { 
            text: '*A movie is already being uploaded. Please wait a while before uploading another one.* ⏳', 
            quoted: mek 
        });
    }

    try {
        isUploading = true;

        const datae = q.split("±")[0];
        const datas = q.split("±")[1];
        const dat = q.split("±")[2];

        // NEW DOWNLOAD API
        let sadas = await fetchJson(`https://apis.sadas.dev/api/v1/movie/cinesubz/dl?q=${encodeURIComponent(datas)}&apiKey=${CINESUBZ_API_KEY}`);

        if (!sadas || !sadas.data || !sadas.data.dl_link) {
            throw new Error('No direct download link found. Try again...');
        }

        if (!sadas.data.dl_link || !sadas.data.dl_link.includes('https://drive.baiscopeslk')) {
            console.log('Invalid input:', q);
            return await reply('*❗ Sorry, this download url is incorrect please choose another number*');
        }

        const mediaUrl = sadas.data.dl_link.trim();
        const botimg = `${datae}`;

        await conn.sendMessage(from, { react: { text: '⬆️', key: mek.key } });
        await conn.sendMessage(from, { text: '*Uploading your movie..⬆️*' });

        await conn.sendMessage(config.JID || from, { 
            document: { url: mediaUrl },
            caption: `*🎬 Name :* ${dat}\n\n${config.NAME}`,
            mimetype: "video/mp4",
            jpegThumbnail: await (await fetch(botimg)).buffer(),
            fileName: `${dat}.mp4`
        });

        await conn.sendMessage(from, { react: { text: '✔️', key: mek.key } });
        await conn.sendMessage(from, { text: `*Movie sent successfully to JID ${config.JID} ✔*` }, { quoted: mek });

    } catch (error) {
        console.error('Error fetching or sending:', error);
        await conn.sendMessage(from, { text: "*Erro fetching this moment retry now ❗*" }, { quoted: mek });
    } finally {
        isUploading = false;
    }
});

cmd({
    pattern: "bdetails",
    react: '🎬',
    desc: "Movie downloader",
    filename: __filename
},
async (conn, m, mek, { from, q, isMe, reply }) => {
    try {
        if (!q) 
            return await reply('⚠️ *Please provide the movie URL and image URL separated by "&".*');

        const [url, imgUrl] = q.split("&");
        if (!url || !imgUrl) 
            return await reply('❌ *Invalid format! Example:*\n_bdetails https://movieurl.com&https://imageurl.com_');

        // NEW INFO API (reuse)
        let sadas = await fetchJson(`https://apis.sadas.dev/api/v1/movie/cinesubz/info?q=${encodeURIComponent(url)}&apiKey=${CINESUBZ_API_KEY}`);
        let details = (await axios.get('https://mv-visper-full-db.pages.dev/Main/main_var.json')).data;

        let msg = `*☘️ 𝗧ɪᴛʟᴇ ➮* *_${sadas.data.title   || 'N/A'}_*\n\n` +
                  `*📅 𝗥ᴇʟᴇꜱᴇᴅ ᴅᴀᴛᴇ ➮* _${sadas.data.date   || 'N/A'}_\n` +
                  `*💃 𝗥ᴀᴛɪɴɢ ➮* _${sadas.data.imdb  || 'N/A'}_\n` +
                  `*⏰ 𝗥ᴜɴᴛɪᴍᴇ ➮* _${sadas.data.runtime   || 'N/A'}_\n` +
                  `*💁‍♂️ 𝗦ᴜʙᴛɪᴛʟᴇ ʙʏ ➮* _${sadas.data.subtitle_author   || 'N/A'}_\n` +
                  `*🎭 𝗚ᴇɴᴀʀᴇꜱ ➮* ${sadas.data.genres ? sadas.data.genres.join(', ') : 'N/A'}\n\n` +
                  `✨ *Follow us:* ${details.chlink}`;

        await conn.sendMessage(config.JID || from, {
            image: { url: imgUrl.replace("-150x150", "") },
            caption: msg
        });

        await conn.sendMessage(from, { react: { text: '✅', key: mek.key } });

    } catch (error) {
        console.error('Error:', error);
        await conn.sendMessage(from, '⚠️ *An error occurred. Please try again later.*', { quoted: mek });
    }
});

