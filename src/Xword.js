// @flow
import React, { Component } from 'react';
import Modal from 'react-modal';
import FileInput from './FileInput.js';
import Server from './Server.js';
import './Xword.css';

// . undo/redo
// . webworker impl
// . test fill
// . menu
// . export as xd/puz/pdf
// . fill specific entry
//   . don't fill the score!
// . hint entry
// . difficulty grade
var Xd = require("./xd.js");
var Puz = require("./puz.js");
var Xpf = require("./xpf.js");
var Filler = require("./fill.js");

class XwordClue {
  state: {
    index: number,
    direction: string,
    number: number,
    clue: string,
    answer: string,
    active: boolean,
    crossActive: boolean
  };

  constructor(options) {
    this.state = {
      'index': 0,
      'direction': 'A',
      'number': 0,
      'clue': '',
      'answer': '',
      'active': false,
      'crossActive': false,
    };
    Object.assign(this.state, options);
  }
  setState(newstate) {
    Object.assign(this.state, newstate);
  }
  get(key) : any {
    return this.state[key];
  }
}

class XwordCell {
  state: {
    fill: string,
    entry: string,
    committed: boolean,
    active: boolean,
    focus: boolean,
    circled: boolean,
    number: number,
    version: number,
    modified: boolean,
    free: boolean,
  };

  constructor(options) {
    this.state = {
      fill: '.',
      entry: ' ',
      active: false,
      committed: false,
      focus: false,
      circled: false,
      version: 0,
      modified: false,
      free: true,
      number: 0,
    };
    Object.assign(this.state, options);
  }
  setState(newstate) {
    Object.assign(this.state, newstate);
  }
  get(key) : any {
    return this.state[key];
  }
  isBlack() : boolean {
    return this.state.fill === '#';
  }
}

function Title(props) {
  var title = props.title;
  var author = props.author ? " by " + props.author : "";

  return (
      <div className={"xwordjs-title"}>
        <span className={"xwordjs-title-text"}>{title}</span>
        <span className={"xwordjs-author-text"}>{author}</span>
      </div>
  );
}

function FillItem(props) {
  var without_score = props.value;
  if (without_score.indexOf(" ") > 0) {
    without_score = props.value.substr(0, without_score.indexOf(" "));
  }
  return (
    <div className={"xwordjs-fill"} onClick={() => props.onClick(without_score)}>{props.value}</div>
  );
}

function FillList(props) {

  var items = [];
  for (var i=0; i < props.value.length; i++) {
    items.push(<FillItem key={"item" + i} value={props.value[i]} onClick={(x) => props.fillEntry(x)}/>);
  }
  return (
    <div id="xwordjs-fill-list-container" className="xwordjs-fill-list-container">
      <div className="xwordjs-fill-list">{items}</div>
    </div>
  );
}

class Grid extends Component {
  render() {
    var rows = [];
    for (var i=0; i < this.props.height; i++) {
      var row_cells = [];
      for (var j=0; j < this.props.width; j++) {
        var ind = i * this.props.width + j;
        var fill = this.props.cells[ind].get('fill');
        var entry = this.props.cells[ind].get('entry');
        var active = this.props.cells[ind].get('active');
        var focus = this.props.cells[ind].get('focus');
        var circled = this.props.cells[ind].get('circled');
        var number = this.props.cells[ind].get('number') || '';
        var black = fill === '#';

        if (fill === '#' || fill === '.') {
          fill = ' ';
        }
        var cell = <Cell id={"cell_" + ind} value={entry} key={"cell_" + ind}
         isBlack={black} isActive={active} isFocus={focus}
         isCircled={circled}
         isTop={i===0} isLeft={j===0} number={number}
         onClick={(x)=>this.props.handleClick(parseInt(x.substring(5), 10))}/>;
        row_cells.push(cell);
      }
      rows[i] = <div className="xwordjs-grid-row" key={"row_" + i}>{row_cells}</div>;
    }
    return (
      <div id="xwordjs-grid-inner">{rows}</div>
    );
  }
}

function MobileKeyboardKey(props) {
  return <div className="xwordjs-keyboard-key" onClick={() => props.onClick(props.code)}>{props.value}</div>;
}

function MobileKeyboard(props) {
  var keys = ["qwertyuiop", "asdfghjkl", "␣zxcvbnm⌫"];
  var rows = [];
  for (var i=0; i < keys.length; i++) {
    var rowstr = keys[i];
    var row_keys = [];
    for (var j=0; j < rowstr.length; j++) {
      var ch = rowstr.charAt(j);
      var code;
      if (ch === '␣') {
        code = 0x20;
      } else if (ch === '⌫') {
        code = 0x8;
      } else {
        code = ch.charCodeAt(0);
      }
      var key = <MobileKeyboardKey key={ch} onClick={props.onClick} code={code} value={ch}/>;
      row_keys.push(key);
    }
    rows[i] = <div className="xwordjs-keyboard-row" key={i}>{row_keys}</div>;
  }
  return (
    <div className="xwordjs-keyboard">{rows}</div>
  );
}

function Cell(props) {
  var classname="xwordjs-cell";
  if (props.isTop) {
    classname += " xwordjs-cell-top";
  }
  if (props.isLeft) {
    classname += " xwordjs-cell-left";
  }
  if (props.isActive) {
    classname += " xwordjs-cell-active";
  }
  if (props.isFocus) {
    if (props.isBlack)
      classname += " xwordjs-cell-focus-black";
    else
      classname += " xwordjs-cell-focus";
  } else if (props.isBlack) {
    classname += " xwordjs-cell-black";
  }
  var circleclass = "";
  if (props.isCircled) {
    circleclass = "xwordjs-cell-circled";
  }

  return <div className={classname} onClick={() => props.onClick(props.id)}>
            <div className={circleclass}>
              <div className="xwordjs-cell-number">{props.number}</div>
              <div className="xwordjs-cell-text">{props.value}</div>
            </div>
          </div>;
}

class Mutation {
  start_cell: number;
  direction: number;
  fill: string;

  constructor(start_cell: number, direction: number, fill: string)
  {
    this.start_cell = start_cell;
    this.direction = direction;
    this.fill = fill;
  }
}

class XwordMain extends Component {

  state: {
    height: number,
    width: number,
    cells: Array<XwordCell>,
    title: string,
    author: string,
    activecell: number,
    direction: string,
    construct: boolean,
    version: number,
    solutionId: ?string,
    dismissed_modal: boolean,
    modified: boolean,
    fills: Array<string>,
    numFills: number,
    server: ?Server,
    filler: Filler.filler,
    undo: Array<Mutation>
  };
  closeModal: Function;
  showAnswers: Function;
  serverUpdate: Function;
  clearUncommitted: Function;
  fill: Function;
  fillEntry: Function;

  constructor() {
    super();
    this.state = {
      'height': 15,
      'width': 15,
      'cells': [],
      'title': '',
      'author': '',
      'activecell': 0,
      'direction': 'A',
      'cell_to_clue_table': [],
      'clue_to_cell_table': [],
      'dismissed_modal': false,
      filler: new Filler.filler('', new Filler.wordlist([])),
      modified: false,
      version: 1,
      fills: [],
      numFills: 0,
      construct: false,
      solutionId: null,
      server: null,
      undo: [],
    }
    this.closeModal = this.closeModal.bind(this);
    this.showAnswers = this.showAnswers.bind(this);
    this.serverUpdate = this.serverUpdate.bind(this);
    this.fill = this.fill.bind(this);
    this.fillEntry = this.fillEntry.bind(this);
    this.clearUncommitted = this.clearUncommitted.bind(this);
  }
  loadServerPuzzle(id: string) {
    if (!process.env.REACT_APP_HAS_SERVER)
      return;

    var self = this;
    var server = new Server({base_url: process.env.PUBLIC_URL})
    server
      .getSolution(id)
      .then(function(obj) {
        return server.getPuzzle(obj.PuzzleId)
      })
      .then(function(data) {
        var decoder = new TextDecoder('utf-8');
        var puz = new Xpf(decoder.decode(data));
        document.location.hash = id;
        self.setState({solutionId: id, server: server});
        self.puzzleLoaded(id, puz);
        server.connect(id, self.serverUpdate);
        server.sendSolution(id, -1, '');
      });
  }
  loadPuzzle(file: File, filename : ?string) {
    var self = this;
    if (process.env.REACT_APP_HAS_SERVER) {
      var server = new Server({base_url: process.env.PUBLIC_URL})
      server.uploadPuzzle(file)
        .then(function(obj) {
          var id = obj.Id;
          return server.startSolution(id);
        })
        .then(function(obj) {
          var solutionId = obj.Id;
          self.loadServerPuzzle(solutionId);
        });
    } else {
      this.loadPuzzleURL(window.URL.createObjectURL(file), filename);
    }
  }
  newPuzzle(width : number, length: number) {
    var maxx = width;
    var maxy = length;
    var cells = new Array(maxx * maxy);
    for (var i=0; i < maxx * maxy; i++) {
      cells[i] = new XwordCell();
    }

    var now = new Date();
    var year = now.getFullYear();
    var month = "" + (now.getMonth() + 1);
    if (month.length < 2) {
      month = "0" + month;
    }
    var day = "" + now.getDay();
    if (day.length < 2) {
      day = "0" + day;
    }

    var datestr = year + "-" + month + "-" + day;
    var title = 'Untitled - ' + datestr;

    this.setState({
      'title': title, 'author': 'unknown',
      'width': maxx, 'height': maxy, 'cells': cells,
      construct: true
    });
    this.resizeScrollPane();
  }
  loadWordlist() {
    var self = this;

    // $FlowFixMe
    var url = process.env.PUBLIC_URL + "XwiWordList.txt";
    var request = new Request(url);
    fetch(request).then(function(response) {
      return response.arrayBuffer();
    }).then(function(data) {
      // $FlowFixMe
      var text = new TextDecoder('utf-8').decode(data);
      self.setState({filler: new Filler.filler('', new Filler.wordlist(text.trim().split("\n")))});
    });
  }
  getFillerString() : string {
    var grid = '';
    for (var i = 0; i < this.state.cells.length; i++) {
      var ch = this.state.cells[i].get('entry');
      if (this.state.cells[i].isBlack())
        ch = '#';
      else if (ch === ' ')
        ch = '.';
      grid += ch;
      if ((i + 1) % this.state.width == 0)
        grid += "\n";
    }
    return grid;
  }
  updateFills(activecell: number, direction: string) {
    var [x, y] = this.cellPos(activecell);
    var dir = direction === 'A' ? 0 : 1;

    console.log("update fills: " + x + ", " + y + " " + dir);

    var filler = this.state.filler;
    var result = filler.getFills(x, y, dir);
    var numFills = filler.estimatedFills();

    this.setState({fills: result, numFills: numFills});
  }
  clearUncommitted() {
    for (var i=0; i < this.state.cells.length; i++) {
      if (!this.state.cells[i].get('committed')) {
        this.state.cells[i].setState({entry: ' '});
      }
    }
    this.setState({'cells': this.state.cells.slice()});
  }
  fill() {
    var grid = this.getFillerString();

    var filler = this.state.filler;
    var result = filler.fill();
    var rows = result.trim().split("\n");
    for (var i = 0; i < rows.length; i++) {
      for (var j = 0; j < rows[i].length; j++) {
        var cell_id = this.state.height * i + j;
        var entry = rows[i].charAt(j);
        if (entry === '#' || entry === '.')
          continue;
        this.state.cells[cell_id].setState({entry: entry});
      }
    }
    this.setState({'cells': this.state.cells.slice()});
  }
  loadPuzzleURL(url: string, filename : ?string) {
    var self = this;
    var request = new Request(url);
    fetch(request).then(function(response) {
      return response.arrayBuffer();
    }).then(function(data) {
      var puz;
      var fn = filename || url;
      if (fn.endsWith("xd")) {
        var decoder = new TextDecoder('utf-8');
        // $FlowFixMe decode handles ArrayBuffer too
        puz = new Xd(decoder.decode(data));
        self.puzzleLoaded(url, puz);
      } else if (fn.endsWith("xml") || url.match(/^http/)) {
        var decoder = new TextDecoder('utf-8');
        // $FlowFixMe decode handles ArrayBuffer too
        puz = new Xpf(decoder.decode(data));
        self.puzzleLoaded(url, puz);
      } else {
        puz = new Puz(data);
        self.puzzleLoaded(url, puz);
      }
    });
  }
  cellPos(clue_id: number) {
    var y = Math.floor(clue_id / this.state.width);
    var x = clue_id % this.state.width;
    return [x, y];
  }
  cellId(x: number, y: number) : number {
    return y * this.state.width + x;
  }
  cellAt(x: number, y: number) : XwordCell {
    return this.state.cells[this.cellId(x, y)];
  }
  clueCells(cell_id: number, direction: string) {
    var xincr = 0, yincr = 0;
    if (direction === 'A') {
      xincr = 1;
    } else {
      yincr = 1;
    }
    var [x, y] = this.cellPos(cell_id);
    var cells = [];
    for (var j = 0; y < this.state.height && x < this.state.width; j++) {
      var cell = this.cellAt(x, y);
      if (cell.isBlack())
        break;
      cells.push(this.cellId(x, y));
      x += xincr; y += yincr;
    }
    return cells;
  }
  navRight() {
    var [x, y] = this.cellPos(this.state.activecell);
    if (x < this.state.width) {
      x += 1;
    }
    if (x === this.state.width)
      return;

    var activecell = y * this.state.width + x;
    this.selectCell(activecell, this.state.direction);
  }
  navLeft() {
    var [x, y] = this.cellPos(this.state.activecell);
    if (x >= 0) {
      x -= 1;
    }
    if (x < 0)
      return;

    var activecell = y * this.state.width + x;
    this.selectCell(activecell, this.state.direction);
  }
  navUp() {
    var [x, y] = this.cellPos(this.state.activecell);
    if (y >= 0) {
      y -= 1;
    }
    if (y < 0)
      return;
    var activecell = y * this.state.width + x;
    this.selectCell(activecell, this.state.direction);
  }
  navDown() {
    var [x, y] = this.cellPos(this.state.activecell);
    if (y < this.state.height) {
      y += 1;
    }
    if (y === this.state.height)
      return;

    var activecell = y * this.state.width + x;
    this.selectCell(activecell, this.state.direction);
  }
  navNextClue() {
    var dind = (this.state.direction === 'A') ? 0 : 1;
    var cur_cell_id = this.state.activecell;
  }
  navPrevClue() {
    var dind = (this.state.direction === 'A') ? 0 : 1;
    var cur_cell_id = this.state.activecell;
  }
  navNext() {
    var dind = (this.state.direction === 'A') ? 0 : 1;
    var cur_cell_id = this.state.activecell;

    var [x, y] = this.cellPos(cur_cell_id);
    if (this.state.direction === 'A')
      x += 1;
    else
      y += 1;

    if (x >= this.state.width || y >= this.state.height)
      return;

    var activecell = y * this.state.width + x;
    this.selectCell(activecell, this.state.direction);
  }
  navPrev() {
    var dind = (this.state.direction === 'A') ? 0 : 1;
    var cur_cell_id = this.state.activecell;

    var [x, y] = this.cellPos(cur_cell_id);
    if (this.state.direction === 'A')
      x -= 1;
    else
      y -= 1;

    if (x < 0 || y < 0)
      return;

    var activecell = y * this.state.width + x;
    this.selectCell(activecell, this.state.direction);
  }
  switchDir() {
    var dir = this.state.direction === 'A' ? 'D' : 'A';
    this.selectCell(this.state.activecell, dir);
  }
  type(ch: string) {
    var cell = this.state.cells[this.state.activecell];

    cell.setState({'entry': ch, 'version': cell.get('version') + 1, committed: true});
    this.setState({modified: true})
    this.saveStoredData();
    this.navNext();
  }
  del() {
    var cell = this.state.cells[this.state.activecell];

    cell.setState({'entry': ' ', 'version': cell.get('version') + 1, committed: true});
    this.setState({modified: true})
    this.saveStoredData();
    this.selectCell(this.state.activecell, this.state.direction);
  }
  backspace() {
    var cell = this.state.cells[this.state.activecell];
    cell.setState({'entry': ' ', 'version': cell.get('version') + 1, committed: true});
    this.setState({modified: true})
    this.saveStoredData();
    this.navPrev();
  }
  isCorrect() {
    for (var i=0; i < this.state.cells.length; i++) {
      var cell = this.state.cells[i];
      var fill = cell.get('fill');
      var entry = cell.get('entry');

      if (fill !== '#' && entry !== fill)
        return false;
    }
    return true;
  }
  processKeyCode(keyCode: number, shift: boolean, ctrl: boolean)
  {
    // ctrl-z
    if (ctrl && keyCode == 0x5a)
    {
      this.undo();
      return true;
    }

    // A-Z
    if ((keyCode >= 0x41 && keyCode <= 0x5a) ||
        (keyCode >= 0x61 && keyCode <= 0x7a)) {
      var ch = String.fromCharCode(keyCode)
      this.type(ch.toUpperCase());
      return true;
    }

    switch (keyCode) {
      case 0x8:
        this.backspace();
        return true;
      case 0x9:
        if (!shift)
          this.navNextClue();
        else
          this.navPrevClue();
        return true;
      case 0x20:
        this.switchDir();
        return true;
      case 0x25:
        this.navLeft();
        return true;
      case 0x26:
        this.navUp();
        return true;
      case 0x27:
        this.navRight();
        return true;
      case 0x28:
        this.navDown();
        return true;
      case 0x2e:
        this.del();
        return true;
      case 0xbe: // '.'
        this.toggleBlank();
      default:
        return false;
    }
  }
  handleKeyDown(e: KeyboardEvent) {
    if (e.altKey)
      return;

    if (this.state.direction === 'A' && (e.keyCode === 0x26 || e.keyCode === 0x28)) {
      this.selectCell(this.state.activecell, 'D');
      e.preventDefault();
      return;
    }
    if (this.state.direction === 'D' && (e.keyCode === 0x25 || e.keyCode === 0x27)) {
      this.selectCell(this.state.activecell, 'A');
      e.preventDefault();
      return;
    }
    if (this.processKeyCode(e.keyCode, e.shiftKey, e.ctrlKey)) {
      e.preventDefault();
    }
  }
  undo() {
    var mutation;

    if (!this.state.undo.length)
      return;
    
    mutation = this.state.undo.pop();

    var [x, y] = this.cellPos(mutation.start_cell);
    var x_incr = !mutation.direction;
    var y_incr = mutation.direction;
    var value = mutation.fill;

    var orig_str = '';
    for (var i = 0; i < value.length; i++, x += x_incr, y += y_incr) {
      var cell_id = y * this.state.width + x;
      this.state.cells[cell_id].setState({entry: value[i], committed: true});
    }
    this.setState({'cells': this.state.cells.slice(), 'undo': this.state.undo.slice()});
  }
  toggleBlank() {
    var i = this.state.activecell;
    var dir = this.state.direction;

    var [x,y] = this.cellPos(i);
    var cell = this.state.cells[i];
    var black = cell.isBlack();
    var fill = black ? ' ' : '#';
    cell.setState({fill: fill});

    var symx = this.state.width - x - 1;
    var symy = this.state.height - y - 1;
    cell = this.state.cells[this.state.width * symy + symx];
    cell.setState({fill: fill});

    this.setState({cells: this.state.cells.slice()});
    this.saveStoredData();
    this.updateFills(i, dir);
  }
  handleClick(i: number) {
    if (this.state.activecell === i) {
      this.switchDir();
    } else {
      this.selectCell(i, this.state.direction);
    }
  }
  puzzleLoaded(url: string, puz: Object) {
    var grid = puz.grid;
    var flags = puz.flags;
    var maxx = grid[0].length;
    var maxy = grid.length;
    var i;
    var title = 'Untitled';
    var author = 'Unknown';

    for (i=0; i < puz.headers.length; i++) {
      var [header, value] = puz.headers[i];
      if (header === 'Title') {
        title = value;
      } else if (header === 'Creator' || header === 'Author') {
        author = value;
      }
    }

    var cells = Array(maxx * maxy).fill(null);
    var cell_to_clue_table = Array(maxx * maxy).fill(null);

    var number_index = [];
    for (var y = 0; y < maxy; y++) {
      for (var x = 0; x < maxx; x++) {
        var fill = grid[y][x];
        var is_black = fill === '#';
        var number = 0;
        var start_of_xslot = (!is_black &&
                              (x === 0 || grid[y][x-1] === '#') &&
                              (x + 1 < maxx && grid[y][x+1] !== '#'));
        var start_of_yslot = (!is_black &&
                              (y === 0 || grid[y-1][x] === '#') &&
                              (y + 1 < maxy && grid[y+1][x] !== '#'));

        if (start_of_xslot || start_of_yslot) {
          number_index.push([x,y]);
          number = number_index.length;
        }
        var circled = false;
        if (flags) {
          circled = !!(flags[y][x] & puz.FLAGS.CIRCLED);
        }
        var entry = fill;
        if (fill === '.' || fill === '#')
          entry = ' ';

        cells[y * maxx + x] = new XwordCell({
          'fill': fill,
          'entry': entry,
          'committed': true,
          'number': number,
          'active': false,
          'circled': circled
        });
        cell_to_clue_table[y * maxx + x] = [null, null];
      }
    }

    var clues = [];
    var clue_to_cell_table = [];

    for (i=0; i < puz.clues.length; i++) {
      var [type, cluestr, answer] = puz.clues[i];
      var [dir, num] = type;
      var clue = new XwordClue({
        'index': i, 'direction': dir, 'number': num, 'clue': cluestr,
        'answer': answer});
      clues.push(clue);

      // clue_to_cell table: index into clues[] has the corresponding
      // cell id
      var xy = number_index[num - 1];
      clue_to_cell_table[i] = xy[1] * maxx + xy[0];

      // set up cell_to_clue_table: indexed by cell id, each entry
      // has a two element array (across, down) which contains the
      // index into clues[].  Iterate over answer in the direction
      // of the clue to set all cells making up the answer
      var ind = 0, xincr = 0, yincr = 0;
      if (dir === 'A') {
        xincr = 1;
      } else {
        ind = 1; yincr = 1;
      }
      [x, y] = xy;
      for (var j = 0; y < maxy && x < maxx; j++) {
        var cell = y * maxx + x;
        if (grid[cell] === '#')
          break;
        cell_to_clue_table[cell][ind] = i;
        x += xincr; y += yincr;
      }
    }
    this.setState({
      'title': title, 'author': author,
      'width': maxx, 'height': maxy, 'cells': cells
    });
    this.loadStoredData();
    this.selectCell(0, 'A', true);
    this.resizeScrollPane();
  }
  resizeScrollPane()
  {
    // set cluelist to match grid height
    var gridelem = document.getElementById("xwordjs-grid-inner");
    var cluediv = document.getElementById("xwordjs-fill-list-container");
    var cluelist = document.getElementsByClassName("xwordjs-fill-list");
    var gridHeight = window.getComputedStyle(gridelem).getPropertyValue("height");

    if (cluediv)
      cluediv.style.height = gridHeight;

    for (var i = 0; i < cluelist.length; i++) {
        var e = cluelist[i];
        var newheight = String(parseInt(gridHeight, 10) - 60) + "px";
        e.style.height = newheight;
    }
  }
  saveStoredData()
  {
    var key = this.state.title;
    console.log("saving data: " + key);
    var data = {
      entries: this.state.cells.map((x) => x.state.entry),
    };
    localStorage.setItem(key, JSON.stringify(data));

    // update filler state
    var grid = this.getFillerString();
    var filler = this.state.filler;
    filler.updateGrid(grid);
  }
  readStoredData()
  {
    var key = this.state.title;
    console.log("loading data: " + key);
    var data = localStorage.getItem(key);
    if (!data)
      return null;

    return JSON.parse(data);
  }
  loadStoredData()
  {
    var data = this.readStoredData()
    if (!data)
      return;

    var entries = data.entries;
    var elapsed = data.elapsed;
    for (var i=0; i < entries.length; i++) {
      this.state.cells[i].setState({entry: entries[i]});
    }
    this.setState({modified: true})
    this.setState({cells: this.state.cells});
    this.state.filler.updateGrid(this.getFillerString());
  }
  rewindToStart(x: number, y: number, direction: number)
  {
    var x_incr = (direction === 0) ? 1 : 0;
    var y_incr = (x_incr) ? 0 : 1;
    for (; y >= 0 && x >= 0; x -= x_incr, y -= y_incr) {
      var cell = this.state.cells[this.state.width * y + x];
      if (cell.isBlack()) {
        x += x_incr; y += y_incr;
        break;
      }
    }
    if (x < 0)
      x = 0;
    if (y < 0)
      y = 0;
    return [x, y];
  }
  highlight(x: number, y: number, direction: number, active: boolean)
  {
    var x_incr = (direction === 0) ? 1 : 0;
    var y_incr = (x_incr) ? 0 : 1;

    var cell = this.state.cells[this.state.width * y + x];
    if (cell.isBlack())
      return;

    // rewind to start of entry
    [x, y] = this.rewindToStart(x, y, direction);

    for (; y < this.state.height && x < this.state.width; x += x_incr, y += y_incr) {
      cell = this.state.cells[this.state.width * y + x];
      if (active && cell.isBlack())
        break;

      cell.setState({"active": active});
    }
  }
  selectCell(cell_id: number, direction: string, initial: ?boolean)
  {
    var cell = this.state.cells[cell_id];

    var newcells = this.state.cells.slice();

    // unselect existing selected cell and crosses
    var oldcell_id = this.state.activecell;
    var old_dind = (this.state.direction === 'A') ? 0 : 1;
    var [old_x, old_y] = this.cellPos(oldcell_id);

    var oldcell = this.state.cells[oldcell_id];
    var dind = (direction === 'A') ? 0 : 1;
    var [x, y] = this.cellPos(cell_id);

    this.state.cells.forEach(function(c) {
      c.setState({active: false});
    });
    this.highlight(x, y, dind, true);

    oldcell.setState({focus: false});
    cell.setState({focus: true});

    this.setState({'cells': newcells, 'activecell': cell_id, 'direction': direction});
    this.updateFills(cell_id, direction);
  }
  closeModal() {
    this.setState({'dismissed_modal': true});
  }
  showAnswers() {
    this.setState({'dismissed_modal': true});
    for (var i=0; i < this.state.cells.length; i++) {
      var cell = this.state.cells[i];
      if (!cell.isBlack())
        cell.setState({'entry': cell.get('fill')});
    }
    var newcells = this.state.cells.slice();
    this.setState({'cells': newcells});
  }
  serverUpdate(json: Object) {
    console.log("a server update happened...");
    for (var i = 0; i < json.Entries.length; i++) {
      var ch = json.Entries[i].Value;
      var version = json.Entries[i].Version;

      var cell = this.state.cells[i];
      if (cell && !cell.isBlack() && version > cell.get('version')) {
        cell.setState({entry: ch, version: version});
      }
    }
    this.setState({version: json.Version});
  }
  fillEntry(value: string) {
    var pos = this.cellPos(this.state.activecell);
    var [x, y] = this.rewindToStart(pos[0], pos[1], this.state.direction === 'A' ? 0 : 1);
    var x_incr = this.state.direction === 'A' ? 1 : 0;
    var y_incr = (x_incr) ? 0 : 1;
    var start_cell = y * this.state.width + x;


    var orig_str = '';
    for (var i = 0; i < value.length; i++, x += x_incr, y += y_incr) {
      var cell_id = y * this.state.width + x;
      orig_str += this.state.cells[cell_id].get('entry');
      this.state.cells[cell_id].setState({entry: value[i], committed: true});
    }
    this.state.undo.push(new Mutation(start_cell, y_incr, orig_str));
    var newcells = this.state.cells.slice();
    this.setState({'cells': newcells, 'undo': this.state.undo.slice()});
    this.saveStoredData();
  }
  componentDidMount() {
    var self = this;
    this.loadWordlist();
    window.addEventListener("keydown", (e) => self.handleKeyDown(e));
  }
  componentWillUnmount() {
    var self = this;
    window.removeEventListener("keydown", (e) => self.handleKeyDown(e));
  }
  render() {
    if (this.state.cells.length === 0) {
      if (window.location.search.length || window.location.hash.length) {
        return (
          <div className="XwordMain"/>
        );
      }
      return (
        <div className="XwordMain">
          <div className="xwordjs-text-box">
          <h1>XwordJS</h1>

          <p>
          Upload a crossword puzzle here (.puz, .xpf, or .xd format) and then
          you can edit the puzzle.  The file remains local to your computer
          and not uploaded anywhere else.
          </p>

          <FileInput onChange={(x, filename) => this.loadPuzzle(x, filename)} />

          <p>Or start a new puzzle.</p>
          <form>
            Width: <input type="number" id="newwidth" value="15"/>
            Height: <input type="number" id="newheight" value="15"/>
            <input type="button" onClick={() => this.newPuzzle(
                // $FlowFixMe
                document.getElementById("newwidth").value,
                // $FlowFixMe
                document.getElementById("newheight").value)} value="Start"/>
          </form>
          </div>
        </div>
      );
    }
    return (
      <div className="XwordMain">
        <div className="xwordjs-vertical-container">
          <div className="xwordjs-topbar">
            <Title title={this.state.title} author={this.state.author}/>
          </div>
          <div className="xwordjs-container">
            <div className="xwordjs-grid">
              <Grid height={this.state.height} width={this.state.width} cells={this.state.cells} handleClick={(x) => this.handleClick(x)}/>
            </div>
            <FillList value={this.state.fills} fillEntry={(x) => this.fillEntry(x)}/>
          </div>
          <div>Estimated fills: {this.state.numFills}</div>
          <MobileKeyboard onClick={(code) => this.processKeyCode(code, false)}/>
        </div>
        <a href="#" onClick={() => this.fill()}>Fill</a>
        <hr/>
        <a href="#" onClick={() => this.clearUncommitted()}>Clear uncommitted entries</a>
      </div>
    );
  }
}

export default XwordMain;
