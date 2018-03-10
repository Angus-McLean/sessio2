
/**
  * SESSIO : BACKGROUND Script
*/

// DECLARING Variables
var sitesVisited = {0:[]}; // Doesn't need to be stored, this object helps with page processing -- The keys are the tabIds, values are the urls with the unique identifiers of the pages
var nodes = [];
var edges = [];
var pageCount = {};
var idObject = {};
var globalDict = {addedIds: [], dict: {}};
var initTabs = {}; //This is a simple fix to solve the recurring tabOpenerId problem
var generalObject = {};
var userToken ="";
var activityObj = {last: {id: 0,path:0}};
var config = {};


function retrieveObjects () {
    chrome.storage.local.get(function(storedObj) {

        if(typeof(storedObj.globalDict) !== 'undefined' && storedObj.globalDict.addedIds != undefined && storedObj.globalDict.dict != undefined) {
            globalDict = storedObj.globalDict;
            generalObject= storedObj;
        }
        if (storedObj.idObject!= undefined){
            idObject = storedObj.idObject;
        }
        if (storedObj.activityObj != undefined && storedObj.activityObj.last != undefined){
            activityObj = storedObj.activityObj;
        }
    });
}
retrieveObjects();

function updateActivity(tabId) {
    if (idObject[tabId]!= undefined){
        // console.log(idObject[tabId])
        var _time = Date.now(),
        _tabId = tabId,
        _path = _.last(idObject[tabId]).path;

        var lastTime = activityObj.last.time || _time,
        lastId = activityObj.last.id || 0,
        lastPath = activityObj.last.path || 0;

        if (activityObj[lastId]!= undefined && activityObj[lastId][lastPath] != undefined){
            activityObj[lastId][lastPath] += (_time-lastTime);
        }
        else if (activityObj[lastId]!= undefined) {
            activityObj[lastId][lastPath]=(_time-lastTime);
        }
        else {
            activityObj[lastId]= {},
            activityObj[lastId][lastPath]=(_time-lastTime);

        }
        // console.log("We added ",_time-lastTime," to ", lastId, " of path ", lastPath );
        // console.log("activityObj: ",activityObj);
        activityObj.last.time = _time,
        activityObj.last.id = _tabId,
        activityObj.last.path = _path;
    }
}


var pageChangeTime = [];
chrome.tabs.onUpdated.addListener(function (tabId, change, tab) {

    // clickTestify(change, tabId);
    // Use the loading event that will not depend on the connection speed
    // to confirm if the click event has lead to a navigation event

    if (change.status == "complete") {
        //console.log(change, tab);
        pageChangeTime.push(Date.now());
        var isRefreshed = checkForRefresh(tab.url, tab.id);
        if (!isRefreshed) {


            var saveObj = {
                id : tab.id,
                status : "Completed",
                //favIconUrl : tab.favIconUrl,
                //openerid : tab.openerTabId,
                time : Date.now(),
                title : tab.title,
                url : tab.url,
                incognito : tab.incognito,
                active : tab.active
            }
            if (initTabs[tab.id]== undefined || initTabs[tab.id] != true){
                saveObj.openerid = tab.openerTabId;
            }



            nomenclatureId(saveObj);
            //console.log("THE SAVED OBJECT : ", saveObj);

            var text = "";
            chrome.tabs.sendMessage(tabId, {fn: "gatherText"}, function(response) {
                if(response) {
                    saveObj.favIconUrl = tab.favIconUrl || response.favIcon;
                    var keptText= [];


                    text = response.content.toLowerCase().split(/\W+/);

                    text.forEach( function (item, index, object) {
                        var indexOf = words100list.indexOf(item);
                        if (indexOf <0 && (hasNumbers(item)==false) && (item.length < 20)) { // word10000[item]!=undefined &&
                            keptText.push(item);
                        }
                    })

                    var texting_the = response.content.split("the ");
                    var texting_a = response.content.split("a ");
                    var texting_an = response.content.split("an ");
                    var texting_to = response.content.split("to ");


                    var links = response.links;


                    var texting = _.concat(texting_the,texting_a,texting_an);
                    var deterWords = [];
                    texting.forEach(function (e) {
                        deterWords.push(e.split(/\W+/)[0])
                    });
                    _.remove(deterWords, function(n){
                        return n == "";
                    });
                    deterWords = _.uniq(deterWords);
                    deterWords.sort();
                    saveObj.theWords = deterWords;


                    var verbs = [];
                    texting_to.forEach(function(e){
                       verbs.push(e.split(/\W+/)[0])
                    });

                    verbs= _.uniq(verbs);
                    verbs.sort();
                    saveObj.verbs = verbs;
                    // PORTER STEMMER IMPLEMENTATION
                    var stemmerAr = [];
                    keptText.forEach(function(el){
                        var e = stemmer(el);
                        if (_.includes(stemmerAr,e)== false){
                        stemmerAr.push(e);}
                    })
                    stemmerAr.sort();
                    saveObj.stemmer = stemmerAr;

                    // ALSO SPLICE STRINGS OF NUMBERS
                    // AND LIMIT THE TOTAL SIZE
                    var identifier = saveObj.id + "/" + saveObj.path;
                    var dictio = new textAnalysis(keptText,identifier);

                    dictio.createDict();
                    //console.log("Diction node: ", dictio);
                    dictio.updateGlobal();

                    calculateScore(dictio.keys,dictio.dict);
                    scoreSort(dictio.keys,dictio.dict);
                    var ar2 = dictio.keys.slice(0, 30);

                    //console.log("Main Words: ",ar2);
                    var wordList = [];
                    ar2.forEach( function(e) {
                        //console.log("Word: ", e, " Score :", dictio.dict[e].score, "Count :", dictio.dict[e].count)
                        var wordObj = {word: e, score: dictio.dict[e].score, count: dictio.dict[e].count};
                        wordList.push(wordObj);
                    })

                    saveObj.mainWords = wordList;
                    _.remove(links, function(n){return n=="" || n== " "})
                    saveObj.links = links;
                    updateActivity(saveObj.id);
                    addClickText(saveObj);
                    // console.log("New Obj", saveObj);
                    chrome.tabs.detectLanguage(tab.id,function (lang){
                        console.log("Language has been detected ", lang);
                        saveObj.lang = lang;
                        chrome.tabs.captureVisibleTab(tab.windowId, {format: "jpeg", quality:7}, function (image){
                            if (image) {saveObj.image = image};
                            pushNewPage(saveObj);
                        });
                    })


                }
            })

        }
    }
});



/// Click event listener

var clickActions = [0];
chrome.runtime.onMessage.addListener(function(message,sender,sendResponse){
    if(message.fn == "navigate"){
        var queryInfo = {
            windowId : previousInfo.id
        }
        var activeTab = {};
        chrome.tabs.query(queryInfo, function(tabs) {
            console.log(tabs)
            tabs.forEach(function(tab){
                if (tab.active == true){
                    activeTab.windowId = tab.windowId;
                    activeTab.id = tab.id;
                }
            })
            console.log("navigate to", message.url);
            chrome.windows.update(activeTab.windowId, {focused: true}, function(){
                chrome.tabs.update(activeTab.id, {url: message.url});
                chrome.windows.update(popupId, {focused: true});
            });
        });
    }

    else if(message.fn == "highPreview"){
        chrome.windows.update(popupId, {focused: true})
    }

    else if(message.obj == "clickObj"){
        var clickObj = {time: Date.now(), text: message.click.text, tabId: sender.tab.id, href:message.click.link};
        clickActions.push(clickObj);
        // console.log("Received Text:", clickObj.text);
        sendResponse({farewell:"Click Received"});
    }
    else if(message.fn == "sidebar"){
        displaySessioWindow();
    }
    else if(message.fn == "fulltab"){
        chrome.tabs.create({'url': "/public/index.html" });
    }

});



// Correct this
function addClickText (pageObj) {
    var lastClickEntry = clickActions.pop();
    if (lastClickEntry && lastClickEntry.tabId) {
        if (pageObj.id == lastClickEntry.tabId) {
            for (var j=0; j<lastClickEntry.href.length;j++){
                var href = lastClickEntry.href[j];
                if (href == pageObj.url){
                    pageObj.clicktext = lastClickEntry.text;
                    // console.log("Click text has been added");
                    break;
                }
            }

        }
    }
}

function checkForRefresh(currentUrl, tabId) {
    // if (sitesVisited[tabId] == undefined){
    //     sitesVisited[tabId] = [];
    //     sitesVisited[tabId].push("We have started using this tab");
    // }
    // var sitelength = sitesVisited[tabId].length;
    // var previousUrl = sitesVisited[tabId][sitelength-1];
    //
    // if (currentUrl == previousUrl || (purl(currentUrl).data.attr.user == purl(previousUrl).data.attr.user && purl(currentUrl).data.attr.user!= "")) {
    //     return true;
    // }
    // else {
    //     sitesVisited[tabId].push(currentUrl);
    //     return false;
    // }
    return false;
}

chrome.tabs.onRemoved.addListener(function (tabId, info) {
    //console.log('onRemoved', tabId, info);
    var saveObj = {
        id : tabId,
        status : "Removed",
        timeStamp : Date.now()
    }
    //console.log("The OBJECT:",saveObj);
    nomenclatureId(saveObj);
    //pushNewPage(saveObj);
});


function saveChanges(key, pageNode) {
    if (!pageNode) {
        console.log('Error: No value specified');
        return;
    }
    var obj = {}
    obj[key] = pageNode
    chrome.storage.sync.set(obj, function() {
        console.log('Page saved');
    });
}

function pushNewPage(pageObj) {
    chrome.storage.local.get(function(storedObj) {
        if(typeof(storedObj["pages"]) !== 'undefined' && storedObj["pages"] instanceof Array) {
            storedObj["pages"].push(pageObj);
            storedObj["globalDict"] = globalDict;
            storedObj["idObject"] = idObject;
            storedObj["activityObj"]=activityObj;
        } else {
            storedObj["pages"] = [pageObj];
            storedObj["globalDict"] = globalDict;
            storedObj["idObject"] = idObject;
            storedObj["activityObj"]=activityObj;
        }
        generalObject = storedObj;
        chrome.storage.local.set(storedObj);
    });
}

function textAnalysis(words, identifier) {
    this.dict = {};
    this.keys = [];
    this.id = identifier;
    this.words = words;
    var _this= this; // change to var _this

    this.createDict = function(){
        var dict = _this.dict;
        var keys = _this.keys;
        this.words.forEach( function(word){
            if (validate(word)){
                if (dict[word] == undefined) {
                    dict[word] = {};
                    dict[word].count = 1;
                    dict[word].word = word;
                    keys.push(word);
                } else {
                    dict[word].count++;
                }
            }
        });
    }

    this.updateGlobal = function() {

        var entryAdded = false;
        globalDict.addedIds.forEach( function (e) {
            if (e==_this.id) {entryAdded = true};
        })

        if (entryAdded == false) {
            globalDict.addedIds.push(_this.id);
            _this.keys.forEach ( function(word) {
                if (validate(word)){
                    var wordAdded = false;
                    if (globalDict.dict[word] == undefined) {
                        globalDict.dict[word] = {};
                        globalDict.dict[word].ids = [];
                    }
                    globalDict.dict[word].ids.forEach( function(e) {
                        if (e == _this.id) {
                            wordAdded = true
                        };
                    });
                    if (wordAdded == false) {globalDict.dict[word].ids.push(_this.id)}
                }
            });
        }
        calculateScore(_this.keys,_this.dict);
        scoreSort(_this.keys,_this.dict);
    }

    this.getCount = function(word) {
        return _this.dict[word].count;
    }

    this.countSort = function() {
        _this.keys.sort(function(a, b) {
            return (_this.getCount(b) - _this.getCount(a));
        });
    }
}

function calculateScore(keys,dict) {
    keys.forEach( function(word) {
        var entry = dict[word];
        //console.log("Word being checked in the globalDict", word);
        var tf = entry.count // I havent normalized by dividing by whole number of number of words, its not going to change the ranking, however I wont be able to compare these scores with the scores of other pages
        var lengthDic =1;
        if (globalDict.dict[word] != undefined) {
            lengthDic = globalDict.dict[word].ids.length;
        }

        var idf = Math.log(globalDict.addedIds.length / lengthDic);
        entry.score = tf * idf;
    });
}

function getScore(word,dict) {
    return dict[word].score;
}

function scoreSort(keys,dict) {
    keys.sort(function(a,b) {
        return (getScore(b,dict) - getScore(a,dict))
    });
}

function createWordKeys() {
    this.words.forEach( function(word){
        if (validate(word)){
            if (dict[word] == undefined) {
                dict[word] = {};
                dict[word].count = 1;
                dict[word].word = word;
                keys.push(word);
            } else {
                dict[word].count++;
            }
        }
    });
}


// chrome.browserAction.onClicked.addListener(function (tab) {
//     console.log('browserAction', tab);
//     chrome.tabs.create({'url': "/public/index.html" });
//
// })


////// Functions to Process the Incoming text

// A function to tokenize
function tokenize(text) {
    var arrayText = text.split(/\W+/);
    return arrayText;
}

// A function to validate a token
function validate(token) {
    return /\w{2,}/.test(token);
}

function hasNumbers(t) {
    return /\d/.test(t);
}

// ID NAMING PROCESS


function nomenclatureId(nodeEvent) {

    // Assigns a unique identifier as a string for every event -- This one works for branching
    // Events need to be passed in a chronological order

    var currentId = nodeEvent.id;
    var newPath = "";
    if (idObject[currentId]== undefined){
        idObject[currentId] = [{time : Date.now(), path:"0", url : "New Generation - 0"}];
    }

    // If the tab was closed

    if (nodeEvent.status == "Removed"){
        var maxGen = 0;
        idObject[currentId].forEach( function(e) {
            var arr = e.path.split("-");;
            if (maxGen < Number(arr[0])){
                maxGen = Number(arr[0]);
            }
        });
        newPath = (maxGen+1).toString();
        nodeEvent.url = "New Generation - " + newPath;
    }
    else if (nodeEvent.status == "Completed" && nodeEvent.openerid == undefined) {

        // CHECKING IF THE USER HAS GONE BACK TO VISIT AN OLD PAGE

        var lastItem = idObject[currentId].length -1;
        var lastItemPath = idObject[currentId][lastItem].path;
        var stringArray = lastItemPath.split("-");
        var startingPath = stringArray.shift();
        var allTabStrings = [];
        idObject[currentId].forEach(function(item){
            allTabStrings.push(item.path);
        });
        var stringIndex = -1;
        var matchingString = false;

        for (var i= stringArray.length-1; i >0 ; i=i-1) {
            var id_string = startingPath ;
            for (var j=0; j < i ; j++){
                id_string = id_string + '-' + stringArray[j];
            }
            stringIndex = allTabStrings.indexOf(id_string);
            if (idObject[currentId][stringIndex].url == nodeEvent.url){
                matchingString = true;
                break;
            }
        }


        if (matchingString) {
            newPath =  idObject[currentId][stringIndex].path;
        }
        else {
            // Searching the next in line to see if the page is present

            var maxBranch = -1;
            var nextBranchFound = false;
            allTabStrings.forEach( function(item,index) {
                var startString = item.slice(0,lastItemPath.length);
                if (startString == lastItemPath) {

                    var tempString = item.slice(lastItemPath.length+1,lastItemPath.length+6);

                    var tempArray = tempString.split('-');

                    var branchNb = tempArray[0];
                    if (branchNb != ""){
                        var branchInt = Number(branchNb);
                        if (branchInt>maxBranch){
                            maxBranch = branchInt;

                        }
                    }

                }
            });


            for (var j = 0; j < maxBranch + 1; j++) {
                var stringTest = lastItemPath + '-' + j;

                var indexLocated = allTabStrings.indexOf(stringTest);
                if (indexLocated >-1){

                    if (idObject[currentId][indexLocated].url == nodeEvent.url) {
                        nextBranchFound = true;
                        newPath = stringTest;
                    }
                }
            }
            if (nextBranchFound == false){
                newPath = lastItemPath + '-' + (maxBranch+1);
            }
        }
    }
    else if (nodeEvent.status == "Completed" && nodeEvent.openerid != undefined) {

        initTabs[nodeEvent.id]=true;
        // Check if there is a closing generation event
        var maxGen = 0;
        idObject[currentId].forEach( function(e) {
            var arr = e.path.split("-");;
            if (maxGen < Number(arr[0])){
                maxGen = Number(arr[0]);
            }
        });
        var stringNewGen = maxGen.toString();
        var GenerationUsed = false;
        idObject[currentId].forEach(function(item){
            var idDecomp = item.path.split('-');
            if (idDecomp[0] == maxGen.toString()){
                if (idDecomp[1] != "" && idDecomp[1] != undefined) {
                    GenerationUsed = true;
                }
            }
        });
        if (GenerationUsed) {
            newPath = (maxGen+1) + '-' + 0;
        }
        else {
            newPath = (maxGen) + '-' + 0;
        }
        var openerid = nodeEvent.openerid;
        if (idObject[openerid]==undefined) {
            idObject[openerid] = [{time : Date.now(), path:"0", url : "The id count has been restarted"}];
        }
        var lengthOpenerList = idObject[openerid].length-1;

        var openerIdString = idObject[openerid][lengthOpenerList].path;

        nodeEvent.openerpath = openerIdString;

    }
    nodeEvent.path = newPath;
    console.log(" THE NEWLY ASSIGNED ID:", newPath);
    idObject[currentId].push({time : Date.now(), path:newPath, url : nodeEvent.url});
    // console.log(" Done Renaming");

}
