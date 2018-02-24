const mongoose = require('mongoose');

const config = require('./../config.js');

mongoose.connect(`mongodb://${config.dbSettings.host}/${config.dbSettings.name}`);
mongoose.Promise = global.Promise;

const channels = mongoose.model('channels', new mongoose.Schema({
    banWords: {
        default: '',
        type: String
    },
    editors: {
        default: [],
        type: Array
    },
    language: {
        default: 'en',
        type: String
    },
    name: String,
    nonSubAllowedDomains: {
        default: '',
        type: String
    },
    nonSubDomainCheck : {
        default: false,
        type: Boolean
    },
    resubscription: {
        default: '',
        type: String
    },
    subAllowedDomains: {
        default: '',
        type: String
    },
    subDomainCheck : {
        default: false,
        type: Boolean
    },
    subscription: {
        default: '',
        type: String
    },
    subscriptionGift: {
        default: '',
        type: String
    },
    timeoutWords: {
        default: '',
        type: String
    }
}));

const commands = mongoose.model('commands', new mongoose.Schema({
    channel: String,
    content: String,
    cooldown: {
        default: 0,
        type: Number
    },
    name: String,
    permission: {
        default: 0,
        type: Number
    },
    timesUsed: {
        default: 0,
        type: Number
    }
}));

const quotes = mongoose.model('quotes', new mongoose.Schema({
    addedBy: String,
    channel: String,
    content: String
}));

module.exports = {
    channels,
    commands,
    quotes
};