const fs = require('fs');
if (fs.existsSync('config.env')) {
    require('dotenv').config({ path: './config.env' });
}
function convertToBool(text, fault = 'true') {
    return text === fault;
}
module.exports = {
    SESSION_ID: 'jTBABCLa#nrravytBQaiIdEIneAF3k0UOFBAzyfqcoO-RDGXY-64',
    ANTI_DELETE: process.env.ANTI_DELETE === undefined ? 'true' : process.env.ANTI_DELETE,
    MV_BLOCK: process.env.MV_BLOCK === undefined ? 'true' : process.env.MV_BLOCK,
    ANTI_LINK: process.env.ANTI_LINK === undefined ? 'true' : process.env.ANTI_LINK,
    SEEDR_MAIL: '',
    SEEDR_PASSWORD: '',
    SUDO: '',
    DB_NAME: 'pramaaaataaaaahaaaaggaaaajjaa',
    LANG: 'SI',
    OWNER_NUMBER: '94766863255',
    TG_GROUP: 'https://t.me/+Zm865mJ_TL0yNGVl',
    
};
