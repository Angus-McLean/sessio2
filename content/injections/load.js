/* - - - - - - - - - -  FUNCTIONS TO LOAD THE PREVIEW FROM THE BOOKMARK
*/

// This function is called from the bookmark in order to display the popup
function DisplaySession(identifier){
    var data = { fn: "openPreview", id: identifier };
    window.postMessage(data, "*");
}
