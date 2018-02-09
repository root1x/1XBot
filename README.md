# 1XBot
## Moderate Twitch channels easily

**What is 1XBot?**

_1XBot is a Twitch bot developed by Root1X._


**What does 1XBot do?**

_1XBot lets you manage your channel commands, subscription messages, quotes etc. easily on a web interface._


**How can I start using this bot?**

_Follow the required steps in the documentation to set the 1XBot up._


## Installing 1XBot
First you need to create an account on Twitch for your bot. 

After you've done so, you need to go to [this page](https://twitchapps.com/tmi/) and get your _Twitch Chat OAuth Token_ for your bot.


Then open the **config.js** file and edit lines 10 & 11 with your newly acquired token. After editing it should look like this:

```
identity: {
    username: '1XBot', // Your bot's Twitch username
    password: 'oauth:<youroauthtoken>' // Your bot's OAuth token
},
```


Then you need to go to [this page](https://dev.twitch.tv/dashboard/apps/create) and create a new application.


If you're going to use this bot on your local machine, set this as your OAuth Redirect URI:

```
http://localhost/login
```


If you're going to upload this bot onto a server and use it from there, set this as your OAuth Redirect URI:

```
https://<your server address>/login
```


After you've successfully created your app on Twitch and have gotten your Client ID, open the **config.js** file once again and edit lines 24 & 27 with your newly acquired infos. 

After editing it should look like this:

```
const serverSettings = {
    clientID: '<yournewclientid>',
    log: ['info', 'error'],
    port: 80,
    redirectUri: 'http://<your server address>/login'
};
```


Then you can use this command on your terminal to install all the required modules:

```
npm install
```


After this, your bot is almost ready to use.

As of right now, the tmi.js module doesn't support the gifted sub events. So you need to manually add it to your **client.js** file in the tmi.js's lib folder.


To do this, go to _/node_modules/tmi.js/lib/client.js_ and edit the line 604.


Between the 

```
}
```

and 
```
break;
```

add this code:

```
// Handle subgift
else if (msgid == "subgift") {
    var username = message.tags["display-name"] || message.tags["login"];
    var recipient = message.tags["msg-param-recipient-display-name"] || message.tags["msg-param-recipient-user-name"];
    var plan = message.tags["msg-param-sub-plan"];
    var planName = _.replaceAll(_.get(message.tags["msg-param-sub-plan-name"], null), {
        "\\\\s": " ",
        "\\\\:": ";",
        "\\\\\\\\": "\\",
        "\\r": "\r",
        "\\n": "\n"
    });
    var userstate = message.tags;

    this.emit("subgift", channel, username, recipient, {plan, planName}, userstate);
}
```

([Credit for the gifted subs fix](https://github.com/tmijs/tmi.js/issues/262#issuecomment-360223838))


The fixed client.js file should look like this:

![Fixed client.js file](https://image.prntscr.com/image/f5eXVK2uS0_9j26pAJGkMw.png)

Finally, install MongoDB on your server, if you haven't already, and voilà!

_Now you're ready to use the 1XBot, congratulations!_


## Running the 1XBot
To start running the 1XBot, type this into your terminal:

```
sudo node main.js
```

_(You need to run this as root to use it on port 80, thus: sudo)_


## Special thanks
_Special thanks to EncryptedFeelings & berkeuu and everyone else who has been supporting the project either by watching the stream or helping me debug the system._

_Follow me on Twitch for more: [https://twitch.tv/Root1X](https://twitch.tv/Root1X)_