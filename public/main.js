console.log("Main loaded");
var family_tree = {};


/** - - - - - - FUNCTIONS TO LOAD DATA
*/

function load_tree(){
    chrome.runtime.sendMessage({fn: "load_tree"}, function(response) {
    });
}

/* * - - - - - - - - EVENT LISTENERS
*/

chrome.runtime.onMessage.addListener(function(message,sender,sendResponse){
    if (message.fn == "tree_loaded"){
        console.log(message.param)
        family_tree = message.param;
        load_tabs();
        init_bfs("310","chrome://newtab/");
        treeData = tree_map["310"];
        all_d3();

    }
}
)

/* * - - - - - - - - - PAGE INIT
*/

load_tree();

function load_tabs(){
    var _alltabs = Object.keys(family_tree);
    add_options(_alltabs);
}

function add_options(all_tabs){
    //_.pull(all_tabs,"root","init");

    all_tabs.forEach(function(tab){
        if (if_complex_tree(tab)==true){
            var option = document.createElement("OPTION")
            option.setAttribute("value",tab);
            option.innerHTML=tab;


            document.getElementById("optionList").appendChild(option);
        }
    })

}

/** - - -  - - - -- DOM EVENT LISTENERS
*/
document.getElementById("optionList").addEventListener("change", function() {
    console.log("Displaying TAB:", this.value);
    var tab=this.value;
    var svgs = document.getElementsByTagName("svg");
    for(var j= 0 ; j<svgs.length;j++){
        svgs[j].parentNode.removeChild(svgs[j]);
    }
    init_bfs(tab,family_tree[tab].root);
    treeData = tree_map[tab];
    all_d3();
});

/** - - - - - - - - DATA PROCESSING FUNCTIONS
*/

// We work with d3
var tree_map ={};
var visited_nodes ={}

function look_for_id(){
    var id_arr = [];
    var _ids = Object.keys(family_tree);
    _ids.forEach(function(_id){
        var _items = Object.keys(family_tree[_id]);
        if (_items.length >3){
            id_arr.push({name:_id,count:_items.length});
        }
    })


    id_arr.sort(function(a,b){
        if (a.count >= b.count){
            return false;
        }
        else {
            return true;
        }
    })

    return id_arr;
}

function init_bfs(id,root_node){

    tree_map[id]={
        name:root_node,
        children:[]
    };
    visited_nodes[id]={}

    bfs(id,tree_map[id],root_node)
}

function bfs(id,map_obj,node){
    visited_nodes[id][node]=true;
    var children = Object.keys(family_tree[id][node].children)
    //console.log(children)
    for (var i=0; i<children.length;i++){
        var child = children[i];
        //console.log("child",child)
        if (visited_nodes[id][child]==true){

        }
        else {
            //console.log("map_obj",map_obj)
            map_obj.children.push({
                name:child,
                children:[]
            })


            console.log("bfs('%s','%s','%s')",id,map_obj.children[map_obj.children.length-1],node);

            bfs(id,map_obj.children[map_obj.children.length-1],child)
        }
    }


}
var complexity = 7; // Sets the minimum number of nodes necessary so that tab
// is available for display

function if_complex_tree(tab){
    if(Object.keys(family_tree[tab]).length>complexity+2){
        return true;
    }
    else {
        return false;
    }
}




function all_d3(){


// set the dimensions and margins of the diagram
var margin = {top: 100, right: 90, bottom: 50, left: 90},
width = 660 - margin.left - margin.right,
height = 500 - margin.top - margin.bottom;

// declares a tree layout and assigns the size
var treemap = d3.tree()
.size([width, height]);

//  assigns the data to a hierarchy using parent-child relationships
var nodes = d3.hierarchy(treeData);

// maps the node data to the tree layout
nodes = treemap(nodes);

// append the svg obgect to the body of the page
// appends a 'group' element to 'svg'
// moves the 'group' element to the top left margin
var svg = d3.select("body").append("svg")
  .attr("width", width + margin.left + margin.right)
  .attr("height", height + margin.top + margin.bottom),
g = svg.append("g")
  .attr("transform",
        "translate(" + margin.left + "," + margin.top + ")");

// adds the links between the nodes
var link = g.selectAll(".link")
.data( nodes.descendants().slice(1))
.enter().append("path")
.attr("class", "link")
.attr("d", function(d) {
   return "M" + d.x + "," + d.y
     + "C" + d.x + "," + (d.y + d.parent.y) / 2
     + " " + d.parent.x + "," +  (d.y + d.parent.y) / 2
     + " " + d.parent.x + "," + d.parent.y;
   });

// adds each node as a group
var node = g.selectAll(".node")
.data(nodes.descendants())
.enter().append("g")
.attr("class", function(d) {
  return "node" +
    (d.children ? " node--internal" : " node--leaf"); })
.attr("transform", function(d) {
  return "translate(" + d.x + "," + d.y + ")"; });

// adds the circle to the node
node.append("circle")
.attr("r", 10);

// adds the text to the node
node.append("text")
.attr("dy", ".35em")
.attr("y", function(d) { return d.children ? -20 : 20; })
.style("text-anchor", "middle")
.text(function(d) { return purl(d.data.name).data.attr.host; });
}
