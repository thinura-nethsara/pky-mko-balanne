const fs = require('fs');
if (fs.existsSync('config.env')) require('dotenv').config({ path: './config.env' });
function convertToBool(text, fault = 'true') {
    return text === fault ? true : false;
}

//gg
module.exports = {
SESSION_ID:'4VkRWZoa#gAp1J4whlwNPX3jK7UoDweYGvOyy7i6AwATpR-EKi84',

ANTI_DELETE: process.env.ANTI_DELETE === undefined ? 'true' : process.env.ANTI_DELETE, 
MV_BLOCK: process.env. MV_BLOCK === undefined ? 'true' : process.env. MV_BLOCK,    
ANTI_LINK: process.env.ANTI_LINK === undefined ? 'true' : process.env.ANTI_LINK, 
SEEDR_MAIL: '',
SEEDR_PASSWORD: '',
SUDO: '',//
DB_NAME: 'pramaaaataaaaahaaaaggaaaajjaa',
LANG: 'SI',
OWNER_NUMBER: '94758260318',
TG_GROUP: 'https://t.me/+Zm865mJ_TL0yNGVl',
YT_API_KEY: 'key_4797e0dcedd66cca',
YT_API_BASE: 'https://mr-thinuzz-api-build.zone.id/api/ytmp4/download',
CINESUBZ_API_KEY: 'key_13be1374312cdd0a',
CINESUBZ_BASE_URL: 'https://mr-thinuzz-api-build.vercel.app/api/cinesubz'


