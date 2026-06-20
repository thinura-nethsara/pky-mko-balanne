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

// =============================================
// MV COMMAND – MAIN MENU
// =============================================
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

// =============================================
// CINESUBZ MOVIE PLUGIN (FULLY UPDATED)
// =============================================

const CINESUBZ_API_KEY = '50d7ce3f5137b97bc64d220a3f6a33ed';

cmd({
    pattern: "cine",	
    react: '🔎',
    category: "movie",
    desc: "Baiscopes.lk movie search",
    use: ".baiscopes 2025",
    filename: __filename
},
async (conn, m, mek, { from, isPre, q, prefix, isMe, isSudo, isOwner, reply }) => {
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

// =============================================
// BDL – Get Movie Details & Download Links
// =============================================
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

        // If image URL is missing, use a fallback
        const imageUrl = (im && im.trim() !== '') ? im.replace("-150x150", "") : 'https://via.placeholder.com/200x300?text=Movie';

        let sadas = await fetchJson(`https://apis.sadas.dev/api/v1/movie/cinesubz/info?q=${encodeURIComponent(urll)}&apiKey=${CINESUBZ_API_KEY}`);

        if (!sadas || !sadas.data) {
            return await reply('*Invalid response from server.*');
        }

        const movieData = sadas.data;

        // Extract download links – from log we see 'download_links' array with 'final_link', 'quality', 'size'
        let dlLinks = movieData.download_links || [];

        // Also try alternative keys if not found
        if (!dlLinks || dlLinks.length === 0) {
            const altKeys = ['dl_links', 'links', 'sources', 'downloads'];
            for (let key of altKeys) {
                if (movieData[key] && Array.isArray(movieData[key]) && movieData[key].length > 0) {
                    dlLinks = movieData[key];
                    break;
                }
            }
        }

        if (!dlLinks || dlLinks.length === 0) {
            console.log('No links found in the response.');
            return await reply('*No valid download links found.*');
        }

        // Normalize each link: use final_link as URL, quality, size
        const normalized = dlLinks.map(item => {
            let link = item.final_link || item.link || item.url || item.download_link || '';
            let quality = item.quality || item.resolution || 'Unknown';
            let size = item.size || item.filesize || 'N/A';
            return { link, quality, size };
        }).filter(item => item.link && item.link.startsWith('http')); // Only keep valid URLs

        if (normalized.length === 0) {
            return await reply('*No valid download links found.*');
        }

        // Build message
        let msg = `*☘️ 𝗧ɪᴛʟᴇ ➮* *_${movieData.title   || 'N/A'}_*\n\n` +
                  `*📅 𝗥ᴇʟᴇꜱᴇᴅ ᴅᴀᴛᴇ ➮* _${movieData.date   || 'N/A'}_\n` +
                  `*💃 𝗥ᴀᴛɪɴɢ ➮* _${movieData.imdb  || 'N/A'}_\n` +
                  `*⏰ 𝗥ᴜɴᴛɪᴍᴇ ➮* _${movieData.runtime   || 'N/A'}_\n` +
                  `*💁‍♂️ 𝗦ᴜʙᴛɪᴛʟᴇ ʙʏ ➮* _${movieData.subtitle_author   || 'N/A'}_\n` +
                  `*🎭 𝗚ᴇɴᴀʀᴇꜱ ➮* ${movieData.genres ? movieData.genres.join(', ') : 'N/A'}\n`;

        // Create buttons
        var rows = [];  
        rows.push({
            buttonId: prefix + `bdetails ${urll}&${imageUrl}`,
            buttonText: { displayText: 'Details send' },
            type: 1
        });

        normalized.forEach((v) => {
            rows.push({
                buttonId: prefix + `cdl ${imageUrl}±${v.link}±${movieData.title}\n\n*\`[ ${v.quality} ]\`*`,
                buttonText: { displayText: `${v.size} - ${v.quality}` },
                type: 1
            });
        });

        const buttonMessage = {
            image: { url: imageUrl },	
            caption: msg,
            footer: config.FOOTER,
            buttons: rows,
            headerType: 4
        };

        const rowss = normalized.map((v, i) => {
            const cleanText = `${v.size} (${v.quality})`
                .replace(/WEBDL|WEB DL|BluRay HD|BluRay SD|BluRay FHD|Telegram BluRay SD|Telegram BluRay HD|Direct BluRay SD|Direct BluRay HD|Direct BluRay FHD|FHD|HD|SD|Telegram BluRay FHD/gi, "")
                .trim() || "No info";
            return {
                title: cleanText,
                id: prefix + `cdl ${imageUrl}±${v.link}±${movieData.title}\n\n*\`[ ${v.quality} ]\`*`
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
                image: { url: imageUrl },
                caption: msg,
                footer: config.FOOTER,
                buttons: [
                    {
                        buttonId: prefix + `bdetails ${urll}&${imageUrl}`,
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

// =============================================
// CDL – Download & Upload Movie
// =============================================
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

        let sadas = await fetchJson(`https://apis.sadas.dev/api/v1/movie/cinesubz/dl?q=${encodeURIComponent(datas)}&apiKey=${CINESUBZ_API_KEY}`);

        if (!sadas || !sadas.data || !sadas.data.dl_link) {
            throw new Error('No direct download link found. Try again...');
        }

        if (!sadas.data.dl_link || !sadas.data.dl_link.includes('https://drive.baiscopeslk')) {
            console.log('Invalid input:', q);
            return await reply('*❗ Sorry, this download url is incorrect please choose another number*');
        }

        const mediaUrl = sadas.data.dl_link.trim();
        const botimg = datae && datae !== 'undefined' ? datae : 'https://via.placeholder.com/200x300?text=Movie';

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

// =============================================
// BDETAILS – Send Full Details
// =============================================
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

        let sadas = await fetchJson(`https://apis.sadas.dev/api/v1/movie/cinesubz/info?q=${encodeURIComponent(url)}&apiKey=${CINESUBZ_API_KEY}`);
        let details = (await axios.get('https://mv-visper-full-db.pages.dev/Main/main_var.json')).data;

        if (!sadas || !sadas.data) {
            return await reply('*Failed to fetch movie details.*');
        }

        const movieData = sadas.data;

        let msg = `*☘️ 𝗧ɪᴛʟᴇ ➮* *_${movieData.title   || 'N/A'}_*\n\n` +
                  `*📅 𝗥ᴇʟᴇꜱᴇᴅ ᴅᴀᴛᴇ ➮* _${movieData.date   || 'N/A'}_\n` +
                  `*💃 𝗥ᴀᴛɪɴɢ ➮* _${movieData.imdb  || 'N/A'}_\n` +
                  `*⏰ 𝗥ᴜɴᴛɪᴍᴇ ➮* _${movieData.runtime   || 'N/A'}_\n` +
                  `*💁‍♂️ 𝗦ᴜʙᴛɪᴛʟᴇ ʙʏ ➮* _${movieData.subtitle_author   || 'N/A'}_\n` +
                  `*🎭 𝗚ᴇɴᴀʀᴇꜱ ➮* ${movieData.genres ? movieData.genres.join(', ') : 'N/A'}\n\n` +
                  `✨ *Follow us:* ${details.chlink}`;

        const finalImgUrl = imgUrl.replace("-150x150", "");
        await conn.sendMessage(config.JID || from, {
            image: { url: finalImgUrl },
            caption: msg
        });

        await conn.sendMessage(from, { react: { text: '✅', key: mek.key } });

    } catch (error) {
        console.error('Error:', error);
        await conn.sendMessage(from, '⚠️ *An error occurred. Please try again later.*', { quoted: mek });
    }
});
