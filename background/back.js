

/** Global Variables
*/


// Object contains id, tree id, url, key words
var history_obj = {};


/**  - - - - - - - - - - CHROME EVENT LISTENERS - - - - - - - - -
*/









// RUNTIME EVENT LISTENERS
chrome.runtime.onMessage.addListener(function(message,sender,sendResponse){
    switch (message.fn) {
        case "search_request":
            // console.log(message.param);
            var query = message.param.query,
                size = parseInt(message.param.size);

            chrome.history.search({text:query,maxResults:size}, function(results){
                // console.log("results", results)

                chrome.runtime.sendMessage({fn: "search_update", param: results})
            })


            break;
        default:
            console.log("No match")
}})

// CHROME HISTORY EVENT LISTENERS
chrome.history.onVisited.addListener(function (e){
    var id = e.id;

    // Checking for first visit
    if (history_obj[id]== undefined){
        history_obj[id] = {
            id : id,
            url : e.url

        }
        console.table(history_obj);
    }

})

/**
    1. Get the chrome history event for page navigation
    2. Create an object that stores the page id, url, total activity time, tree id, key words
    3. The visits information can be found by using the history api

*/

/** Functions to Call up the information from the
    chrome history Api

*/

function get_history_item (_url){
    // input: Url of the history entry
    // output: Array of Visited Items

    chrome.history.getVisits({url: _url}, function (e){
        console.table(e)
    })
}


function get_url_from_id (_id){
    // input: Id of the history entry
    // output: Url of the history item
 history_obj[_id].url;
}

function update_search(obj,callback){
    chrome.history.search(obj, function(results){
        console.log("search complete", results)
        console.log(callback)
        callback({farewell:"hey"})
        sendResponse({farewell:"Search Updated", data:results})
    })
}

// STEPS
/*
    1. Call up the history api, to find the most recent searches
    2. Run the list through a filter to remove all the "bad" history items
    3. Use a function to call up the info associated with each id using
        localy stored information






*/
