const config = require('../config');
const { cmd } = require('../command');
const axios = require('axios');

// WORKING API KEY
const key = "cd0d0874c61d4a80";

let isUploading = false;

/* ---------------------------------------------------------
   1. TV SHOW SEARCH  (CineSubz)
--------------------------------------------------------- */
cmd({
  pattern: "ctv1",
  react: '🔎',
  category: "movie",
  desc: "Search TV Shows",
  filename: __filename
},
async (conn, m, mek, { from, q, prefix, reply }) => {

  if (!q) return reply("*❗ Enter TV show name*");

  const url = `https://tharuzz-movie-api.vercel.app/api/cinesub/search?query=${encodeURIComponent(q)}`;
  const data = (await axios.get(url)).data;

  if (!data.success) return reply("*❌ No results found!*");

  const shows = data.result.filter(x => x.type === "tvshows");
  if (shows.length === 0) return reply("*❌ No TV shows found!*");

  let rows = shows.map(v => ({
    title: v.title.replace(/Sinhala Subtitles/gi, "").trim(),
    id: `${prefix}tvinfo ${v.link}±${v.image}±${v.title}`
  }));

  await conn.sendMessage(from, {
    image: { url: config.LOGO },
    caption: `*📺 Results for:* ${q}`,
    footer: config.FOOTER,
    buttons: [{
      buttonId: "download_list",
      buttonText: { displayText: "📺 Select Show" },
      type: 4,
      nativeFlowInfo: {
        name: "single_select",
        paramsJson: JSON.stringify({
          title: "📺 TV Shows",
          sections: [{ title: "Cinesubz Results", rows }]
        })
      }
    }]
  }, { quoted: mek });
});


/* ---------------------------------------------------------
   2. TV SHOW DETAILS + EPISODE LIST
--------------------------------------------------------- */
cmd({
  pattern: "tvinfo",
  react: "📺",
  desc: "TV show details",
  filename: __filename
},
async (conn, m, mek, { from, q, prefix, reply }) => {

  const [url, img, title] = q.split("±");

  const api = `https://episodes-cine.vercel.app/api/details?url=${encodeURIComponent(url)}`;
  const d = (await axios.get(api)).data;

  if (!d.status) return reply("*❌ Failed to load TV details!*");

  const episodes = d.result.seasons?.[0]?.episodes || [];
  if (episodes.length === 0) return reply("*No episodes found!*");

  let rows = episodes.map(ep => ({
    title: ep.title,
    id: `${prefix}tvepinfo ${ep.url}±${img}±${title}±${ep.title}`
  }));

  await conn.sendMessage(from, {
    image: { url: img },
    caption: `*📺 ${d.result.title}*\n\n*Episodes:* ${episodes.length}`,
    footer: config.FOOTER,
    buttons: [{
      buttonId: "download_list",
      buttonText: { displayText: "🎬 Select Episode" },
      type: 4,
      nativeFlowInfo: {
        name: "single_select",
        paramsJson: JSON.stringify({
          title: "Episodes",
          sections: [{ title: "TV Episodes", rows }]
        })
      }
    }]
  }, { quoted: mek });
});


// -------------------------------
// TV EPISODE INFO EXTRACTOR (FIXED 401 ERROR)
// -------------------------------
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
      const res = await axios.get(infoAPI, {
        timeout: 15000,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
          "Accept": "application/json",
          "Referer": "https://cinesubz.lk/",
          "Origin": "https://cinesubz.lk"
        }
      });
      data = res.data;
    } catch (apiErr) {
      return await reply("*⚠️ Episode info API blocked or unreachable (401 Unauthorized)*\n*Headers fixed, try again!*");
    }

    if (!data || !data.status || !data.result?.downloadLinks?.length) {
      return await reply("*❌ No download links found!*");
    }

    const d = data.result;

    let msg = `*_📺 Episode ➽ ${epTitle || d.title}_*\n\n*🎬 Available Qualities:*\n`;
    let rows = [];

    d.downloadLinks.forEach(dl => {
      const ql = dl.quality;
      const size = dl.size ? ` (${dl.size})` : '';

      msg += `• *${ql}${size}*\n`;

      rows.push({
        title: `${ql}${size}`,
        id: prefix + "tvdownload " + encodeURIComponent(dl.link) + "±" + img + "±" + title + "±" + epTitle + "±" + ql
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
      image: { url: d.poster || img },
      caption: msg + `\n_Select a quality to convert → direct download_`,
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

/* ---------------------------------------------------------
   4. CONVERT LINK → DIRECT DOWNLOAD (PixelDrain / Cloud)
--------------------------------------------------------- */
cmd({
  pattern: "tvdl",
  react: "⬇️",
  desc: "Direct download TV episode",
  filename: __filename
},
async (conn, m, mek, { from, q, reply }) => {

  const [dlUrl, img, title, epTitle, quality] = q.split("±");
  const link = decodeURIComponent(dlUrl);

  const api = `https://api-dark-shan-yt.koyeb.app/movie/cinesubz-download?url=${encodeURIComponent(link)}&apikey=${key}`;

  const d = (await axios.get(api)).data;

  if (!d.success || d.data.download.length === 0)
    return reply("❌ *Download failed — No links found!*");

  if (isUploading) return reply("*Please wait, uploading another file…*");
  isUploading = true;

  await conn.sendMessage(from, { react: { text: "⬆️", key: mek.key } });

  for (const x of d.data.download) {
    let direct = x.url;
    const host = x.name || "Cloud";

    if (/pixel/i.test(host)) direct += "?download";
    if (/gdrive|google/i.test(host))
      direct = direct.replace("/file/d/", "/uc?id=").replace("/open?", "/uc?export=download&");

    await conn.sendMessage(from, {
      document: { url: direct },
      fileName: `${title} - ${epTitle} [${quality}] [${host}].mp4`,
      mimetype: "video/mp4",
      caption: `📥 *${title}*\n🎬 ${epTitle}\n⭐ ${quality}\n☁ Host: ${host}`
    }, { quoted: mek });
  }

  await conn.sendMessage(from, { text: "✅ *Download Ready!* 🚀" });

  isUploading = false;
});
