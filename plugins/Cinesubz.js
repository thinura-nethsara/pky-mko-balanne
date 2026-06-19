const config = require('../config'),
  { cmd, commands } = require('../command'),
  axios = require('axios'),
  {
    getBuffer,
    getRandom,
    h2k,
    isUrl,
    runtime,
    sleep,
    fetchJson,
  } = require('../lib/functions'),
  { Buffer } = require('buffer');

const SEARCH_API = "https://cinesubz-search-cftt.vercel.app/api/search?text=";
const DETAILS_API = "https://cinesubz-dl.vercel.app/api/download?url=";
const DIRECT_DL_API = "https://api-dark-shan-yt.koyeb.app/movie/cinesubz-download?url=";
const API_KEY = "&apikey=82406ca340409d44";  // Your working apikey

let isUploadingg = false;

cmd({
  pattern: "cine1",	
  react: '🔎',
  category: "movie",
  alias: ["cz"],
  desc: "cinesubz.lk movie search",
  use: ".cine deadpool",
  filename: __filename
},
async (conn, m, mek, {
  from, q, prefix, isPre, isSudo, isOwner, isMe, reply
}) => {
  try {
    // Your premium check
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

    // Block check
    if (config.MV_BLOCK === "true" && !isMe && !isSudo && !isOwner) {
      await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
      return await conn.sendMessage(from, {
        text: "*This command currently only works for the Bot owner. To disable it for others, use the .settings command 👨‍🔧.*"
      }, { quoted: mek });
    }

    if (!q) return await reply('*Please give me a movie name 🎬*');

    const searchRes = await fetchJson(SEARCH_API + encodeURIComponent(q));

    // Accurate check using the "total" field
    if (!searchRes || !searchRes.total || searchRes.total <= 1) {
      await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
      return await conn.sendMessage(from, { text: '*No results found ❌*' }, { quoted: mek });
    }

    // Filter out the fake "All Movies" entry
    const results = searchRes.results.filter(r => r.title !== "All Movies");

    if (results.length === 0) {
      await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
      return await conn.sendMessage(from, { text: '*No results found ❌*' }, { quoted: mek });
    }

    var srh = [];  
    for (let i = 0; i < results.length; i++) {
      srh.push({
        title: results[i].title.replace(/Sinhala Subtitles|සිංහල උපසිරැසි සමඟ/gi, "").trim(),
        description: '',
        rowId: prefix + 'cinedl2 ' + results[i].url
      });
    }

    const sections = [{ title: "cinesubz.lk results", rows: srh }];
    const listMessage = {
      text: `_*CINESUBZ MOVIE SEARCH RESULTS 🎬*_\n\n*\`Input :\`* ${q}`,
      footer: config.FOOTER,
      title: 'cinesubz.lk results',
      buttonText: '*Reply Below Number 🔢*',
      sections
    };

    const caption = `_*CINESUBZ.LK MOVIE SEARCH RESULTS 🎬*_ \n\n*\`💃🏻Input :\`* ${q}`;

    const rowss = results.map((v) => ({
      title: v.title.replace(/Sinhala Subtitles|සිංහල උපසිරැසි සමඟ/gi, "").trim(),
      id: prefix + `cinedl2 ${v.url}`
    }));

    const listButtons = {
      title: "Choose a Movie :)",
      sections: [{ title: "Available Links", rows: rowss }]
    };

    if (config.BUTTON === "true") {
      await conn.sendMessage(from, {
        image: { url: config.LOGO },
        caption: caption,
        footer: config.FOOTER,
        buttons: [{
          buttonId: "download_list",
          buttonText: { displayText: "🎥 Select Option" },
          type: 4,
          nativeFlowInfo: { name: "single_select", paramsJson: JSON.stringify(listButtons) }
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

cmd({
    pattern: "cinedl2",	
    react: '🎥',
    desc: "movie details & download",
    filename: __filename
},
async (conn, m, mek, { from, q, prefix, reply }) => {
  try {
    if (!q || !q.startsWith('https://cinesubz.lk/movies/')) {
      return await reply('*❗ Invalid movie link.*');
    }

    const detailsRes = await fetchJson(DETAILS_API + encodeURIComponent(q));

    if (!detailsRes || !detailsRes.status || !detailsRes.downloads || detailsRes.downloads.length === 0) {
      return await reply('*No download links found ❌*');
    }

    const msg = `*🍿 𝗧ɪᴛʟᴇ ➮* _${detailsRes.title || 'N/A'}_\n\n` +
                `*📅 Year ➮* _${detailsRes.year || 'N/A'}_\n` +
                `*⭐ IMDB ➮* _${detailsRes.imdb || 'N/A'}_\n\n` +
                `*🎭 Available Qualities:*`;

    const rowss = detailsRes.downloads.map((v) => ({
      title: `${v.size || 'Unknown Size'} (${v.quality || 'Unknown'}) - ${v.type || 'Direct'}`,
      id: prefix + `nadeendl ${detailsRes.thumbnail}±${v.url}±${detailsRes.title}`
    }));

    const listButtons = {
      title: "🎬 Choose a download link:",
      sections: [{ title: "Available Links", rows: rowss }]
    };

    if (config.BUTTON === "true") {
      await conn.sendMessage(from, {
        image: { url: detailsRes.thumbnail || config.LOGO },
        caption: msg,
        footer: config.FOOTER,
        buttons: [
          {
            buttonId: "download_list",
            buttonText: { displayText: "🎥 Select Quality" },
            type: 4,
            nativeFlowInfo: { name: "single_select", paramsJson: JSON.stringify(listButtons) }
          }
        ],
        headerType: 1,
        viewOnce: true
      }, { quoted: mek });
    } else {
      var rows = detailsRes.downloads.map((v) => ({
        buttonId: prefix + `nadeendl ${detailsRes.thumbnail}±${v.url}±${detailsRes.title}`,
        buttonText: { displayText: `${v.size || 'Unknown Size'} (${v.quality || 'Unknown'}) - ${v.type || 'Direct'}` },
        type: 1
      }));

      const buttonMessage = {
        image: { url: detailsRes.thumbnail || config.LOGO },
        caption: msg,
        footer: config.FOOTER,
        buttons: rows,
        headerType: 4
      };
      await conn.buttonMessage(from, buttonMessage, mek);
    }
  } catch (e) {
    console.log(e);
    await conn.sendMessage(from, { text: '🚩 *Error !!*' }, { quoted: mek });
  }
});

cmd({
    pattern: "nadeendl",
    react: "⬇️",
    dontAddCommandList: true,
    filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
    if (!q) return await reply('*Invalid data*');

    if (isUploadingg) {
        return await conn.sendMessage(from, { text: '*A movie is already uploading. Please wait ⏳*', quoted: mek });
    }

    isUploadingg = true;
    await conn.sendMessage(from, { react: { text: '⬆️', key: mek.key } });
    const up_mg = await conn.sendMessage(from, { text: '*Fetching & uploading your movie..⬆️ Please wait*' });

    try {
        const [thumb, ztLink, title] = q.split("±");

        // Use native fetch (more stable than axios/fetchJson)
        const apiUrl = DIRECT_DL_API + encodeURIComponent(ztLink) + API_KEY;
        const response = await fetch(apiUrl);

        if (!response.ok) {
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }

        const directRes = await response.json();

        if (!directRes || !directRes.status || !directRes.data || !directRes.data.download || !Array.isArray(directRes.data.download)) {
            throw new Error("Invalid API response structure");
        }

        const downloads = directRes.data.download;

        // Filter out Telegram
        const filteredLinks = downloads.filter(dl => 
            dl.name && dl.name.toLowerCase() !== "telegram"
        );

        let finalLink = null;

        // Priority 1: Cloud (your sonic-cloud link)
        const cloudLink = filteredLinks.find(dl => dl.name && dl.name.toLowerCase() === "cloud");
        if (cloudLink && cloudLink.url) {
            finalLink = cloudLink.url;
        }

        // Priority 2: Pixeldrain
        if (!finalLink) {
            const pixLink = filteredLinks.find(dl => dl.name && dl.name.toLowerCase() === "pix");
            if (pixLink && pixLink.url) {
                const match = pixLink.url.match(/https?:\/\/pixeldrain\.com\/u\/([a-zA-Z0-9]+)/i);
                if (match && match[1]) {
                    finalLink = `https://pixeldrain.com/api/file/${match[1]}`;
                } else {
                    finalLink = pixLink.url;
                }
            }
        }

        // Last resort
        if (!finalLink && filteredLinks.length > 0) {
            finalLink = filteredLinks[0].url;
        }

        if (!finalLink) {
            throw new Error("No valid download link found");
        }

        console.log("Selected direct link:", finalLink);

        // ===== THUMBNAIL FIX =====
        // The error was here: (await fetch(thumb)).buffer() → fetch returns Response, .buffer() doesn't exist in node-fetch
        // Fix: Use .arrayBuffer() then Buffer.from()
        const thumbResponse = await fetch(thumb);
        if (!thumbResponse.ok) {
            throw new Error("Failed to fetch thumbnail");
        }
        const thumbArrayBuffer = await thumbResponse.arrayBuffer();
        const thumbBuffer = Buffer.from(thumbArrayBuffer);

        // Upload movie
        await conn.sendMessage(config.JID || from, { 
            document: { url: finalLink },
            caption: `🍕 ${title}\n\n\`${config.NAME}\`\n\n> *•DARKLEX-MD•*`,
            mimetype: "video/mp4",
            jpegThumbnail: thumbBuffer,  // Fixed: now proper Buffer
            fileName: `DARKLEX - ${title}.mp4`
        });

        await conn.sendMessage(from, { delete: up_mg.key });
        await conn.sendMessage(from, { react: { text: '☑️', key: mek.key } });

    } catch (error) {
        console.error("Upload Error:", error);
        await conn.sendMessage(from, { 
            text: "*Failed to upload movie ❌*\n\nReason: " + error.message + "\n\nTry another quality or movie.", 
            quoted: mek 
        });
    }

    isUploadingg = false;
});
