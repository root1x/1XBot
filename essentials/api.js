const dateTime = require('node-datetime');
const moment = require('moment');
const mongoose = require('mongoose');
const request = require('request-promise');

const config = require('./../config.js');
const functions = require('./functions.js');
const languages = require('./language.json');
const schemas = require('./schemas.js');

mongoose.connect(`mongodb://${config.dbSettings.host}/${config.dbSettings.name}`);
mongoose.Promise = global.Promise;

function addCommand(data) {
    return new Promise((resolve, reject) => {
        schemas.commands.find({
            channel: data.channel,
            name: data.name
        }, (error, response) => {
            if (response.length > 0)
                resolve({
                    error: 'command-exists',
                    success: false
                });
            else
                new schemas.commands(data).save((error, response) => {
                    if (error)
                        resolve({
                            error: 'an-error-occurred',
                            success: false
                        });
                    resolve({
                        success: true,
                        response: response
                    });
                });
        })
    });
}

function addQuote(data) {
    return new Promise((resolve, reject) => {
        new schemas.quotes({
            addedBy: data.addedBy,
            channel: data.channel,
            content: data.content
        }).save((error, response) => {
            if (error)
                resolve({
                    success: false
                });

            resolve({
                success: true,
                response: response
            });
        });
    });
}

function addRegex(data) {
    return new Promise((resolve, reject) => {
        schemas.regexes.find({
            channel: data.channel
        }, (error, response) => {
            new schemas.regexes(data).save((error, response) => {
                if (error)
                    resolve({
                        error: 'an-error-occurred',
                        success: false
                    });
                resolve({
                    success: true,
                    response: response
                });
            });
        })
    });
}

function checkCooldown(user, command) {
    if (getPrivilege(user) > 1)
        return false;
    else {
        var time = new Date().getTime();
        if (!command.lastUsed || time - command.cooldown * 1000 > command.lastUsed)
            return false;
        else
            return true;
    }
}

function checkPermissions(data) {
    return new Promise((resolve, reject) => {
        data.username = data.username.replace('#', '');
        schemas.channels.find({
            name: data.channel
        }, (error, response) => {
            if (response.length > 0 && (response[0]['editors'].indexOf(data.username) !== -1 || response[0].name.replace('#', '') === data.username)) {
                resolve(true);
            } else {
                resolve(false);
            }
        });
    });
}

function checkLogin(cookies) {
    return new Promise(async (resolve, reject) => {
        if (!cookies.token)
            resolve(false);
        else {
            var user = JSON.parse(await request(`https://api.twitch.tv/kraken?oauth_token=${cookies.token}&client_id=b31o4btkqth5bzbvr9ub2ovr79umhh`));
            if (user.error)
                resolve(false);
            else  {
                var channel = `#${user.token.user_name}`;
                schemas.channels.find({
                    name: channel
                }, (error, response) => {
                    if (response.length === 0)
                        new schemas.channels({
                            name: channel
                        }).save((error, response) => {
                            global.channels[channel] = response;
                            global.channels[channel]['commands'] = {};
                            global.channels[channel]['regexes'] = [];
        
                            global.client.join(channel.replace('#', ''));
        
                            resolve(channel);
                        });
                    else
                        resolve(channel);
                });
            }
        }
    });
}

function editCommand(data, newData) {
    return new Promise((resolve, reject) => {
        schemas.commands.find({
            channel: data.channel,
            _id: new mongoose.Types.ObjectId(data.id)
        }, (error, response) => {
            if (response.length > 0) {
                var oldName = response[0].name;
                schemas.commands.findOneAndUpdate({
                    _id: new mongoose.Types.ObjectId(data.id)
                }, newData, {
                    new: true
                }, (error, response) => {
                    if (error)
                        resolve({
                            error: 'an-error-occurred',
                            success: false
                        });

                    resolve({
                        oldName: oldName,
                        response: response,
                        success: true
                    });
                });
            } else
                resolve({
                    error: 'command-not-found',
                    success: false
                });
        });
    });
}

function editQuote(data, newData) {
    return new Promise((resolve, reject) => {
        schemas.quotes.find({
            channel: data.channel,
            _id: new mongoose.Types.ObjectId(data.id)
        }, (error, response) => {
            if (response.length > 0) {
                schemas.quotes.findOneAndUpdate({
                    _id: new mongoose.Types.ObjectId(data.id)
                }, newData, {
                    new: true
                }, (error, response) => {
                    if (error)
                        resolve({
                            error: 'an-error-occurred',
                            success: false
                        });

                    resolve({
                        response: response,
                        success: true
                    });
                });
            } else
                resolve({
                    error: 'an-error-occurred',
                    success: false
                });
        });
    });
}

function editRegex(data, newData) {
    return new Promise((resolve, reject) => {
        schemas.regexes.find({
            channel: data.channel,
            _id: new mongoose.Types.ObjectId(data.id)
        }, (error, response) => {
            if (response.length > 0) {
                schemas.regexes.findOneAndUpdate({
                    _id: new mongoose.Types.ObjectId(data.id)
                }, newData, {
                    new: true
                }, (error, response) => {
                    if (error)
                        resolve({
                            error: 'an-error-occurred',
                            success: false
                        });

                    resolve({
                        response: response,
                        success: true
                    });
                });
            } else
                resolve({
                    error: 'regex-not-found',
                    success: false
                });
        });
    });
}

function getChannels(channel) {
    return new Promise((resolve, reject) => {
        schemas.channels.find((channel ? {
            'name': channel
        } : {}), (error, response) => {
            if (error)
                reject(error);

            channel ? resolve(response[0]) : resolve(response);
        });
    });
}

function getCommands(channel) {
    return new Promise((resolve, reject) => {
        schemas.commands.find((channel ? {
            'channel': channel
        } : {}), (error, response) => {
            if (error)
                reject(error);

            resolve(response);
        });
    });
}

function getPermissions(data) {
    return new Promise(async (resolve, reject) => {
        var addedChannels = [];
        var channels = JSON.parse(await request(`https://twitchstuff.3v.fi/modlookup/api/user/${data.username}`))['channels'];

        for (var i=0; i<channels.length; i++) {
            var exists = await checkPermissions({username: data.username, channel: `#${channels[i].name}`})
            !exists || addedChannels.push(channels[i]);
        }

        resolve(addedChannels);
    });
}

function getPrivilege(user) {
    if (user.badges && user.badges.broadcaster && user.badges.broadcaster === '1')
        return 3;
    else if (user.mod)
        return 2;
    else if (user.subscriber)
        return 1;
    else
        return 0;
}

function getQuote(channel, quote) {
    return new Promise((resolve, reject) => {
        schemas.quotes.find({
            channel: channel,
            content: {
                $regex: `.*${quote}.*`
            }
        }, (error, response) => {
            if (error)
                resolve({
                    success: false
                });

            if (response.length > 0)
                resolve({
                    success: true,
                    response: response[Math.floor(Math.random() * response.length)].content
                });
            else
                resolve({
                    success: false
                });
        });
    });
}

function getQuotes(channel) {
    return new Promise((resolve, reject) => {
        schemas.quotes.find((channel ? {
            'channel': channel
        } : {}), (error, response) => {
            if (error)
                reject(error);

            resolve(response);
        });
    });
}

function getRegexes(channel) {
    return new Promise((resolve, reject) => {
        schemas.regexes.find((channel ? {
            'channel': channel
        } : {}), (error, response) => {
            if (error)
                reject(error);

            resolve(response);
        });
    });
}

function quotify(data) {
    return `"${data.content}" - ${data.quoteBy}, ${dateTime.create().format('d/m/Y - H:M:S')}`;
}

async function handleMessage(command, user, channel, split, language) {
    var content = command.content ? command.content : command.response;
    if (content.indexOf('%username%') !== -1)
        content = content.split('%username%').join(user.username);

    if (content.indexOf('%usernameorparam%') !== -1)
        content = content.split('%usernameorparam%').join(`${split[1] ? split[1] : user.username}`);

    if (content.indexOf('%timesused%') !== -1)
        content = content.split('%timesused%').join(command.timesUsed);

    if (content.indexOf('%commands%') !== -1) {
        var commandsText = '';
        Object.keys(global.channels[channel].commands).forEach((key) => {
            commandsText += commandsText === '' ? global.channels[channel]['commands'][key].name : `, ${global.channels[channel]['commands'][key].name}`;
        });
        content = content.split('%commands%').join(commandsText);
    }

    if (content.indexOf('%followdate%') !== -1) {
        var followDateInfo = await request(`http://api.newtimenow.com/follow-length/?channel=${channel.replace('#', '')}&user=${split[1] ? split[1].replace(/[^a-z_0-9]/gi, '') : user.username}`);
        followDateInfo = followDateInfo.trim()
        if (followDateInfo !== 'Not following...') {
            followDateInfo = moment(followDateInfo).format('DD/MM/YYYY - HH:mm:ss');
            content = content.split('%followdate%').join(followDateInfo);
        } else {
            content = content.split('%followdate%').join(languages[language]['not-following']);
        }
    }

    if (content.indexOf('%followtime%') !== -1) {
        var followTimeInfo = await request(`https://decapi.me/twitch/followage/${channel.replace('#', '')}/${split[1] ? split[1].replace(/[^a-z_0-9]/gi, '') : user.username}?precision=2`);
        if (followTimeInfo.indexOf('not following') !== -1 || followTimeInfo.indexOf('user with the') !== -1 || followTimeInfo.indexOf('not found') !== -1 || followTimeInfo.indexOf('cannot follow') !== -1) {
            content = content.split('%followtime%').join(languages[language]['not-following']);
        } else {
            if (language !== 'en') {
                followTimeInfo = followTimeInfo.split('years').join(languages[language]['years']).split('year').join(languages[language]['years']);
                followTimeInfo = followTimeInfo.split('months').join(languages[language]['months']).split('month').join(languages[language]['months']);
                followTimeInfo = followTimeInfo.split('weeks').join(languages[language]['weeks']).split('week').join(languages[language]['weeks']);
                followTimeInfo = followTimeInfo.split('days').join(languages[language]['days']).split('day').join(languages[language]['days']);
                followTimeInfo = followTimeInfo.split('hours').join(languages[language]['hours']).split('hour').join(languages[language]['hours']);
                followTimeInfo = followTimeInfo.split('minutes').join(languages[language]['minutes']).split('minute').join(languages[language]['minutes']);
                followTimeInfo = followTimeInfo.split('seconds').join(languages[language]['seconds']).split('second').join(languages[language]['seconds']);
            }

            content = content.split('%followtime%').join(followTimeInfo);
        }
    }

    if (content === '%addquote%') {
        var splitBackup = split.slice();
        splitBackup.splice(0, 2);
        var quote = quotify({
            content: splitBackup.join(' '),
            quoteBy: split[1]
        });
        var addQuoteInfo = await addQuote({
            addedBy: user.username,
            channel: channel,
            content: quote
        });
        if (addQuoteInfo.success)
            content = content.split('%addquote%').join(languages[language]['added-the-quote']);
        else
            content = content.split('%addquote%').join(languages[language]['cannot-add-the-quote']);
    }

    if (content.indexOf('%getquote%') !== -1) {
        var splitBackup = split.slice();
        splitBackup.splice(0, 1);
        var quote = splitBackup.join(' ');
        var quoteInfo = await getQuote(channel, quote);
        if (quoteInfo.success)
            content = content.split('%getquote%').join(quoteInfo.response);
        else
            content = content.split('%getquote%').join(languages[language]['quote-not-found']);
    }

    if (content.indexOf('%randomviewer%') !== -1) {
        var viewerInfo = await request(`http://tmi.twitch.tv/group/user/${channel.replace('#', '')}/chatters`);
        viewerInfo = viewerInfo.trim()
        try {
            var viewerList = [];
            viewerInfo = JSON.parse(viewerInfo);

            viewerInfo.chatters.moderators.forEach((user) => {
                viewerList.push(user);
            });

            viewerInfo.chatters.staff.forEach((user) => {
                viewerList.push(user);
            });

            viewerInfo.chatters.admins.forEach((user) => {
                viewerList.push(user);
            });

            viewerInfo.chatters.global_mods.forEach((user) => {
                viewerList.push(user);
            });

            viewerInfo.chatters.viewers.forEach((user) => {
                viewerList.push(user);
            });

            content = content.split('%randomviewer%').join(viewerList[Math.floor(Math.random() * viewerList.length)]);
        } catch (error) {
            content = content.split('%randomviewer%').join(languages[language]['an-error-occurred']);
        }
    }

    if (content.indexOf('%uptime%') !== -1) {
        var uptimeInfo = JSON.parse(await request(`https://api.twitch.tv/kraken/streams/${channel.replace('#', '')}?client_id=b31o4btkqth5bzbvr9ub2ovr79umhh`));
        if (uptimeInfo.stream === null) {
            content = content.split('%uptime%').join(languages[language]['stream-not-online']);
        } else {
            var timeStarted = moment(uptimeInfo.stream.created_at).format('YYYY-MM-DD HH:mm:ss');
            var timeNow = moment(new Date()).format('YYYY-MM-DD HH:mm:ss');
            if (moment(timeNow).diff(timeStarted, 'hours') > 0)
                content = content.split('%uptime%').join(`${moment(timeNow).diff(timeStarted, 'hours')} ${languages[language]['hours']} ${moment(timeNow).diff(timeStarted, 'minutes') % 60} ${languages[language]['minutes']}`);
            else
                content = content.split('%uptime%').join(`${moment(timeNow).diff(timeStarted, 'minutes')} ${languages[language]['minutes']}`);
        }
    }

    if (content.indexOf('%game%') !== -1) {
        var gameInfo = JSON.parse(await request(`https://api.twitch.tv/kraken/streams/${channel.replace('#', '')}?client_id=b31o4btkqth5bzbvr9ub2ovr79umhh`));
        if (gameInfo.stream === null) {
            content = content.split('%game%').join('-');
        } else {
            content = content.split('%game%').join(gameInfo.stream.game);
        }
    }

    if (content.indexOf('%title%') !== -1) {
        var titleInfo = JSON.parse(await request(`https://api.twitch.tv/kraken/streams/${channel.replace('#', '')}?client_id=b31o4btkqth5bzbvr9ub2ovr79umhh`));
        if (titleInfo.stream === null) {
            content = content.split('%title%').join('-');
        } else {
            content = content.split('%title%').join(titleInfo.stream.channel.status);
        }
    }

    return content;
}

function removeCommand(data) {
    return new Promise((resolve, reject) => {
        schemas.commands.find({
            channel: data.channel,
            _id: new mongoose.Types.ObjectId(data.id)
        }, (error, response) => {
            if (response.length > 0) {
                var oldName = response[0].name;
                schemas.commands.findOneAndRemove({
                    _id: new mongoose.Types.ObjectId(data.id)
                }, (error, response) => {
                    if (error)
                        resolve({
                            error: 'an-error-occurred',
                            success: false
                        });

                    resolve({
                        oldName: oldName,
                        response: response,
                        success: true
                    });
                });
            } else
                resolve({
                    error: 'command-not-found',
                    success: false
                });
        });
    });
}

function removeQuote(data) {
    return new Promise((resolve, reject) => {
        schemas.quotes.find({
            channel: data.channel,
            _id: new mongoose.Types.ObjectId(data.id)
        }, (error, response) => {
            if (response.length > 0) {
                schemas.quotes.findOneAndRemove({
                    _id: new mongoose.Types.ObjectId(data.id)
                }, (error, response) => {
                    if (error)
                        resolve({
                            error: 'an-error-occurred',
                            success: false
                        });

                    resolve({
                        response: response,
                        success: true
                    });
                });
            } else
                resolve({
                    error: 'an-error-occurred',
                    success: false
                });
        });
    });
}

function removeRegex(data) {
    return new Promise((resolve, reject) => {
        schemas.regexes.find({
            channel: data.channel,
            _id: new mongoose.Types.ObjectId(data.id)
        }, (error, response) => {
            if (response.length > 0) {
                schemas.regexes.findOneAndRemove({
                    _id: new mongoose.Types.ObjectId(data.id)
                }, (error, response) => {
                    if (error)
                        resolve({
                            error: 'an-error-occurred',
                            success: false
                        });

                    resolve({
                        response: response,
                        success: true
                    });
                });
            } else
                resolve({
                    error: 'an-error-occurred',
                    success: false
                });
        });
    });
}

function updateBotEditors(data) {
    return new Promise((resolve, reject) => {
        schemas.channels.findOneAndUpdate({
            name: data.channel
        }, {
            editors: data.botEditors.split(',')
        }, (error) => {
            if (error)
                resolve({
                    error: 'an-error-occurred',
                    success: false
                });

            resolve({
                success: true
            });
        });
    });
}

function updateLanguage(data) {
    return new Promise((resolve, reject) => {
        schemas.channels.findOneAndUpdate({
            name: data.channel
        }, {
            language: data.language
        }, {
            new: true
        }, (error, response) => {
            if (error)
                resolve({
                    error: 'an-error-occurred',
                    success: false
                });

            resolve({
                data: response,
                success: true
            });
        });
    });
}

function updateLinkModeration(data) {
    return new Promise((resolve, reject) => {
        schemas.channels.findOneAndUpdate({
            name: data.channel
        }, {
            nonSubDomainCheck: data.nonSubDomainCheck,
            nonSubAllowedDomains: data.nonSubAllowedDomains,
            subDomainCheck: data.subDomainCheck,
            subAllowedDomains: data.subAllowedDomains
        }, (error) => {
            if (error)
                resolve({
                    error: 'an-error-occurred',
                    success: false
                });

            resolve({
                success: true
            });
        });
    });
}

function updateMessageModeration(data) {
    return new Promise((resolve, reject) => {
        schemas.channels.findOneAndUpdate({
            name: data.channel
        }, {
            banWords: data.banWords,
            timeoutWords: data.timeoutWords
        }, (error) => {
            if (error)
                resolve({
                    error: 'an-error-occurred',
                    success: false
                });

            resolve({
                success: true
            });
        });
    });
}

function updateSubMessages(data) {
    return new Promise((resolve, reject) => {
        schemas.channels.findOneAndUpdate({
            name: data.channel
        }, {
            subscription: data.subscription,
            subscriptionGift: data.subscriptionGift,
            resubscription: data.resubscription
        }, (error) => {
            if (error)
                resolve({
                    error: 'an-error-occurred',
                    success: false
                });

            resolve({
                success: true
            });
        });
    });
}

function used(channel, command, timesUsed) {
    schemas.commands.findOneAndUpdate({
        channel: channel,
        name: command
    }, {
        timesUsed: timesUsed
    }, (error) => {
        if (error)
            functions.log('error', error)

        return 0;
    });
}

module.exports = {
    addCommand,
    addQuote,
    addRegex,
    checkCooldown,
    checkLogin,
    checkPermissions,
    editCommand,
    editQuote,
    editRegex,
    getChannels,
    getCommands,
    getPermissions,
    getPrivilege,
    getQuotes,
    getRegexes,
    handleMessage,
    quotify,
    removeCommand,
    removeQuote,
    removeRegex,
    updateBotEditors,
    updateLanguage,
    updateLinkModeration,
    updateMessageModeration,
    updateSubMessages,
    used
};