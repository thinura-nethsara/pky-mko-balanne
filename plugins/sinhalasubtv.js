const config = require('../config'),
  { cmd, commands } = require('../command'),
  axios = require('axios'),
	sharp = require('sharp'),
  {
    getBuffer,
    getGroupAdmins,
    getRandom,
    h2k,
    isUrl,
    Json,
    runtime,
    sleep,
    fetchJson,
  } = require('../lib/functions'),
  fetch = (..._0x1c20f7) =>
    import('node-fetch').then(({ default: _0x557a09 }) =>
      _0x557a09(..._0x1c20f7)
    ),
  { Buffer } = require('buffer'),
  FormData = require('form-data'),
  fs = require('fs'),
  {
    sinhalasub_search,
    sinhalasub_info,
    sinhalasub_dl,
  } = require('../lib/sinhalasubli'),
  {
    sinhalasubb_search,
    sinhalasubtv_info,
    sinhalasubtv_dl,
  } = require('../lib/sinhalasubtv'),
  path = require('path'),
  fileType = require('file-type'),
  l = console.log

//===========================================================================================================
//sinhalasub tv show
const API_KEY = "charuka-key-666";
const BASE_URL = "https://my-apis-site.vercel.app/movie/sinhalasub";

// ----------------------------------------------------------------------------------------------------
// 1. SEARCH COMMAND (TV SHOWS ONLY) - ALIAS: sinhalasutv, sintv
// ----------------------------------------------------------------------------------------------------
cmd({
    pattern: "sinhalasubtv",
    react: '📺',
    category: "movie",
    alias: ["sinhalasutv", "sintv", "sinhalatv"],
    desc: "Search TV shows from sinhalasub.lk",
    filename: __filename
},
async (conn, m, mek, { from, q, prefix, isMe, isOwner, isSudo, isPre, reply }) => {
    try {
        const isAuthorized = isMe || isOwner || isSudo || isPre;
        if (!isAuthorized) {
            const { data: db } = await axios.get('https://nadeen-botzdatabse.vercel.app/data.json');
            return await conn.sendMessage(from, { text: db.freemsg }, { quoted: mek });
        }

        if (!q) return reply('*❗ Please enter a TV series name (e.g. .sintv Loki)*');

        const { data } = await axios.get(`${BASE_URL}/search?text=${encodeURIComponent(q)}&apikey=${API_KEY}`);
        
        if (!data.status || !data.result || data.result.length === 0) {
            return reply("*❌ No results found on SinhalaSub!*");
        }

        // TV Shows විතරක් Filter කිරීම
        const results = data.result.filter(v => v.link.includes('/tvshows/'));
        if (results.length === 0) return reply("*❌ No TV Series found for this search!*");

        let rows = results.map(v => ({
            title: v.title.replace("Sinhala Subtitles", "").trim(),
            rowId: `${prefix}sintvinfo ${v.link}`
        }));

        await conn.listMessage(from, {
            text: `*_VISPER SINHALASUB TV SEARCH RESULTS 📺_*`,
            footer: config.FOOTER,
            title: "Select a TV Series 🎥",
            buttonText: "Click Here 🔢",
            sections: [{ title: "Search Results", rows }]
        }, mek);

    } catch (e) {
        console.log(e);
        reply("*❌ Search Error! Try again later.*");
    }
});

// ----------------------------------------------------------------------------------------------------
// 2. INFO COMMAND (FIXED UNDEFINED ERROR)
// ----------------------------------------------------------------------------------------------------
cmd({
    pattern: "sintvinfo",
    react: '🎥',
    category: "movie",
    dontAddCommandList: true,
    filename: __filename
},
async (conn, m, mek, { from, q, prefix, reply }) => {
    try {
        if (!q) return;
        
        const { data } = await axios.get(`${BASE_URL}/tvshow?url=${encodeURIComponent(q)}&apikey=${API_KEY}`);
        const show = data?.result;

        if (!show || !show.title) {
            return reply("*❌ Error: Could not fetch details for this show!*");
        }

        // විස්තර සකස් කිරීම
        let details = `🎬 *${show.title}*\n\n` +
                      `▫️⭐ *IMDB:* ${show.imdb || 'N/A'}\n` +
                      `▫️📅 *Date:* ${show.date || 'N/A'}\n` +
                      `▫️🎭 *Genres:* ${show.category ? show.category.join(', ') : 'N/A'}\n\n${config.DCARD}` +
                      `*Please select an Episode/Season below:*`;

        // Episode List එක හදනවා
        if (!show.episodes || show.episodes.length === 0) {
            return reply("*❌ No episodes found for this show!*");
        }

        let rows = show.episodes.map(v => ({
            title: v.title || "Episode",
            rowId: `${prefix}sintvepi ${v.url}±${show.image}`
        }));

        const sections = [{ title: "Available Episodes", rows }];

        // Image එකත් එක්කම විස්තර යැවීම
        await conn.sendMessage(from, {
            image: { url: show.image || config.LOGO },
            caption: details,
            footer: config.FOOTER,
            buttons: [
                { 
                    buttonId: "list_ep", 
                    buttonText: { displayText: "📂 Select Episode" }, 
                    type: 4, 
                    nativeFlowInfo: { 
                        name: "single_select", 
                        paramsJson: JSON.stringify({ title: "Episode List", sections }) 
                    }
                }
            ],
            headerType: 4
        }, { quoted: mek });

    } catch (e) {
        console.log(e);
        reply("*❌ Info Error: API response issue or Link error!*");
    }
});

// ----------------------------------------------------------------------------------------------------
// 3. EPISODE QUALITY SELECT (FILTERING)
// ----------------------------------------------------------------------------------------------------
cmd({
    pattern: "sintvepi",
    react: '🎬',
    dontAddCommandList: true,
    filename: __filename
},
async (conn, m, mek, { from, q, prefix, reply }) => {
    try {
        if (!q) return;
        const [epUrl, showImg] = q.split("±");

        const { data } = await axios.get(`${BASE_URL}/episode?url=${encodeURIComponent(epUrl)}&apikey=${API_KEY}`);
        const result = data?.result;

        if (!result || !result.dl_links) return reply("*❌ No download links available!*");

        // Userdrive/Telegram ලින්ක් අයින් කරනවා
        const filteredLinks = result.dl_links.filter(v => 
            !v.link.includes('userdrive') && !v.link.includes('t.me') && !v.link.includes('telegram')
        );

        if (filteredLinks.length === 0) return reply("*❌ Only Userdrive/Telegram links found. Cannot download!*");

        let rows = filteredLinks.map(v => ({
            title: `${v.quality} (${v.size})`,
            rowId: `${prefix}sintvdl ${v.link}±${result.title}±${showImg}±${v.quality}`
        }));

        await conn.listMessage(from, {
            text: `*🍿 Episode:* ${result.title}\n\n*Select quality to download:*`,
            footer: config.FOOTER,
            title: "Download Quality",
            buttonText: "Select One 🎥",
            sections: [{ title: "Available Qualities", rows }]
        }, mek);

    } catch (e) {
        console.log(e);
        reply("*❌ Episode Error!*");
    }
});

// ----------------------------------------------------------------------------------------------------
// 4. FINAL DOWNLOAD
// ----------------------------------------------------------------------------------------------------
cmd({
    pattern: "sintvdl",
    react: '⬇️',
    dontAddCommandList: true,
    filename: __filename
}, 
async (conn, m, mek, { from, q, reply }) => {
    try {
        if (!q) return;
        const [url, title, img, qual] = q.split("±");

        let directLink = url;
        if (url.includes("pixeldrain.com/u/")) {
            directLink = `https://pixeldrain.com/api/file/${url.split("/u/")[1]}`;
        }

        if (global.isUploading) return reply("*⏳ Another file is uploading. Wait!*");
        global.isUploading = true;

        await reply(`*🚀 Uploading:* _${title}_ (${qual})`);

        const thumbRes = await fetch(img || config.LOGO);
        const thumb = await thumbRes.buffer();

        await conn.sendMessage(from, {
            document: { url: directLink },
            mimetype: "video/mp4",
            fileName: `${config.TITLE}${title} - ${qual}.mp4`,
            jpegThumbnail: thumb,
            caption: `🎬 *${title}*\n⭐ *Quality:* ${qual}\n\n${config.FOOTER}`
        }, { quoted: mek });

        await conn.sendMessage(from, { react: { text: '✔️', key: mek.key } });
        global.isUploading = false;

    } catch (e) {
        global.isUploading = false;
        console.log(e);
        reply("*❌ Upload failed! Link may be expired.*");
    }
});
//==========================================================================================================

cmd({
  pattern: "dtaqt",
  alias: ["mdv"],
  react: "🎥",
	 category: "movie",
  desc: "Download movie details from SinhalaSub TV",
  filename: __filename
},
async (conn, m, mek, { from, q, prefix, isPre, isMe, isSudo, isOwner, reply }) => {
    try {
        // 🧩 Sudo, Owner, Me හෝ Premium නම් පමණක් අවසර ඇත
        const isAuthorized = isMe || isOwner || isSudo || isPre;

        if (!isAuthorized) {
            // API එකෙන් පණිවිඩය ලබාගැනීම
            const { data } = await axios.get('https://nadeen-botzdatabse.vercel.app/data.json');
            
            await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
            return await conn.sendMessage(from, { text: data.freemsg }, { quoted: mek });
        }
//iwaraiiii



  if (!q) return reply('🚩 *Please give me a valid SinhalaSub TV link!*');

  const sadas = await axios.get(`https://test-sadaslk-apis.vercel.app/api/v1/movie/sinhalasub/tv/info?q=${encodeURIComponent(q)}&apiKey=vispermdv4`);
  const details = (await axios.get('https://raw.githubusercontent.com/Nadeenpoorna-app/main-data/refs/heads/main/master.json')).data;

  const result = sadas.data.result;
  if (!result) return reply('❌ *No data found!*');

  const caption = `*☘️ Title:* *_${result.title || 'N/A'}_*\n\n` +
    `*📅 Date:* _${result.date || 'N/A'}_\n` +
    `*💃 Rating:* _${result.imdb || 'N/A'}_\n` +
    `*💁‍♂️ Subtitle By:* _${result.director || 'Unknown'}_\n\n` +
    `*➟➟➟➟➟➟➟➟➟➟➟➟➟➟➟*\n*👥 𝙵𝙾𝙻𝙻𝙾𝚆 𝙾𝚄𝚁 𝙲𝙷𝙰𝙽𝙽𝙴𝙻 ➟* https://whatsapp.com/channel/0029Vb8JZnfA89MqNc8hLb18\n*➟➟➟➟➟➟➟➟➟➟➟➟➟➟➟*\n\n` +
    `${config.DCARD}`;

  await conn.sendMessage(from, { image: { url: result.image[0] }, caption }, { quoted: mek });
  await conn.sendMessage(from, { react: { text: '✔️', key: mek.key } });

} catch (error) {
  console.error('Error fetching or sending:', error);
  reply('🚫 *Error fetching movie details!*');
}
});

  
//==================================================================
// 🖼️ SinhalaSub TV All Images Sender
//==================================================================
cmd({
    pattern: "ch",
    alias: ["tvimg"],
    use: '.ch <url>',
    react: "🖼️",
    desc: "Send all SinhalaSub TV screenshots/posters",
    filename: __filename
},
async (conn, m, mek, { from, q, prefix, isPre, isMe, isSudo, isOwner, reply }) => {
    try {
        // 🧩 Sudo, Owner, Me හෝ Premium නම් පමණක් අවසර ඇත
        const isAuthorized = isMe || isOwner || isSudo || isPre;

        if (!isAuthorized) {
            // API එකෙන් පණිවිඩය ලබාගැනීම
            const { data } = await axios.get('https://nadeen-botzdatabse.vercel.app/data.json');
            
            await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
            return await conn.sendMessage(from, { text: data.freemsg }, { quoted: mek });
        }
//iwaraiiii



        if (!q) return reply('🚩 *Please provide a SinhalaSub TV URL!*');

        // API request
        let sadas = await axios.get(`https://test-sadaslk-apis.vercel.app/api/v1/movie/sinhalasub/tv/info?q=${encodeURIComponent(q)}&apiKey=vispermdv4`);

        const result = sadas.data.result;
        if (!result || !result.image || result.image.length === 0)
            return reply('⚠️ *No images found for this title!*');

        for (let url of result.image) {
            await conn.sendMessage(from, { image: { url } }, { quoted: mek });
        }

        await conn.sendMessage(from, { react: { text: '✔️', key: mek.key } });

    } catch (error) {
        console.error('Error fetching or sending images:', error);
        reply('🚫 *Error while sending images!*');
    }
});

//===========================================================================================================
