const config = require('./../config.js');

// Function to log stuff onto console
function log(type, info) {
	if (config.serverSettings.log.indexOf(type.toLowerCase()) !== -1) {
		console.log(`[${type[0].toUpperCase()}${type.slice(1)}] ${info}`);
	}
}

// Function to turn string into regex. Credit: https://stackoverflow.com/a/39406498
function regexpify(q) {
	let flags = q.replace(/.*\/([gimuy]*)$/, '$1');
	if (flags === q) flags = '';
	let pattern = (flags ? q.replace(new RegExp('^/(.*?)/' + flags + '$'), '$1') : q);
	try {
		return new RegExp(pattern, flags);
	} catch (e) {
		return null;
	}
}

module.exports = {
	log,
	regexpify
};