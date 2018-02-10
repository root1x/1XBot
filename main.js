const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const express = require('express');

const app = express();

const api = require('./api.js');
const config = require('./config.js');
const functions = require('./functions.js');
const languages = require('./language.json');

const appHandler = require('./appHandler.js');

app.set('views', __dirname + '/views');
app.use(express.static(__dirname + '/public'));
app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));

app.get('/', async (req, res) => {
    var username = await api.checkLogin(req.cookies);
    if (!username) {
        res.render('login.ejs', {
            clientID: config.serverSettings.clientID,
            redirectUri: config.serverSettings.redirectUri
        });
    } else {
        var permission = await api.checkPermissions({username: username, channel: req.params.channel});
        try {
            var channel = await api.getChannels(username);
            var permissions = await api.getPermissions({username: username.replace('#', '')});

            res.render('index.ejs', {
                channel: channel,
                channels: permissions
            });
        } catch (error) {
            functions.log('error', error);
            res.render('error.ejs');
        }
    }
});

app.get('/login', (req, res) => {
    res.render('checkLogin.ejs');
});

app.get('/logout', (req, res) => {
    res.render('logout.ejs');
});

app.post('/api/addCommand/:channel', async (req, res) => {
    req.params.channel = `#${req.params.channel}`;
    var username = await api.checkLogin(req.cookies);
    if (!username) {
        res.render('login.ejs', {
            clientID: config.serverSettings.clientID,
            redirectUri: config.serverSettings.redirectUri
        });
    } else {
        var permission = await api.checkPermissions({username: username, channel: req.params.channel});
        if (permission) {
            Number.isInteger(parseInt(req.body.cooldown)) || (req.body.cooldown = 0);
            Number.isInteger(parseInt(req.body.permission)) || (req.body.permission = 0);
            (req.body.content && req.body.content.trim()) || (req.body.content = 'Error');
    
            if (!req.body.name || !req.body.name.trim()) {
                res.send({
                    error: 'invalid-name',
                    success: false
                });
            } else {
                var response = await api.addCommand({
                    channel: req.params.channel,
                    content: req.body.content,
                    cooldown: req.body.cooldown,
                    name: req.body.name,
                    permission: req.body.permission
                });
    
                if (response.success) {
                    global.channels[req.params.channel]['commands'][req.body.name] = response.response;
                    res.send({
                        data: response.response,
                        success: true
                    });
                } else {
                    res.send(response);
                }
            }
        } else {
            res.render('error.ejs');
        }
    }
});

app.post('/api/editCommand/:channel', async (req, res) => {
    req.params.channel = `#${req.params.channel}`;
    var username = await api.checkLogin(req.cookies);
    if (!username) {
        res.render('login.ejs', {
            clientID: config.serverSettings.clientID,
            redirectUri: config.serverSettings.redirectUri
        });
    } else {
        var permission = await api.checkPermissions({username: username, channel: req.params.channel});
        if (permission) {
            Number.isInteger(parseInt(req.body.cooldown)) || (req.body.cooldown = 0);
            Number.isInteger(parseInt(req.body.permission)) || (req.body.permission = 0);
            (req.body.content && req.body.content.trim()) || (req.body.content = 'Error');
    
            if (!req.body.name || !req.body.name.trim()) {
                res.send({
                    error: 'invalid-name',
                    success: false
                });
            } else if (!req.body.id) {
                res.send({
                    error: 'an-error-occurred',
                    success: false
                });
            } else {
                var response = await api.editCommand({
                    channel: req.params.channel,
                    id: req.body.id
                }, {
                    content: req.body.content,
                    cooldown: req.body.cooldown,
                    name: req.body.name,
                    permission: req.body.permission
                });
    
                if (response.success) {
                    delete global.channels[req.params.channel]['commands'][response.oldName];
                    global.channels[req.params.channel]['commands'][req.body.name] = response.response;
                    res.send({
                        data: response.response,
                        success: true
                    });
                } else {
                    res.send(response);
                }
            }
        } else {
            res.render('error.ejs');
        }
    }
});

app.post('/api/removeCommand/:channel', async (req, res) => {
    req.params.channel = `#${req.params.channel}`;
    var username = await api.checkLogin(req.cookies);
    if (!username) {
        res.render('login.ejs', {
            clientID: config.serverSettings.clientID,
            redirectUri: config.serverSettings.redirectUri
        });
    } else {
        var permission = await api.checkPermissions({username: username, channel: req.params.channel});
        if (permission) {
            if (!req.body.id) {
                res.send({
                    error: 'an-error-occurred',
                    success: false
                });
            } else {
                var response = await api.removeCommand({
                    channel: req.params.channel,
                    id: req.body.id
                });
    
                if (response.success) {
                    delete global.channels[req.params.channel]['commands'][response.oldName];
                    res.send({
                        data: response.response,
                        success: true
                    });
                } else {
                    res.send(response);
                }
            }
        } else {
            res.render('error.ejs');
        }
    }
});

app.post('/api/subMessages/:channel', async (req, res) => {
    req.params.channel = `#${req.params.channel}`;
    var username = await api.checkLogin(req.cookies);
    if (!username) {
        res.render('login.ejs', {
            clientID: config.serverSettings.clientID,
            redirectUri: config.serverSettings.redirectUri
        });
    } else {
        var permission = await api.checkPermissions({username: username, channel: req.params.channel});
        if (permission) {
            req.body.subscriptionGift || (req.body.subscriptionGift = '');
            req.body.subscription || (req.body.subscription = '');
            req.body.resubscription || (req.body.resubscription = '');
    
            var response = await api.updateSubMessages({
                channel: req.params.channel,
                subscription: req.body.subscription,
                subscriptionGift: req.body.subscriptionGift,
                resubscription: req.body.resubscription,
            });
    
            if (response.success) {
                global.channels[req.params.channel]['subscription'] = req.body.subscription;
                global.channels[req.params.channel]['subscriptionGift'] = req.body.subscriptionGift;
                global.channels[req.params.channel]['resubscription'] = req.body.resubscription;
                res.send({
                    success: true
                });
            } else {
                res.send(response);
            }
        } else {
            res.render('error.ejs');
        }
    }
});

app.post('/api/addQuote/:channel', async (req, res) => {
    req.params.channel = `#${req.params.channel}`;
    var username = await api.checkLogin(req.cookies);
    if (!username) {
        res.render('login.ejs', {
            clientID: config.serverSettings.clientID,
            redirectUri: config.serverSettings.redirectUri
        });
    } else {
        var permission = await api.checkPermissions({username: username, channel: req.params.channel});
        if (permission) {
            if (!req.body.quoteBy || !req.body.quoteBy.trim()) {
                res.send({
                    error: 'invalid-quote-owner',
                    success: false
                });
            } else if (!req.body.content || !req.body.content.trim()) {
                res.send({
                    error: 'invalid-quote',
                    success: false
                });
            } else {
                var response = await api.addQuote({
                    addedBy: username.replace('#', ''),
                    channel: req.params.channel,
                    content: api.quotify({
                        content: req.body.content,
                        quoteBy: req.body.quoteBy
                    })
                });
    
                if (response.success) {
                    res.send({
                        data: response.response,
                        success: true
                    });
                } else {
                    res.send(response);
                }
            }
        } else {
            res.render('error.ejs');            
        }
    }
});

app.post('/api/editQuote/:channel', async (req, res) => {
    req.params.channel = `#${req.params.channel}`;
    var username = await api.checkLogin(req.cookies);
    if (!username) {
        res.render('login.ejs', {
            clientID: config.serverSettings.clientID,
            redirectUri: config.serverSettings.redirectUri
        });
    } else {
        var permission = await api.checkPermissions({username: username, channel: req.params.channel});
        if (permission) {
            if (!req.body.content || !req.body.content.trim()) {
                res.send({
                    error: 'invalid-quote',
                    success: false
                });
            } else if (!req.body.id) {
                res.send({
                    error: 'an-error-occurred',
                    success: false
                });
            } else {
                var response = await api.editQuote({
                    channel: req.params.channel,
                    id: req.body.id
                }, {
                    content: req.body.content
                });
    
                if (response.success) {
                    res.send({
                        data: response.response,
                        success: true
                    });
                } else {
                    res.send(response);
                }
            }
        } else {
            res.render('error.ejs');
        }
    }
});

app.post('/api/removeQuote/:channel', async (req, res) => {
    req.params.channel = `#${req.params.channel}`;
    var username = await api.checkLogin(req.cookies);
    if (!username) {
        res.render('login.ejs', {
            clientID: config.serverSettings.clientID,
            redirectUri: config.serverSettings.redirectUri
        });
    } else {
        var permission = await api.checkPermissions({username: username, channel: req.params.channel});
        if (permission) {
            if (!req.body.id) {
                res.send({
                    error: 'an-error-occurred',
                    success: false
                });
            } else {
                var response = await api.removeQuote({
                    channel: req.params.channel,
                    id: req.body.id
                });
    
                if (response.success) {
                    res.send({
                        data: response.response,
                        success: true
                    });
                } else {
                    res.send(response);
                }
            }
        } else {
            res.render('error.ejs');
        }

    }
});

app.post('/api/updateLanguage/:channel', async (req, res) => {
    req.params.channel = `#${req.params.channel}`;
    var username = await api.checkLogin(req.cookies);
    if (!username) {
        res.render('login.ejs', {
            clientID: config.serverSettings.clientID,
            redirectUri: config.serverSettings.redirectUri
        });
    } else {
        var permission = await api.checkPermissions({username: username, channel: req.params.channel});
        if (permission) {
            if (!req.body.language || !languages[req.body.language]) {
                res.send({
                    error: 'an-error-occurred',
                    success: false
                });
            } else {
                var response = await api.updateLanguage({
                    channel: req.params.channel,
                    language: req.body.language
                });
    
                if (response.success) {
                    global.channels[req.params.channel].language = req.body.language;
                    res.send({
                        data: response.data,
                        success: true
                    });
                } else {
                    res.send(response);
                }
            }
        } else {
            res.render('error.ejs');
        }
    }
});

app.post('/api/messageModeration/:channel', async (req, res) => {
    req.params.channel = `#${req.params.channel}`;
    var username = await api.checkLogin(req.cookies);
    if (!username) {
        res.render('login.ejs', {
            clientID: config.serverSettings.clientID,
            redirectUri: config.serverSettings.redirectUri
        });
    } else {
        var permission = await api.checkPermissions({username: username, channel: req.params.channel});
        if (permission) {
            req.body.banWords || (req.body.banWords = '');
            req.body.timeoutWords || (req.body.timeoutWords = '');
    
            var response = await api.updateMessageModeration({
                banWords: req.body.banWords,
                channel: req.params.channel,
                timeoutWords: req.body.timeoutWords
            });
    
            if (response.success) {
                global.channels[req.params.channel].banWords = req.body.banWords;
                global.channels[req.params.channel].timeoutWords = req.body.timeoutWords;
                res.send({
                    success: true
                });
            } else {
                res.send(response);
            }
        } else {
            res.render('error.ejs');
        }
    }
});

app.post('/api/linkModeration/:channel', async (req, res) => {
    req.params.channel = `#${req.params.channel}`;
    var username = await api.checkLogin(req.cookies);
    if (!username) {
        res.render('login.ejs', {
            clientID: config.serverSettings.clientID,
            redirectUri: config.serverSettings.redirectUri
        });
    } else {
        var permission = await api.checkPermissions({username: username, channel: req.params.channel});
        if (permission) {
            if (!req.body.nonSubAllowedDomains) {
                req.body.nonSubDomainCheck = false;
                req.body.nonSubAllowedDomains = '';
            } else {
                req.body.nonSubDomainCheck = true;
            }
    
            if (!req.body.subAllowedDomains) {
                req.body.subDomainCheck = false;
                req.body.subAllowedDomains = '';
            } else {
                req.body.subDomainCheck = true;
            }
    
            var response = await api.updateLinkModeration({
                channel: req.params.channel,
                nonSubDomainCheck: req.body.nonSubDomainCheck,
                nonSubAllowedDomains: req.body.nonSubAllowedDomains,
                subDomainCheck: req.body.subDomainCheck,
                subAllowedDomains: req.body.subAllowedDomains
            });
    
            if (response.success) {
                global.channels[req.params.channel].nonSubDomainCheck = req.body.nonSubDomainCheck;
                global.channels[req.params.channel].nonSubAllowedDomains = req.body.nonSubAllowedDomains;
                global.channels[req.params.channel].subDomainCheck = req.body.subDomainCheck;
                global.channels[req.params.channel].subAllowedDomains = req.body.subAllowedDomains;
                
                res.send({
                    success: true
                });
            } else {
                res.send(response);
            }
        } else {
            res.render('error.ejs');
        }
    }
});

app.post('/api/updateBotEditors/:channel', async (req, res) => {
    req.params.channel = `#${req.params.channel}`;
    var username = await api.checkLogin(req.cookies);
    if (!username) {
        res.render('login.ejs', {
            clientID: config.serverSettings.clientID,
            redirectUri: config.serverSettings.redirectUri
        });
    } else {
        if (username === req.params.channel) {
            req.body.botEditors || (req.body.botEditors = '');
    
            var response = await api.updateBotEditors({
                botEditors: req.body.botEditors.toLowerCase(),
                channel: req.params.channel
            });
    
            if (response.success) {
                res.send({
                    success: true
                });
            } else {
                res.send(response);
            }
        } else {
            res.render('error.ejs');
        }
    }
});

app.get('/:channel', async (req, res) => {
    req.params.channel = `#${req.params.channel}`;
    var username = await api.checkLogin(req.cookies);
    if (!username) {
        res.render('login.ejs', {
            clientID: config.serverSettings.clientID,
            redirectUri: config.serverSettings.redirectUri
        });
    } else {
        var permission = await api.checkPermissions({username: username, channel: req.params.channel});
        if (permission) {
            try {
                var channel = await api.getChannels(req.params.channel);
                var commands = await api.getCommands(req.params.channel);
                var quotes = await api.getQuotes(req.params.channel);
    
                res.render('manage.ejs', {
                    channel: channel,
                    commands: commands,
                    username: username,
                    quotes: quotes
                });
            } catch (error) {
                functions.log('error', error);
                res.render('error.ejs');
            }
        } else {
            res.render('error.ejs');
        }
    }
});

app.listen(config.serverSettings.port);
functions.log('info', `Server started running on port ${config.serverSettings.port}`);