// @flow
import React, { Component } from 'react';
import Modal from 'react-modal';
import FileInput from './FileInput.js';
import { Route, Switch, Link } from 'react-router-dom';
import {Navbar, Nav, MenuItem, NavDropdown, DropdownButton, Alert, Button, ButtonToolbar} from 'react-bootstrap';
import { XwordCell, Cell } from './Cell.js';
import { XwordClue } from './Clue.js';
import { ClueEditor } from './ClueEditor.js';
import Histogram from './Histogram.js';
import { saveAs } from 'file-saver';
import './Xword.css';

// . manage wordlist
//    . action to change wordlist
// . export as xd/puz/pdf
// . list puzzles by id
// . easy copy-paste grid
// . undo/redo
//  . typing
// . hint entry
// . show score in wordlist panel
// . one-look helper
// . optimize
// . mobile keyboard always on top
var Xd = require("./xd.js");
var Puz = require("./puz.js");
var Xpf = require("./xpf.js");
var Filler = require("./fill.js");

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
  return (
    <div className={"xwordjs-fill-item"} onClick={() => props.onClick(props.value)}>
      <span>{props.value}</span><span>{props.score}</span>
    </div>
  );
}

function Stats(props) {

  var clue_lengths = {};
  var letter_counts = {};
  var num_across = 0;
  var num_down = 0;
  var num_black = 0;
  var curlen = 0;

  // row counts
  curlen = 0;
  for (let y = 0; y < props.height; y++) {
    for (let x = 0; x < props.width; x++) {
      var i = props.width * y + x;
      var cell = props.cells[i];
      var fill = cell.get('entry');
      letter_counts[fill] += 1;

      if (cell.isBlack()) {
        num_black += 1;
      } else {
        curlen += 1;
      }

      if (curlen && (x === props.width - 1 || cell.isBlack())) {
        if (!clue_lengths[curlen])
          clue_lengths[curlen] = 0;
        clue_lengths[curlen] += 1;
        num_across += 1;
        curlen = 0;
      }
    }
  }

  // col counts
  curlen = 0;
  for (let x = 0; x < props.width; x++) {
    for (let y = 0; y < props.height; y++) {
      var i = props.width * y + x;
      var cell = props.cells[i];
      var fill = cell.get('entry');

      if (!cell.isBlack()) {
        curlen += 1;
      }

      // if end of line or black, save current clue count
      if (curlen && (y === props.height - 1 || cell.isBlack())) {
        if (!clue_lengths[curlen])
          clue_lengths[curlen] = 0;
        clue_lengths[curlen] += 1;
        num_down += 1;
        curlen = 0;
      }
    }
  }

  var trows = [];
  var keys = Object.keys(clue_lengths).sort((a, b) => ((parseInt(a) - parseInt(b))));
  trows.push(<tr><th>Blocks</th><td>{num_black}</td></tr>);
  trows.push(<tr><th>Words</th><td>{num_across + num_down} ({num_across} A, {num_down} D)</td></tr>);
  for (var i = 0; i < keys.length; i++) {
    trows.push(<tr><th>{keys[i]}</th><td>{clue_lengths[keys[i]]}</td></tr>);
  }

  //<Histogram keys={"ABCDEFGHIJKLMNOPQRSTUVWXYZ"} samples={Array.from(Object.keys(letter_counts).map((x) => [x, letter_counts[x]]))}/>
  return (
    <div>
    <table>
      <thead><tr><th colspan="2">Stats</th></tr></thead>
      <tbody>{trows}</tbody>
    </table>
    </div>
  );
}

function FillList(props) {

  var items = [];
  for (var i=0; i < props.value.length; i++) {
    items.push(<FillItem key={"item" + i} score={props.value[i][1]} value={props.value[i][0]} onClick={(x) => props.fillEntry(x.toUpperCase())}/>);
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
        var hinted = this.props.cells[ind].get('hinted');
        var circled = this.props.cells[ind].get('circled');
        var number = this.props.cells[ind].get('number') || '';
        var difficulty = this.props.cells[ind].get('difficulty') || '';
        var black = fill === '#';

        if (fill === '#' || fill === '.') {
          fill = ' ';
        }
        if (entry !== ' ' || black)
          difficulty = '';

        var cell = <Cell id={"cell_" + ind} value={entry} key={"cell_" + ind}
         isBlack={black} isActive={active} isFocus={focus} isHinted={hinted}
         isCircled={circled} difficulty={difficulty}
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

class BetterLoadWordlist extends Component {
  state: {
    dismissed: boolean,
  };
  handleDismiss: Function;

  constructor() {
    super();
    this.state = { dismissed: false };
    this.handleDismiss = this.handleDismiss.bind(this);
  }

  render() {
    if (!this.props.visible || this.state.dismissed) {
      return <span/>;
    }

    return (
      <Alert bsStyle="danger" onDismiss={this.handleDismiss}>
        <h4>Hey, you don't have a wordlist yet!</h4>
        <p>For autofill to work you need to upload a wordlist into your
        browser's local storage.  The wordlist stays on your computer and
        only needs to be uploaded once.
        </p>

        <Link to="/wordlist/upload"><Button>Add Wordlist</Button></Link>
      </Alert>
    );
  }

  handleDismiss() {
    this.setState({dismissed: true});
  }
}

class XwordSolver extends Component {

  state: {
    height: number,
    width: number,
    cells: Array<XwordCell>,
    puzzleId: string,
    title: string,
    author: string,
    activecell: number,
    direction: string,
    construct: boolean,
    version: number,
    solutionId: ?string,
    dismissed_modal: boolean,
    modified: boolean,
    fills: Array<Array<string>>,
    numFills: number,
    cellLetters: Map<string, number>,
    filler: Filler.filler,
    wordlist: Array<string>,
    puzzleId: string,
    clues: Array<XwordClue>,
    undo: Array<Mutation>,
    redo: Array<Mutation>,
  };
  closeModal: Function;
  showAnswers: Function;
  clearHinted: Function;
  fill: Function;
  fillEntry: Function;

  constructor() {
    super();
    this.state = {
      height: 15,
      width: 15,
      cells: [],
      title: '',
      author: '',
      activecell: 0,
      direction: 'A',
      cell_to_clue_table: [],
      clue_to_cell_table: [],
      dismissed_modal: false,
      filler: new Filler.filler('', new Filler.wordlist([])),
      modified: false,
      version: 1,
      fills: [],
      numFills: 0,
      cellLetters: new Map(),
      construct: false,
      solutionId: null,
      puzzleId: '',
      undo: [],
      redo: [],
      clues: [],
      wordlist: [],
    }
    this.closeModal = this.closeModal.bind(this);
    this.showAnswers = this.showAnswers.bind(this);
    this.fill = this.fill.bind(this);
    this.fillEntry = this.fillEntry.bind(this);
    this.clearHinted = this.clearHinted.bind(this);
  }
  loadPuzzle(file: File, filename : ?string) {
    this.loadPuzzleURL(window.URL.createObjectURL(file), filename);
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
    var puzzleId = this.generateId();

    this.setState({
      puzzleId: puzzleId, title: title, author: 'unknown',
      width: maxx, height: maxy, cells: cells,
      construct: true
    });
    this.saveStoredData();
    this.props.history.replace("/puzzle/" + puzzleId);
  }
  loadWordlist(name: string) : Array<string> {
    var data = localStorage.getItem("wordlist_" + name);
    if (!data)
      return [];

    return JSON.parse(data);
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

    var filler = this.state.filler;
    var result = filler.getFills(x, y, dir);
    var num_fills = filler.estimatedFills();
    var cell_letters = filler.getCellLetters(x, y);

    for (var i=0; i < this.state.height; i++) {
        for (var j = 0; j < this.state.width; j++) {
          var cell_id = this.state.height * i + j;
          if (this.state.cells[cell_id].isBlack())
            continue;
          var this_cell_letters = filler.getCellLetters(j, i);
          var fillct = 0;
          for (const ct of this_cell_letters.values()) {
            fillct += ct;
          }
          if (fillct < 10)
            this.state.cells[cell_id].setState({difficulty: 'hardest'});
          else if (fillct < 100)
            this.state.cells[cell_id].setState({difficulty: 'harder'});
          else if (fillct < 1000)
            this.state.cells[cell_id].setState({difficulty: 'hard'});
          else
            this.state.cells[cell_id].setState({difficulty: ''});
        }
    }
    this.setState({fills: result, numFills: num_fills, cells: this.state.cells.slice(), cellLetters: cell_letters});
  }
  getAnswers() {
    var across = [];
    var down = [];
    let answer = '';
    var number_grid = Array(this.state.height * this.state.width);
    var number = 0;
    var maxx = this.state.width;
    var maxy = this.state.height;
    var start_i = 0;
    
    for (let y = 0; y < this.state.height; y++) {
      for (let x = 0; x < this.state.width; x++) {
        var i = this.state.width * y + x;
        var cell = this.state.cells[i];
        var is_black = cell.isBlack();

        var fill = cell.get('entry');
        if (!is_black) {
          answer += fill;
        }
        if (answer && (x === this.state.width - 1 || is_black)) {
          across.push({'answer': answer, 'number': number_grid[start_i]});
          answer = '';
        }

        var start_of_xslot = (!is_black &&
                              (x === 0 || this.cellAt(y, x-1).isBlack()) &&
                              (x + 1 < maxx && !this.cellAt(y, x+1).isBlack()));
        var start_of_yslot = (!is_black &&
                              (y === 0 || this.cellAt(y-1, x).isBlack()) &&
                              (y + 1 < maxy && !this.cellAt(y+1, x).isBlack()));

        if (start_of_xslot || start_of_yslot) {
          number += 1;
          start_i = i;
        }
        number_grid[i] = number;
      }
    }
    for (let x = 0; x < this.state.width; x++) {
      for (let y = 0; y < this.state.height; y++) {
        var i = this.state.width * y + x;
        var cell = this.state.cells[i];
        var fill = cell.get('entry');
        if (!cell.isBlack()) {
          if (!answer) 
            start_i = i;
          answer += fill;
        }
        if (answer && (y === this.state.height - 1 || cell.isBlack())) {
          down.push({answer: answer, number: number_grid[start_i]});
          answer = '';
        }
      }
    }
    return [across, down];
  }
  updateClues() {
    var answer_to_clue = {};
    for (var i = 0; i < this.state.clues.length; i++) {
      answer_to_clue[this.state.clues[i].get('answer')] = this.state.clues[i];
    }

    var clues = [];
    var [across, down] = this.getAnswers()
    console.log("across: " + JSON.stringify(across));
    console.log("down: " + JSON.stringify(down));
    for (var i = 0; i < across.length; i++) {
      var clue;
      if (answer_to_clue[across[i].answer]) {
        clue = answer_to_clue[across[i].answer];
      } else {
        clue = new XwordClue({
          'index': i, 'direction': 'A', 'number': across[i].number, 'clue': "",
          'answer': across[i].answer});
      }
      clues.push(clue);
    }
    for (var i = 0; i < down.length; i++) {
      var clue;
      if (answer_to_clue[down[i].answer]) {
        clue = answer_to_clue[down[i].answer];
      } else {
        clue = new XwordClue({
          'index': i, 'direction': 'D', 'number': down[i].number, 'clue': "",
          'answer': down[i].answer});
      }
      clues.push(clue);
    }
    this.setState({clues: clues});
  }
  clearHinted() {
    for (var i=0; i < this.state.cells.length; i++) {
      if (this.state.cells[i].get('hinted')) {
        this.state.cells[i].setState({entry: ' ', hinted: false});
      }
    }
    this.setState({'cells': this.state.cells.slice()});
  }
  fill() {
    this.clearHinted();
    var grid = this.getFillerString();

    var filler = this.state.filler;
    filler.updateGrid(grid);

    var self = this;
    filler.fillAsync(0.3, function(result, next) {
      var rows = result.trim().split("\n");
      for (var i = 0; i < rows.length; i++) {
        for (var j = 0; j < rows[i].length; j++) {
          var cell_id = self.state.height * i + j;
          var entry = rows[i].charAt(j).toUpperCase();
          if (entry === '#' || entry === '.')
            continue;
          if (entry === self.state.cells[cell_id].get('entry'))
            continue;

          self.state.cells[cell_id].setState({entry: entry, hinted: true});
        }
      }
      self.setState({'cells': self.state.cells.slice()});
      window.setTimeout(next, 0);
    });
  }
  loadPuzzleFromId(id: string) {
    var data = localStorage.getItem("construct_" + id);
    if (!data)
      throw "puzzle not found";

    var wordlist = this.loadWordlist("default");
    this.setState({wordlist: wordlist});
    this.loadStoredData(id);
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
        self.puzzleLoaded(puz);
      } else if (fn.endsWith("xml") || url.match(/^http/)) {
        var decoder = new TextDecoder('utf-8');
        // $FlowFixMe decode handles ArrayBuffer too
        puz = new Xpf().parse(decoder.decode(data));
        self.puzzleLoaded(puz);
      } else {
        puz = new Puz().parse(data);
        self.puzzleLoaded(puz);
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
  save() {
    var xpf = new Xpf();
    xpf.height = this.state.height;
    xpf.width = this.state.width;
    xpf.headers.push(['Title', this.state.title]);
    xpf.headers.push(['Author', this.state.author]);
    xpf.grid = this.getFillerString().split("\n");

    for (var i = 0; i < this.state.clues.length; i++) {
      var clue = this.state.clues[i];
      xpf.clues.push([[ clue.get('direction'), clue.get('number') ],
        clue.get('clue'), clue.get('answer'), 1, 1]);
    }

    var blob = new Blob([xpf.format()], {type: "text/xml; charset=utf-8"});
    saveAs(blob, this.state.title.replace(/ /g, "_") + ".xml");
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
    var orig_str = cell.get('entry');

    cell.setState({'entry': ch, 'version': cell.get('version') + 1, hinted: false});
    this.state.undo.push(new Mutation(this.state.activecell, this.state.direction == 'A' ? 0 : 1, orig_str));
    this.setState({modified: true})
    this.saveStoredData();
    this.navNext();
  }
  del() {
    var cell = this.state.cells[this.state.activecell];
    var orig_str = cell.get('entry');

    cell.setState({'entry': ' ', 'version': cell.get('version') + 1, hinted: false});
    this.state.undo.push(new Mutation(this.state.activecell, this.state.direction == 'A' ? 0 : 1, orig_str));
    this.setState({modified: true})
    this.saveStoredData();
    this.selectCell(this.state.activecell, this.state.direction);
  }
  backspace() {
    var cell = this.state.cells[this.state.activecell];
    cell.setState({'entry': ' ', 'version': cell.get('version') + 1, hinted: false});
    this.setState({modified: true})
    this.saveStoredData();
    this.navPrev();
  }
  processKeyCode(keyCode: number, shift: boolean, ctrl: boolean)
  {
    if (ctrl) {
      switch (keyCode) {
      case 0x59:
        this.redo();
        return true;
      case 0x5a:
        this.undo();
        return true;
      case 0x47:
        this.fill();
        return true;
      case 0x48:
        this.clearHinted();
        return true;
      }
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
    // $FlowFixMe
    if (['INPUT', 'SELECT', 'TEXTAREA'].indexOf(e.target.tagName) !== -1)
      return false;

    if (e.altKey)
      return false;

    if (this.state.direction === 'A' && (e.keyCode === 0x26 || e.keyCode === 0x28)) {
      this.selectCell(this.state.activecell, 'D');
      e.preventDefault();
      return true;
    }
    if (this.state.direction === 'D' && (e.keyCode === 0x25 || e.keyCode === 0x27)) {
      this.selectCell(this.state.activecell, 'A');
      e.preventDefault();
      return true;
    }
    if (this.processKeyCode(e.keyCode, e.shiftKey, e.ctrlKey)) {
      e.preventDefault();
      return true;
    }
    return false;
  }
  undoOrRedo(oldstack, newstack) {
    var mutation;

    if (!oldstack.length)
      return [oldstack, newstack];

    mutation = oldstack.pop();

    var [x, y] = this.cellPos(mutation.start_cell);
    var x_incr = !mutation.direction;
    var y_incr = mutation.direction;
    var value = mutation.fill;

    var orig_str = '';
    for (var i = 0; i < value.length; i++, x += x_incr, y += y_incr) {
      var cell_id = y * this.state.width + x;
      orig_str += this.state.cells[cell_id].get('entry');
      this.state.cells[cell_id].setState({entry: value[i], hinted: false});
    }
    newstack.push(new Mutation(mutation.start_cell, mutation.direction, orig_str));
    this.setState({'cells': this.state.cells.slice()});
    this.state.filler.updateGrid(this.getFillerString());
    this.updateClues();
    this.updateFills(this.state.activecell, this.state.direction);
  }
  undo() {
    this.undoOrRedo(this.state.undo, this.state.redo);
  }
  redo() {
    this.undoOrRedo(this.state.redo, this.state.undo);
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
    this.updateClues();
  }
  handleClick(i: number) {
    if (this.state.activecell === i) {
      this.switchDir();
    } else {
      this.selectCell(i, this.state.direction);
    }
  }
  puzzleLoaded(puz: Object) {
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
          'hinted': false,
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
    var puzzleId = this.state.puzzleId;
    if (!puzzleId) {
      puzzleId = this.generateId();
    }
    this.setState({
      puzzleId: puzzleId,
      title: title, author: author,
      width: maxx, height: maxy, cells: cells
    });
    this.saveStoredData();
    this.props.history.replace("/puzzle/" + puzzleId);
  }
  generateId()
  {
    const len = 12;
    var chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz01234567890";
    var str = "";
    for (let i = 0; i < len; i++) {
      str += chars.charAt(Math.random() * chars.length);
    }
    return str;
  }
  resizeScrollPane()
  {
    // set cluelist to match grid height
    var gridelem = document.getElementById("xwordjs-grid-inner");
    var cluediv = document.getElementById("xwordjs-fill-list-container");
    var cluelist = document.getElementsByClassName("xwordjs-fill-list");
    if (!gridelem)
      return;

    var gridHeight = window.getComputedStyle(gridelem).getPropertyValue("height");

    if (cluediv) {
      cluediv.style.height = gridHeight;
    }

    for (var i = 0; i < cluelist.length; i++) {
        var e = cluelist[i];
        var newheight = String(parseInt(gridHeight, 10) - 10) + "px";
        e.style.height = newheight;
    }
  }
  saveStoredData()
  {
    var key = "construct_" + this.state.puzzleId;
    var data = {
      title: this.state.title,
      author: this.state.author,
      height: this.state.height,
      width: this.state.width,
      cells: this.state.cells.map(function(x) {
        return {
          fill: x.state.fill,
          entry: x.state.entry,
          hinted: x.state.hinted,
        }
      }),
      clues: this.state.clues.map(function(x) {
        return {
          clue: x.state.clue,
          answer: x.state.answer,
        }
      }),
    };
    localStorage.setItem(key, JSON.stringify(data));
    // update filler state
    var grid = this.getFillerString();
    var filler = this.state.filler;
    filler.updateGrid(grid);
  }
  readStoredData(id)
  {
    var key = "construct_" + id;
    var data = localStorage.getItem(key);
    if (!data)
      return null;

    return JSON.parse(data);
  }
  loadStoredData(id)
  {
    var data = this.readStoredData(id)
    if (!data)
      return;

    var maxx = data.width;
    var maxy = data.height;
    var cells = new Array(maxx * maxy);
    for (var i=0; i < maxx * maxy; i++) {
      cells[i] = new XwordCell();
      cells[i].setState(data.cells[i]);
    }

    var clues = [];
    for (i=0; i < data.clues.length; i++) {
      clues.push(new XwordClue(data.clues[i]));
    }

    this.setState({
      puzzleId: id,
      title: data.title,
      author: data.author,
      height: data.height,
      width: data.width,
      cells: cells,
      clues: clues,
      filler: new Filler.filler('', new Filler.wordlist(this.state.wordlist)),
    });
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
    this.updateClues();
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
      this.state.cells[cell_id].setState({entry: value[i], hinted: false});
    }
    this.state.undo.push(new Mutation(start_cell, y_incr, orig_str));
    var newcells = this.state.cells.slice();
    this.setState({'cells': newcells, 'undo': this.state.undo.slice()});
    this.saveStoredData();
  }
  componentDidMount() {
    var self = this;
    var id = this.props.match.params.id;
    if (id) {
      this.loadPuzzleFromId(id);
    }

    if (!this.state.wordlist.length) {
      var wordlist = this.loadWordlist("default");
      this.setState({
        wordlist: wordlist,
        filler: new Filler.filler('', new Filler.wordlist(wordlist))
      });
    }
    window.addEventListener("keydown", (e) => self.handleKeyDown(e));
    window.addEventListener("resize", () => self.resizeScrollPane());
    window.setTimeout(this.resizeScrollPane, 0);
  }
  componentWillUnmount() {
    var self = this;
    window.removeEventListener("keydown", (e) => self.handleKeyDown(e));
  }
  render() {
    if (this.state.cells.length === 0) {
      return (
        <div className="XwordMain">
          <XwordChooser
            onChange={(f, name) => this.loadPuzzle(f, name)}
            onNewPuzzle={(x, y) => this.newPuzzle(x, y)}/>
        </div>
      );
    }
    if (this.state.clues.length === 0) {
      this.updateClues();
    }
    return (
      <div className="XwordMain">
        <XwordNav
          processToggle={() => this.toggleBlank()}
          fill={() => this.fill()}
          clearHinted={() => this.clearHinted()}
          undo={() => this.undo()}
          redo={() => this.redo()}
          save={() => this.save()}
          />
        <BetterLoadWordlist visible={this.state.wordlist.length == 0}/>
        <div className="xwordjs-vertical-container">
          <div className="xwordjs-topbar">
            <Title title={this.state.title} author={this.state.author}/>
          </div>
          <Switch>
            <Route path={this.props.match.url + "/clues"} render={props =>
              <ClueEditor {...props}
                clues={this.state.clues}
                onChange={(i, val) => {
                  this.state.clues[i].setState({clue: val});
                  this.setState({ clues: this.state.clues.slice() });
                  this.saveStoredData();
                }}
              />
            }/>
            <Route render={props =>
              <GridEditor {...props}
                height={this.state.height} width={this.state.width}
                cells={this.state.cells}
                handleClick={(x) => this.handleClick(x)}
                fills={this.state.fills}
                numFills={this.state.numFills}
                cellLetters={this.state.cellLetters}
                fillEntry={(x) => this.fillEntry(x)} />}/>
          </Switch>
          <MobileKeyboard onClick={(code) => this.processKeyCode(code, false, false)}/>
        </div>
      </div>
    );
  }
}

const GridEditor = (props) => {
  return (
    <div>
    <div className="xwordjs-container">
      <div className="xwordjs-grid">
        <Grid height={props.height} width={props.width} cells={props.cells} handleClick={props.handleClick}/>
      </div>
      <FillList value={props.fills} fillEntry={(x) => props.fillEntry(x)}/>
      <Stats height={props.height} width={props.width} cells={props.cells}/>
    </div>
    <div>
      <Histogram keys={"ABCDEFGHIJKLMNOPQRSTUVWXYZ"} samples={Array.from(props.cellLetters.entries()).map((x) => [x[0].toUpperCase(), x[1]])}/>
      Estimated fills: {props.numFills}
    </div>
    </div>
  );
}


function XwordLoad(props) {
  return (
    <XwordSolver filename={props.match.params.name}/>
  );
}

function XwordNav(props) {
  return (
    <Navbar>
      <DropdownButton title="Actions">
        <MenuItem eventKey={1.1} onSelect={(event, eventKey) => props.processToggle()}>Toggle Blank</MenuItem>
        <MenuItem divider={true}/>
        <MenuItem eventKey={1.2} onSelect={(event, eventKey) => props.fill()}>Autofill</MenuItem>
        <MenuItem eventKey={1.3} onSelect={(event, eventKey) => props.clearHinted()}>Clear hints</MenuItem>
        <MenuItem divider={true}/>
        <MenuItem eventKey={1.4} onSelect={(event, eventKey) => props.undo()}>Undo</MenuItem>
        <MenuItem eventKey={1.5} onSelect={(event, eventKey) => props.redo()}>Redo</MenuItem>
        <MenuItem divider={true}/>
        <MenuItem eventKey={1.5} onSelect={(event, eventKey) => props.save()}>Save</MenuItem>
      </DropdownButton>
    </Navbar>
  );
}

const XwordChooser = props => (
  <div className="xwordjs-text-box">
    <h1>XwordJS</h1>

    <p>
    Upload a crossword puzzle here (.puz, .xpf, or .xd format) and then
    you can edit the puzzle.  The file remains local to your computer
    and not uploaded anywhere else.
    </p>

    <FileInput onChange={props.onChange} />

    <p>Or start a new puzzle.</p>
    <form>
    Width: <input type="number" id="newwidth" defaultValue="15"/>
    Height: <input type="number" id="newheight" defaultValue="15"/>
    <input type="button" onClick={() => props.onNewPuzzle(
        // $FlowFixMe
        document.getElementById("newwidth").value,
        // $FlowFixMe
        document.getElementById("newheight").value)}
        value="Start"/>
    </form>
  </div>
);

class XwordWordlistChooser extends Component
{
  saveWordlist: Function;

  constructor() {
    super();
    this.saveWordlist = this.saveWordlist.bind(this);
  }
  render() {
    return (
      <div>
        <h4>Upload Wordlist</h4>
        <p>
        Select your wordlist here.  Acceptable files are ascii format
        with word and score delimited by semicolons, one per line.
        For example:
        <pre>{`apple;20
banana;30
zanzibar;60
`}</pre>

        The file remains local to your computer and is not uploaded
        anywhere else.</p>

        <FileInput onChange={this.saveWordlist} />
      </div>
    );
  }
  loadWordlistFromUrl(url, filename) {
    var self = this;

    var request = new Request(url);
    fetch(request).then(function(response) {
      return response.arrayBuffer();
    }).then(function(data) {
      // $FlowFixMe
      var text = new TextDecoder('utf-8').decode(data);
      localStorage.setItem("wordlist_default", JSON.stringify(text.trim().split("\n")));
      self.props.history.push("/");
    });
  }
  saveWordlist(file: File, filename: ?string) {
    this.loadWordlistFromUrl(window.URL.createObjectURL(file), filename);
  }
}

function XwordMainPanel() {
  return (
    <Switch>
      <Route exact path="/" component={XwordSolver}/>
      <Route path="/puzzle/:id" component={XwordSolver}/>
      <Route exact path="/wordlist/upload" component={XwordWordlistChooser}/>
    </Switch>
  );
}

function XwordMain() {
  return (
    <div>
      <XwordMainPanel />
    </div>
  );
}


export default XwordMain;
