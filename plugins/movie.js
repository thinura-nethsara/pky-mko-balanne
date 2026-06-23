const config = require('../config')
const { cmd, commands } = require('../command')
const axios = require('axios');
const { getBuffer, getGroupAdmins, getRandom, h2k, isUrl, Json, runtime, sleep, fetchJson} = require('../lib/functions')
const fetch = (...args) => import("node-fetch").then(({ default: fetch }) => fetch(...args));
const { Buffer } = require('buffer'); 
const l = console.log

// =============================================
// FALLBACK IMAGE (1x1 transparent PNG)
// =============================================
const FALLBACK_IMAGE_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const FALLBACK_IMAGE_BUFFER = Buffer.from(FALLBACK_IMAGE_BASE64, 'base64');

async function getImageBuffer(url) {
    if (!url || url === 'undefined' || !url.startsWith('http')) return FALLBACK_IMAGE_BUFFER;
    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error('Image fetch failed');
        return Buffer.from(await res.arrayBuffer());
    } catch {
        return FALLBACK_IMAGE_BUFFER;
    }
}

// =============================================
// MV – Main Menu
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
    from, prefix, quoted, q,
    isPre, isSudo, isOwner, isMe, reply
}) => {
    try {
        const pr = (await axios.get('https://mv-visper-full-db.pages.dev/Main/main_var.json')).data;
        const isFree = pr.mvfree === "true";
        if (!isFree && !isMe && !isPre) {
            await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
            return await conn.sendMessage(from, {
                text: "*`You are not a premium user⚠️`*\n\n*Send a message to one of the 2 numbers below and buy Lifetime premium 🎉.*\n\n_Price : 200 LKR ✔️_\n\n*👨‍💻Contact us : 0778500326 , 0722617699*"
            }, { quoted: mek });
        }
        if (config.MV_BLOCK === "true" && !isMe && !isSudo && !isOwner) {
            await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
            return await conn.sendMessage(from, { text: "*This command currently only works for the Bot owner. To disable it for others, use the .settings command 👨‍🔧.*" }, { quoted: mek });
        }
        if (!q) return await reply('*Enter movie name..🎬*');

        const sources = [
            { name: "CINESUBZ", cmd: "cine" },
            { name: "SINHALASUB", cmd: "sinhalasub" },
            { name: "SUBLK", cmd: "sublk" }
        ];

        let imageBuffer = FALLBACK_IMAGE_BUFFER;
        try {
            const res = await axios.get('https://nadeen-botzdatabse.vercel.app/MovieZoneX.png', { responseType: 'arraybuffer' });
            imageBuffer = Buffer.from(res.data, 'binary');
        } catch {}

        const caption = `_*VISPER MOVIE SYSTEM 🎬*_\n\n*\`🔍Input :\`* ${q}\n\n_*🌟 Select your preferred movie download site*_`;

        if (config.BUTTON === "true") {
            const listButtons = {
                title: "❯❯ Choose a movie source ❮❮",
                sections: [{
                    title: "❯❯ Choose a movie source ❮❮",
                    rows: sources.map(src => ({
                        title: `${src.name} Results 🎬`,
                        id: prefix + src.cmd + ' ' + q
                    }))
                }]
            };
            return await conn.sendMessage(from, {
                image: imageBuffer,
                caption,
                footer: config.FOOTER,
                buttons: [{
                    buttonId: "movie_menu_list",
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
// CINESUBZ – Search
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
                text: "*`You are not a premium user⚠️`*\n\n*Send a message to one of the 2 numbers below and buy Lifetime premium 🎉.*\n\n_Price : 200 LKR ✔️_\n\n*👨‍💻Contact us : 0778500326 , 0722617699*"
            }, { quoted: mek });
        }
        if (config.MV_BLOCK === "true" && !isMe && !isSudo && !isOwner) {
            await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
            return await conn.sendMessage(from, { text: "*This command currently only works for the Bot owner. To disable it for others, use the .settings command 👨‍🔧.*" }, { quoted: mek });
        }
        if (!q) return await reply('*please give me text !..*');

        let url = await fetchJson(`https://apis.sadas.dev/api/v1/movie/cinesubz/search?q=${encodeURIComponent(q)}&apiKey=${CINESUBZ_API_KEY}`);
        if (!url || !url.data || url.data.length === 0) {
            await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
            return await conn.sendMessage(from, { text: '*No results found ❌*' }, { quoted: mek });
        }

        const srh = url.data.map(item => ({
            title: item.title,
            description: '',
            rowId: prefix + `bdl ${item.link}&${item.year}`
        }));

        const sections = [{ title: "cinesubz.co results", rows: srh }];
        const listMessage = {
            text: `*_BAISCOPES MOVIE SEARCH RESULT 🎬_*\n\n*\`Input :\`* ${q}`,
            footer: config.FOOTER,
            title: 'cinesubz.co results',
            buttonText: '*Reply Below Number 🔢*',
            sections
        };

        if (config.BUTTON === "true") {
            await conn.sendMessage(from, {
                image: { url: config.LOGO },
                caption: listMessage.text,
                footer: config.FOOTER,
                buttons: [{
                    buttonId: "download_list",
                    buttonText: { displayText: "🎥 Select Option" },
                    type: 4,
                    nativeFlowInfo: {
                        name: "single_select",
                        paramsJson: JSON.stringify({
                            title: "Choose a Movie :)",
                            sections: [{ title: "Available Links", rows: srh }]
                        })
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
        await conn.sendMessage(from, { text: '🚩 *Error !!*' }, { quoted: mek });
    }
});

// =============================================
// BDL – Get Movie Details & Download Links
// =============================================
cmd({
    pattern: "bdl",	
    react: '🎥',
    desc: "movie downloader",
    filename: __filename
},
async (conn, m, mek, { from, q, isMe, isSudo, isOwner, prefix, reply }) => {
    try {
        const urll = q.split("&")[0];
        const im = q.split("&")[1];
        const imageUrl = (im && im !== 'undefined' && im.startsWith('http')) ? im.replace("-150x150", "") : null;

        let sadas = await fetchJson(`https://apis.sadas.dev/api/v1/movie/cinesubz/info?q=${encodeURIComponent(urll)}&apiKey=${CINESUBZ_API_KEY}`);
        if (!sadas || !sadas.data) return await reply('*Invalid response from server.*');

        const movieData = sadas.data;

        // Extract download links from 'download_links'
        let dlLinks = movieData.download_links || [];
        if (!dlLinks.length) {
            const altKeys = ['dl_links', 'links', 'sources', 'downloads'];
            for (let key of altKeys) {
                if (movieData[key] && Array.isArray(movieData[key]) && movieData[key].length) {
                    dlLinks = movieData[key];
                    break;
                }
            }
        }
        if (!dlLinks.length) return await reply('*No download links found for this movie.*');

        const normalized = dlLinks.map(item => ({
            link: item.final_link || item.link || item.url || '',
            quality: item.quality || item.resolution || 'Unknown',
            size: item.size || item.filesize || 'N/A'
        })).filter(item => item.link && item.link.startsWith('http'));

        if (!normalized.length) return await reply('*No valid download links found.*');

        // Build details message
        let msg = `*☘️ 𝗧ɪᴛʟᴇ ➮* *_${movieData.title   || 'N/A'}_*\n\n` +
                  `*📅 𝗥ᴇʟᴇꜱᴇᴅ ᴅᴀᴛᴇ ➮* _${movieData.date   || 'N/A'}_\n` +
                  `*💃 𝗥ᴀᴛɪɴɢ ➮* _${movieData.imdb  || 'N/A'}_\n` +
                  `*⏰ 𝗥ᴜɴᴛɪᴍᴇ ➮* _${movieData.runtime   || 'N/A'}_\n` +
                  `*💁‍♂️ 𝗦ᴜʙᴛɪᴛʟᴇ ʙʏ ➮* _${movieData.subtitle_author   || 'N/A'}_\n` +
                  `*🎭 𝗚ᴇɴᴀʀᴇꜱ ➮* ${(movieData.genres || []).join(', ') || 'N/A'}\n`;

        let imageBuffer = FALLBACK_IMAGE_BUFFER;
        if (imageUrl) {
            const fetched = await getImageBuffer(imageUrl);
            if (fetched) imageBuffer = fetched;
        }

        // Buttons: Details + each quality
        const rows = [];
        rows.push({
            buttonId: prefix + `bdetails ${urll}&${imageUrl || ''}`,
            buttonText: { displayText: '📄 Details send' },
            type: 1
        });

        normalized.forEach(v => {
            const buttonData = `${imageUrl || ''}±${v.link}±${movieData.title || 'Movie'}\n\n*\`[ ${v.quality} ]\`*`;
            rows.push({
                buttonId: prefix + `cdl ${buttonData}`,
                buttonText: { displayText: `${v.size} - ${v.quality}` },
                type: 1
            });
        });

        await conn.sendMessage(from, {
            image: imageBuffer,
            caption: msg,
            footer: config.FOOTER,
            buttons: rows,
            headerType: 4
        }, { quoted: mek });

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
    if (!q) return await reply('*Please provide a direct URL!*');
    if (isUploading) {
        return await conn.sendMessage(from, { 
            text: '*A movie is already being uploaded. Please wait a while before uploading another one.* ⏳', 
            quoted: mek 
        });
    }

    try {
        isUploading = true;

        const parts = q.split("±");
        const datae = parts[0] || '';
        const datas = parts[1] || '';
        const dat = parts[2] || '';

        if (!datas) return await reply('*Invalid download URL.*');

        // Call the download API
        let sadas = await fetchJson(`https://apis.sadas.dev/api/v1/movie/cinesubz/dl?q=${encodeURIComponent(datas)}&apiKey=${CINESUBZ_API_KEY}`);

        if (!sadas || !sadas.data) throw new Error('No direct download link found.');

        // Extract the direct link from the response
        let mediaUrl = sadas.data.dl_link;
        if (!mediaUrl && sadas.data.links && Array.isArray(sadas.data.links)) {
            // Prefer a non-Telegram direct link (e.g., .mp4)
            const direct = sadas.data.links.find(link => link && !link.includes('t.me') && link.startsWith('http'));
            mediaUrl = direct || sadas.data.links[0];
        }

        if (!mediaUrl) throw new Error('No downloadable URL found.');

        // Get thumbnail
        let thumbnailBuffer = FALLBACK_IMAGE_BUFFER;
        if (datae && datae !== 'undefined' && datae.startsWith('http')) {
            const fetched = await getImageBuffer(datae);
            if (fetched) thumbnailBuffer = fetched;
        }

        await conn.sendMessage(from, { react: { text: '⬆️', key: mek.key } });
        await conn.sendMessage(from, { text: '*Uploading your movie..⬆️*' });

        await conn.sendMessage(config.JID || from, { 
            document: { url: mediaUrl },
            caption: `*🎬 Name :* ${dat || 'Movie'}\n\n${config.NAME}`,
            mimetype: "video/mp4",
            jpegThumbnail: thumbnailBuffer,
            fileName: `${dat || 'movie'}.mp4`
        });

        await conn.sendMessage(from, { react: { text: '✔️', key: mek.key } });
        await conn.sendMessage(from, { text: `*Movie sent successfully to JID ${config.JID} ✔*` }, { quoted: mek });

    } catch (error) {
        console.error('Error fetching or sending:', error);
        await conn.sendMessage(from, { text: "*Error fetching this moment retry now ❗*" }, { quoted: mek });
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
        if (!q) return await reply('⚠️ *Please provide the movie URL and image URL separated by "&".*');
        const [url, imgUrl] = q.split("&");
        if (!url) return await reply('❌ *Invalid format! Example:*\n_bdetails https://movieurl.com&https://imageurl.com_');

        let sadas = await fetchJson(`https://apis.sadas.dev/api/v1/movie/cinesubz/info?q=${encodeURIComponent(url)}&apiKey=${CINESUBZ_API_KEY}`);
        let details = (await axios.get('https://mv-visper-full-db.pages.dev/Main/main_var.json')).data;

        if (!sadas || !sadas.data) return await reply('*Failed to fetch movie details.*');
        const movieData = sadas.data;

        let msg = `*☘️ 𝗧ɪᴛʟᴇ ➮* *_${movieData.title   || 'N/A'}_*\n\n` +
                  `*📅 𝗥ᴇʟᴇꜱᴇᴅ ᴅᴀᴛᴇ ➮* _${movieData.date   || 'N/A'}_\n` +
                  `*💃 𝗥ᴀᴛɪɴɢ ➮* _${movieData.imdb  || 'N/A'}_\n` +
                  `*⏰ 𝗥ᴜɴᴛɪᴍᴇ ➮* _${movieData.runtime   || 'N/A'}_\n` +
                  `*💁‍♂️ 𝗦ᴜʙᴛɪᴛʟᴇ ʙʏ ➮* _${movieData.subtitle_author   || 'N/A'}_\n` +
                  `*🎭 𝗚ᴇɴᴀʀᴇꜱ ➮* ${(movieData.genres || []).join(', ') || 'N/A'}\n\n` +
                  `✨ *Follow us:* ${details.chlink}`;

        let imageBuffer = FALLBACK_IMAGE_BUFFER;
        if (imgUrl && imgUrl !== 'undefined' && imgUrl.startsWith('http')) {
            const fetched = await getImageBuffer(imgUrl.replace("-150x150", ""));
            if (fetched) imageBuffer = fetched;
        }

        await conn.sendMessage(config.JID || from, {
            image: imageBuffer,
            caption: msg
        });

        await conn.sendMessage(from, { react: { text: '✅', key: mek.key } });

    } catch (error) {
        console.error('Error:', error);
        await conn.sendMessage(from, '⚠️ *An error occurred. Please try again later.*', { quoted: mek });
    }
});
