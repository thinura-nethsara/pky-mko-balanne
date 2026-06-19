const { cmd, commands } = require('../command');
const { downloadContentFromMessage, generateWAMessageContent, generateWAMessageFromContent } = require('@whiskeysockets/baileys');
const crypto = require('crypto');
const config = require('../config');

cmd({
    pattern: "gs",
    alias: ["gstatus", "statusgroup"],
    desc: "Post a group status to specific JID(s)",
    category: "group",
    use: ".gs [jid] [text] or reply to media",
    filename: __filename
},
async (conn, mek, m, { from, quoted, q, reply }) => {
    try {
        await conn.sendMessage(from, { react: { text: '📸', key: mek.key } });

        let statusContent = {};
        let backgroundColor = null;
        let isMedia = false;
        let targetJids = [];
        let textContent = q?.trim() || '';

       
        const args = textContent.split(' ');
        if (args[0] && (args[0].includes('@g.us') || args[0].includes('@s.whatsapp.net'))) {
            
            targetJids = args[0].split(',').map(v => v.trim()); 
            textContent = args.slice(1).join(' ').trim(); 
        }

        
        const colorRegex = /^#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})\s+/i;
        const colorMatch = textContent.match(colorRegex);
        if (colorMatch) {
            backgroundColor = colorMatch[0].trim();
            textContent = textContent.slice(colorMatch[0].length).trim();
        }

        
        if (quoted) {
            const quotedType = quoted.mtype || quoted.type;
            const mediaTypes = ['imageMessage', 'videoMessage', 'audioMessage', 'documentMessage'];

            if (mediaTypes.includes(quotedType)) {
                isMedia = true;
                try {
                    const messageType = quotedType.replace('Message', '');
                    const stream = await downloadContentFromMessage(quoted.msg || quoted, messageType);
                    let buffer = Buffer.from([]);
                    for await (const chunk of stream) {
                        buffer = Buffer.concat([buffer, chunk]);
                    }

                    if (quotedType === 'imageMessage') {
                        statusContent = { image: buffer, caption: textContent || undefined };
                    }
                    else if (quotedType === 'videoMessage') {
                        statusContent = { video: buffer, caption: textContent || undefined };
                    }
                    else if (quotedType === 'audioMessage') {
                        statusContent = {
                            audio: buffer,
                            mimetype: quoted.msg?.mimetype || 'audio/ogg; codecs=opus',
                            ptt: quoted.msg?.ptt || false
                        };
                    }
                } catch (e) {
                    console.error("Media download failed:", e);
                    return reply("❌ Media එක download කිරීම අසාර්ථකයි.");
                }
            } else {
               
                if (!textContent) textContent = quoted.msg?.text || quoted.text || "";
            }
        }

     
        if (!isMedia) {
            if (!textContent) {
                return reply("📌 USE: \n.gs [jid] [text]\n.gs [jid] #color [text]\nනැතහොත් image එකකට reply කරන්න.");
            }
            statusContent = { text: textContent };
        }

     
        if (targetJids.length === 0) {
            targetJids = config.JID ? [config.JID] : [from];
        }

     
    async function sendGroupStatus(jid, content, bgColor) {
            
            const msgContent = await generateWAMessageContent(content, {
                upload: conn.waUploadToServer
            });

            const messageSecret = crypto.randomBytes(32);

            const statusMsg = generateWAMessageFromContent(jid, {
                messageContextInfo: { messageSecret },
                groupStatusMessageV2: {
                    message: {
                        ...msgContent,
                        messageContextInfo: { messageSecret }
                    },
                    backgroundColor: bgColor || undefined
                }
            }, {});

            await conn.relayMessage(jid, statusMsg.message, {
                messageId: statusMsg.key.id
            });
        }

        let successCount = 0;
        await reply(`⏳ Chat ${targetJids.length} කට status යවමින් පවතියි...`);

        for (const jid of targetJids) {
            try {
                await sendGroupStatus(jid.trim(), statusContent, backgroundColor);
                successCount++;
            } catch (err) {
                console.error(`Error sending to ${jid}:`, err);
            }
        }

        
        let resMsg = `✅ *Status Update Completed!*\n\n` +
                     `• Count: ${successCount}\n` +
                     `• Type: ${isMedia ? 'Media' : 'Text'}\n`;
        if (backgroundColor) resMsg += `• වර්ණය: ${backgroundColor}\n`;
        
        await reply(resMsg);

    } catch (err) {
        console.error("MAIN ERROR:", err);
        await reply(`❌ ERROR: ${err.message}`);
    }
});
