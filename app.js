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


bot.dialog('/', [
    // function (session) {
    //     console.log("NODE VERSION: "+process.version);
    //     builder.Prompts.text(session, "Hello... What's your name?", {speak: "Hello, what's your name?"});
    // },

    function (session) {
        session.userData.name = "Calvin";
        var temp = "Hi " + session.userData.name + ", what would you like to make today?";
        builder.Prompts.text(session, temp, { speak: temp });
    },

    function (session, results) {
        var options = {
            headers: {
                "X-Mashape-Key": "YCt1DnputOmshN4JwfNYAUxzK39xp1Ln0GZjsnbgC8HjfQtD6b",
                "X-Mashape-Host": "spoonacular-recipe-food-nutrition-v1.p.mashape.com"
            }
        };
        var searchUrl = 'https://spoonacular-recipe-food-nutrition-v1.p.mashape.com/recipes/search?number=1&query=';
        var res = results.response.toLowerCase();
        res = res.replace(" ", "+");
        searchUrl += res;
        searchUrl += '&offset=0';
        fetch(searchUrl, options)
            .then(r => r.json())
            .then(r => {
                console.log(r);
                if (r.results.length === 0) session.beginDialog('/recipeNotFound', session);
                fetch('https://spoonacular-recipe-food-nutrition-v1.p.mashape.com/recipes/'+ r.results[0].id +'/information', options)
                    .then(response => response.json())
                    .then(recipe => {
                        session.userData.currentStep = 0;
                        session.userData.recipe = recipe;
                        session.userData.starting = true;
                        session.beginDialog('/recipe', session);
                    });
            });
        session.endDialog();
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
        } else if (res.includes("repeat")) {
            session.beginDialog(route, session);
        } else if (res.includes("how much") || results.response.toLowerCase().includes("how many")) {
            var words = res.split(" ");
            var ingredient = "";
            for (var i = 2; i<words.length; i++) {
              ingredient = ingredient + words[i] + " ";
            }
            ingredient = ingredient.substring(0, ingredient.length - 1);
            var found = false;
            session.userData.recipe.extendedIngredients.forEach(i => {
              if (found) return; // take first instance of an ingredient by default
              if (!i.name.toLowerCase().includes(ingredient)) return;
              var response = "You need "+i.amount+" "+i.unit+" of "+i.name;
              session.userData.ingredientResponse = response;
              session.beginDialog('/ingredientQuantity', session);
              found = true;
            });
            if (!found) session.beginDialog('/ingredientNotFound', session);
        } else {
            // unhandled!
            session.beginDialog('/unhandled', session);
        }
    };
    return gsiFunction;
};

// ================================================================================================

var stepFunction = function (session) {
    var step = session.userData.currentStep + 1;
    var recipe = session.userData.recipe;
    if(step === recipe.analyzedInstructions[0].steps.length + 1 ) {
        session.beginDialog('/recipeDONE', session);
        return ;
    }
    var prompt = "Step "+step+": " + recipe.analyzedInstructions[0].steps[ step-1 ].step;
    if (session.userData.starting) {
        prompt = "Okay, lets get started.  We're going to cook "+recipe.title+".  \n"+prompt;
        session.userData.starting = false;
    }
    builder.Prompts.text(session, prompt, { speak: prompt });
};

bot.dialog('/ingredientQuantity', [
  function (session) {
    var prompt = session.userData.ingredientResponse + ".  How can I help you next?";
    builder.Prompts.text(session, prompt, { speak: prompt });
  },
  getStepInput('/recipe')
]);

bot.dialog('/ingredientNotFound', [
   function (session) {
       var prompt = "Sorry, we couldn't find that ingredient in this recipe.  You can try again, or continue to a different step";
       builder.Prompts.text(session, prompt, { speak: prompt });
   },
   getStepInput('/recipe')
]);

bot.dialog('/unhandled', [
    function (session) {
       var prompt = "Sorry, I'm not sure what you mean.  Please try again";
       builder.Prompts.text(session, prompt, { speak: prompt });
   },
   getStepInput('/recipe')
]);

bot.dialog('/recipe', [
    stepFunction,
    getStepInput('/recipe2')
]);

bot.dialog('/recipe2', [
    stepFunction,
    getStepInput('/recipe')
]);

bot.dialog('/recipeDONE', [
    function (session) {
        var temp = "Congratulations, " + session.userData.name + "! You've successfully cooked " + session.userData.recipe.title + ". What would you like to do next?" ;
        builder.Prompts.choice(session, temp, ["Let's eat!", "View wine pairings"],
            {speak: temp});
        // session.endConversation();
    },

    function (session, result) {
        session.userData.endChoice = result.response;
        if(session.userData.endChoice === "Let's eat!") {
            session.endConversation();
        } else {
            var wines = session.userData.recipe.winePairing.pairedWines;
            var wineOutput = "Your " + session.userData.recipe.title + " goes well with ";
            for (var i = 0; i<wines.length - 1; i++) {
                wineOutput += wines[i] + ", ";
            }
            wineOutput += wines[wines.length-1] + ".";
            console.log(wineOutput);
            builder.Prompts.text(session, wineOutput, {speak: wineOutput});
        }
    }
]);

bot.dialog('/recipeNotFound', [
    function (session) {
        session.say("Sorry, we couldn't find a recipe matching your search.  Please try again.");
        session.beginDialog('/', session);
        session.endDialog();
    }
]);
