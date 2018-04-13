/*-----------------------------------------------------------------------------
A simple echo bot for the Microsoft Bot Framework.
-----------------------------------------------------------------------------*/

var restify = require('restify');
var builder = require('botbuilder');
var botbuilder_azure = require("botbuilder-azure");
var unirest = require('unirest');

// var documentDbOptions = {
//     host: 'https://cookingcortana.documents.azure.com:443/',
//     masterKey: 'q8c7eXyXzso9GDEafTKgVAVsN1iAHdkVkDCCoIkszZOPQhRBA4k5sdTmrPR2GxtUmQC6lJv8QkljmTqr7yU4uA==',
//     database: 'botdocs',
//     collection: 'botdata'
// };

// var docDbClient = new azure.DocumentDbClient(documentDbOptions);

// var cosmosStorage = new azure.AzureBotStorage({ gzipData: false }, docDbClient);

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

bot.dialog('/', [ // CONSIDER WHAT IF USER LEAVES AND CORTANA SHUTS OFF?????????????????????????????
                    // bot state management : https://docs.microsoft.com/en-us/azure/bot-service/nodejs/bot-builder-nodejs-stat

    function (session) {
        console.log("NODE VERSION: "+process.version);
        builder.Prompts.text(session, "Hello... What's your name?", {speak: "Hello, what's your name?"});
    },

    function (session, results) {
        session.userData.name = results.response;
        builder.Prompts.choice(session, "Hi " + results.response + ", do you want me to walk you through making a grilled cheese?", ["Yes", "No"],
            {speak: "Hi " + results.response + ", do you want me to walk you through making a grilled cheese?"});
    },

    function (session, results) {
        session.userData.GCchoice = results.response.entity;
        if(session.userData.GCchoice === "No") {
            session.say("Okay goodbye screw you then.", "Okay goodbye screw you then.");
        }
        else {
            session.say("Okay! Let's get started.  Loading instructions...") ;
            unirest.get("https://spoonacular-recipe-food-nutrition-v1.p.mashape.com/recipes/479101/information")
                .header("X-Mashape-Key", "YCt1DnputOmshN4JwfNYAUxzK39xp1Ln0GZjsnbgC8HjfQtD6b")
                .header("X-Mashape-Host", "spoonacular-recipe-food-nutrition-v1.p.mashape.com")
                .end(function (result) {
                  session.say("Today we're gonna cook: "+result.body.title);
                  session.userData.currentStep = 0;
                  session.userData.recipe = result.body;
                  session.beginDialog('/recipe', session);
                });
        }
    },


]);

bot.dialog('/recipe', [
    function (session) {
        session.say('hi');
        var step = session.userData.currentStep;
        var recipe = session.userData.recipe;
        builder.Prompts.text(session, "Step "+step+": " + recipe.analyzedInstructions[0].steps[ step ].step);
    },
    function (session, results) {
        console.log(results.response);
        if (results.response.toLowerCase().includes("next")) {
            session.userData.currentStep++;
            session.beginDialog('/recipe2', session);
        }
    }
]);

bot.dialog('/recipe2', [
    function (session) {
        session.say('hi');
        var step = session.userData.currentStep;
        var recipe = session.userData.recipe;
        builder.Prompts.text(session, "Step "+step+": " + recipe.analyzedInstructions[0].steps[ step ].step);
    },
    function (session, results) {
        console.log(results.response);
        if (results.response.toLowerCase().includes("next")) {
            session.userData.currentStep++;
            session.beginDialog('/recipe', session);
        }
    }
]);
