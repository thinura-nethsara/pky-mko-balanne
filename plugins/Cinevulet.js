

//අසිත පොන්නයාගෙ සයිට් එක
const config = require('../config')
const fg = require('api-dylux');
const { cmd, commands } = require('../command')
const { getBuffer, getGroupAdmins, getRandom, h2k, isUrl, Json, runtime, sleep, fetchJson} = require('../lib/functions')
const axios = require('axios');
const  { Buffer } = require('buffer');
const   fetch = (..._0x1c20f7) =>
    import('node-fetch').then(({ default: _0x557a09 }) =>
      _0x557a09(..._0x1c20f7)
    ),
FormData = require('form-data'),
  fs = require('fs')
const { File } = require('megajs'); // Assuming megajs is installed and required

cmd({
    pattern: "darklex",
    react: '🔎',
    category: "movie",
    alias: ["vispet", "vispetmovie"],
    desc: "Download movies from ",
    use: ".vispetmovie <movie id or url>",
    filename: __filename
},
async (conn, m, mek, { from, q, prefix, isPre, isMe, isSudo, isOwner, reply }) => {
    try {
        // 🧩 Premium check
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

        if (config.MV_BLOCK == "true" && !isMe && !isSudo && !isOwner) {
            await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
            return await conn.sendMessage(from, { 
                text: "*This command currently only works for the Bot owner. To disable it for others, use the .settings command 👨‍🔧.*" 
            }, { quoted: mek });
        }

        if (!q) return await reply('*Please enter a movie ID (e.g., 95) or full URL from cinevault.site! 🎬*');

        let url = q;

        // 🧠 If q is numeric, construct URL
        if (/^\d+$/.test(q.trim())) {
            const paddedId = q.padStart(6, '0');
            url = `https://cinevault.site/movie/M${paddedId}`;
        } else if (!q.includes('https://cinevault.site/movie/')) {
            return await reply('*❗ Please provide a valid movie ID (numbers only) or cinevault.site movie URL!*');
        }

        // 🧠 Fetch movie info from API
        const { data: apiRes } = await axios.get(`https://asithadl.netlify.app/api/Download/functions?url=${encodeURIComponent(url)}`);

        if (!apiRes.status || !apiRes.title) {
            return await conn.sendMessage(from, { text: '*No results found or invalid URL/ID ❌*', quoted: mek });
        }

        const sadas = apiRes;

        // 🎬 Movie info caption
        const msg = `*🌾 𝗧ɪᴛʟᴇ ➮* *_${sadas.title || 'N/A'}_*

*📅 𝗬𝗲𝗮𝗿 ➮* *_${sadas.year || 'N/A'}_*
*⏰ 𝗥𝘂𝗻𝘁𝗶𝗺𝗲 ➮* *_${sadas.runtime || 'N/A'}_*

*📖 𝗗𝗲𝘀𝗰𝗿𝗶𝗽𝘁𝗶𝗼𝗻 ➮* *_${sadas.description || 'N/A'}_*
`;

        // 🧩 Create buttons
        const rows = [
            { buttonId: prefix + 'vispetdaqt ' + url, buttonText: { displayText: '💡 Send Details' }, type: 1 }
        ];

        // Add download links if available
        if (sadas.download && Object.keys(sadas.download).length > 0) {
            Object.entries(sadas.download).forEach(([quality, link]) => {
                rows.push({
                    buttonId: prefix + `vispetdl ${link}±${sadas.poster || ''}±${sadas.title}`,
                    buttonText: { displayText: `${quality}p` },
                    type: 1
                });
            });
        }

        // 🖼️ Image + Caption
        const movieImage = sadas.poster || config.LOGO;

        // ✅ BUTTON MODE ENABLED
        if (config.BUTTON === "true") {
            // Since potentially multiple qualities, but for simplicity, use buttons if few, else list
            if (rows.length <= 4) {  // Limit for buttons
                await conn.sendMessage(from, {
                    image: { url: movieImage },
                    caption: msg,
                    footer: config.FOOTER,
                    buttons: rows,
                    headerType: 4
                }, { quoted: mek });
            } else {
                // Use list for many options
                const listRows = rows.slice(1).map(r => ({  // Skip first if details
                    title: r.buttonText.displayText,
                    id: r.buttonId
                }));

                const listButtons = {
                    title: "🎬 Choose a download link :)",
                    sections: [{ title: "Available Download Links", rows: listRows }]
                };

                await conn.sendMessage(from, {
                    image: { url: movieImage },
                    caption: msg + `\n*Select download option below:*`,
                    footer: config.FOOTER,
                    buttons: [
                        { buttonId: prefix + 'vispetdaqt ' + url, buttonText: { displayText: "Details" }, type: 1 },
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
                    headerType: 4,
                    viewOnce: true
                }, { quoted: mek });
            }
        } else {
            // NORMAL MODE - send with buttons
            await conn.sendMessage(from, {
                image: { url: movieImage },
                caption: msg,
                footer: config.FOOTER,
                buttons: rows,
                headerType: 4
            }, { quoted: mek });
        }

    } catch (e) {
        console.error("🔥 darklexMovie Error:", e);
        reply('🚫 *Error Occurred !!*\n\n' + e.message);
    }
});

let isVispetUploading = false; // Track upload status for vispet

cmd({
    pattern: "vispetdl",
    react: "⬇️",
    dontAddCommandList: true,
    filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
    if (isVispetUploading) {
        return await conn.sendMessage(from, { 
            text: '*A movie is already being uploaded. Please wait until it finishes.* ⏳', 
            quoted: mek 
        });
    }

    try {
        //===================================================
        const [link, imglink, title] = q.split("±");
        if (!link || !title) return await reply("⚠️ Invalid format. Use:\n`vispetdl link±img±title`");
        //===================================================

        isVispetUploading = true; // lock start

        //===================================================
        const botimg = imglink ? imglink.trim() : '';
        // Send "uploading..." msg without blocking
        conn.sendMessage(from, { text: '*Uploading your movie.. ⬆️*', quoted: mek });

        let sentMessage;
        let fileName;
        let mimetype = "video/mp4"; // Default for movies

        if (link.includes('mega.nz')) {
            // Mega logic
            const file = File.fromURL(link);
            await file.loadAttributes();

            const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
            if (file.size > config.MAX_SIZE * 1024 * 1024) {
                throw new Error(`File too large! Size: ${fileSizeMB} MB, Limit: ${config.MAX_SIZE} MB`);
            }

            await reply(`⬇️ Downloading movie...`);

            const data = await streamToBuffer(file.download());

            // Detect mimetype
            const ext = file.name.split('.').pop().toLowerCase();
            const mimeTypes = {
                mp4: "video/mp4",
                pdf: "application/pdf",
                zip: "application/zip",
                rar: "application/x-rar-compressed",
                '7z': "application/x-7z-compressed",
                jpg: "image/jpeg",
                jpeg: "image/jpeg",
                png: "image/png",
                mp3: "audio/mpeg",
                txt: "text/plain"
            };
            mimetype = mimeTypes[ext] || "application/octet-stream";
            fileName = file.name;

            sentMessage = await conn.sendMessage(config.JID || from, { 
                document: data,
                caption: `🎬 ${title}\n\n${config.NAME}\n\n${config.FOOTER}`,
                mimetype,
                fileName: `🎬DARKLEX-MD🎬${fileName}`
            }, { quoted: mek });

        } else if (link.includes('drive.google.com') || link.includes('drive.usercontent.google.com')) {
            // GDrive logic
            let processedUrl = link.replace('https://drive.usercontent.google.com/download?id=', 'https://drive.google.com/file/d/').replace('&export=download', '/view');
            let res = await fg.GDriveDl(processedUrl);
            
            fileName = res.fileName;
            mimetype = res.mimetype;

            reply(`*⬇️ Downloading movie...*`);

            sentMessage = await conn.sendMessage(config.JID || from, { 
                document: { url: res.downloadUrl }, 
                fileName: `🎬DARKLEX-MD🎬${res.fileName}`, 
                mimetype: res.mimetype, 
                caption: `${title}\n\n${config.NAME}\n\n${config.FOOTER}`
            }, { quoted: mek });

        } else if (link.includes('pixeldrain.com')) {
            // Pixeldrain logic
            const da = link.split("https://pixeldrain.com/u/")[1];
            if (!da) throw new Error("Couldn’t extract Pixeldrain file ID.");

            // Get file info for name
            const infoRes = await axios.get(`https://pixeldrain.com/api/file/${da}/info`);
            fileName = infoRes.data.name || `${title}.mp4`;

            const fhd = `https://pixeldrain.com/api/file/${da}`;

            // Optional: Get size from info
            const fileSizeMB = (infoRes.data.size / (1024 * 1024)).toFixed(2);
            if (infoRes.data.size > config.MAX_SIZE * 1024 * 1024) {
                throw new Error(`File too large! Size: ${fileSizeMB} MB, Limit: ${config.MAX_SIZE} MB`);
            }

            await reply(`⬇️ Downloading movie...`);

            sentMessage = await conn.sendMessage(config.JID || from, { 
                document: { url: fhd },
                caption: `🎬 ${title}\n\n${config.NAME}\n\n${config.FOOTER}`,
                mimetype,
                fileName: `🎬DARKLEX-MD🎬${fileName}`
            }, { quoted: mek });

        } else {
            throw new Error("Unsupported download link. Only Mega.nz, Google Drive, and Pixeldrain are supported.");
        }
        
        await conn.sendMessage(from, { react: { text: '✔️', key: mek.key } });
        await conn.sendMessage(from, { text: `*Movie sent successfully ✔*`, quoted: mek });

    } catch (e) {
        reply('🚫 *Error Occurred !!*\n\n' + e.message);
        console.error("vispetdl error:", e);
    } finally {
        isVispetUploading = false; // reset lock always
    }
});

cmd({
    pattern: "vispetdaqt",
    alias: ["vispetmdv"],
    use: '.vispetmovie <url>',
    react: "🎥",
    desc: "Send full movie details from cinevault.site",
    filename: __filename
},
async (conn, mek, m, { from, q, prefix, reply }) => {
    try {
        if (!q) return reply('🚩 *Please give me a valid movie URL!*');

        // If q is numeric, construct URL
        let fullUrl = q;
        if (/^\d+$/.test(q.trim())) {
            const paddedId = q.padStart(6, '0');
            fullUrl = `https://cinevault.site/movie/M${paddedId}`;
        }

        // ✅ Fetch movie info from API
        const { data } = await axios.get(`https://asithadl.netlify.app/api/Download/functions?url=${encodeURIComponent(fullUrl)}`);
        
        if (!data.status || !data.title) {
            return await reply('*🚫 No details found for this movie!*');
        }

        const sadas = data;

        // ✅ Fetch extra details (for footer / channel link) - reuse from existing
        const details = (await axios.get('https://mv-visper-full-db.pages.dev/Main/main_var.json')).data;

        // 🧾 Caption Template
        const msg = `*🍿 𝗧ɪᴛʟᴇ ➮* *_${sadas.title || 'N/A'}_*

*📅 𝗬𝗲𝗮𝗿 ➮ _${sadas.year || 'N/A'}_*
*⏰ 𝗥𝘂𝗻𝘁𝗶𝗺𝗲 ➮ _${sadas.runtime || 'N/A'}_*

*📖 𝗗𝗲𝘀𝗰𝗿𝗶𝗽𝘁𝗶𝗼𝗻 ➮ _${sadas.description || 'N/A'}_*

> 🌟 *Follow us :* ${details.chlink || 'N/A'}
`;

        // ✅ Send movie info message
        await conn.sendMessage(
            config.JID || from,
            {
                image: { url: sadas.poster || config.LOGO },
                caption: msg,
                footer: config.FOOTER || "DARKLEX-MD🎬",
            },
            { quoted: mek }
        );

        // ✅ React confirmation
        await conn.sendMessage(from, { react: { text: '✔️', key: mek.key } });

    } catch (error) {
        console.error('Error fetching or sending:', error);
        await conn.sendMessage(from, { text: `🚫 *Error Occurred While Fetching Movie Data!* \n\n${error.message}` }, { quoted: mek });
    }
});

// Helper function for stream to buffer (add this if not exists)
function streamToBuffer(stream) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        stream.on('data', chunk => chunks.push(chunk));
        stream.on('end', () => resolve(Buffer.concat(chunks)));
        stream.on('error', reject);
    });
}

function ytreg(url) {
    const ytIdRegex = /(?:http(?:s|):\/\/|)(?:(?:www\.|)youtube(?:\-nocookie|)\.com\/(?:watch\?.*(?:|\&)v=|embed|shorts\/|v\/)|youtu\.be\/)([-_0-9A-Za-z]{11})/
    return ytIdRegex.test(url);
  }
