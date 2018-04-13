/*-----------------------------------------------------------------------------
Cooking Cortana - your personal cooking instructor right in your Windows Device
-----------------------------------------------------------------------------*/

var restify = require('restify');
var builder = require('botbuilder');
var botbuilder_azure = require("botbuilder-azure");
var fetch = require('node-fetch');

// Setup Restify Server
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
   console.log('%s listening to %s', server.name, server.url);
});

// Create chat connector for communicating with the Bot Framework Service
var connector = new builder.ChatConnector({
    appId: process.env.MicrosoftAppId,
    appPassword: process.env.MicrosoftAppPassword,
    openIdMetadata: process.env.BotOpenIdMetadata
});

// Listen for messages from users
server.post('/api/messages', connector.listen());

/*----------------------------------------------------------------------------------------
* Bot Storage: This is a great spot to register the private state storage for your bot.
* We provide adapters for Azure Table, CosmosDb, SQL Azure, or you can implement your own!
* For samples and documentation, see: https://github.com/Microsoft/BotBuilder-Azure
* ---------------------------------------------------------------------------------------- */

var tableName = 'botdata';
var azureTableClient = new botbuilder_azure.AzureTableClient(tableName, process.env['AzureWebJobsStorage']);
var tableStorage = new botbuilder_azure.AzureBotStorage({ gzipData: false }, azureTableClient);

// Create your bot with a function to receive messages from the user
var bot = new builder.UniversalBot(connector);
bot.set('storage', tableStorage);

// bot.dialog('/', [
//     function (session) {
//         builder.Prompts.text(session, "Hello... What's your name?");
//     },
//     function (session, results) {
//         session.userData.name = results.response;
//         builder.Prompts.number(session, "Hi " + results.response + ", How many years have you been coding?");
//     },
//     function (session, results) {
//         session.userData.coding = results.response;
//         builder.Prompts.choice(session, "What language do you code Node using?", ["JavaScript", "CoffeeScript", "TypeScript"]);
//     },
//     function (session, results) {
//         session.userData.language = results.response.entity;
//         session.send("Got it... " + session.userData.name +
//                     " you've been programming for " + session.userData.coding +
//                     " years and use " + session.userData.language + ".");
//     }
// ]);

    // if(session.message.text === "Next step") {
    // session.send('The next step is ______________') ;
    // }


bot.dialog('/', [
    function (session) {
        console.log("NODE VERSION: "+process.version);
        builder.Prompts.text(session, "Hello... What's your name?", {speak: "Hello, what's your name?"});
    },
    // function (session, results) {
    //     session.userData.name = results.response;
    //     builder.Prompts.number(session, "Hi " + results.response + ", How many years have you been coding?");
    // },

    function (session, results) {
        session.userData.name = results.response;
        var temp = "Hi " + results.response + ", what would you like to make today?";
        builder.Prompts.choice(session, temp, ["Pan Roasted Cauliflower", "Food #2", "Food #2"],
            {speak: temp});
    },

    function (session, results) {
        session.userData.GCchoice = results.response.entity;
        if(session.userData.GCchoice === "No") {
            session.say("Okay goodbye screw you then.", "Okay goodbye screw you then.");
        } else {
            var options = {
                headers: {
                    "X-Mashape-Key": "YCt1DnputOmshN4JwfNYAUxzK39xp1Ln0GZjsnbgC8HjfQtD6b",
                    "X-Mashape-Host": "spoonacular-recipe-food-nutrition-v1.p.mashape.com"
                }
            };
            fetch("https://spoonacular-recipe-food-nutrition-v1.p.mashape.com/recipes/479101/information", options)
                .then(res => res.json())
                .then(recipe => {
                    session.userData.currentStep = 0;
                    session.userData.recipe = recipe;
                    session.send("Okay, lets get started.  We're going to cook "+recipe.title);
                    session.beginDialog('/recipe', session);
                });
            session.endDialog();
        }
    }
]);

var getStepInput = function (route) {
    var gsiFunction = function (session, results) {
        var res = results.response.toLowerCase();
        if (res.includes("next")) {
            session.userData.currentStep++;
            session.beginDialog(route, session);
        } else if (res.includes("previous") ||
                    results.response.toLowerCase().includes("back")) {
            session.userData.currentStep--;
            session.beginDialog(route, session);
        } else if (res.includes("go to")) {
            session.userData.currentStep = Number(results.response.slice(-1)) - 1;
            session.beginDialog(route, session);
        } else if (res.includes("how much") || results.response.toLowerCase().includes("how many")) {
            // if 
        }
    };
    return gsiFunction;
};

var stepFunction = function (session) {
    var step = session.userData.currentStep + 1;
    var recipe = session.userData.recipe;
    // if step === recipe.analyzedInstructions[0].steps
    var prompt = "Step "+step+": " + recipe.analyzedInstructions[0].steps[ step ].step;
    builder.Prompts.text(session, prompt, { speak: prompt });
};


bot.dialog('/recipe', [
    stepFunction,
    getStepInput('/recipe2')
]);

bot.dialog('/recipe2', [
    stepFunction,
    getStepInput('/recipe')
]);
