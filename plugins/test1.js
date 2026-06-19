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
    pattern: "kwik",
    react: "🍿",
    alias: ["kdl", "kwikdl"],
    desc: "Kwik.cx වීඩියෝ 403 error එකක් නැතිව download කරයි.",
    category: "download",
    use: ".kwik <link>",
    filename: __filename
},
async (conn, mek, m, { from, q, reply }) => {
    try {
        if (!q) return await reply("⚠️ කරුණාකර Kwik link එකක් ලබා දෙන්න!");

        await reply("⏳ *VISPER-MD bypass system activating...*");

        // 1. Headers සකස් කිරීම (403 එක නවත්වන්න මේක අනිවාර්යයි)
        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'Referer': 'https://kwik.cx/',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1'
        };

        // 2. Page එක Fetch කිරීම
        const response = await axios.get(q, { headers });
        const html = response.data;

        // 3. Packed Script එක ඇතුළෙන් URL එක ගැලවීම
        // Kwik සයිට් එකේ 'eval(function(p,a,c,k,e,d)...' කියන script එක ඇතුළේ mp4 ලින්ක් එක තියෙනවා.
        const regex = /https?:\/\/[^"']+\.mp4/g;
        const links = html.match(regex);

        if (!links || links.length === 0) {
            return await reply("❌ වීඩියෝ ලින්ක් එක සොයාගැනීමට නොහැකි වුණා. Link එක පරීක්ෂා කරන්න.");
        }

        // සාමාන්‍යයෙන් මුලින්ම තියෙන ලින්ක් එක තමයි වැඩ කරන්නේ
        const directUrl = links[0];

        await reply(`✅ වීඩියෝව හමු විය! දැන් WhatsApp වෙත එවමින් පවතී...`);

        // 4. FFmpeg අවශ්‍ය නැතිවම Baileys හරහා කෙලින්ම යැවීම
        // මෙතනදී headers: headers කොටස දාන්න අමතක කරන්න එපා.
        await conn.sendMessage(
            from,
            {
                video: { url: directUrl },
                mimetype: 'video/mp4',
                caption: `🎥 *Kwik Downloader*\n\n*Source:* ${q}\n\n*VISPER-MD VERSION 6.0.0*`,
                fileName: `visper-video.mp4`,
                header: headers // Download වෙද්දී පාවිච්චි කරන්න
            },
            { quoted: mek }
        );

        await conn.sendMessage(from, { react: { text: "✔️", key: mek.key } });

    } catch (e) {
        console.error(e);
        // 403 ආවොත් ඒක මෙතනින් පෙන්නයි
        await reply(`❌ දෝෂයක් සිදු විය: ${e.response?.status === 403 ? "Kwik සයිට් එකෙන් Bot එක Block කරා (403 Forbidden)." : e.message}`);
    }
});
