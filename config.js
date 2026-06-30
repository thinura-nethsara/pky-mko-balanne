const fs = require('fs');
if (fs.existsSync('config.env')) require('dotenv').config({ path: './config.env' });
function convertToBool(text, fault = 'true') {
    return text === fault ? true : false;
}

//gg
module.exports = {
SESSION_ID:'1Ulj1DhT#EC2_nAadj2ZIU8b-sOWrOlEeMqn6j2L8cJKzuVmRZpI',

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
YT_API_BASE: 'https://mr-thinuzz-api-build.zone.id/api/ytmp4/download'

};
//GITHUB_AUTH_TdOKEN: 'ouvnI0xSDsmfWA1filVxx.SZ0vJGYkjlC5VX54U0e10',

