const places = "1234567890ET";
//holder for svg functions
var svg;
//full method collection
var bigmethodarr;

var stage = 6;
//clicked bell
var bell;
var palindromic = true;
//currently selected place notations
var chosen = [];
//as strings
var chosenstr = [];
var rightplace = true;
var highlightfalse = true;

var method;


$(function() {
  getmethods();
  $("svg").svg({onLoad: (o) => {svg = o;}});
  buildstart(6, false, true);
});


function getmethods() {
  $.get("methods.json", function(arr) {
    bigmethodarr = arr;
    console.log("lists retrieved");
  });
}

function cleargrid() {
  let ids = ["#falserects","#trebleline","#palindromelines","#fixedlines","#placenotation","#linklines","#treblecircles","#treblenums","#placebells","#placebellnums","#endbells","#endbellnums"];
  $("#methodgrid g").contents().remove();
}


function buildstart(n, plain, right) {
  stage = n;
  rightplace = right;
  //build treble path - plain hunt or treble bob hunt
  let treblepp = [1];
  let length = plain ? n*2 : n*4;
  let treblep = 1;
  chosen = [];
  for (let i = 0; i < length; i++) {
    let pn = "x";
    if ((plain && i%2 === 1) || i%4 === 3) {
      pn = [1,n];
    }
    if (!right || i%2 === 1) {
      chosen.push(pn);
    }
    let next = nextplace(treblep, pn);
    treblepp.push(next);
    treblep = next;
  }
  //console.log(treblepp);
  let treblepath = buildsvgpath(treblepp);
  svg.path($("#trebleline"), treblepath);
  
  chosenstr = chosen.map(e => e === "x" ? "x" : rowstring(e));
  
  //circles
  let endy = 10 + length*20;
  for (let p = 1; p <= n; p++) {
    let cx = p*16-6;
    
    if (p === 1) {
      svg.circle($("#treblecircles"), cx, 10, 6);
      svg.circle($("#treblecircles"), cx, endy, 6);
      svg.text($("#treblenums"), cx, 13, "1");
      svg.text($("#treblenums"), cx, endy+3, "1");
    } else {
      svg.circle($("#placebells"), cx, 10, 6);
      svg.circle($("#endbells"), cx, endy, 6);
      svg.text($("#placebellnums"), cx, 13, places[p-1]);
      svg.text($("#endbellnums"), cx, endy+3, places[p-1]);
    }
  }
  
  //line segments
  //for each change
  for (let i = 0; i < length; i++) {
    let pn = "x";
    if ((plain && i%2 === 1) || i%4 === 3) {
      pn = [1,n];
    }
    let tchunk = [treblepp[i],treblepp[i+1]];
    let flexible;
    //for each place
    for (let p = 1; p <= n; p++) {
      //only build segment if it's not treble
      if (p != treblepp[i]) {
        let id = "row"+i+"place"+p;
        let p2 = nextplace(p, pn);
        let points = {
          x1: p*16-6,
          y1: 10+i*20,
          x2: p2*16-6,
          y2: 30+i*20
        };
        let diffs = [Math.abs(p-tchunk[0]), Math.abs(p2-tchunk[1])];
        let element = "line"; //path (fixed) or line (flexible)
        if (right && i%2 === 0) {
          element = "path";
        } else if (p != p2 && diffs.every(num => num === 1)) {
          //crossing treble
          element = "path";
        } else {
          if (p === 1 && p2 === 1 && tchunk.includes(2)) {
            element = "path";
          }
          if (p === n && p2 === n && tchunk.includes(n-1)) {
            element = "path";
          }
        }
        
        if (element === "line") {
          flexible = true;
          let params = ["x1","y1","x2","y2"].map(k => points[k]);
          params.unshift($("#linklines"));
          params.push({id: id});
          svg.line(...params);
        } else if (element === "path") {
          //seriously I can't have a blank if statement???
          let path = ["M", points.x1, points.y1, "L", points.x2, points.y2].join(" ");
          svg.path($("#fixedlines"), path, {id: id});
        }
      }
    }
    if (flexible) {
      let pnopts = buildpnoptions(tchunk,n);
      if (pn === "x" && !right) {
        pnopts.unshift("x");
      }
      let pnstr = pn === "x" ? "x" : rowstring(pn);
      pnopts.sort((a,b) => a.length-b.length);
      let group = svg.group($("#placenotation"));
      let y = 25+i*20;
      let startx = 44 + n*16;
      if (palindromic) {
        let extra = length/2*5;
        if (right) extra /= 2;
        startx += extra;
      }
      for (let j = 0; j < pnopts.length; j++) {
        let text = svg.text(group, startx+j*50, y, pnopts[j]);
        if (pnopts[j] === pnstr) {
          $(text).addClass("selected");
        }
      }
    }
  }
  
  $("#placenotation g text").on("click", pnclick);
  $("#placebells circle,#placebellnums text").on("click", bellclick);
  if (palindromic) drawpalindrome();
  if (highlightfalse) buildfalse();
  //console.log();
}

function pnclick(e) {
  let points = [chosen.length/2-1,chosen.length-1]; //index of HL and LE
  //where was the click? row & pn
  let i = $(e.target).parent("g").index(); //index of <g>
  let pn = $(e.target).text();
  if (pn != chosenstr[i]) {
    //click was not on selected pn
    $(e.target).siblings().removeClass("selected");
    $(e.target).addClass("selected");
    chosenstr.splice(i,1,pn);
    chosen.splice(i,1,convertpn(pn));
    let pna = pn === "x" ? [] : pn.split("").map(bellnum);
    let rownum = rightplace ? i*2+1 : i;
    changepn(rownum, pna);
    if (palindromic && !points.includes(i)) {
      let j = points[1]-i-1;
      let k = $(e.target).index();
      $("#placenotation g:nth-child("+(j+1)+")").children().removeClass("selected");
      $("#placenotation g:nth-child("+(j+1)+") text:nth-child("+(k+1)+")").addClass("selected");
      chosenstr.splice(j,1,pn);
      chosen.splice(j,1,convertpn(pn));
      let othernum = rightplace ? j*2+1 : j;
      changepn(othernum, pna);
    }
    
    movecircles();
    if (highlightfalse) {
      $("#falserects").children().remove();
      buildfalse();
    }
    let full = getfullpn();
    method = findbypn(full,stage);
    let text = method ? method.name : "Unnamed method";
    $("#methodname").text(text);
  }
}

//pna is array, empty array for "x"
function changepn(row, pna) {
  let dir = 1;
  //animate the connecting lines
  for (let p = 1; p <= stage; p++) {
    let id = "#row"+row+"place"+p;
    if ($(id)) {
      let p2;
      if (pna.includes(p)) {
        p2 = p;
      } else {
        p2 = p+dir;
        dir*=-1;
      }
      let x = p2*16 - 6;
      $(id).animate({svgX2: x}, 600);
    }
  }
  
  if (bell) {
    $("path.highlight,line.highlight").removeClass("highlight");
    modifypath(bell, "highlight");
  }
}

function movecircles() {
  let lh = getleadhead();
  let lhstr = rowstring(lh);
  ["circle","path","line"].forEach(w => {
    $(w+".hunt").removeClass("hunt");
  });
  for (let j = 2; j <= stage; j++) {
    let p = lh.indexOf(j);
    let cx = 16*p + 10;
    $("#endbells circle:nth-child("+(j-1)+")").animate({svgCx: cx}, 600);
    $("#endbellnums text:nth-child("+(j-1)+")").animate({svgX: cx}, 600);
    if (p === j-1) { //!places.includes(lhstr) && 
      $("#placebells circle:nth-child("+(j-1)+")").addClass("hunt");
      $("#endbells circle:nth-child("+(j-1)+")").addClass("hunt");
      modifypath(j, "hunt");
    }
  }
}

function bellclick(e) {
  let i = $(e.target).index();
  if (i+2 === bell) {
    //clear highlight
    ["circle","path","line"].forEach(w => {
      $(w+".highlight").removeClass("highlight");
    });
    bell = null;
  } else {
    $("#placebells circle:nth-child("+(i+1)+")").addClass("highlight");
    $("#endbells circle:nth-child("+(i+1)+")").addClass("highlight");
    modifypath(i+2, "highlight");
    bell = i+2;
  }
}

//draw rectangles under false rows
function buildfalse() {
  let rows = buildlead().map(r => rowstring(r));
  rows.unshift(places.slice(0,stage));
  let index = {};
  for (let i = 0; i < rows.length; i++) {
    let r = rows[i];
    if (index[r] > -1) {
      //false!
      if (index[r] != 0 || i < rows.length-1) {
        svg.rect($("#falserects"), 10, 2+i*20, (stage-1)*16, 16);
      }
    } else {
      index[r] = i;
    }
  }
}

//draw lines connecting same place notations
function drawpalindrome() {
  let startx = 40 + stage*16 + chosen.length/2*5;
  let centery = 20 * chosen.length/2;
  if (rightplace) centery *= 2;
  for (let i = 1; i < chosen.length/2; i++) {
    let diffy = (rightplace ? 40 : 20)*i;
    let path = ["M", startx, centery-diffy, "h", -5*i, "v", diffy*2, "h", 5*i].join(" ");
    svg.path($("#palindromelines"), path);
  }
}

//given a bell and a class, find the bell lines and add the class to them
function modifypath(b, c) {
  let rows = buildlead();
  let path = [b];
  
  for (let i = 0; i < rows.length; i++) {
    let p = rows[i].indexOf(b)+1;
    path.push(p);
  }
  
  for (let j = 0; j < path.length; j++) {
    let id = "#row"+j+"place"+path[j];
    if ($(id)) {
      $(id).addClass(c);
    }
  }
}

//pp is array of place numbers
function buildsvgpath(pp) {
  let current = pp[0];
  let path = ["M", -6+16*current, "10"].join(" ");
  for (let i = 1; i < pp.length; i++) {
    let p = pp[i];
    if (p === current) {
      path += " v 20";
    } else if (p > current) {
      path += " l 16 20";
    } else if (p < current) {
      path += " l -16 20";
    }
    current = p;
  }
  return path;
}


// **** BELLRINGING STUFF ****

//convert bell characters to numbers
function bellnum(n) {
  return places.indexOf(n)+1;
}

//convert array of bell numbers to string of characters
function rowstring(arr) {
  let r = arr.map(n => places[n-1]);
  return r.join("");
}

//convert pn string to either "x" or array of bell numbers
function convertpn(str) {
  if (str === "x") {
    return "x";
  } else {
    return str.split("").map(bellnum);
  }
}

//take my processed pn and make a string
function pnstring(pn) {
  let str = "";
  let nums;
  pn.forEach(e => {
    if (e === "x") {
      str += "-";
      nums = false;
    } else {
      if (nums) str += ".";
      str += rowstring(e);
      nums = true;
    }
  });
  return str;
}

function findbypn(pn, pnstage) {
  let pnstr = pnstring(pn);
  let possible = bigmethodarr.filter(m => m.stage === pnstage);
  let match = possible.find(m => pnstring(m.plainPN) === pnstr);
  return match;
}

//given two treble places, build possible changes
function buildpnoptions(pp, stage) {
  let allopts = buildpns(stage, 2);
  let opts = [];
  if (pp[0] === pp[1]) {
    opts = allopts.filter(a => a.includes(pp[0]));
  } else {
    let sub = allopts.filter(a => !a.includes(pp[0]) && !a.includes(pp[1]));
    let min = Math.min(...pp);
    let dodging = Math.min(...pp)%2 === 1; //are the treble places dodging places or a cross section
    sub.forEach(a => {
      let num = a.filter(n => n < min).length;
      if (dodging) {
        if (num%2 === 0) opts.push(a);
      } else {
        if (num%2 === 1) opts.push(a);
      }
    });
  }
  return opts.map(a => rowstring(a));
}

//build place notation options
//only even stages
//maximum of four places, "x" is not included
function buildpns(stage, level) {
  let pns = [];
  for (let p = 1; p < stage; p+=2) {
    for (let q = p+1; q <= stage; q += 2) {
      let pn = [p,q];
      pns.push(pn);
      if (level === 2 && q < stage-1) {
        let left = stage-q;
        let nest = buildpns(left, 1);
        nest.forEach(a => {
          let npn = pn.concat(a.map(n => n+q));
          pns.push(npn);
        });
      }
    }
  }
  return pns;
}

function getleadhead() {
  let arr = buildlead();
  return arr[arr.length-1];
}

function buildlead() {
  let row = places.slice(0,stage).split("").map(bellnum);
  let pn = getfullpn();
  return buildrows(row, pn);
}

//if the grid is set to rightplace, pn will be abbreviated
function getfullpn() {
  let pn = [];
  for (let i = 0; i < chosen.length; i++) {
    if (rightplace) pn.push("x");
    pn.push(chosen[i]);
  }
  return pn;
}

function buildrows(prev, pn) {
  let rows = [];
  pn.forEach(e => {
    let r = applypn(prev, e);
    rows.push(r);
    prev = r;
  });
  return rows;
}


//given a row and a change, apply the change
//row could be array or string, but since the result is an array array would be better
function applypn(row, pn) {
  let next = [];
  let dir = 1;
  for (let p = 0; p < row.length; p++) {
    if (pn === "x" || !pn.includes(p+1)) {
      next.push(row[p+dir]);
      dir *= -1;
    } else if (pn.includes(p+1)) {
      next.push(row[p]);
    }
  }
  return next;
}

//given a place and a change, determine place after the change
function nextplace(p, pn) {
  let p2, dir;
  if (pn === "x") {
    dir = p%2 === 0 ? -1 : 1;
    p2 = p+dir;
  } else if (pn.includes(p)) {
    p2 = p;
  } else {
    dir = 1;
    let i = 1;
    do {
      if (i === p) {
        p2 = p+dir;
      } else {
        if (!pn.includes(i)) {
          dir*=-1;
        }
      }
      i++;
    } while (i <= p);
  }
  return p2;
}





