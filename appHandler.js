const twitch = require('tmi.js');

const api = require('./api.js');
const config = require('./config.js');
const functions = require('./functions.js');
const language = require('./language.json');

global.client;
global.channels = {};

(async () => {
    var dbChannels = await api.getChannels();
    dbChannels.forEach((channel) => {
        global.channels[channel.name] = channel;
        global.channels[channel.name]['commands'] = {};
        config.botSettings.channels.push(channel.name);
    });

    functions.log('info', 'Loaded channel list');

    var dbCommands = await api.getCommands();
    dbCommands.forEach((command) => {
        global.channels[command.channel]['commands'][command.name] = command;
    });

    functions.log('info', 'Loaded command list');

    global.client = new twitch.client(config.botSettings);
    global.client.connect();

    global.client.on('subgift', function (channel, username, recipient, method) {
        !global.channels[channel]['subscriptionGift'].trim() || global.client.say(channel, global.channels[channel]['subscriptionGift'].split('%username%').join(recipient).split('%gifter%').join(username));
    });

    global.client.on('subscription', function (channel, username, method) {
        !global.channels[channel]['subscription'].trim() || global.client.say(channel, global.channels[channel]['subscription'].split('%username%').join(username));
    });

    global.client.on('resub', function (channel, username, months, message) {
        !global.channels[channel]['resubscription'].trim() || global.client.say(channel, global.channels[channel]['resubscription'].split('%username%').join(username).split('%months%').join(months));
    });

    global.client.on('chat', async (channel, user, message, self) => {
        if (self) return;

        var handleMessage = true;
        var split = message.split(' ');
        var userPermission = api.getPrivilege(user);

        if (userPermission < 2) {
            var banWords = global.channels[channel]['banWords'].split(',');
            var toWords = global.channels[channel]['timeoutWords'].split(',');
            split.forEach((userWord) => {
                if (handleMessage) {
                    banWords.forEach((banWord) => {
                        if (handleMessage && userWord.toLowerCase() === banWord.toLowerCase()) {
                            handleMessage = false;
                            global.client.ban(channel, user.username, language[global.channels[channel]['language']]['restricted-word']);
                        }
                    });

                    toWords.forEach((toWord) => {
                        if (handleMessage && userWord.toLowerCase() === toWord.toLowerCase()) {
                            handleMessage = false;
                            global.client.timeout(channel, user.username, 60, language[global.channels[channel]['language']]['restricted-word']);
                        }
                    });
                }
            });

            if (handleMessage && (global.channels[channel]['subDomainCheck'] || global.channels[channel]['nonSubDomainCheck'])) {
                var subAllowedDomains = global.channels[channel]['subAllowedDomains'].split(',');
                var nonSubAllowedDomains = global.channels[channel]['nonSubAllowedDomains'].split(',');
                var caughtWebsites = message.toLowerCase().match(/(https?:\/\/)?(([a-zA-Z0-9-]*)\.){0,}([a-zA-Z0-9-]*)\.([a-zA-Z]*).*?/g);
                caughtWebsites === null || caughtWebsites.forEach((site) => {
                    if (handleMessage) {
                        site.indexOf('http://') !== 0 || (site = site.replace('http://', ''));
                        site.indexOf('https://') !== 0 || (site = site.replace('https://', ''));
                        site.indexOf('www.') !== 0 || (site = site.replace('www.', ''));
                        
                        var allowedDomain = false;
                        if (userPermission === 1) {
                            subAllowedDomains.forEach((domain) => {
                                domain !== site || (allowedDomain = true);
                            });
                            allowedDomain || (handleMessage = false);
                        } else {
                            nonSubAllowedDomains.forEach((domain) => {
                                domain !== site || (allowedDomain = true);
                            });
                            allowedDomain || (handleMessage = false);
                        }
                    }
                });

                handleMessage || global.client.timeout(channel, user.username, 60, language[global.channels[channel]['language']]['restricted-domain']);
            }
        }

        if (handleMessage && global.channels[channel]['commands'][split[0]] && !api.checkCooldown(user, global.channels[channel]['commands'][split[0]]) && api.getPrivilege(user) >= global.channels[channel]['commands'][split[0]].permission) {
            var time = new Date().getTime();
            api.getPrivilege(user) > 1 || (global.channels[channel]['commands'][split[0]].lastUsed = time);

            global.channels[channel]['commands'][split[0]].timesUsed++;
            api.used(channel, split[0], global.channels[channel]['commands'][split[0]].timesUsed);

            var response = await api.handleMessage(global.channels[channel]['commands'][split[0]], user, channel, split, global.channels[channel]['language']);
            global.client.say(channel, response);
        }
    });
})();