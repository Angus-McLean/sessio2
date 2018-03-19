/*  FUNCTIONS TO DISPLAY THE BROWSING INFO
*/

function create_card(info){
    // input: info is an JSON
    // function: creates an html div that displays the info a search result
    // output: none

    /*
    info : {
        url:
        title:
        lastVisitTime:
        visitCount:
        transition:
        referringVisitId:
        visitId:

    }

    */
    var node = document.createElement("LI");
    var textnode = document.createTextNode(info.title);         // Create a text node
    node.appendChild(textnode);


    document.getElementById("search_list").appendChild(node)
}

function display_searches(_array){
    _array.forEach(function(e){
        create_card(e);
    })
}

function clear_list(){
    var box = document.getElementById("search_list")
    while (box.firstChild) {
  box.removeChild(box.firstChild);
    }

}

/** - - - - - - - - - - - - - - SESSION LAUNCHER
*/
