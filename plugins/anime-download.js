const config = require('../config');
const { cmd, commands } = require('../command');
const axios = require('axios');
const path = require('path');
const sharp = require('sharp');
const { getBuffer, getGroupAdmins, getRandom, h2k, isUrl, Json, runtime, sleep, fetchJson } = require('../lib/functions');

const sessionCache = new Map();
const WORKER_API_URL = 'https://wocker.alstudents20.workers.dev';
const API_HEAD = { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" } };

function generateId() {
    return Math.random().toString(36).substring(2, 10);
}

// ==================== HELPERS ====================
function cleanTitleForFilename(title) {
    return title.replace(/[^a-zA-Z0-9]/g, '_');
}

function generateFilename(animeTitleClean, episodeNum, quality, isDub) {
    return `AnimePahe_${animeTitleClean}_Ep${episodeNum}_${quality}p${isDub ? '_Dub' : '_Sub'}.mp4`;
}

async function getResizedThumb(url) {
    try {
        if (!url) return null;
        const response = await axios.get(url, { 
            responseType: 'arraybuffer',
            headers: { 
                "User-Agent": "Mozilla/5.0",
                "Referer": "https://animepahe.ru/" 
            }
        });
        const buffer = Buffer.from(response.data, 'binary');
        return await sharp(buffer).resize(200, 200).jpeg({ quality: 80 }).toBuffer();
    } catch (e) {
        return null;
    }
}

async function downloadViaWorker(downloadUrl, animeTitle, episodeNum, quality, isDub, targetJid, conn, posterUrl) {
    try {
        const animeTitleClean = cleanTitleForFilename(animeTitle);
        const fileName = generateFilename(animeTitleClean, episodeNum, quality, isDub);

        const response = await axios({
            method: 'GET',
            url: `${WORKER_API_URL}/download`,
            params: { url: downloadUrl },
            responseType: 'stream',
            timeout: 600000, // 10 minutes
            validateStatus: (status) => status < 400
        });

        if (response.headers['content-type']?.includes('application/json')) {
            throw new Error("Worker API Error or Cookies Expired");
        }

        const thumb = await getResizedThumb(posterUrl || config.LOGO);
        const finalCaption = `*🐦‍🔥𝐕ɪꜱᴘᴇʀ 𝐀ɴɪᴍᴇ🐦‍🔥*\n\n🎬 ${animeTitle}\n📺 Episode ${episodeNum}\n🎥 Quality: ${quality}p ${isDub ? '(Dub)' : '(Sub)'}\n\n${config.NAME}`;

        await conn.sendMessage(targetJid, {
            document: { stream: response.data },
            caption: finalCaption,
            mimetype: "video/mp4",
            fileName: `🐦‍🔥𝐕ɪꜱᴘᴇʀ 𝐀ɴɪᴍᴇ🐦‍🔥 ${fileName}`,
            jpegThumbnail: thumb
        });

        return true;
    } catch (error) {
        console.error("Worker Download error:", error.message);
        throw error;
    }
}

// ==================== COMMANDS ====================

// 1. ANIME SEARCH
cmd({
    pattern: "anime",
    react: '🔍',
    category: "anime",
    filename: __filename
},
async (conn, m, mek, { from, q, prefix, reply }) => {
    try {
        if (!q) return await reply('*Please enter an Anime name! ⛩️*');

        const res = await axios.get(`https://anime-pahe-five.vercel.app/api/search?q=${encodeURIComponent(q)}`, API_HEAD);
        const results = res.data.data;

        if (!results || results.length === 0) return await reply('*No results found ❌*');

        let rows = results.map(v => {
            let isMovie = v.type && v.type.toLowerCase().includes("movie");
            let typeDesc = isMovie ? "Movie 🎬" : `${v.type} 📺`;

            return {
                title: v.title,
                description: `Type: ${typeDesc} | Status: ${v.status} | Episodes: ${v.episodes}`,
                rowId: `${prefix}aniinfo ${v.session}±${v.title}`
            };
        });

        await conn.listMessage(from, {
            text: `\n*VISPER MD ANIME SEARCH ⛩️*\n\n*🔎 Input:* ${q}\n\n*Select an anime/movie from the list below.*`,
            footer: config.FOOTER,
            buttonText: 'Select Anime 🎬',
            sections: [{ title: "Search Results", rows }]
        }, mek);

    } catch (e) { 
        reply('🚩 *Error during search!* ' + e.message); 
    }
});

// 2. ANIME EPISODES INFO & POSTER
cmd({
    pattern: "aniinfo",
    react: "⛩️",
    dontAddCommandList: true,
    filename: __filename
},
async (conn, m, mek, { from, q, prefix, reply }) => {
    try {
        const [session, title] = q.split("±");
        if (!session) return reply('🚩 *Invalid anime selection.*');

        let posterUrl = config.LOGO || "https://i.ibb.co/C0wV1h8/logo.jpg";

        try {
            let searchRes = await axios.get(`https://anime-pahe-five.vercel.app/api/search?q=${encodeURIComponent(title)}`, API_HEAD);
            let results = searchRes.data?.data || [];

            if (results.length === 0) {
                let cleanedTitle = title.replace(/[^a-zA-Z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
                searchRes = await axios.get(`https://anime-pahe-five.vercel.app/api/search?q=${encodeURIComponent(cleanedTitle)}`, API_HEAD);
                results = searchRes.data?.data || [];
            }

            if (results.length === 0) {
                let firstWord = title.split(' ')[0].replace(/[^a-zA-Z0-9]/g, '');
                searchRes = await axios.get(`https://anime-pahe-five.vercel.app/api/search?q=${encodeURIComponent(firstWord)}`, API_HEAD);
                results = searchRes.data?.data || [];
            }

            const match = results.find(v => v.session === session);
            if (match && match.poster) {
                posterUrl = match.poster;
            }
        } catch (err) {
            console.log("[DEBUG] Error fetching poster in aniinfo:", err.message);
        }

        const res = await axios.get(`https://anime-pahe-five.vercel.app/api/${session}/releases?sort=episode_asc&page=1`, API_HEAD);
        let episodes = res.data.data || [];
        const lastPage = res.data.paginationInfo?.lastPage || 1;

        if (lastPage > 1) {
            let promises = [];
            for (let p = 2; p <= lastPage; p++) {
                promises.push(axios.get(`https://anime-pahe-five.vercel.app/api/${session}/releases?sort=episode_asc&page=${p}`, API_HEAD).catch(() => null));
            }
            let results = await Promise.all(promises);
            results.forEach(r => {
                if (r && r.data && r.data.data) episodes.push(...r.data.data);
            });
        }

        if (episodes.length === 0) return reply('🚩 *No episodes found for this anime.*');

        const LIMIT = 13; 
        const totalParts = Math.ceil(episodes.length / LIMIT);

        for (let i = 0; i < totalParts; i++) {
            let chunk = episodes.slice(i * LIMIT, (i + 1) * LIMIT);
            let buttons = [];

            let startEp = chunk[0].episode;
            let endEp = chunk[chunk.length - 1].episode;

            if (i === 0) {
                let detId = generateId();
                sessionCache.set(detId, { session, title });
                buttons.push({
                    buttonId: `${prefix}anidetails ${detId}`,
                    buttonText: { displayText: 'View Details 📋' },
                    type: 1
                });
            }

            let allId = generateId();
            sessionCache.set(allId, { session, partIndex: i, title, posterUrl, startEp, endEp });
            buttons.push({
                buttonId: `${prefix}aniallquality ${allId}`,
                buttonText: { displayText: `📥 Download All (${startEp}-${endEp})` },
                type: 1
            });

            chunk.forEach(ep => {
                let epId = generateId();
                sessionCache.set(epId, { animeSession: session, epSession: ep.session, epNum: ep.episode, posterUrl });
                buttons.push({
                    buttonId: `${prefix}anidlopt ${epId}`,
                    buttonText: { displayText: `Episode ${ep.episode}` },
                    type: 1
                });
            });

            let seasonNum = Math.floor((startEp - 1) / 50) + 1;
            let caption = `*🍿 Title:* ${title}\n*🌟 Season:* ${seasonNum}\n*📂 Part:* ${i + 1}/${totalParts} (Eps ${startEp}-${endEp})\n\nSelect an episode below:`;

            await conn.buttonMessage(from, {
                image: { url: posterUrl }, 
                caption: caption,
                footer: config.FOOTER,
                buttons: buttons, 
                headerType: 4
            }, mek);

            await new Promise(res => setTimeout(res, 2000));
        }

    } catch (e) { 
        reply('🚩 *Error fetching episodes!* ' + e.message); 
    }
});

// 3. ANIME DETAILS CARD
cmd({
    pattern: "anidetails",
    react: '📋',
    dontAddCommandList: true,
    filename: __filename
},
async (conn, m, mek, { from, q, reply }) => {
    try {
        const cache = sessionCache.get(q.trim());
        if (!cache) return reply("🚩 *Session expired! Please search the anime again.*");

        console.log(`[DEBUG] Fetching details for: ${cache.title}`);

        let searchRes = await axios.get(`https://anime-pahe-five.vercel.app/api/search?q=${encodeURIComponent(cache.title)}`, API_HEAD);
        let results = searchRes.data?.data || [];

        if (results.length === 0) {
            let cleanedTitle = cache.title.replace(/[^a-zA-Z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
            searchRes = await axios.get(`https://anime-pahe-five.vercel.app/api/search?q=${encodeURIComponent(cleanedTitle)}`, API_HEAD);
            results = searchRes.data?.data || [];
        }

        if (results.length === 0) {
            let firstWord = cache.title.split(' ')[0].replace(/[^a-zA-Z0-9]/g, '');
            searchRes = await axios.get(`https://anime-pahe-five.vercel.app/api/search?q=${encodeURIComponent(firstWord)}`, API_HEAD);
            results = searchRes.data?.data || [];
        }

        const anime = results.find(v => v.session === cache.session);

        if (!anime) {
            return reply("🚩 *Details not found! API could not locate the anime.*");
        }

        let isMovie = (anime.type && anime.type.toLowerCase().includes("movie")) || anime.episodes === 1 || anime.episodes === "1";
        let displayType = isMovie ? "Movie 🎬" : `${anime.type} 📺`;

        let details = {}; 
        try {
            const dbRes = await axios.get('https://mv-visper-full-db.pages.dev/Main/main_var.json');
            details = dbRes.data;
        } catch (e) {}

        let msg = `*✨ ANIME DETAILS ✨*\n\n` +
                  `*🍿 Title:* ${anime.title}\n` +
                  `*📺 Type:* ${displayType}\n` +
                  `*🟢 Status:* ${anime.status}\n` +
                  `*🎬 Episodes:* ${anime.episodes}\n` +
                  `*⭐ Score:* ${anime.score}\n` +
                  `*📅 Year:* ${anime.year} (${anime.season})\n\n` + 
                  `*✨ Follow us:* ${details.mvchlink || 'N/A'}`;

        const targetJid = config.JID || from;
        const poster = anime.poster || config.LOGO || "https://i.ibb.co/C0wV1h8/logo.jpg";

        await conn.sendMessage(targetJid, { image: { url: poster }, caption: msg });

        if (targetJid !== from) {
            await reply('✅ *Details sent to the target group!*');
        }

    } catch (e) { 
        reply('🚩 *Error fetching details!* ' + e.message); 
    }
});

// 4. EPISODE DOWNLOAD OPTIONS
cmd({
    pattern: "anidlopt",
    react: "📥",
    dontAddCommandList: true,
    filename: __filename
},
async (conn, m, mek, { from, q, prefix, reply }) => {
    try {
        const cache = sessionCache.get(q.trim());
        if (!cache) return reply("🚩 *Session expired! Please search the anime again.*");

        const res = await axios.get(`https://anime-pahe-five.vercel.app/api/play/${cache.animeSession}?episodeId=${cache.epSession}`, API_HEAD);
        const data = res.data;

        if (!data.downloads || data.downloads.length === 0) return reply("🚩 *No download links available.*");

        let buttons = [];
        data.downloads.forEach(dl => {
            let dlId = generateId();
            sessionCache.set(dlId, { 
                animeSession: cache.animeSession, 
                epSession: cache.epSession, 
                quality: dl.resolution, 
                isDub: dl.isDub,
                posterUrl: cache.posterUrl
            });

            let dubStatus = dl.isDub ? "Dub" : "Sub";
            buttons.push({
                buttonId: `${prefix}anidrive ${dlId}`,
                buttonText: { displayText: `${dl.resolution}p ${dubStatus}` },
                type: 1
            });
        });

        buttons = buttons.slice(0, 10);

        await conn.buttonMessage(from, {
            image: { url: cache.posterUrl || config.LOGO || "https://i.ibb.co/C0wV1h8/logo.jpg" }, 
            caption: `*🎬 Anime:* ${data.anime_title}\n*📺 Episode:* ${data.episode}\n\nSelect quality & language:`,
            footer: config.FOOTER,
            buttons: buttons,
            headerType: 4
        }, mek);

    } catch (e) { reply("🚩 *Error fetching download links!* " + e.message); }
});

// 5. DOWNLOAD ALL - QUALITY & LANGUAGE SELECTION
cmd({
    pattern: "aniallquality",
    react: "📑",
    dontAddCommandList: true,
    filename: __filename
},
async (conn, m, mek, { from, q, prefix, reply }) => {
    try {
        const cache = sessionCache.get(q.trim());
        if (!cache) return reply("🚩 *Session expired! Please search the anime again.*");

        const options = [
            { q: "480", isDub: false, label: "480p Sub" },
            { q: "720", isDub: false, label: "720p Sub" },
            { q: "480", isDub: true, label: "480p Dub" },
            { q: "720", isDub: true, label: "720p Dub" }
        ];

        let buttons = options.map(opt => {
            let dlAllId = generateId();
            sessionCache.set(dlAllId, { 
                session: cache.session, 
                partIndex: cache.partIndex, 
                quality: opt.q,
                isDub: opt.isDub,
                posterUrl: cache.posterUrl,
                startEp: cache.startEp,
                endEp: cache.endEp
            });

            return {
                buttonId: `${prefix}anidlall ${dlAllId}`,
                buttonText: { displayText: opt.label },
                type: 1
            };
        });

        await conn.buttonMessage(from, {
            image: { url: cache.posterUrl || config.LOGO || "https://i.ibb.co/C0wV1h8/logo.jpg" },
            caption: `*📥 DOWNLOAD ALL (Part ${cache.partIndex + 1})*\n*🎬 ${cache.title}*\n*🎞️ Episodes:* ${cache.startEp} to ${cache.endEp}\n\n*Note:* If Dub is unavailable for an episode, it will automatically fallback to Sub.\n\nPlease select quality:`,
            footer: config.FOOTER,
            buttons: buttons,
            headerType: 4
        }, mek);

    } catch (e) { reply("🚩 *Error fetching quality menu!* " + e.message); }
});

// 6. FINAL SINGLE DOWNLOAD EXECUTION
cmd({
    pattern: "anidrive",
    react: "⬇️",
    dontAddCommandList: true,
    filename: __filename
},
async (conn, m, mek, { from, q, reply }) => {
    try {
        const cache = sessionCache.get(q.trim());
        if (!cache) return reply("🚩 *Session expired! Please search the anime again.*");

        await conn.sendMessage(from, { react: { text: '⏳', key: mek.key } });

        const res = await axios.get(`https://anime-pahe-five.vercel.app/api/play/${cache.animeSession}?episodeId=${cache.epSession}`, API_HEAD);
        const data = res.data;

        const dlMatch = data.downloads.find(d => d.resolution === cache.quality && d.isDub === cache.isDub);
        if (!dlMatch || !dlMatch.download) return reply("🚩 *Direct download link not found!*");

        const targetJid = config.JID || from;

        await downloadViaWorker(
            dlMatch.download, 
            data.anime_title, 
            data.episode, 
            cache.quality, 
            cache.isDub, 
            targetJid, 
            conn, 
            cache.posterUrl
        );

        await conn.sendMessage(from, { react: { text: '✅', key: mek.key } });

        if (targetJid !== from) {
            await reply('✅ *Video sent to the target group!*');
        }

    } catch (e) {
        reply('🚩 *Download Failed!*\n\n*Reason:* ' + e.message);
    }
});

// 7. DOWNLOAD ALL - EXECUTION PROCESS 
cmd({
    pattern: "anidlall",
    react: "⏳",
    dontAddCommandList: true,
    filename: __filename
},
async (conn, m, mek, { from, q, reply }) => {
    try {
        const cache = sessionCache.get(q.trim());
        if (!cache) return reply("🚩 *Session expired! Please search the anime again.*");

        const preferredLang = cache.isDub ? "Dub" : "Sub";
        await reply(`*🚀 Download All (Eps ${cache.startEp}-${cache.endEp}) Started!*\n\nDownloading via Worker Api in ${cache.quality}p ${preferredLang}.\nPlease wait...`);

        const res = await axios.get(`https://anime-pahe-five.vercel.app/api/${cache.session}/releases?sort=episode_asc&page=1`, API_HEAD);
        let episodes = res.data.data || [];
        const lastPage = res.data.paginationInfo?.lastPage || 1;

        if (lastPage > 1) {
            let promises = [];
            for (let p = 2; p <= lastPage; p++) {
                promises.push(axios.get(`https://anime-pahe-five.vercel.app/api/${cache.session}/releases?sort=episode_asc&page=${p}`, API_HEAD).catch(() => null));
            }
            let results = await Promise.all(promises);
            results.forEach(r => {
                if (r && r.data && r.data.data) episodes.push(...r.data.data);
            });
        }

        const LIMIT = 30;
        const chunk = episodes.slice(cache.partIndex * LIMIT, (cache.partIndex + 1) * LIMIT);
        const targetJid = config.JID || from;

        for (const ep of chunk) {
            try {
                const playRes = await axios.get(`https://anime-pahe-five.vercel.app/api/play/${cache.session}?episodeId=${ep.session}`, API_HEAD);
                const data = playRes.data;

                if (!data.downloads || data.downloads.length === 0) continue;

                let dlMatch = data.downloads.find(d => d.resolution === cache.quality && d.isDub === cache.isDub);
                if (!dlMatch) {
                    dlMatch = data.downloads.find(d => d.resolution === cache.quality); // Alternate Language
                }
                if (!dlMatch) {
                    dlMatch = data.downloads[0]; // Any available resolution
                }

                if (dlMatch && dlMatch.download) {
                    await downloadViaWorker(
                        dlMatch.download, 
                        data.anime_title, 
                        data.episode, 
                        dlMatch.resolution, 
                        dlMatch.isDub, 
                        targetJid, 
                        conn, 
                        cache.posterUrl
                    );

                    await new Promise(resolve => setTimeout(resolve, 5000)); // Delay between downloads
                }
            } catch (err) {
                console.log(`Failed to process Episode ${ep.episode}:`, err.message);
            }
        }

        if (targetJid !== from) {
            await reply(`*✅ All episodes in Part ${cache.partIndex + 1} sent to the target group successfully!*`);
        } else {
            await reply(`*✅ All episodes in Part ${cache.partIndex + 1} downloaded successfully!*`);
        }

    } catch (e) {
        reply('🚩 *Error during Download All process!* ' + e.message); 
    }
});




// ==========================================================
//                 ANIMEHEAVEN DOWNLOADER (RAILWAY + RENDER FALLBACK & PAGINATION)
// ==========================================================

// API Domains Array (Primary and Fallback)
const API_DOMAINS = [
    'https://anime-heaven-dxz.up.railway.app', // Primary API (Railway)
    'https://anime-heaven-me.onrender.com'     // Fallback API (Render)
];

// Helper Function for Fallback API Requests
async function fetchWithFallback(endpoint, queryParam, axiosConfig = {}) {
    let lastError;
    for (const domain of API_DOMAINS) {
        try {
            const url = `${domain}${endpoint}${queryParam}`;
            const response = await axios.get(url, axiosConfig);
            return response; // Success, return immediately
        } catch (error) {
            lastError = error;
            // API is working but data not found (404), no need to try fallback
            if (error.response && error.response.status === 404) {
                throw error; 
            }
            // Log and try the next domain
            console.log(`[AnimeHeaven] Failed with ${domain}, trying next API...`);
        }
    }
    throw lastError; // Throw if all APIs fail
}

// Direct Download Function for AnimeHeaven
async function downloadAnimeHeavenDirect(downloadUrl, animeTitle, episodeNum, quality, isDub, targetJid, conn, posterUrl) {
    try {
        const animeTitleClean = cleanTitleForFilename(animeTitle);
        const fileName = generateFilename(animeTitleClean, episodeNum, quality, isDub);

        // Direct request to the AnimeHeaven MP4 link
        const response = await axios({
            method: 'GET',
            url: downloadUrl,
            responseType: 'stream',
            timeout: 600000, // 10 minutes
            headers: { 
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            },
            validateStatus: (status) => status < 400
        });

        const thumb = await getResizedThumb(posterUrl || config.LOGO);
        const finalCaption = `*🐦‍🔥𝐕ɪꜱᴘᴇʀ 𝐀ɴɪᴍᴇ🐦‍🔥*\n\n🎬 ${animeTitle}\n📺 Episode ${episodeNum}\n🎥 Quality: ${quality}p ${isDub ? '(Dub)' : '(Sub)'}\n\n${config.NAME}`;

        // Send directly to WhatsApp
        await conn.sendMessage(targetJid, {
            document: { stream: response.data },
            caption: finalCaption,
            mimetype: "video/mp4",
            fileName: `🐦‍🔥𝐕ɪꜱᴘᴇʀ 𝐀ɴɪᴍᴇ🐦‍🔥 ${fileName}`,
            jpegThumbnail: thumb
        });
        return true;
    } catch (error) {
        console.error("AnimeHeaven Direct Download error:", error.message);
        throw error;
    }
}

// 1. ANIMEHEAVEN SEARCH
cmd({
    pattern: "animeheaven",
    alias: ["ahsearch"],
    react: '🔍',
    category: "anime",
    filename: __filename
},
async (conn, m, mek, { from, q, prefix, reply }) => {
    try {
        if (!q) return await reply('*Please enter an Anime name! ⛩️*');

        let res;
        try {
            res = await fetchWithFallback('/search?q=', encodeURIComponent(q), typeof API_HEAD !== 'undefined' ? API_HEAD : {});
        } catch (err) {
            if (err.response && err.response.status === 404) {
                return await reply('*No results found on AnimeHeaven ❌*');
            }
            throw err;
        }

        const results = res.data?.data || [];
        if (!results || results.length === 0) return await reply('*No results found on AnimeHeaven ❌*');

        let rows = results.map(v => {
            let resId = generateId();
            sessionCache.set(resId, { url: v.url, title: v.title, image: v.image });

            let isMovie = v.title.toLowerCase().includes("movie");
            let typeDesc = isMovie ? "Movie 🎬" : "Anime 📺";

            return {
                title: v.title,
                description: `Type: ${typeDesc} | Click to view episodes`,
                rowId: `${prefix}ahinfo ${resId}`
            };
        });

        await conn.listMessage(from, {
            text: `\n*VISPER MD ANIMEHEAVEN ⛩️*\n\n*🔎 Input:* ${q}\n\n*Select an anime/movie from the list below.*`,
            footer: config.FOOTER,
            buttonText: 'Select Anime 🎬',
            sections: [{ title: "Search Results", rows }]
        }, mek);
    } catch (e) { 
        reply('🚩 *Error during AnimeHeaven search!* ' + e.message); 
    }
});

// --- HELPER FUNCTION FOR PAGINATION ---
async function sendEpPage(conn, from, cache, pageIndex, prefix, mek) {
    const LIMIT = 10; // 10 Episodes per page to fit WA button limits properly
    const totalParts = Math.ceil(cache.uniqueEps.length / LIMIT);
    let chunk = cache.uniqueEps.slice(pageIndex * LIMIT, (pageIndex + 1) * LIMIT);

    let buttons = [];
    let startEp = chunk[0];
    let endEp = chunk[chunk.length - 1];

    // 1. Details Button (Only on Page 1)
    if (pageIndex === 0) {
        let detId = generateId();
        sessionCache.set(detId, { url: cache.url, title: cache.title, posterUrl: cache.posterUrl });
        buttons.push({
            buttonId: `${prefix}ahdetails ${detId}`,
            buttonText: { displayText: 'View Details 📋' },
            type: 1
        });
    }

    // 2. Download All for this chunk
    let allId = generateId();
    sessionCache.set(allId, { url: cache.url, title: cache.title, posterUrl: cache.posterUrl, chunkEps: chunk, epMap: cache.epMap, partIndex: pageIndex, startEp, endEp });
    buttons.push({
        buttonId: `${prefix}ahallquality ${allId}`,
        buttonText: { displayText: `📥 Download All (${startEp}-${endEp})` },
        type: 1
    });

    // 3. Episode Buttons
    chunk.forEach(epNum => {
        let epId = generateId();
        sessionCache.set(epId, { title: cache.title, episode: epNum, files: cache.epMap.get(epNum), posterUrl: cache.posterUrl });
        buttons.push({
            buttonId: `${prefix}ahdlopt ${epId}`,
            buttonText: { displayText: `Episode ${epNum}` },
            type: 1
        });
    });

    // 4. Pagination Buttons (Prev / Next)
    if (pageIndex > 0) {
        buttons.push({
            buttonId: `${prefix}aheppage ${cache.seriesId}_${pageIndex - 1}`,
            buttonText: { displayText: '⬅️ Prev Page' },
            type: 1
        });
    }
    if (pageIndex < totalParts - 1) {
        buttons.push({
            buttonId: `${prefix}aheppage ${cache.seriesId}_${pageIndex + 1}`,
            buttonText: { displayText: 'Next Page ➡️' },
            type: 1
        });
    }

    let seasonNum = Math.floor((startEp - 1) / 50) + 1;
    let caption = `*🍿 Title:* ${cache.title}\n*🌟 Season:* ${seasonNum}\n*📂 Page:* ${pageIndex + 1}/${totalParts} (Eps ${startEp}-${endEp})\n\nSelect an option below:`;

    await conn.buttonMessage(from, {
        image: { url: cache.posterUrl }, 
        caption: caption,
        footer: config.FOOTER,
        buttons: buttons, 
        headerType: 4
    }, mek);
}

// 2. ANIMEHEAVEN EPISODES INFO (INITIAL FETCH)
cmd({
    pattern: "ahinfo",
    react: "⛩️",
    dontAddCommandList: true,
    filename: __filename
},
async (conn, m, mek, { from, q, prefix, reply }) => {
    try {
        let seriesId = q.trim();
        const cache = sessionCache.get(seriesId);
        if (!cache) return reply('🚩 *Session expired! Please search the anime again.*');

        let posterUrl = cache.image || config.LOGO || "https://i.ibb.co/C0wV1h8/logo.jpg";
        cache.posterUrl = posterUrl;
        cache.seriesId = seriesId; 

        let epRes;
        try {
            epRes = await fetchWithFallback('/episodes?url=', encodeURIComponent(cache.url), typeof API_HEAD !== 'undefined' ? API_HEAD : {});
        } catch (err) {
            if (err.response && err.response.status === 404) return reply('🚩 *No episodes found for this anime.*');
            throw err;
        }

        let episodes = epRes.data?.data || [];
        if (episodes.length === 0) return reply('🚩 *No episodes found for this anime.*');

        let epMap = new Map();
        episodes.forEach(ep => {
            if (!epMap.has(ep.episode)) epMap.set(ep.episode, []);
            epMap.get(ep.episode).push(ep);
        });

        let uniqueEps = Array.from(epMap.keys());
        uniqueEps.sort((a, b) => Number(a) - Number(b)); 

        cache.uniqueEps = uniqueEps;
        cache.epMap = epMap;
        sessionCache.set(seriesId, cache);

        await sendEpPage(conn, from, cache, 0, prefix, mek);

    } catch (e) { 
        reply('🚩 *Error fetching episodes!* ' + e.message); 
    }
});

// 2.2 ANIMEHEAVEN PAGINATION HANDLER
cmd({
    pattern: "aheppage",
    react: "🔄",
    dontAddCommandList: true,
    filename: __filename
},
async (conn, m, mek, { from, q, prefix, reply }) => {
    try {
        let [seriesId, pageStr] = q.split('_');
        let pageIndex = parseInt(pageStr);

        const cache = sessionCache.get(seriesId);
        if (!cache || !cache.uniqueEps) return reply('🚩 *Session expired! Please search the anime again.*');

        await sendEpPage(conn, from, cache, pageIndex, prefix, mek);
    } catch (e) {
        reply('🚩 *Error loading page!* ' + e.message); 
    }
});

// 2.5 SINGLE EPISODE QUALITY SELECTION
cmd({
    pattern: "ahdlopt",
    react: "📥",
    dontAddCommandList: true,
    filename: __filename
},
async (conn, m, mek, { from, q, prefix, reply }) => {
    try {
        const cache = sessionCache.get(q.trim());
        if (!cache) return reply("🚩 *Session expired! Please search the anime again.*");

        let buttons = [];
        cache.files.forEach(file => {
            let qualityMatch = file.name.match(/\((.*?)\)/);
            let rawQuality = qualityMatch ? qualityMatch[1] : "HD";
            let displayQ = rawQuality.includes('p') ? rawQuality : rawQuality + 'p';

            let dlId = generateId();
            sessionCache.set(dlId, { 
                title: cache.title, 
                episode: cache.episode, 
                token: file.token, 
                quality: rawQuality.replace('p', ''), 
                posterUrl: cache.posterUrl
            });

            buttons.push({
                buttonId: `${prefix}ahdrive ${dlId}`,
                buttonText: { displayText: displayQ },
                type: 1
            });
        });

        await conn.buttonMessage(from, {
            image: { url: cache.posterUrl || config.LOGO || "https://i.ibb.co/C0wV1h8/logo.jpg" }, 
            caption: `*🎬 Anime:* ${cache.title}\n*📺 Episode:* ${cache.episode}\n\nSelect available quality:`,
            footer: config.FOOTER,
            buttons: buttons,
            headerType: 4
        }, mek);
    } catch (e) { reply("🚩 *Error fetching download options!* " + e.message); }
});

// 2.6 DOWNLOAD ALL QUALITY SELECTION
cmd({
    pattern: "ahallquality",
    react: "📑",
    dontAddCommandList: true,
    filename: __filename
},
async (conn, m, mek, { from, q, prefix, reply }) => {
    try {
        const cache = sessionCache.get(q.trim());
        if (!cache) return reply("🚩 *Session expired! Please search the anime again.*");

        let uniqueQualities = new Set();
        cache.chunkEps.forEach(epNum => {
            let files = cache.epMap.get(epNum) || [];
            files.forEach(f => {
                let qualityMatch = f.name.match(/\((.*?)\)/);
                if (qualityMatch) uniqueQualities.add(qualityMatch[1].replace('p', ''));
            });
        });

        let qualities = Array.from(uniqueQualities).sort((a, b) => Number(a) - Number(b));
        if (qualities.length === 0) qualities = ["720"];

        let buttons = qualities.map(qLevel => {
            let dlAllId = generateId();
            sessionCache.set(dlAllId, { ...cache, selectedQuality: qLevel });
            return {
                buttonId: `${prefix}ahdlall ${dlAllId}`,
                buttonText: { displayText: `${qLevel}p` },
                type: 1
            };
        });

        await conn.buttonMessage(from, {
            image: { url: cache.posterUrl || config.LOGO || "https://i.ibb.co/C0wV1h8/logo.jpg" },
            caption: `*📥 DOWNLOAD ALL (Page ${cache.partIndex + 1})*\n*🎬 ${cache.title}*\n*🎞️ Episodes:* ${cache.startEp} to ${cache.endEp}\n\n*Please select quality:*`,
            footer: config.FOOTER,
            buttons: buttons,
            headerType: 4
        }, mek);
    } catch (e) { reply("🚩 *Error fetching quality menu!* " + e.message); }
});

// 3. ANIMEHEAVEN DETAILS CARD
cmd({
    pattern: "ahdetails",
    react: '📋',
    dontAddCommandList: true,
    filename: __filename
},
async (conn, m, mek, { from, q, reply }) => {
    try {
        const cache = sessionCache.get(q.trim());
        if (!cache) return reply("🚩 *Session expired! Please search the anime again.*");

        let infoRes;
        try {
            infoRes = await fetchWithFallback('/info?url=', encodeURIComponent(cache.url), typeof API_HEAD !== 'undefined' ? API_HEAD : {});
        } catch (err) {
            if (err.response && err.response.status === 404) return reply("🚩 *Details not found from API!*");
            throw err;
        }

        const data = infoRes.data?.data;
        if (!data) return reply("🚩 *Details not found from API!*");

        let isMovie = data.episodes === "1" || data.title.toLowerCase().includes("movie");
        let displayType = isMovie ? "Movie 🎬" : "TV Series 📺";

        let details = {}; 
        try {
            const dbRes = await axios.get('https://mv-visper-full-db.pages.dev/Main/main_var.json');
            details = dbRes.data;
        } catch (e) {}

        let tagsFormat = data.tags ? data.tags.slice(0, 6).join(", ") : "N/A";

        let msg = `*✨ ANIME DETAILS ✨*\n\n` +
                  `*🍿 Title:* ${data.title}\n` +
                  `*📺 Type:* ${displayType}\n` +
                  `*🎭 Genres:* ${tagsFormat}\n` +
                  `*🎬 Episodes:* ${data.episodes}\n` +
                  `*⭐ Score:* ${data.score}\n` +
                  `*📅 Year:* ${data.year}\n\n` + 
                  `*✨ Follow us:* ${details.mvchlink || 'N/A'}`;

        const targetJid = config.JID || from;
        const poster = data.image || cache.posterUrl || config.LOGO;

        await conn.sendMessage(targetJid, { image: { url: poster }, caption: msg });
        if (targetJid !== from) await reply('✅ *Details sent to the target group!*');

    } catch (e) { reply('🚩 *Error fetching details!* ' + e.message); }
});

// 4. DOWNLOAD SINGLE EPISODE
cmd({
    pattern: "ahdrive",
    react: "⬇️",
    dontAddCommandList: true,
    filename: __filename
},
async (conn, m, mek, { from, q, reply }) => {
    try {
        const cache = sessionCache.get(q.trim());
        if (!cache) return reply("🚩 *Session expired! Please search the anime again.*");

        await conn.sendMessage(from, { react: { text: '⏳', key: mek.key } });

        let dlRes;
        try {
            dlRes = await fetchWithFallback('/download?token=', cache.token, typeof API_HEAD !== 'undefined' ? API_HEAD : {});
        } catch (err) {
            if (err.response && err.response.status === 404) return reply("🚩 *Direct download link not found!*");
            throw err;
        }

        const dlData = dlRes.data?.data;
        if (!dlData || !dlData.download) return reply("🚩 *Direct download link not found!*");

        const targetJid = config.JID || from;

        try {
            await downloadAnimeHeavenDirect(
                dlData.download, 
                cache.title, 
                cache.episode, 
                cache.quality, 
                false, 
                targetJid, 
                conn, 
                cache.posterUrl
            );
            await conn.sendMessage(from, { react: { text: '✅', key: mek.key } });
            if (targetJid !== from) await reply(`✅ *${cache.title} - Episode ${cache.episode} sent to the target group!*`);
        } catch (dlErr) {
            throw new Error(`Direct Download Error: ${dlErr.message}`);
        }

    } catch (e) {
        reply('🚩 *Download Failed!*\n\n*Reason:* ' + e.message);
    }
});

// 5. DOWNLOAD ALL - EXECUTION PROCESS
cmd({
    pattern: "ahdlall",
    react: "⏳",
    dontAddCommandList: true,
    filename: __filename
},
async (conn, m, mek, { from, q, reply }) => {
    try {
        const cache = sessionCache.get(q.trim());
        if (!cache) return reply("🚩 *Session expired! Please search the anime again.*");

        const selectedQ = cache.selectedQuality || "720";
        await reply(`*🚀 Download All (Eps ${cache.startEp}-${cache.endEp}) Started!*\n\nDownloading in ${selectedQ}p.\nPlease wait...`);

        const targetJid = config.JID || from;

        for (const epNum of cache.chunkEps) {
            try {
                let files = cache.epMap.get(epNum);
                if (!files || files.length === 0) continue;

                let targetFile = files.find(f => {
                    let match = f.name.match(/\((.*?)\)/);
                    return match && match[1].includes(selectedQ);
                });

                if (!targetFile) targetFile = files[0];

                let matchQ = targetFile.name.match(/\((.*?)\)/);
                let finalQuality = matchQ ? matchQ[1].replace('p', '') : "HD";

                const dlRes = await fetchWithFallback('/download?token=', targetFile.token, typeof API_HEAD !== 'undefined' ? API_HEAD : {});
                const dlData = dlRes.data?.data;

                if (dlData && dlData.download) {
                    await downloadAnimeHeavenDirect(
                        dlData.download, 
                        cache.title, 
                        epNum, 
                        finalQuality, 
                        false, 
                        targetJid, 
                        conn, 
                        cache.posterUrl
                    );
                    await new Promise(resolve => setTimeout(resolve, 5000));
                }
            } catch (err) {
                console.log(`Failed to process Episode ${epNum}:`, err.message);
            }
        }

        if (targetJid !== from) {
            await reply(`*✅ All episodes in Page ${cache.partIndex + 1} sent to the target group successfully!*`);
        } else {
            await reply(`*✅ All episodes in Page ${cache.partIndex + 1} downloaded successfully!*`);
        }

    } catch (e) {
        reply('🚩 *Error during Download All process!* ' + e.message); 
    }
});






// ==========================================================
//        ANIME CLUB 2 DOWNLOADER (WITH OMINISAVE G-DRIVE FIX)
// ==========================================================

// Helper Function for AnimeClub API Requests
async function fetchAnimeClubAPI(endpoint) {
    try {
        const response = await axios.get(`https://anime-club-2-com.vercel.app${endpoint}`);
        // API response එකේ data.data ඇතුලෙ තියෙන නිසා ඒක handle කරමු
        return response.data?.data || response.data;
    } catch (error) {
        console.error(`[AnimeClub] API Error on ${endpoint}:`, error.message);
        throw error;
    }
}

// Helper Function for Ominisave API (G-Drive Fix)
async function resolveGdriveUrl(gdriveUrl, reply) {
    try {
        await reply('⏳ Google Drive link එකක් හමුවිය. Link එක resolve කරමින් පවතී...');
        console.log(`[Ominisave] Resolving G-Drive URL: ${gdriveUrl}`);
        const response = await axios.get(`https://www.ominisave.com/api/gdrive?url=${encodeURIComponent(gdriveUrl)}`);
        
        if (response.data && response.data.url) {
            await reply('✅ Link එක සාර්ථකව Resolve විය. Download වෙමින් පවතී...');
            return response.data.url;
        }
        throw new Error('Ominisave API did not return a valid download URL.');
    } catch (error) {
        console.error(`[Ominisave] Error: ${error.message}`);
        await reply(`⚠️ Ominisave API Error: ${error.message}\nTrying original link...`);
        // Ominisave fail වුණොත්, පරණ link එකම try කරන්න
        return gdriveUrl; 
    }
}

// ⬇️ Direct Download Function (G-DRIVE FIX ඇතුළුව)
async function downloadAnimeClubDirect(initialUrl, animeTitle, episodeNum, quality, targetJid, conn, mek, reply, posterUrl) {
    try {
        let finalDownloadUrl = initialUrl;

        // 1. Google Drive link එකක්ද කියලා Check කරනවා
        if (initialUrl && initialUrl.includes('drive.google.com')) {
            finalDownloadUrl = await resolveGdriveUrl(initialUrl, reply);
        }
        
        // 2. Telegram links Block කරනවා
        if (finalDownloadUrl.includes('t.me')) {
            throw new Error("Telegram links cannot be downloaded directly. Please select a Drive link.");
        }

        const fileName = `${animeTitle} ${episodeNum && episodeNum !== '1' ? '- Ep ' + episodeNum : ''} [${quality}].mp4`.trim();

        const response = await axios({
            method: 'GET',
            url: finalDownloadUrl,
            responseType: 'stream',
            timeout: 600000, 
            headers: { 
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                "Accept": "video/mp4,video/*;q=0.9,*/*;q=0.8"
            },
            validateStatus: (status) => status < 400
        });

        // 3. KB Issue Fix: HTML page එකක් ආවොත් නවත්වනවා
        const contentType = response.headers['content-type'];
        if (contentType && contentType.includes('text/html')) {
            throw new Error("Received HTML page instead of Video. Download limit reached or link expired.");
        }

        const thumb = await getResizedThumb(posterUrl || config.LOGO);
        const finalCaption = `*🐦‍🔥𝐕ɪꜱᴘᴇʀ 𝐀ɴɪᴍᴇ🐦‍🔥*\n\n🎬 ${animeTitle}\n📺 ${episodeNum && episodeNum !== '1' ? 'Episode ' + episodeNum : 'Movie'}\n🎥 Quality: ${quality}\n\n${config.NAME}`;

        await conn.sendMessage(targetJid, {
            document: { stream: response.data },
            caption: finalCaption,
            mimetype: "video/mp4",
            fileName: `🐦‍🔥𝐕ɪꜱᴘᴇʀ 𝐀ɴɪᴍᴇ🐦‍🔥 ${fileName}`,
            jpegThumbnail: thumb
        });
        return true;
    } catch (error) {
        console.error("Direct Download error:", error.message);
        throw error;
    }
}


// --- HELPER FUNCTION FOR EPISODE PAGINATION ---
async function sendAcEpPage(conn, from, cache, pageIndex, prefix, mek) {
    const LIMIT = 10; 
    const totalParts = Math.ceil(cache.episodesList.length / LIMIT);
    let chunk = cache.episodesList.slice(pageIndex * LIMIT, (pageIndex + 1) * LIMIT);

    let buttons = [];
    let startEpIndex = (pageIndex * LIMIT) + 1;
    let endEpIndex = startEpIndex + chunk.length - 1;

    if (pageIndex === 0) {
        let detId = generateId();
        sessionCache.set(detId, { url: cache.url, title: cache.title, posterUrl: cache.posterUrl });
        buttons.push({ buttonId: `${prefix}acdetails ${detId}`, buttonText: { displayText: 'View Details 📋' }, type: 1 });
    }

    let allId = generateId();
    sessionCache.set(allId, { title: cache.title, posterUrl: cache.posterUrl, chunkEps: chunk, partIndex: pageIndex, startEp: startEpIndex, endEp: endEpIndex });
    buttons.push({ buttonId: `${prefix}acallquality ${allId}`, buttonText: { displayText: `📥 Download All (${startEpIndex}-${endEpIndex})` }, type: 1 });

    chunk.forEach((ep, idx) => {
        let epNum = startEpIndex + idx;
        let epTitle = ep.title || `Episode ${epNum}`;
        let epId = generateId();
        sessionCache.set(epId, { title: cache.title, episode: epNum, link: ep.link, posterUrl: cache.posterUrl });
        buttons.push({ buttonId: `${prefix}acdlopt ${epId}`, buttonText: { displayText: epTitle.substring(0, 20) }, type: 1 });
    });

    if (pageIndex > 0) buttons.push({ buttonId: `${prefix}aceppage ${cache.seriesId}_${pageIndex - 1}`, buttonText: { displayText: '⬅️ Prev Page' }, type: 1 });
    if (pageIndex < totalParts - 1) buttons.push({ buttonId: `${prefix}aceppage ${cache.seriesId}_${pageIndex + 1}`, buttonText: { displayText: 'Next Page ➡️' }, type: 1 });

    let caption = `*🍿 Title:* ${cache.title}\n*📂 Page:* ${pageIndex + 1}/${totalParts} (Eps ${startEpIndex}-${endEpIndex})\n\nSelect an option below:`;
    await conn.buttonMessage(from, { image: { url: cache.posterUrl }, caption: caption, footer: config.FOOTER, buttons: buttons, headerType: 4 }, mek);
}

// 1. 🔍 SEARCH API 
cmd({
    pattern: "animeclub",
    alias: ["acsearch"],
    react: '🔍',
    category: "anime",
    filename: __filename
},
async (conn, m, mek, { from, q, prefix, reply }) => {
    try {
        if (!q) return await reply('*කරුණාකර ඇනිමෙ නමක් ඇතුලත් කරන්න! ⛩️*');
        const [moviesRes, tvshowsRes] = await Promise.all([
            axios.get(`https://anime-club-2-com.vercel.app/search?q=${encodeURIComponent(q)}&section=movies`).catch(() => null),
            axios.get(`https://anime-club-2-com.vercel.app/search?q=${encodeURIComponent(q)}&section=tvshows`).catch(() => null)
        ]);

        let results = [];
        if (moviesRes?.data?.data?.results) results.push(...moviesRes.data.data.results.map(x => ({...x, displayType: 'Movie 🎬'})));
        if (tvshowsRes?.data?.data?.results) results.push(...tvshowsRes.data.data.results.map(x => ({...x, displayType: 'TV Show 📺'})));

        if (results.length === 0) return await reply('*Anime Club හි කිසිදු ප්‍රතිඵලයක් හමුවුයේ නැත ❌*');
        let rows = results.map(v => {
            let resId = generateId();
            sessionCache.set(resId, { url: v.link, title: v.title, image: v.poster });
            return { title: v.title, description: `${v.displayType} | Rating: ${v.rating || 'N/A'}`, rowId: `${prefix}acinfo ${resId}`};
        });
        await conn.listMessage(from, { text: `\n*VISPER MD ANIME CLUB ⛩️*\n\n*🔎 Input:* ${q}\n\n*Select an anime/movie from the list below.*`, footer: config.FOOTER, buttonText: 'Select Anime 🎬', sections: [{ title: "Search Results", rows }] }, mek);
    } catch (e) { reply('🚩 *Search Error!* ' + e.message); }
});

// 2. 📄 ANIME INFO API
cmd({
    pattern: "acinfo",
    react: "⛩️",
    dontAddCommandList: true,
    filename: __filename
},
async (conn, m, mek, { from, q, prefix, reply }) => {
    try {
        let seriesId = q.trim();
        const cache = sessionCache.get(seriesId);
        if (!cache) return reply('🚩 *Session expired! Please search again.*');

        cache.seriesId = seriesId;
        cache.posterUrl = cache.image || config.LOGO;

        const data = await fetchAnimeClubAPI(`/info?url=${encodeURIComponent(cache.url)}`);
        if (!data) return reply('🚩 *No details found from API.*');

        if (data.seasons && data.seasons.length > 0) {
            let rows = data.seasons.map(s => {
                let sId = generateId();
                sessionCache.set(sId, { url: s.link, title: s.title, image: data.poster || cache.posterUrl });
                return { title: s.title, description: 'Click to view episodes', rowId: `${prefix}acinfo ${sId}` };
            });
            await conn.listMessage(from, { text: `*🎬 TV Show:* ${data.title}\n\n*Select a Season below:*`, footer: config.FOOTER, buttonText: 'Select Season 📺', sections: [{ title: "Seasons", rows }] }, mek);
        } 
        else if (data.episodes && data.episodes.length > 0) {
            cache.title = data.title;
            cache.episodesList = data.episodes;
            sessionCache.set(seriesId, cache);
            await sendAcEpPage(conn, from, cache, 0, prefix, mek);
        } 
        else if (data.downloadLinks && data.downloadLinks.length > 0) {
            let buttons = [];
            let detId = generateId();
            sessionCache.set(detId, { url: cache.url, title: data.title, posterUrl: data.poster || cache.posterUrl });
            buttons.push({ buttonId: `${prefix}acdetails ${detId}`, buttonText: { displayText: 'View Details 📋' }, type: 1 });
            data.downloadLinks.forEach(link => {
                if (link.label !== "Telegram") {
                    let dlId = generateId();
                    sessionCache.set(dlId, { title: data.title, directUrl: link.href, quality: link.quality, posterUrl: data.poster || cache.posterUrl });
                    buttons.push({ buttonId: `${prefix}acdrive ${dlId}`, buttonText: { displayText: `Download ${link.quality}` }, type: 1 });
                }
            });
            await conn.buttonMessage(from, { image: { url: data.poster || cache.posterUrl }, caption: `*🎬 Movie/Episode:* ${data.title}\n\nSelect Quality below:`, footer: config.FOOTER, buttons: buttons, headerType: 4 }, mek);
        } else {
            reply('🚩 *No episodes or download links found!*');
        }
    } catch (e) { reply('🚩 *Error fetching Info!* ' + e.message); }
});

// 2.2 NEXT / PREV BUTTON HANDLER
cmd({
    pattern: "aceppage",
    react: "🔄",
    dontAddCommandList: true,
    filename: __filename
}, async (conn, m, mek, { from, q, prefix, reply }) => {
    try {
        let [seriesId, pageStr] = q.split('_');
        let pageIndex = parseInt(pageStr);
        const cache = sessionCache.get(seriesId);
        if (!cache) return reply('🚩 *Session expired!*');
        await sendAcEpPage(conn, from, cache, pageIndex, prefix, mek);
    } catch (e) { reply('🚩 *Error loading page!* ' + e.message); }
});

// 3. 📋 DETAILS CARD BUTTON
cmd({
    pattern: "acdetails",
    react: '📋',
    dontAddCommandList: true,
    filename: __filename
}, async (conn, m, mek, { from, q, reply }) => {
    try {
        const cache = sessionCache.get(q.trim());
        if (!cache) return reply("🚩 *Session expired!*");
        const data = await fetchAnimeClubAPI(`/info?url=${encodeURIComponent(cache.url)}`);
        let msg = `*✨ ANIME DETAILS ✨*\n\n*🍿 Title:* ${data.title}\n*🎭 Genres:* ${data.genres ? data.genres.join(", ") : "N/A"}\n*📅 Date:* ${data.date || "N/A"}\n*⭐ Rating:* IMDb ${data.imdbRating || "N/A"}\n\n*📝 Description:* ${data.description || "N/A"}`;
        await conn.sendMessage(from, { image: { url: data.poster || cache.posterUrl }, caption: msg });
    } catch (e) { reply('🚩 *Error fetching details!* ' + e.message); }
});

// 4. 📦 QUALITY SELECTION
cmd({
    pattern: "acdlopt",
    react: "📥",
    dontAddCommandList: true,
    filename: __filename
}, async (conn, m, mek, { from, q, prefix, reply }) => {
    try {
        const cache = sessionCache.get(q.trim());
        if (!cache) return reply("🚩 *Session expired!*");
        const downloadsData = await fetchAnimeClubAPI(`/downloads?url=${encodeURIComponent(cache.link)}`);
        const validLinks = (downloadsData.downloads || []).filter(f => f.host && f.host.toLowerCase() !== "telegram");
        if (validLinks.length === 0) return reply("🚩 *Direct Download links (Google Drive) not found!*");
        let buttons = [];
        validLinks.forEach(file => {
            let dlId = generateId();
            sessionCache.set(dlId, { title: cache.title, episode: cache.episode, directUrl: file.directUrl, quality: file.quality, posterUrl: cache.posterUrl });
            buttons.push({ buttonId: `${prefix}acdrive ${dlId}`, buttonText: { displayText: `${file.quality} (${file.host})` }, type: 1 });
        });
        await conn.buttonMessage(from, { image: { url: cache.posterUrl }, caption: `*🎬 Anime:* ${cache.title}\n*📺 Episode:* ${cache.episode}\n\nSelect Quality:`, footer: config.FOOTER, buttons: buttons, headerType: 4 }, mek);
    } catch (e) { reply("🚩 *Error fetching qualities!* " + e.message); }
});

// 5. ⬇️ SINGLE DOWNLOAD (G-Drive Fix is triggered here)
cmd({
    pattern: "acdrive",
    react: "⬇️",
    dontAddCommandList: true,
    filename: __filename
}, async (conn, m, mek, { from, q, reply }) => {
    try {
        const cache = sessionCache.get(q.trim());
        if (!cache) return reply("🚩 *Session expired!*");
        const targetJid = config.JID || from;
        await downloadAnimeClubDirect(cache.directUrl, cache.title, cache.episode, cache.quality, targetJid, conn, mek, reply, cache.posterUrl);
    } catch (e) { reply('🚩 *Download Failed!*\n\n*Reason:* ' + e.message); }
});

// 6. 📑 DOWNLOAD ALL QUALITY SELECTION
cmd({
    pattern: "acallquality",
    react: "📑",
    dontAddCommandList: true,
    filename: __filename
}, async (conn, m, mek, { from, q, prefix, reply }) => {
    try {
        const cache = sessionCache.get(q.trim());
        if (!cache) return reply("🚩 *Session expired!*");
        let qualities = ["480p", "720p", "1080p"];
        let buttons = qualities.map(qLevel => {
            let dlAllId = generateId();
            sessionCache.set(dlAllId, { ...cache, selectedQuality: qLevel });
            return { buttonId: `${prefix}acdlall ${dlAllId}`, buttonText: { displayText: qLevel }, type: 1 };
        });
        await conn.buttonMessage(from, { image: { url: cache.posterUrl }, caption: `*📥 DOWNLOAD ALL*\n*🎬 ${cache.title}*\n*🎞️ Episodes:* ${cache.startEp} to ${cache.endEp}\n\n*Select quality:*`, footer: config.FOOTER, buttons: buttons, headerType: 4 }, mek);
    } catch (e) { reply("🚩 *Error!* " + e.message); }
});

// 7. 🚀 DOWNLOAD ALL EXECUTION
cmd({
    pattern: "acdlall",
    react: "⏳",
    dontAddCommandList: true,
    filename: __filename
}, async (conn, m, mek, { from, q, reply }) => {
    try {
        const cache = sessionCache.get(q.trim());
        if (!cache) return reply("🚩 *Session expired!*");
        const selectedQ = cache.selectedQuality || "720p";
        await reply(`*🚀 Download All (Eps ${cache.startEp}-${cache.endEp}) Started!*\nQuality: ${selectedQ}\nPlease wait...`);
        const targetJid = config.JID || from;
        for (let i = 0; i < cache.chunkEps.length; i++) {
            let ep = cache.chunkEps[i];
            let epNum = cache.startEp + i;
            try {
                const dlRes = await fetchAnimeClubAPI(`/downloads?url=${encodeURIComponent(ep.link)}`);
                const downloads = dlRes.downloads || [];
                let targetFile = downloads.find(f => f.quality.includes(selectedQ) && f.host !== "Telegram");
                if (!targetFile) targetFile = downloads.find(f => f.host !== "Telegram");
                if (targetFile && targetFile.directUrl) {
                    await downloadAnimeClubDirect(targetFile.directUrl, cache.title, epNum, targetFile.quality, targetJid, conn, mek, reply, cache.posterUrl);
                    await sleep(5000); // Anti-spam delay
                }
            } catch (err) { console.log(`Failed Ep ${epNum}:`, err.message); }
        }
        await reply(`*✅ All selected episodes downloaded successfully!*`);
    } catch (e) { reply('🚩 *Download All Error!* ' + e.message); }
});











// ==========================================================
//             MIZTY API ANIME DOWNLOADER (CLASSIC UI)
// ==========================================================

const API_KEY = 'mizty_live_e8751d2befd6af07755c11cbd4a1f015';
const API_DOMAIN = 'https://mizty.site/api/v1/anime';

// Helper Function for Mizty API Requests (403 Error Fix: Added Headers)
async function fetchMiztyAPI(endpoint, urlParam) {
    try {
        const url = `${API_DOMAIN}${endpoint}?api_key=${API_KEY}&q=${encodeURIComponent(urlParam)}`;
        const response = await axios.get(url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
                "Accept": "application/json, text/plain, */*",
                "Connection": "keep-alive"
            }
        });
        return response.data;
    } catch (error) {
        console.error(`[Mizty API] Error on ${endpoint}:`, error.message);
        throw error;
    }
}

// ⬇️ Direct Download Function (With KB Issue Fix)
async function downloadMiztyAnimeDirect(downloadUrl, animeTitle, epName, quality, targetJid, conn, posterUrl) {
    try {
        if (downloadUrl.includes('t.me')) {
            throw new Error("Telegram links cannot be downloaded directly. Please select a Drive/External link.");
        }

        const fileName = `${animeTitle} ${epName && epName !== animeTitle ? '- ' + epName : ''} [${quality}].mp4`.trim();

        const response = await axios({
            method: 'GET',
            url: downloadUrl,
            responseType: 'stream',
            timeout: 600000, 
            headers: { 
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                "Accept": "video/mp4,video/*;q=0.9,*/*;q=0.8"
            },
            validateStatus: (status) => status < 400
        });

        // 🛑 KB Issue Fix: Drive limit පැනලා HTML warning page එකක් ආවොත් නවත්වන්න
        const contentType = response.headers['content-type'];
        if (contentType && contentType.includes('text/html')) {
            throw new Error("Received HTML page instead of Video. Download limit reached or link expired.");
        }

        // Generate Thumbnail
        let thumb;
        try {
            if (typeof getResizedThumb === 'function') {
                thumb = await getResizedThumb(posterUrl || config.LOGO);
            }
        } catch (e) { thumb = null; }

        const finalCaption = `*🐦‍🔥𝐕ɪꜱᴘᴇʀ 𝐀ɴɪᴍᴇ🐦‍🔥*\n\n🎬 ${animeTitle}\n📺 ${epName && epName !== animeTitle ? epName : 'Movie'}\n🎥 Quality: ${quality}\n\n${config.NAME}`;

        await conn.sendMessage(targetJid, {
            document: { stream: response.data },
            caption: finalCaption,
            mimetype: "video/mp4",
            fileName: `🐦‍🔥𝐕ɪꜱᴘᴇʀ 𝐀ɴɪᴍᴇ🐦‍🔥 ${fileName}`,
            jpegThumbnail: thumb
        });
        return true;
    } catch (error) {
        console.error("Direct Download error:", error.message);
        throw error;
    }
}

// --- HELPER FUNCTION FOR EPISODE PAGINATION ---
async function sendMiztyEpPage(conn, from, cache, pageIndex, prefix, mek) {
    const LIMIT = 10; 
    const totalParts = Math.ceil(cache.uniqueEps.length / LIMIT);
    let chunk = cache.uniqueEps.slice(pageIndex * LIMIT, (pageIndex + 1) * LIMIT);

    let buttons = [];
    let startEpIndex = (pageIndex * LIMIT) + 1;
    let endEpIndex = startEpIndex + chunk.length - 1;

    if (pageIndex === 0) {
        let detId = generateId();
        sessionCache.set(detId, { url: cache.url, title: cache.title, posterUrl: cache.posterUrl, rawDetails: cache.rawDetails });
        buttons.push({
            buttonId: `${prefix}mzdetails ${detId}`,
            buttonText: { displayText: 'View Details 📋' },
            type: 1
        });
    }

    let allId = generateId();
    sessionCache.set(allId, { title: cache.title, posterUrl: cache.posterUrl, chunkEps: chunk, epMap: cache.epMap, partIndex: pageIndex, startEp: startEpIndex, endEp: endEpIndex });
    buttons.push({
        buttonId: `${prefix}mzallquality ${allId}`,
        buttonText: { displayText: `📥 Download All (${startEpIndex}-${endEpIndex})` },
        type: 1
    });

    chunk.forEach((epName) => {
        let epId = generateId();
        sessionCache.set(epId, { title: cache.title, episode: epName, files: cache.epMap.get(epName), posterUrl: cache.posterUrl });
        let displayBtn = epName.length > 20 ? epName.substring(0, 18) + '..' : epName;
        buttons.push({
            buttonId: `${prefix}mzdlopt ${epId}`,
            buttonText: { displayText: displayBtn },
            type: 1
        });
    });

    if (pageIndex > 0) {
        buttons.push({
            buttonId: `${prefix}mzeppage ${cache.seriesId}_${pageIndex - 1}`,
            buttonText: { displayText: '⬅️ Prev Page' },
            type: 1
        });
    }
    if (pageIndex < totalParts - 1) {
        buttons.push({
            buttonId: `${prefix}mzeppage ${cache.seriesId}_${pageIndex + 1}`,
            buttonText: { displayText: 'Next Page ➡️' },
            type: 1
        });
    }

    let caption = `*🍿 Title:* ${cache.title}\n*📂 Page:* ${pageIndex + 1}/${totalParts} (Items ${startEpIndex}-${endEpIndex})\n\nSelect an option below:`;

    await conn.buttonMessage(from, {
        image: { url: cache.posterUrl }, 
        caption: caption,
        footer: config.FOOTER,
        buttons: buttons, 
        headerType: 4
    }, mek);
}

// 1. 🔍 SEARCH API 
cmd({
    pattern: "animos",
    alias: ["animossearch"],
    react: '🔍',
    category: "anime",
    filename: __filename
},
async (conn, m, mek, { from, q, prefix, reply }) => {
    try {
        if (!q) return await reply('*කරුණාකර ඇනිමෙ නමක් ඇතුලත් කරන්න! ⛩️*');

        const res = await fetchMiztyAPI('/search', q);
        const results = res.results || [];

        if (results.length === 0) return await reply('*කිසිදු ප්‍රතිඵලයක් හමුවුයේ නැත ❌*');

        let rows = results.map(v => {
            let resId = generateId();
            sessionCache.set(resId, { url: v.link, title: v.title, image: v.image });
            return {
                title: v.title,
                description: `Date: ${v.date || 'N/A'}\n${v.snippet ? v.snippet.substring(0, 50) + '...' : ''}`,
                rowId: `${prefix}mzinfo ${resId}`
            };
        });

        await conn.listMessage(from, {
            text: `\n*VISPER MD ANIMOS SEARCH ⛩️*\n\n*🔎 Input:* ${q}\n\n*Select an anime/movie from the list below.*`,
            footer: config.FOOTER,
            buttonText: 'Select Anime 🎬',
            sections: [{ title: "Search Results", rows }]
        }, mek);
    } catch (e) { 
        if(e.response && e.response.status === 403) {
            return reply('🚩 *403 Forbidden Error! API කී එක හෝ Server එක මගින් access ලබාදීම ප්‍රතික්ෂේප කරයි.*');
        }
        reply('🚩 *Search Error!* ' + e.message); 
    }
});

// 2. 📄 ANIME INFO API
cmd({
    pattern: "mzinfo",
    react: "⛩️",
    dontAddCommandList: true,
    filename: __filename
},
async (conn, m, mek, { from, q, prefix, reply }) => {
    try {
        let seriesId = q.trim();
        const cache = sessionCache.get(seriesId);
        if (!cache) return reply('🚩 *Session expired! Please search again.*');

        cache.seriesId = seriesId;
        const data = await fetchMiztyAPI('/details', cache.url);
        if (!data || !data.anime_details) return reply('🚩 *No details found from API.*');

        const details = data.anime_details;
        cache.title = details.title;
        cache.posterUrl = details.image || cache.image || config.LOGO;
        cache.rawDetails = details;

        let downloads = data.downloads || [];
        let validDownloads = downloads.filter(d => d.url && !d.url.includes('t.me'));

        if (validDownloads.length === 0) return reply('🚩 *Direct download links (External) not found!*');

        let epMap = new Map();
        validDownloads.forEach(file => {
            let baseName = file.file_name.replace(/\s*-\s*(External|telegram|External Link)/i, '').trim();
            if (!epMap.has(baseName)) epMap.set(baseName, []);
            epMap.get(baseName).push(file);
        });

        let uniqueEps = Array.from(epMap.keys());
        cache.epMap = epMap;
        cache.uniqueEps = uniqueEps;

        if (uniqueEps.length === 1) {
            let movieFiles = epMap.get(uniqueEps[0]);
            let buttons = [];
            
            let detId = generateId();
            sessionCache.set(detId, { url: cache.url, title: cache.title, posterUrl: cache.posterUrl, rawDetails: details });
            buttons.push({
                buttonId: `${prefix}mzdetails ${detId}`,
                buttonText: { displayText: 'View Details 📋' },
                type: 1
            });

            movieFiles.forEach(file => {
                let dlId = generateId();
                sessionCache.set(dlId, { 
                    title: cache.title, epName: uniqueEps[0], directUrl: file.url, quality: file.quality_group || "HD", posterUrl: cache.posterUrl 
                });
                buttons.push({
                    buttonId: `${prefix}mzdrive ${dlId}`,
                    buttonText: { displayText: `Download ${file.quality_group ? file.quality_group.split('|')[0].trim() : 'HD'}` },
                    type: 1
                });
            });

            await conn.buttonMessage(from, {
                image: { url: cache.posterUrl }, 
                caption: `*🎬 Movie:* ${cache.title}\n\nSelect Quality below:`,
                footer: config.FOOTER,
                buttons: buttons,
                headerType: 4
            }, mek);
        } else {
            sessionCache.set(seriesId, cache);
            await sendMiztyEpPage(conn, from, cache, 0, prefix, mek);
        }
    } catch (e) { reply('🚩 *Error fetching Info!* ' + e.message); }
});

// 2.2 NEXT / PREV BUTTON HANDLER
cmd({
    pattern: "mzeppage",
    react: "🔄",
    dontAddCommandList: true,
    filename: __filename
},
async (conn, m, mek, { from, q, prefix, reply }) => {
    try {
        let [seriesId, pageStr] = q.split('_');
        let pageIndex = parseInt(pageStr);
        const cache = sessionCache.get(seriesId);
        if (!cache) return reply('🚩 *Session expired!*');
        await sendMiztyEpPage(conn, from, cache, pageIndex, prefix, mek);
    } catch (e) { reply('🚩 *Error loading page!* ' + e.message); }
});

// 3. 📋 DETAILS CARD BUTTON
cmd({
    pattern: "mzdetails",
    react: '📋',
    dontAddCommandList: true,
    filename: __filename
},
async (conn, m, mek, { from, q, reply }) => {
    try {
        const cache = sessionCache.get(q.trim());
        if (!cache || !cache.rawDetails) return reply("🚩 *Session expired!*");

        const details = cache.rawDetails;
        let tagsFormat = details.tags ? details.tags.join(", ") : "N/A";

        let msg = `*✨ ANIME DETAILS ✨*\n\n` +
                  `*🍿 Title:* ${details.title}\n` +
                  `*🎭 Tags:* ${tagsFormat}\n\n` +
                  `*📝 Description:* ${details.description || "N/A"}\n\n` +
                  `*ℹ️ Extra Info:*\n${details.extra_info || "N/A"}`;

        await conn.sendMessage(from, { image: { url: cache.posterUrl }, caption: msg });
    } catch (e) { reply('🚩 *Error showing details!* ' + e.message); }
});

// 4. 📦 QUALITY SELECTION 
cmd({
    pattern: "mzdlopt",
    react: "📥",
    dontAddCommandList: true,
    filename: __filename
},
async (conn, m, mek, { from, q, prefix, reply }) => {
    try {
        const cache = sessionCache.get(q.trim());
        if (!cache) return reply("🚩 *Session expired!*");

        let buttons = [];
        cache.files.forEach(file => {
            let dlId = generateId();
            sessionCache.set(dlId, { 
                title: cache.title, epName: cache.episode, directUrl: file.url, quality: file.quality_group || "HD", posterUrl: cache.posterUrl
            });
            
            let qualityLabel = file.quality_group ? file.quality_group.split('|')[0].trim() : "HD";
            buttons.push({
                buttonId: `${prefix}mzdrive ${dlId}`,
                buttonText: { displayText: `Download ${qualityLabel}` },
                type: 1
            });
        });

        await conn.buttonMessage(from, {
            image: { url: cache.posterUrl }, 
            caption: `*🎬 Anime:* ${cache.title}\n*📺 File:* ${cache.episode}\n\nSelect Quality:`,
            footer: config.FOOTER,
            buttons: buttons,
            headerType: 4
        }, mek);
    } catch (e) { reply("🚩 *Error fetching qualities!* " + e.message); }
});

// 5. ⬇️ SINGLE DOWNLOAD 
cmd({
    pattern: "mzdrive",
    react: "⬇️",
    dontAddCommandList: true,
    filename: __filename
},
async (conn, m, mek, { from, q, reply }) => {
    try {
        const cache = sessionCache.get(q.trim());
        if (!cache) return reply("🚩 *Session expired!*");

        await conn.sendMessage(from, { react: { text: '⏳', key: mek.key } });

        const targetJid = config.JID || from;
        
        await downloadMiztyAnimeDirect(cache.directUrl, cache.title, cache.epName, cache.quality, targetJid, conn, cache.posterUrl);
        await conn.sendMessage(from, { react: { text: '✅', key: mek.key } });

    } catch (e) {
        reply('🚩 *Download Failed!*\n\n*Reason:* ' + e.message);
    }
});

// 6. 📑 DOWNLOAD ALL QUALITY SELECTION
cmd({
    pattern: "mzallquality",
    react: "📑",
    dontAddCommandList: true,
    filename: __filename
},
async (conn, m, mek, { from, q, prefix, reply }) => {
    try {
        const cache = sessionCache.get(q.trim());
        if (!cache) return reply("🚩 *Session expired!*");

        let qualitySet = new Set();
        cache.chunkEps.forEach(epName => {
            let files = cache.epMap.get(epName) || [];
            files.forEach(f => {
                if (f.quality_group) qualitySet.add(f.quality_group.split('|')[0].trim());
            });
        });

        let qualities = Array.from(qualitySet);
        if (qualities.length === 0) qualities = ["720P", "480P"];

        let buttons = qualities.map(qLevel => {
            let dlAllId = generateId();
            sessionCache.set(dlAllId, { ...cache, selectedQuality: qLevel });
            return {
                buttonId: `${prefix}mzdlall ${dlAllId}`,
                buttonText: { displayText: qLevel },
                type: 1
            };
        });

        await conn.buttonMessage(from, {
            image: { url: cache.posterUrl },
            caption: `*📥 DOWNLOAD ALL*\n*🎬 ${cache.title}*\n*🎞️ Items:* ${cache.startEp} to ${cache.endEp}\n\n*Select quality:*`,
            footer: config.FOOTER,
            buttons: buttons,
            headerType: 4
        }, mek);
    } catch (e) { reply("🚩 *Error!* " + e.message); }
});

// 7. 🚀 DOWNLOAD ALL EXECUTION
cmd({
    pattern: "mzdlall",
    react: "⏳",
    dontAddCommandList: true,
    filename: __filename
},
async (conn, m, mek, { from, q, reply }) => {
    try {
        const cache = sessionCache.get(q.trim());
        if (!cache) return reply("🚩 *Session expired!*");

        const selectedQ = cache.selectedQuality || "720";
        await reply(`*🚀 Download All (Items ${cache.startEp}-${cache.endEp}) Started!*\nQuality: ${selectedQ}\nPlease wait...`);

        const targetJid = config.JID || from;

        for (let i = 0; i < cache.chunkEps.length; i++) {
            let epName = cache.chunkEps[i];
            try {
                let files = cache.epMap.get(epName);
                if (!files || files.length === 0) continue;

                let targetFile = files.find(f => f.quality_group && f.quality_group.includes(selectedQ));
                if (!targetFile) targetFile = files[0];

                if (targetFile && targetFile.url) {
                    await downloadMiztyAnimeDirect(targetFile.url, cache.title, epName, targetFile.quality_group || "HD", targetJid, conn, cache.posterUrl);
                    await new Promise(resolve => setTimeout(resolve, 5000));
                }
            } catch (err) {
                console.log(`Failed Item ${epName}:`, err.message);
            }
        }
        await reply(`*✅ All selected items downloaded successfully!*`);
    } catch (e) {
        reply('🚩 *Download All Error!* ' + e.message); 
    }
});
