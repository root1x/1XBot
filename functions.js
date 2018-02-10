const config = require('./config.js');

// Function to log stuff onto console
function log(type, info) {
	if (config.serverSettings.log.indexOf(type.toLowerCase()) !== -1) {
		console.log(`[${type[0].toUpperCase()}${type.slice(1)}] ${info}`);
	}
}

module.exports = {
    log
};