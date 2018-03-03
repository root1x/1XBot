const twitch = require('tmi.js');

const api = require('./api.js');
const config = require('./../config.js');
const functions = require('./functions.js');
const language = require('./language.json');

global.client;
global.channels = {};

(async () => {
    var dbChannels = await api.getChannels();
    dbChannels.forEach((channel) => {
        global.channels[channel.name] = channel;
        global.channels[channel.name]['commands'] = {};
        global.channels[channel.name]['message-count'] = 0;
        global.channels[channel.name]['messages'] = [];
        global.channels[channel.name]['permits'] = {};
        global.channels[channel.name]['regexes'] = [];
        config.botSettings.channels.push(channel.name);
    });

    functions.log('info', 'Loaded channel list');

    var dbCommands = await api.getCommands();
    dbCommands.forEach((command) => {
        global.channels[command.channel]['commands'][command.name] = command;
    });

    var dbRegexes = await api.getRegexes();
    dbRegexes.forEach((regex) => {
        global.channels[regex.channel]['regexes'].push(regex);
    });

    var dbMessages = await api.getMessages();
    dbMessages.forEach((message) => {
        global.channels[message.channel]['messages'].push(message);
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

        var autoMessages = [];
        var containsRegex = false;
        var handleMessage = true;
        var split = message.split(' ');
        var userPermission = api.getPrivilege(user);
        var isPermitted = false;

        global.channels[channel]['message-count']++;
        global.channels[channel]['messages'].forEach((message) => {
            if (global.channels[channel]['message-count'] % message.cooldown == 0) {
                autoMessages.push(message.content);
            }
        });

        if (autoMessages.length > 0) {
            global.client.say(channel, autoMessages[Math.floor(Math.random() * autoMessages.length)]);
        }

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

            !(global.channels[channel]['permits'][user.username.toLowerCase()] && Date.now() <= global.channels[channel]['permits'][user.username.toLowerCase()]) || (isPermitted = true);

            if (!isPermitted && handleMessage && (global.channels[channel]['subDomainCheck'] || global.channels[channel]['nonSubDomainCheck'])) {
                var subAllowedDomains = global.channels[channel]['subAllowedDomains'].split(',');
                var nonSubAllowedDomains = global.channels[channel]['nonSubAllowedDomains'].split(',');
                var caughtWebsites = message.toLowerCase().match(/(https?:\/\/)?(([a-zA-Z0-9-]*)\.){0,}([a-zA-Z0-9-]{2,}\.)([a-zA-Z]{2,}).*?/g);
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

        if (handleMessage) {
            var keepGoing = true;
            global.channels[channel]['regexes'].forEach((regex, key) => {
                if (keepGoing) {
                    var regexp = functions.regexpify(regex.regex);
                    if (regexp !== null && regexp.test(message)) {
                        keepGoing = false;
                        containsRegex = `${key}`;
                    }
                }
            });
        }

        if (handleMessage && ((containsRegex && !api.checkCooldown(user, global.channels[channel]['regexes'][containsRegex]) && api.getPrivilege(user) >= global.channels[channel]['regexes'][containsRegex].permission) || (global.channels[channel]['commands'][split[0]] && !api.checkCooldown(user, global.channels[channel]['commands'][split[0]]) && api.getPrivilege(user) >= global.channels[channel]['commands'][split[0]].permission))) {
            if (String(containsRegex) == 'false') {
                var time = new Date().getTime();
                api.getPrivilege(user) > 1 || (global.channels[channel]['commands'][split[0]].lastUsed = time);

                global.channels[channel]['commands'][split[0]].timesUsed++;
                api.used(channel, split[0], global.channels[channel]['commands'][split[0]].timesUsed);

                var response = await api.handleMessage(global.channels[channel]['commands'][split[0]], user, channel, split, global.channels[channel]['language']);
                global.client.say(channel, response);
            } else {
                var time = new Date().getTime();
                api.getPrivilege(user) > 1 || (global.channels[channel]['regexes'][containsRegex].lastUsed = time);

                var response = await api.handleMessage(global.channels[channel]['regexes'][containsRegex], user, channel, split, global.channels[channel]['language']);
                global.client.say(channel, response);
            }
        }
    });
})();