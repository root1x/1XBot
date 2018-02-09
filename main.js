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
        try {
            var channel = await api.getChannels(username);
            var commands = await api.getCommands(username);
            var quotes = await api.getQuotes(username);

            res.render('index.ejs', {
                channel: channel,
                commands: commands,
                quotes: quotes
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

app.post('/api/addCommand', async (req, res) => {
    var username = await api.checkLogin(req.cookies);
    if (!username) {
        res.render('login.ejs', {
            clientID: config.serverSettings.clientID,
            redirectUri: config.serverSettings.redirectUri
        });
    } else {
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
                channel: username,
                content: req.body.content,
                cooldown: req.body.cooldown,
                name: req.body.name,
                permission: req.body.permission
            });

            if (response.success) {
                global.channels[username]['commands'][req.body.name] = response.response;
                res.send({
                    data: response.response,
                    success: true
                });
            } else {
                res.send(response);
            }
        }
    }
});

app.post('/api/editCommand', async (req, res) => {
    var username = await api.checkLogin(req.cookies);
    if (!username) {
        res.render('login.ejs', {
            clientID: config.serverSettings.clientID,
            redirectUri: config.serverSettings.redirectUri
        });
    } else {
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
                channel: username,
                id: req.body.id
            }, {
                content: req.body.content,
                cooldown: req.body.cooldown,
                name: req.body.name,
                permission: req.body.permission
            });

            if (response.success) {
                delete global.channels[username]['commands'][response.oldName];
                global.channels[username]['commands'][req.body.name] = response.response;
                res.send({
                    data: response.response,
                    success: true
                });
            } else {
                res.send(response);
            }
        }
    }
});

app.post('/api/removeCommand', async (req, res) => {
    var username = await api.checkLogin(req.cookies);
    if (!username) {
        res.render('login.ejs', {
            clientID: config.serverSettings.clientID,
            redirectUri: config.serverSettings.redirectUri
        });
    } else {
        if (!req.body.id) {
            res.send({
                error: 'an-error-occurred',
                success: false
            });
        } else {
            var response = await api.removeCommand({
                channel: username,
                id: req.body.id
            });

            if (response.success) {
                delete global.channels[username]['commands'][response.oldName];
                res.send({
                    data: response.response,
                    success: true
                });
            } else {
                res.send(response);
            }
        }
    }
});

app.post('/api/subMessages', async (req, res) => {
    var username = await api.checkLogin(req.cookies);
    if (!username) {
        res.render('login.ejs', {
            clientID: config.serverSettings.clientID,
            redirectUri: config.serverSettings.redirectUri
        });
    } else {
        req.body.subscriptionGift || (req.body.subscriptionGift = '');
        req.body.subscription || (req.body.subscription = '');
        req.body.resubscription || (req.body.resubscription = '');

        var response = await api.updateSubMessages({
            channel: username,
            subscription: req.body.subscription,
            subscriptionGift: req.body.subscriptionGift,
            resubscription: req.body.resubscription,
        });

        if (response.success) {
            global.channels[username]['subscription'] = req.body.subscription;
            global.channels[username]['subscriptionGift'] = req.body.subscriptionGift;
            global.channels[username]['resubscription'] = req.body.resubscription;
            res.send({
                success: true
            });
        } else {
            res.send(response);
        }
    }
});

app.post('/api/addQuote', async (req, res) => {
    var username = await api.checkLogin(req.cookies);
    if (!username) {
        res.render('login.ejs', {
            clientID: config.serverSettings.clientID,
            redirectUri: config.serverSettings.redirectUri
        });
    } else {
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
                channel: username,
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
    }
});

app.post('/api/editQuote', async (req, res) => {
    var username = await api.checkLogin(req.cookies);
    if (!username) {
        res.render('login.ejs', {
            clientID: config.serverSettings.clientID,
            redirectUri: config.serverSettings.redirectUri
        });
    } else {

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
                channel: username,
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
    }
});

app.post('/api/removeQuote', async (req, res) => {
    var username = await api.checkLogin(req.cookies);
    if (!username) {
        res.render('login.ejs', {
            clientID: config.serverSettings.clientID,
            redirectUri: config.serverSettings.redirectUri
        });
    } else {
        if (!req.body.id) {
            res.send({
                error: 'an-error-occurred',
                success: false
            });
        } else {
            var response = await api.removeQuote({
                channel: username,
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
    }
});

app.post('/api/updateLanguage', async (req, res) => {
    var username = await api.checkLogin(req.cookies);
    if (!username) {
        res.render('login.ejs', {
            clientID: config.serverSettings.clientID,
            redirectUri: config.serverSettings.redirectUri
        });
    } else {
        if (!req.body.language || !languages[req.body.language]) {
            res.send({
                error: 'an-error-occurred',
                success: false
            });
        } else {
            var response = await api.updateLanguage({
                channel: username,
                language: req.body.language
            });

            if (response.success) {
                global.channels[username].language = req.body.language;
                res.send({
                    data: response.data,
                    success: true
                });
            } else {
                res.send(response);
            }
        }
    }
});

app.post('/api/messageModeration', async (req, res) => {
    var username = await api.checkLogin(req.cookies);
    if (!username) {
        res.render('login.ejs', {
            clientID: config.serverSettings.clientID,
            redirectUri: config.serverSettings.redirectUri
        });
    } else {
        req.body.banWords || (req.body.banWords = '');
        req.body.timeoutWords || (req.body.timeoutWords = '');

        var response = await api.updateMessageModeration({
            banWords: req.body.banWords,
            channel: username,
            timeoutWords: req.body.timeoutWords
        });

        if (response.success) {
            global.channels[username].banWords = req.body.banWords;
            global.channels[username].timeoutWords = req.body.timeoutWords;
            res.send({
                success: true
            });
        } else {
            res.send(response);
        }
    }
});

app.post('/api/linkModeration', async (req, res) => {
    var username = await api.checkLogin(req.cookies);
    if (!username) {
        res.render('login.ejs', {
            clientID: config.serverSettings.clientID,
            redirectUri: config.serverSettings.redirectUri
        });
    } else {
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
            channel: username,
            nonSubDomainCheck: req.body.nonSubDomainCheck,
            nonSubAllowedDomains: req.body.nonSubAllowedDomains,
            subDomainCheck: req.body.subDomainCheck,
            subAllowedDomains: req.body.subAllowedDomains
        });

        if (response.success) {
            global.channels[username].nonSubDomainCheck = req.body.nonSubDomainCheck;
            global.channels[username].nonSubAllowedDomains = req.body.nonSubAllowedDomains;
            global.channels[username].subDomainCheck = req.body.subDomainCheck;
            global.channels[username].subAllowedDomains = req.body.subAllowedDomains;
            
            res.send({
                success: true
            });
        } else {
            res.send(response);
        }
    }
});

app.listen(config.serverSettings.port);
functions.log('info', `Server started running on port ${config.serverSettings.port}`);