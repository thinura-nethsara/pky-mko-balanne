
const config = require('../config'),
  { cmd, commands } = require('../command'),
  axios = require('axios'),
  {
    fetchJson,
  } = require('../lib/functions');

// Working API key
const key = "82406ca340409d44";

let isUploading = false;

// -------------------------------
// CINESUBZ TV SHOWS SEARCH
// -------------------------------
cmd({
  pattern: "ctv",
  react: '🔎',
  category: "movie",
  alias: ["tvsearch"],
  desc: "Search TV Shows on cinesubz.lk",
  use: ".ctv breaking bad",
  filename: __filename
},
async (conn, m, mek, { from, q, prefix, reply }) => {
  try {
    if (!q) return await reply("*❗ Please give a TV show name*");

    const searchAPI = `https://tharuzz-movie-api.vercel.app/api/cinesub/search?query=${encodeURIComponent(q)}`;
    const data = (await axios.get(searchAPI)).data;

    if (!data || !data.success || !data.result || data.result.length === 0) {
      return await reply("*❌ No TV shows found!*");
    }

    const tvShows = data.result.filter(item => item.type === "tvshows");

    if (tvShows.length === 0) {
      return await reply("*❌ No TV shows found for this query!*");
    }

    let rows = [];
    tvShows.forEach((show) => {
      rows.push({
        title: show.title.replace(/Sinhala Subtitles|සිංහල උපසිරැසි සමඟ/gi, "").trim(),
        id: prefix + "tvdetails " + show.link + "±" + show.image + "±" + show.title
      });
    });

    const listButtons = {
      title: "📺 Choose a TV Show",
      sections: [{
        title: "Cinesubz TV Results",
        rows
      }]
    };

    await conn.sendMessage(from, {
      image: { url: config.LOGO },
      caption: `_*CINESUBZ TV SHOW SEARCH RESULTS 📺*_\n\n*Input:* ${q}\n*Found:* ${tvShows.length} shows`,
      footer: config.FOOTER,
      buttons: [{
        buttonId: "download_list",
        buttonText: { displayText: "📺 Select Show" },
        type: 4,
        nativeFlowInfo: {
          name: "single_select",
          paramsJson: JSON.stringify(listButtons)
        }
      }],
      headerType: 1
    }, { quoted: mek });

  } catch (e) {
    console.log(e);
    reply("*Error ❗*");
  }
});

// -------------------------------
// TV SHOW DETAILS + EPISODES
// -------------------------------
cmd({
  pattern: "tvdetails",
  react: "📺",
  desc: "Show TV series info and episodes",
  filename: __filename
},
async (conn, m, mek, { from, q, prefix, reply }) => {
  try {
    if (!q) return await reply("*Invalid data*");

    const [url, img, title] = q.split("±");

    const detailsAPI = `https://episodes-cine.vercel.app/api/details?url=${encodeURIComponent(url)}`;
    const data = (await axios.get(detailsAPI)).data;

    if (!data || !data.status || !data.result) {
      return await reply("*❌ Failed to fetch TV show details*");
    }

    const d = data.result;

    let msg = `*_▫️️📺 TV Show ➽ ${d.title || title}_*\n\n` +
              `*_▫️️📅 Year ➽ ${d.year || 'N/A'}_*\n` +
              `*_▫️️⭐ IMDB ➽ ${d.imdb || 'N/A'}_*\n` +
              `*_▫️️🌍 Country ➽ ${d.country || 'N/A'}_*\n` +
              `*_▫️️🎭 Genres ➽ ${d.genres?.join(', ') || 'N/A'}_*\n\n` +
              `*🎬 Available Episodes:*`;

    let rows = [];
    const episodes = d.seasons?.[0]?.episodes || [];
    if (episodes.length === 0) {
      return await reply("*No episodes found for this series*");
    }

    episodes.forEach((ep) => {
      rows.push({
        title: ep.title || `Episode ${ep.episode}`,
        id: prefix + "tvep " + ep.url + "±" + img + "±" + title + "±" + (ep.title || `Episode ${ep.episode}`)
      });
    });

    rows.unshift({
      title: "Details Card 📝",
      id: prefix + "tvcard " + url + "±" + img + "±" + title
    });

    const listButtons = {
      title: "Choose Episode",
      sections: [{
        title: "Episodes List",
        rows
      }]
    };

    await conn.sendMessage(from, {
      image: { url: img || config.LOGO },
      caption: msg,
      footer: config.FOOTER,
      buttons: [{
        buttonId: "download_list",
        buttonText: { displayText: "📺 Select Episode" },
        type: 4,
        nativeFlowInfo: {
          name: "single_select",
          paramsJson: JSON.stringify(listButtons)
        }
      }],
      headerType: 1
    }, { quoted: mek });

  } catch (e) {
    console.log(e);
    reply("*Error fetching episodes ❗*");
  }
});



cmd({
  pattern: "tvep",
  react: "🎥",
  desc: "Get episode download qualities from working API",
  filename: __filename
},
async (conn, m, mek, { from, q, prefix, reply }) => {
  try {
    if (!q) return await reply("*Invalid data*");

    const [epUrl, img, title, epTitle] = q.split("±");

    const infoAPI = `https://cinetv-23ozhysvh-poorna-bots-projects.vercel.app/api/info?url=${encodeURIComponent(epUrl)}`;
    
    let data;
    try {
      const res = await axios.get(infoAPI, { timeout: 10000 });
      data = res.data;
    } catch (apiErr) {
      return await reply("*⚠️ Episode info API is currently unreachable/down*\n*Using fallback common qualities instead*");
    }

    if (!data || !data.status || !data.result || !data.result.downloadLinks || data.result.downloadLinks.length === 0) {
      return await reply("*❌ No download links found for this episode!*");
    }

    const d = data.result;

    let msg = `*_📺 Episode ➽ ${epTitle || d.title || 'Unknown'}_*\n\n` +
              `*🎬 Available Qualities:*\n\n`;

    let rows = [];
    d.downloadLinks.forEach((dl) => {
      const quality = dl.quality;
      const size = dl.size ? ` (${dl.size})` : '';
      msg += `• *${quality}${size}*\n`;

      // Pass the internal download link (the one starting with /api-...)
      rows.push({
        title: `${quality}${size}`,
        id: prefix + "tvdownload " + encodeURIComponent(dl.link) + "±" + img + "±" + title + "±" + epTitle + "±" + quality
      });
    });

    const listButtons = {
      title: "Choose Quality",
      sections: [{
        title: "Download Qualities",
        rows
      }]
    };

    await conn.sendMessage(from, {
      image: { url: d.poster || img || config.LOGO },
      caption: msg + `\n*Select a quality → Bot will try to extract direct links*`,
      footer: config.FOOTER,
      buttons: [{
        buttonId: "download_list",
        buttonText: { displayText: "📥 Select Quality" },
        type: 4,
        nativeFlowInfo: {
          name: "single_select",
          paramsJson: JSON.stringify(listButtons)
        }
      }],
      headerType: 1
    }, { quoted: mek });

  } catch (e) {
    console.log(e);
    reply("*Error ❗*");
  }
});

// -------------------------------
// TV EPISODE DIRECT DOWNLOAD (UPDATED FOR CURRENT EXTRACTOR STATUS)
// -------------------------------
cmd({
  pattern: "tvdownload",
  react: "⬇️",
  desc: "Try to extract direct download links",
  filename: __filename
},
async (conn, m, mek, { from, q, reply }) => {
  try {
    if (!q) return await reply("*Invalid data*");

    const [dlUrlEncoded, img, title, epTitle, quality] = q.split("±");
    const dlUrl = decodeURIComponent(dlUrlEncoded);

    const downloadAPI = `https://api-dark-shan-yt.koyeb.app/movie/cinesubz-download?url=${encodeURIComponent(dlUrl)}&apikey=${key}`;
    
    let data;
    try {
      const res = await axios.get(downloadAPI, { timeout: 15000 });
      data = res.data;
    } catch (apiErr) {
      return await reply("*⚠️ Download extractor API is currently down or unreachable*\n*Try again later or use higher quality.*");
    }

    if (!data || !data.success || !data.data || !data.data.download || data.data.download.length === 0) {
      return await reply(`*❌ No direct links found for ${quality}!*\n_Possible reasons:_\n• Extractor API changed/limited\n• Key invalid\n• Links expired\n\n_Try another quality or check later._`);
    }

    const info = data.data;
    const fileNameBase = `${title.trim()} - ${epTitle.trim()} [${quality}]`;

    if (isUploading) return await reply("*Please wait, processing another file...*");

    isUploading = true;
    await conn.sendMessage(from, { react: { text: "⬆️", key: mek.key } });

    let sentCount = 0;
    for (const linkObj of info.download) {
      let directLink = linkObj.url || linkObj.link;
      let host = (linkObj.name || linkObj.host || 'Cloud').toUpperCase();

      // Fix common hosts for direct download
      if (host.includes("PIXEL") || host.includes("PIX")) directLink += (directLink.includes("?") ? "&" : "?") + "download";
      if (host.includes("GDRIVE") || host.includes("GOOGLE")) directLink = directLink.replace("/file/d/", "/uc?id=").replace("/open?", "/uc?export=download&");

      let fileName = `${fileNameBase} [${host}].mp4`;

      await conn.sendMessage(from, {
        document: { url: directLink },
        fileName: fileName,
        mimetype: "video/mp4",
        caption: `*_📥 Direct Download - ${host}_*\n\n*📺 ${title}*\n*🎬 ${epTitle}*\n*⭐ Quality: ${quality}*\n*📏 Size: ${info.size || 'Unknown'}*\n\n_Powered by Cinesubz_`
      }, { quoted: mek });

      sentCount++;
    }

    await conn.sendMessage(from, {
      text: `*_✅ ${sentCount} direct link(s) sent for ${quality}!_*\n_Save fast – links can expire!_ 🚀`
    }, { quoted: mek });

    await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });
    isUploading = false;

  } catch (e) {
    console.log(e);
    isUploading = false;
    reply("*Error extracting links ❗*\n_Current extractor APIs are unstable/down._");
  }
});
        
