const config = require('../config')
const { cmd, commands } = require('../command')
const axios = require('axios'); 
const sharp = require('sharp');
const fg = require('api-dylux');
const fetch = require('node-fetch');
const { getBuffer, getGroupAdmins, getRandom, h2k, isUrl, Json, runtime, sleep, fetchJson} = require('../lib/functions')

let isUploadingTv = false;
const API_KEY = 'key_13be1374312cdd0a';   // new API key
const BASE_URL = 'https://mr-thinuzz-api-build.vercel.app/api/cinesubz';

async function getResizedThumb(url) {
    try {
        const response = await axios.get(url, { responseType: 'arraybuffer' });
        const buffer = Buffer.from(response.data, 'binary');
        return await sharp(buffer)
            .resize(200, 200, { fit: 'cover' }) 
            .jpeg({ quality: 80 }) 
            .toBuffer();
    } catch (e) {
        console.error("Sharp Error:", e.message);
        return null;
    }
}

// ==================== 1. TV SERIES SEARCH ====================
cmd({
    pattern: "ctztv",
    react: '🔎',
    category: "tv",
    filename: __filename
},
async (conn, m, mek, { from, q, prefix, reply }) => {
    try {
        if (!q) return await reply('*Please enter a TV series name! 📺*');

        // new search endpoint
        const searchUrl = `${BASE_URL}/search?query=${encodeURIComponent(q)}&apiKey=${API_KEY}`;
        const { data } = await axios.get(searchUrl, { timeout: 30000 });

        if (!data?.status || !data?.data?.all?.length) {
            return await reply('*No results found ❌*');
        }

        // filter only TV series (type === 'TV')
        const tvShows = data.data.all.filter(item => item.type === 'TV');
        if (tvShows.length === 0) {
            return await reply('*No TV series found for that query.*');
        }

        const results = tvShows.slice(0, 10);
        let srh = results.map(v => ({
            title: v.title.replace(/Sinhala Subtitles\s*\|?\s*සිංහල උපසිරසි.*/gi, "").trim(),
            rowId: `${prefix}tvinfo ${v.link}`
        }));

        await conn.listMessage(from, {
            text: `_CINESUBZ TV SERIES SEARCH RESULTS 📺_\n\n*🔎 Input:* ${q}\n\n*Select a series from the list below to view episodes.*`,
            footer: config.FOOTER || "Cinesubz Downloader",
            title: '', 
            buttonText: 'Click to View Results 🎬',
            sections: [{ title: "Available TV Series", rows: srh }]
        }, mek);
    } catch (e) { 
        console.error(e);
        reply('🚩 *Error during search!*'); 
    }
});

// ==================== 2. TV INFO & EPISODES ====================
cmd({
    pattern: "tvinfo",
    react: "📺",
    filename: __filename
},
async (conn, m, mek, { from, q, prefix, reply }) => {
    try {
        // new TV info endpoint
        const infoUrl = `${BASE_URL}/tvshow?url=${encodeURIComponent(q)}&apiKey=${API_KEY}`;
        const { data } = await axios.get(infoUrl, { timeout: 30000 });

        const series = data.data;
        if (!series) return await reply("*Couldn't find TV series info!*");

        // extract fields from new API
        const title = series.maintitle || 'N/A';
        const imdb = series.imdb || 'N/A';
        const posterUrl = series.mainImage || config.LOGO;
        const seasons = series.episodesDetails || [];   // array of { season: number, episodes: [ { number, title, url } ] }

        if (seasons.length === 0) {
            return await reply("*No seasons/episodes found for this series.*");
        }

        for (let i = 0; i < seasons.length; i++) {
            const season = seasons[i];
            const seasonNum = season.season;
            const episodes = season.episodes || [];

            let rows = [];

            // "Download All Sx" button
            rows.push({
                buttonId: `${prefix}tvallquality ${q}±${posterUrl}±${title}±${seasonNum}`,
                buttonText: { displayText: `📥 Download All S${seasonNum}` },
                type: 1
            });

            // "Details Card" button only for first season
            if (i === 0) {
                rows.push({
                    buttonId: `${prefix}ctvdetails ${q}`,
                    buttonText: { displayText: 'View Details Card 📋' },
                    type: 1
                });
            }

            // episode buttons
            episodes.forEach(ep => {
                const epTitle = `S${String(seasonNum).padStart(2, '0')} E${String(ep.number).padStart(2, '0')}`;
                rows.push({
                    buttonId: `${prefix}tvquality ${ep.url}±${posterUrl}±${title} ${epTitle}±${q}`,
                    buttonText: { displayText: epTitle },
                    type: 1
                });
            });

            const captionText = i === 0 
                ? `*🍿 𝗧ɪᴛ𝗹𝗲 ➮* *_${title}_*\n*⭐ 𝗜𝗠𝗗𝗯 ➮* _${imdb}_\n\n*Select an Episode from Season ${seasonNum} below:*`
                : `*📂 Season ${seasonNum} Episodes - ${title}*`;

            await conn.buttonMessage(from, {
                image: { url: posterUrl },
                caption: captionText,
                footer: config.FOOTER || "Cinesubz Downloader",
                buttons: rows,
                headerType: 4
            }, mek);

            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    } catch (e) { 
        console.error(e);
        reply('🚩 *Error fetching episodes!*'); 
    }
});

// ==================== 3. DETAILS CARD ====================
cmd({
    pattern: "ctvdetails",
    react: '📋',
    desc: "Rich TV info card",
    filename: __filename
},
async (conn, m, mek, { from, q, reply }) => {
    try {
        const infoUrl = `${BASE_URL}/tvshow?url=${encodeURIComponent(q)}&apiKey=${API_KEY}`;
        const { data } = await axios.get(infoUrl, { timeout: 30000 });

        const movie = data.data;
        let details = { mvchlink: "https://whatsapp.com/channel/yourchannel" }; 
        try {
            details = (await axios.get('https://mv-visper-full-db.pages.dev/Main/main_var.json')).data;
        } catch(e){}

        // construct details using new fields
        const title = movie.maintitle || 'N/A';
        const imdb = movie.imdb || 'N/A';
        const genres = movie.category?.join(', ') || 'N/A';
        const cast = movie.cast?.slice(0, 5).map(c => c.actor.name).join(', ') || 'N/A';

        let msg = `*✨ 𝐓ᴠ 𝐒ᴇʀɪᴇ𝐬 𝐃ᴇᴛᴀɪʟ𝐬 ✨*\n\n` +
                  `*🍿 𝐓ɪ𝐓ʟ𝐄 ➮* *_${title}_*\n` +
                  `*⭐ 𝐈𝐌𝐃𝐛 ➮* _${imdb}_\n` +
                  `*🎭 𝐆𝐞𝐧𝐫𝐞𝐬 ➮* _${genres}_\n` +
                  `*👥 𝐂𝐚𝐬𝐭 ➮* _${cast}_\n\n` +
                  `✨ *Follow us:* ${details.mvchlink}`;

        await conn.sendMessage(from, { 
            image: { url: movie.mainImage || config.LOGO }, 
            caption: msg 
        }, { quoted: mek });
        await conn.sendMessage(from, { react: { text: '✔️', key: mek.key } });
    } catch (e) { 
        console.error("Error in ctvdetails command:", e); 
        reply('🚩 *Error fetching details card!*'); 
    }
});

// ==================== 4. QUALITY SELECTION (SINGLE EPISODE) ====================
cmd({
    pattern: "tvquality",
    react: "🎥",
    dontAddCommandList: true,
    filename: __filename
},
async (conn, m, mek, { from, q, prefix, reply }) => {
    try {
        const [epUrl, imgLink, title, mainUrl] = q.split("±");

        // new episode endpoint
        const epInfoUrl = `${BASE_URL}/episode?url=${encodeURIComponent(epUrl)}&apiKey=${API_KEY}`;
        const { data: convData } = await axios.get(epInfoUrl, { timeout: 30000 });

        if (!convData?.status || !convData?.data?.downloadUrl?.length) {
            return await reply('*No download links found for this episode.*');
        }

        let rows = convData.data.downloadUrl.map(dl => ({
            buttonId: `${prefix}tvdl ${dl.link}±${imgLink}±${title}±${mainUrl}±${dl.quality}`, 
            buttonText: { displayText: `${dl.quality} (${dl.size})` },
            type: 1
        }));

        await conn.buttonMessage(from, {
            image: { url: imgLink },
            caption: `*🎥 Select Quality for:* \n_${title}_`,
            footer: config.FOOTER || "Cinesubz Downloader",
            buttons: rows,
            headerType: 4
        }, mek);
    } catch (e) { 
        console.error(e);
        reply('🚩 *Error fetching qualities!*'); 
    }
});

// ==================== 5. ALL EPISODES QUALITY SELECTION ====================
cmd({
    pattern: "tvallquality",
    react: "📑",
    dontAddCommandList: true,
    filename: __filename
},
async (conn, m, mek, { from, q, prefix, reply }) => {
    try {
        const [mainUrl, imgLink, title, seasonNum] = q.split("±");

        // get series info to fetch first episode of that season
        const seriesUrl = `${BASE_URL}/tvshow?url=${encodeURIComponent(mainUrl)}&apiKey=${API_KEY}`;
        const { data: seriesData } = await axios.get(seriesUrl, { timeout: 30000 });

        const targetSeason = seriesData.data.episodesDetails.find(s => s.season.toString() === seasonNum.toString());
        if (!targetSeason || !targetSeason.episodes || targetSeason.episodes.length === 0) {
            return await reply('*No episodes found for this season.*');
        }
        const firstEpUrl = targetSeason.episodes[0].url;

        // fetch quality options from first episode
        const epInfoUrl = `${BASE_URL}/episode?url=${encodeURIComponent(firstEpUrl)}&apiKey=${API_KEY}`;
        const { data: convData } = await axios.get(epInfoUrl, { timeout: 30000 });

        if (!convData?.status || !convData?.data?.downloadUrl?.length) {
            return await reply('*No quality options available.*');
        }

        let rows = convData.data.downloadUrl.map(dl => ({
            buttonId: `${prefix}tvdlall ${mainUrl}±${imgLink}±${title}±${dl.quality}±${seasonNum}`,
            buttonText: { displayText: dl.quality },
            type: 1
        }));

        await conn.buttonMessage(from, {
            image: { url: imgLink },
            caption: `*📥 DOWNLOAD ALL - SEASON ${seasonNum}*\n\n*Series:* ${title}\n*Select the quality for all episodes in Season ${seasonNum}:*`,
            footer: config.FOOTER || "Cinesubz Downloader",
            buttons: rows,
            headerType: 4
        }, mek);
    } catch (e) { 
        console.error(e);
        reply('🚩 *Error fetching quality list!*'); 
    }
});

// ==================== 6. DOWNLOAD ALL EPISODES OF A SEASON ====================
cmd({
    pattern: "tvdlall",
    react: "⏳",
    dontAddCommandList: true,
    filename: __filename
},
async (conn, m, mek, { from, q, reply }) => {
    if (isUploadingTv) return await reply('*Another process is running. Please wait ⏳*');
    try {
        const [mainUrl, imgLink, title, selectedQuality, seasonNum] = q.split("±");
        isUploadingTv = true;
        await reply(`*🚀 Starting download all episodes of Season ${seasonNum} in ${selectedQuality}...*`);

        // get series info
        const seriesUrl = `${BASE_URL}/tvshow?url=${encodeURIComponent(mainUrl)}&apiKey=${API_KEY}`;
        const { data: seriesData } = await axios.get(seriesUrl, { timeout: 30000 });

        const targetSeason = seriesData.data.episodesDetails.find(s => s.season.toString() === seasonNum.toString());
        if (!targetSeason || !targetSeason.episodes) {
            throw new Error('Season not found');
        }

        for (const ep of targetSeason.episodes) {
            try {
                const epTitle = `${title} S${String(seasonNum).padStart(2, '0')}E${String(ep.number).padStart(2, '0')}`;

                // fetch episode download links
                const epInfoUrl = `${BASE_URL}/episode?url=${encodeURIComponent(ep.url)}&apiKey=${API_KEY}`;
                const { data: qData } = await axios.get(epInfoUrl, { timeout: 30000 });

                if (!qData?.status || !qData?.data?.downloadUrl?.length) continue;

                // find matching quality (or fallback to first)
                const matchingDl = qData.data.downloadUrl.find(d => d.quality.trim() === selectedQuality.trim()) || qData.data.downloadUrl[0];

                // resolve final download URL
                const dlUrl = `${BASE_URL}/download?url=${encodeURIComponent(matchingDl.link)}&apiKey=${API_KEY}`;
                const { data: apiRes } = await axios.get(dlUrl, { timeout: 60000 });

                if (!apiRes?.status || !apiRes?.data?.downloadUrls?.length) continue;

                // pick a non-telegram, non-'start=' link
                let finalUrl = null;
                for (const item of apiRes.data.downloadUrls) {
                    if (item.url && !item.url.includes('t.me') && !item.url.includes('start=')) {
                        finalUrl = item.url;
                        break;
                    }
                }
                if (!finalUrl) finalUrl = apiRes.data.downloadUrls[0].url;

                // send file
                const resizedThumb = await getResizedThumb(imgLink);
                const caption = `🎬 *𝗡𝗮𝗺𝗲 :* ${epTitle}\n\n\`[${selectedQuality.trim()}]\` \n\n${config.NAME || 'Bot'}`;

                const targetJid = config.JID || from;
                await conn.sendMessage(targetJid, { 
                    document: { url: finalUrl }, 
                    fileName: "🎥 " + epTitle.replace(/[^\w\s]/g, '').trim() + ".mp4", 
                    mimetype: "video/mp4",
                    jpegThumbnail: resizedThumb,
                    caption: caption
                });
                await new Promise(resolve => setTimeout(resolve, 2000));
            } catch (err) { 
                console.error(`Error downloading episode ${ep.number}:`, err); 
            }
        }
        await reply(`*✅ All episodes of Season ${seasonNum} have been sent!*`);
    } catch (e) { 
        console.error(e);
        reply('*Critical error in Download All!*'); 
    }
    finally { isUploadingTv = false; }
});

// ==================== 7. FINAL INDIVIDUAL DOWNLOAD ====================
cmd({
    pattern: "tvdl",
    react: "⬇️",
    dontAddCommandList: true,
    filename: __filename
},
async (conn, m, mek, { from, q, reply }) => {
    if (isUploadingTv) return await reply('*Another episode is uploading. Please wait ⏳*');
    try {
        const [processedUrl, imgLink, title, mainUrl, quality] = q.split("±");

        // resolve final download URL
        const dlUrl = `${BASE_URL}/download?url=${encodeURIComponent(processedUrl)}&apiKey=${API_KEY}`;
        const { data: apiRes } = await axios.get(dlUrl, { timeout: 60000 });

        if (!apiRes?.status || !apiRes?.data?.downloadUrls?.length) {
            return await reply("⚠️ No working link found.");
        }

        let finalUrl = null;
        for (const item of apiRes.data.downloadUrls) {
            if (item.url && !item.url.includes('t.me') && !item.url.includes('start=')) {
                finalUrl = item.url;
                break;
            }
        }
        if (!finalUrl) finalUrl = apiRes.data.downloadUrls[0].url;

        isUploadingTv = true;
        await conn.sendMessage(from, { react: { text: '⬆️', key: mek.key } });

        const resizedThumb = await getResizedThumb(imgLink);
        const qText = quality ? quality.trim() : 'Unknown';
        const caption = `🎬 *𝗡𝗮𝗺𝗲 :* ${title}\n\n\`[ ${qText} ]\`\n\n${config.NAME || 'Bot'}`;

        const targetJid = config.JID || from;
        await conn.sendMessage(targetJid, { 
            document: { url: finalUrl }, 
            fileName: "🎥" + title.replace(/[^\w\s]/g, '').trim() + ".mp4", 
            mimetype: "video/mp4",
            jpegThumbnail: resizedThumb,
            caption: caption
        });
        await conn.sendMessage(from, { react: { text: '✔️', key: mek.key } });
    } catch (e) { 
        console.error(e);
        reply('*Download Error !!*'); 
    }
    finally { isUploadingTv = false; }
});
