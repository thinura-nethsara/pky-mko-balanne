const { cmd } = require('../command');
const config = require('../config');
const { getNews } = require('../lib/news-first.js');

cmd({
    pattern: "sirasa",
    react: "📰",
    category: "info",
    alias: ["newsf", "newsupdate"],
    desc: "Get latest Sinhala news from NewsFirst.lk",
    use: ".news",
    filename: __filename
},
async (conn, m, mek, { from, q, prefix, reply }) => {
    try {
        // Send initial loading message
        const loading = await conn.sendMessage(from, {
            text: "📰 *Fetching latest news...*\n⏳ Please wait..."
        }, { quoted: mek });

        // Call the news scraper
        const newsData = await getNews();

        // Check if news data is valid
        if (!newsData.status || !newsData.results?.length) {
            await conn.sendMessage(from, { 
                text: "*🚩 No news found or error fetching news!*" 
            }, { quoted: mek });
            await conn.sendMessage(from, { delete: loading.key });
            return;
        }

        // Format the news message
        let newsMessage = `📰 *NEWSFIRST SINHALA NEWS*\n\n`;
        newsMessage += `👤 *Creator:* ${newsData.creator || 'Pathum Rajapakshe'}\n`;
        newsMessage += `🏢 *Team:* ${newsData.team || 'VISPER INC'}\n`;
        newsMessage += `📅 *${new Date().toLocaleString('si-LK', { timeZone: 'Asia/Colombo' })}*\n\n`;
        newsMessage += `─━─━─━─━─━─━─━─━─\n\n`;

        // Add each news item
        newsData.results.forEach((item, index) => {
            newsMessage += `*${index + 1}. ${item.title}*\n`;
            newsMessage += `🔗 ${item.link}\n`;
            if (item.image && item.image !== 'https://sinhala.newsfirst.lk/assets/default-news-image.jpg') {
                newsMessage += `🖼️ *Image:* ${item.image}\n`;
            }
            newsMessage += `\n─━─━─━─━─━─━─━─━─\n\n`;
        });

        // Add footer
        newsMessage += `\n_Use ${prefix}news to refresh_`;

        // Delete loading message
        await conn.sendMessage(from, { delete: loading.key });

        // Send as an image with caption if first item has an image
        if (newsData.results.length > 0 && newsData.results[0].image) {
            try {
                await conn.sendMessage(from, {
                    image: { url: newsData.results[0].image },
                    caption: newsMessage,
                    footer: config.FOOTER || 'Powered by VISPER INC'
                }, { quoted: mek });
            } catch (imgErr) {
                // Fallback to text if image fails
                await conn.sendMessage(from, {
                    text: newsMessage,
                    footer: config.FOOTER || 'Powered by VISPER INC'
                }, { quoted: mek });
            }
        } else {
            await conn.sendMessage(from, {
                text: newsMessage,
                footer: config.FOOTER || 'Powered by VISPER INC'
            }, { quoted: mek });
        }

        // Send reaction
        await conn.sendMessage(from, {
            react: { text: "✅", key: mek.key }
        });

    } catch (error) {
        console.error('News plugin error:', error);
        reply(`*❌ Error:* ${error.message || 'Failed to fetch news'}`);
    }
});
