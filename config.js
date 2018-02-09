// Bot settings
var botSettings = {
    options: {
        debug: false
    },
    connection: {
        reconnect: true
    },
    identity: {
        username: '',
        password: ''
    },
    channels: []
};

// DB settings
const dbSettings = {
    host: 'localhost',
    name: '1xbot'
};

// Server settings
const serverSettings = {
    clientID: '',
    log: ['info', 'error'],
    port: 80,
    redirectUri: ''
};

module.exports = {
    botSettings,
    dbSettings,
    serverSettings
};