console.log("Main loaded");
/**  - - - - - --  GLOBAL VARIABLES
*/

var family_tree = {}; // Stores all the data for the nodes

var complexity = 1; // Sets the minimum number of nodes necessary so that tab
// is available for display

var tree_map ={}; // Construction plans for d3 trees

var visited_nodes ={}; // JSON used in the Depth First Search

var url_to_id = {};

var id_to_url = {};

var selected_nodes = {}; // False or true for each node id


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
        init_dfs("300","chrome://newtab/");
        treeData = tree_map["300"];
        redraw();

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


    init_dfs(tab,family_tree[tab].root);
    treeData = tree_map[tab];
    redraw();
});

/** - - - - - - - - DATA PROCESSING FUNCTIONS
*/

// We work with d3



var counter = 0;
function init_dfs(id,root_node){
    // Function to initiate the contruction of the JSON
    // to display the tree

    if (tree_map[id] != undefined){
        // The tree_map was already constructed
    }
    else{
        tree_map[id]={
            name:root_node,
            children:[]
        };
        visited_nodes[id]={}

        dfs(id,tree_map[id],root_node)
    }

}

function dfs(id,map_obj,node){
    // Depth First Search Algorithm
    counter++;
    // Creating unique identifiers for each node
    url_to_id[node]=counter;
    id_to_url[counter]=node;

    visited_nodes[id][node]=true;
    var children = Object.keys(family_tree[id][node].children)
    //console.log(children)
    for (var i=0; i<children.length;i++){
        var child = children[i];
        //console.log("child",child)
        if (visited_nodes[id][child]==true){

        }
        else {

            // - - - Begining of Function Execute - - - -

            map_obj.children.push({
                name:child,
                children:[]
            })

            // - - - End of Function - - - -

            // console.log("dfs('%s','%s','%s')",id,map_obj.children[map_obj.children.length-1],node);

            dfs(id,map_obj.children[map_obj.children.length-1],child)
        }
    }
}


function if_complex_tree(tab){
    // Function to filter tab that dont possess enough nodes
    if(Object.keys(family_tree[tab]).length>complexity+2){
        return true;
    }
    else {
        return false;
    }
}


var svg,nodes;

function redraw(){

    var svg = document.getElementById("visual_svg");

    if (svg != undefined){svg.parentNode.removeChild(svg);}

    svg = d3.select("#right_panel").append("svg").attr("id","visual_svg");
    // Function that contains all the display code for the tree

    // set the dimensions and margins of the diagram
    var margin = {top: 100, right: 10, bottom: 100, left: 10},
    width = innerWidth - margin.left - margin.right -300,
    height = innerHeight - margin.top - margin.bottom-50;

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


      svg.attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom),
    g = svg.append("g")
      .attr("transform",
            "translate(" + margin.left + "," + margin.top + ")");
    console.log(nodes.descendants().slice(1))
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
        //console.log(d)
      return "node" +
        (d.children ? " node--internal" : " node--leaf"); })
    .attr("transform", function(d) {
      return "translate(" + d.x + "," + d.y + ")"; });

    node.append("circle")
    .attr("id",function(d){
        return "hi_"+url_to_id[d.data.name];
    })
    .attr("class","highlight")
    .style("opacity",1)
    .attr("r", 15);


    // adds the circle to the node
    node.append("circle")
    .attr("class","circle")
    .attr("r", 15)
    .on("click",function(d){
        node_select(d.data.name);
    });

    // adds the text to the node
    node.append("text")
    .attr("dy", ".35em")
    .attr("y", function(d) { return d.children ? -20 : 20; })
    .style("text-anchor", "middle")
    .text(function(d) { return purl(d.data.name).data.attr.host; });

    svg.on("mousedown",function(){
        var begin_coord = d3.mouse(this);


        svg.append("rect")
            .attr("id","selec_box")
            .attr("x",begin_coord[0])
            .attr("y",begin_coord[1])
            .attr("width",0)
            .attr("height",0);


            svg.on("mousemove", mousemove)
            .on("mouseup", mouseup);

            d3.event.preventDefault();

            function mousemove(){
                var new_coord = d3.mouse(this);

                if(begin_coord[0]<new_coord[0]){
                    d3.select("#selec_box")
                    .attr("x",begin_coord[0])
                    .attr("width",new_coord[0]-begin_coord[0])
                }
                else {
                    d3.select("#selec_box")
                    .attr("x",new_coord[0])
                    .attr("width",begin_coord[0]-new_coord[0])
                }

                if(begin_coord[1]<new_coord[1]){
                    d3.select("#selec_box")
                    .attr("y",begin_coord[1])
                    .attr("height",new_coord[1]-begin_coord[1])
                }
                else {
                    d3.select("#selec_box")
                    .attr("y",new_coord[1])
                    .attr("height",begin_coord[1]-new_coord[1])
                }
            }

            function mouseup(){
                var new_coord = d3.mouse(this);
                svg.on("mousemove", null).on("mouseup", null);
                d3.select("#selec_box").remove();
                node_contained(begin_coord,new_coord);
            }

    });

    function highlight(name){
        d3.select("#hi_"+url_to_id[name])
        .style("opacity",1)
        .attr("r",20);
    }

    function unhighlight(name){
        d3.select("#hi_"+url_to_id[name])
        .style("opacity",1)
        .attr("r",15);
    }

    function node_select(name){
        var _id = url_to_id[name];
        selected_nodes[_id]= !selected_nodes[_id];
        selected_nodes[_id] ? highlight(name) : unhighlight(name);
        display_boxes();
    }

    function check_selection(){
        var _nodes = nodes.descendants();
        var _slc = false;
        _nodes.forEach(function(_node){
            if(selected_nodes[url_to_id[_node.data.name]]){
                _slc=true;
            }
        })
        // console.log("Is shit selected", _slc);
        return _slc;
    }

    function display_boxes(){

        // console.log(check_selection())
        if(check_selection()){
            // console.log("Display buttons")
            d3.selectAll(".book_bts")
            .classed("active", true);
        }
        else{
            d3.selectAll(".book_bts")
            .classed("active", false);
        }
    }

    function node_contained(coord1,coord2){
        var a = [],
            b = [];

        if (coord1[0]<=coord2[0]){
            a[0]=coord1[0];
            b[0]=coord2[0];
        }
        else {
            a[0]=coord2[0];
            b[0]=coord1[0];
        }

        if (coord1[1]<=coord2[1]){
            a[1]=coord1[1];
            b[1]=coord2[1];
        }
        else {
            a[1]=coord2[1];
            b[1]=coord1[1];
        }
        a[0]=a[0]-margin.left;
        a[1]=a[1]-margin.top;
        b[0]=b[0]-margin.left;
        b[1]=b[1]-margin.top;

        //console.log(a,b)
        // console.log(nodes.descendants())
        var _nodes = nodes.descendants();
        _nodes.forEach(function(_node){
        //    console.log(_node)
            check_if_contained(_node.data.name,_node.x,_node.y,a,b)
        })

    }
    function check_if_contained(name,x,y,a,b){
        // console.log(a[0],x,b[0],a[1],y,b[1])
        if(a[0]<x && x<b[0] && a[1]<y && y<b[1]){
            // console.log("satisfied")
            node_select(name);
            // console.log(name)
        }
    }
}


// Functions that interact with the d3 window




window.addEventListener("resize", redraw);


/** - - - - - - - - - UTILITIES FUNCTIONS
*/


function sort_tabs_by_node_count(){
    // Returns a sorted array of the tabs with the most nodes

    var id_arr = [];
    var _ids = Object.keys(family_tree);
    _ids.forEach(function(_id){
        var _items = Object.keys(family_tree[_id]);
        if (_items.length >3){
            id_arr.push({name:_id,count:_items.length});
        }
    })


    id_arr.sort(function(a,b){
        return !(a.count >= b.count);
    })

    return id_arr;
}


function check_for_selected(){

}


// // Embellish the DOM
// $(document).ready(function() {
//   $('select').niceSelect();
// });
