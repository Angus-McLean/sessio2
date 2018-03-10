document.getElementById("controller").onchange= function(){
    var _query = document.getElementById("query_text");
    var _size = document.getElementById("results");
    console.log("Query Text: ",_query.value,   "Size: ", _size.value)
    update_search({query: _query.value,size:_size.value});
}
