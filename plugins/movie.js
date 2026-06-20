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
cmd({
    pattern: "moviepro",
    react: '🔎',
    category: "movie",
    alias: ["mpsearch"],
    desc: "Moviepro search",
    use: ".moviepro avatar",
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

        const apiUrl = `https://moviepro.sadas.dev/api/search?keyword=${encodeURIComponent(q)}&key=sadas2007`;
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
                description: `⭐ Rating: ${movie.rating || 'N/A'}`,
                rowId: `${prefix}movieproinfo ${movie.id}`
            });
        });

        
        const sections = [{
            title: "▬▬▬ 🍿 AVAILABLE MOVIES ▬▬▬", 
            rows: srh
        }];

        const listMessage = {
            text:        `╔═══════════════════════════╗\n` +             `  🎬  *𝗠𝗢𝗩𝗜𝗘𝗣𝗥𝗢  𝗦𝗘𝗔𝗥𝗖𝗛 𝗦𝗬𝗦𝗧𝗘𝗠*  🚀\n` +
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
// 2. MOVIE INFO & DOWNLOAD LINKS COMMAND
// ==========================================
cmd({
    pattern: "movieproinfo",
    react: '🎥',
    desc: "moviepro downloader info",
    filename: __filename
},
async (conn, m, mek, { from, q, isMe, prefix, reply }) => {
    try {
        if (!q) return await reply('*Please provide a movie ID!*');

        // Fetching Data from Info API
        const apiUrl = `https://moviepro.sadas.dev/api/info?id=${q}&key=sadas2007`;
        const res = await axios.get(apiUrl);
        const sadas = res.data;

        if (!sadas.status || !sadas.movie_details) {
            return await conn.sendMessage(from, { text: '🚩 *Error fetching movie details!*' }, { quoted: mek });
        }

        const movie = sadas.movie_details;
        const links = sadas.download_links || [];

        let msg = `*🍿 𝗧ɪᴛʟᴇ ➮* *_${movie.title || 'N/A'}_*

*📅 𝗥ᴇʟᴇᴀꜱᴇ ᴅᴀᴛᴇ ➮* _${movie.releaseDate || 'N/A'}_
*🌎 𝗖ᴏᴜɴᴛʀʏ ➮* _${movie.countryName || 'N/A'}_
*💃 𝗥ᴀᴛɪɴɢ ➮* _${movie.imdbRatingValue || 'N/A'}_
*🎭 𝗚ᴇɴʀᴇ ➮* _${movie.genre || 'N/A'}_`

        let rows = [];

        // Add Details Card Button
        rows.push({
            buttonId: prefix + 'movieprodetails ' + `${q}`, 
            buttonText: { displayText: 'Details Card\n' }, 
            type: 1 
        });

        // Add Download Link Buttons
        if (links.length > 0) {
            links.forEach((dl) => {
                rows.push({
                    // format: command direct_url±title±image±quality
                    buttonId: `${prefix}movieprodl ${dl.direct_url}±${movie.title}±${movie.image}±${dl.quality}`, 
                    buttonText: { 
                        displayText: `${dl.size} - ${dl.quality}` 
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
// 3. MOVIE DOWNLOAD COMMAND
// ==========================================
cmd({
    pattern: "movieprodl",
    react: "⬇️",
    dontAddCommandList: true,
    filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
    try {
        if (!q) return reply("*📍 Please provide link!*");

        const [directUrl, movieName, thumbUrl, quality] = q.split("±");

        const loading = await conn.sendMessage(from, {
            text: "*Uploading movie... ⬆️*"
        }, { quoted: mek });

        let thumb = null;

        if (thumbUrl) {
            try {
                const response = await axios.get(thumbUrl, {
                    responseType: "arraybuffer"
                });

                thumb = await sharp(Buffer.from(response.data))
                    .resize(300, 300, { fit: "cover" })
                    .jpeg({ quality: 80 })
                    .toBuffer();

            } catch (e) {
                console.log(e);
            }
        }

        await conn.sendMessage(from, { 
            document: { url: directUrl },
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
// 4. MOVIE DETAILS COMMAND
// ==========================================
cmd({
    pattern: "movieprodetails",
    react: '🎬',
    desc: "Movie details sender from Moviepro",
    filename: __filename
},
async (conn, m, mek, { from, q, isMe, reply }) => {
    try {
        if (!q) return await reply('⚠️ *Please provide the movie ID!*');

        let apiUrl = `https://moviepro.sadas.dev/api/info?id=${q}&key=sadas2007`;
        let sadas = await fetchJson(apiUrl);

        if (!sadas || !sadas.status || !sadas.movie_details) {
            return await conn.sendMessage(from, { text: '🚩 *Error: Could not find movie details!*' }, { quoted: mek });
        }

        const movie = sadas.movie_details;
        let details = (await axios.get('https://mv-visper-full-db.pages.dev/Main/main_var.json')).data;

        let msg = `*🎬 𝗧ɪᴛʟᴇ ➮* *_${movie.title || 'N/A'}_*

*📅 𝗥ᴇʟᴇᴀꜱᴇ 𝗗ᴀᴛᴇ ➮* _${movie.releaseDate || 'N/A'}_
*🌟 𝗥ᴀᴛɪɴɢ ➮* _${movie.imdbRatingValue || 'N/A'}_
*🌍 𝗖ᴏᴜɴᴛʀʏ ➮* _${movie.countryName || 'N/A'}_
*🎭 𝗚ᴇɴʀᴇ ➮* _${movie.genre || 'N/A'}_

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









