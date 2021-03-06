console.log("Content Script working");

    /*
     ** Global Variables
    */


// var listWords = document.body.innerText.split(/ |\n/).filter(function (word){return word.length})


    /*
        * Chrome Extension Messages
    */


chrome.extension.onMessage.addListener(function(request, sender, sendResponse){
	if(request.fn = "gatherText") {
        console.log(request);
        var text = getText();
		var links = getLinks();
		var favIconUrl = document.querySelector("link[rel*='icon']").href;
		sendResponse({content: text, links:links, favIcon: favIconUrl});
		return true; // This is required by a Chrome Extension
	}
})

function test_function (){
	console.log("IT RAN THE FUNCTION !");
}

test_function()



    /*
     ** Page Processing Functions
    */


function getText() {
        // Return: All the text contained in the webpage

	var everything = document.body.innerText;// // textContent
    return everything;
}

function getLinks(){
        // Return: All the links in the webpage

	var links = [];
	var html_list = document.getElementsByTagName('a');
	for (var i=0; i<html_list.length;i++){
	if(html_list[i].getAttribute('href') && html_list[i].innerText){links.push(html_list[i].innerText)}
	}
	return links;
}




document.addEventListener('click', function(clickEvent){
	// console.log(clickEvent)
	// console.log("text :",clickEvent.path[0].innerText);
	var clickObj = {
		text : clickEvent.path[0].innerText,
		link : []
	};
	var pathLen = clickEvent.path.length;
	for (var j = 0; j<pathLen; j++){
		if (clickEvent.path[j].href != undefined){
			clickObj.link.push(clickEvent.path[j].href);
		}
	}

    chrome.runtime.sendMessage({obj: "clickObj", click: clickObj}, function(response) {
      console.log(response.farewell);
    });
}, true);

/* - - - - - - SCRIPT TO INJECT A JS FILE IN THE WEBPAGES
*/

// Injecting a file that is whitelisted in the manifest file
var s = document.createElement('script');
s.src = chrome.extension.getURL("content/injections/load.js");
(document.head||document.documentElement).appendChild(s);
s.parentNode.removeChild(s);


// Adding an event listener when the webpage posts a message
window.addEventListener("message", function(event) {
    // We only accept messages from ourselves
    if (event.source != window)
        return;

    if (event.data.type && (event.data.type == "FROM_PAGE")) {
        console.log("Content script received message: " + event.data.text);
    }
});
