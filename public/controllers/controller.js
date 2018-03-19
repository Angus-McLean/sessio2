/**
 - - - - - - Updating the dom with the search results
*/

// Sending the filter options
function update_search(info_obj){
    chrome.runtime.sendMessage({fn: "search_request", param: info_obj}, function(response) {
    });
}


// Receiving the array of browser items
chrome.runtime.onMessage.addListener(function(message,sender,sendResponse){
    if (message.fn == "search_update"){
        clear_list()
        console.log(message.param)
        display_searches(message.param)
    }
}
)

/** - - - - - - - - - - FUNCTION TO READ ANY VARIABLES PASSED WITH THE URL
*/

function getParameterByName(name, url) {
    if (!url) url = window.location.href;
    name = name.replace(/[\[\]]/g, "\\$&");
    var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, " "));
}


// EXAMPLE: var foo = getParameterByName('foo'); // "lorem"
