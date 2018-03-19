

/** - - - - - - - - - - - - - INIT OF GLOBAL VARIABLES
*/


// Object contains id, tree id, url, key words

var chrome_id_to_url = {}; // Gives back the url for a given chrome history id

var data_of_url = {}; // Stores the data for a given Url

var family_tree = {}; // Stores the parent and child nodes ids and url for a given url in given tab id

var tab_visit_log = {}; // Stores the last visited url for each tab

var tab_for_visitId = {}; // Stores the chrome tab for a given visitId

var config = {}; // Stores config changed by the user


/* * - - - - - - - - -  SAVING AND LOADING GLOBAL VARIABLES
*/

// LOADING THE CONFIGURATION FILE
function load_config(){
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function(){
        if(xhr.readyState === 4){
            config = JSON.parse(xhr.response);
            // console.log(config);
        }
    }
    xhr.open("GET", chrome.extension.getURL("/config.json"),true);
    xhr.send();
}



// LOADING THE STORED DATA

function load_data(){
    chrome.storage.local.get(function(saved_data){
        //console.log(saved_data);
        if (saved_data.family_tree == undefined){
            saved_data = create_container_obj(config.json_to_save);
            chrome.storage.local.set(saved_data);
        }
        else {
            save_container_obj(saved_data);
        }
    })

}

function save_data(){
    var awaiting_data = create_container_obj(config.json_to_save);
    chrome.storage.local.set(awaiting_data);
}

function clear_memory(){
    config.json_to_save.forEach(function(_var){
        window[_var]={};
    })
    chrome.storage.local.clear(function() {
        var error = chrome.runtime.lastError;
            if (error) {
                console.error(error);
            }
    });
    // console.log(create_container_obj(config.json_to_save));
}



// INIT THE BACKGROUND SCRIPT DATA
load_config();
load_data();

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
                console.log("results", results)
                var full_data = add_tree_info_to_data(complete_history_data(results))

                chrome.runtime.sendMessage({fn: "search_update", param: full_data})
            })
            break;

        case "load_tree":
            // command to load the family_tree
            chrome.runtime.sendMessage({fn: "tree_loaded", param: family_tree});


        default:
            console.log("No match")
}})

// CHROME HISTORY,TABS EVENT LISTENERS

chrome.tabs.onUpdated.addListener(function (tabId, change, tab) {

    if (change.status == "complete"){
        //console.log(tab)

        // Updating the information in data_of_url
        if (data_of_url[tab.url]== undefined){ data_of_url[tab.url]={} }

        data_of_url[tab.url].title = tab.title;

        // Updating the family_tree
        update_family_tree(tabId,tab);

        // Get the Visit Id, Save corresponding tabId
        chrome.history.getVisits({
            url:tab.url
        }, function (visit){

            var last_visit = visit.pop();
            tab_for_visitId[last_visit.visitId]=tabId;
        })

        // Updating the tab_visit_log
        tab_visit_log[tabId]=tab.url;
        save_data();
    }
});

chrome.history.onVisited.addListener(function (e){

    // Event is fired when a url is added to the chrome history

    var id = e.id,
        url = e.url;
    // console.log(e);

    // Adding the id to chrome_id_to_url
    if (chrome_id_to_url[id]== undefined){
        chrome_id_to_url[id] = {
            id : id,
            url : e.url
        }
        // console.table(chrome_id_to_url);
    }

    // Updating the information of data_to_url
    if (data_of_url[url]== undefined){
        data_of_url[url]={};
    }
    var data = data_of_url[url];
    data.id = id;
    //data.lastVisitTime = e.lastVisitTime,
    data.visitCount = e.visitCount;
    // console.log(data);

})

/**
    1. Get the chrome history event for page navigation
    2. Create an object that stores the page id, url, total activity time, tree id, key words
    3. The visits information can be found by using the history api



    1. history search:
        visit time to visit id
        visit id to tab id

*/


/**  - - - - - - - - - - - - - - DATA PROCESSING FUNCTIONS
*/

// FILTERING FUNCTIONS


// DATA COMPLETION FUNCTIONS

function complete_history_data(data){
    //input: Array of incomplete search lists
    //output: Array of search item
    data.forEach(function(entry){
        var _url = entry.url;
        entry.data = data_of_url[_url];
    });
    console.log(data);
    return data;
}

function add_tree_info_to_data(data){
    //input: Array of incomplete search lists
    //output: Array of search item
    data.forEach(function(entry){
        var _visitTime = entry.lastVisitTime;
        chrome.history.getVisits({
            url:entry.url
        },function(visits){
            for(var i = visits.length-1;i >= 0;i--){
                var visit = visits[i];
                if(visit.visitTime == _visitTime){
                    var _tab = tab_for_visitId[visit.visitId];
                    if(family_tree[_tab] != undefined && family_tree[_tab][entry.url] != undefined ){
                        entry.tree = {
                            tab: _tab,
                            visitId: visit.visitId,
                            referringVisitId: visit.referringVisitId,
                            transition: visit.transition,
                            treeId: family_tree[_tab][entry.url].treeId
                        }
                    }
                    //
                    break;
                }
            }
        });
    });
    return data;
}

/**  - - - - - - - - - - - - - ACCESSING DATA FROM CHROME API
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

// Creating Chrome Bookmarks




/** - - - - - - - - - - - - FUNCTIONS TO ACQUIRE DATA
*/



/** - - - - - - - - - - - - UPDATE LOCAL DATA
*/

function update_family_tree (tabId,tab) {
            // input: tabId, tab (information when the tab.updated event is fired)
            // function: updates the tree_id of the url
            // ouput: none

            // object dependencies: family_tree, tab_visit_log

            //console.log(family_tree,tab_visit_log);
    // if the tab is initialized
    if (family_tree[tabId] == undefined){
        family_tree[tabId] = {
                init : Date.now(),
                root : tab.url
        }
        family_tree[tabId][tab.url]={
            url: tab.url,
            treeId : "0",
            children: {}
        }
    }

    else if (family_tree[tabId][tab.url] != undefined){
        console.log("Treeid: ",family_tree[tabId][tab.url].treeId);
        console.log(" / parent: ",family_tree[tabId][tab.url].parent);
        console.log(" / children: ", family_tree[tabId][tab.url].children);
    }

    else {
        var previous_url = tab_visit_log[tabId];
        var previous_url_treeId = family_tree[tabId][previous_url].treeId;
        var previous_url_children = Object.keys(family_tree[tabId][previous_url].children).length;

        family_tree[tabId][tab.url] = {
            url: tab.url,
            treeId : previous_url_treeId + "-" + (previous_url_children),
            parent: previous_url,
            children: {}
        }

        family_tree[tabId][previous_url].children[tab.url]="link";
    }
}






/** - - - - - - - - - - - - USEFUL UTILITY FUNCTIONS
*/

// FOR LOADING AND SAVING DATA
function create_container_obj(list){
    //input: list of window variables
    //output: json containing all the inputed variables,obj
    var _obj = {};
    list.forEach(function(key){
        _obj[key]=window[key];
    })
    return _obj;
}

function save_container_obj(json){
    //input: container json
    //function: saves individually the keys of the container json
    //output: none
    var _keys = Object.keys(json);
    _keys.forEach(function(key){
        window[key]=json[key];
    })
}


/** - - - - - - - - - CREATING THE WINDOW FOR THE VISUALIZER
*/
function create_visual(){
    chrome.windows.create({
        type : 'popup',
        url : "../public/mainWindow.html",
        type: "popup"
    }, function(newWindow) {

    });
}
