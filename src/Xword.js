import React, { Component } from 'react';
import Modal from 'react-modal';
import FileInput from './FileInput.js';
import './Xword.css';

// TODO
//  . usability
//  . styling
//   . timer
//    . center over puzzle?
//    . smaller top/bottom margins
//    . show completion time in dialog
//    . extract to separate file
//   . title
//   . colors
//  . polish
//   . clue resize to grid height
//   . shift-tab focus last letter
//   . scrollIntoViewIfNeeded(centered) - polyfill
//   . scroll sideways annoying
//  . reveal letter
//  . reveal clue
//  . show errors
//  . phone interface
//   . clue only entry
//  . puz file loader
//  . restyle input selection
//  . save history (local storage)
//  . solve stats (by day)
//  . creation app using same components as solver app
//  . dictionary loader
//  . javacsript filler
//  . fill statistics - scrabble score etc
//  . file drop
//  'A' => 0, 'D' => 1 constants
var Xd = require("./xd.js");
var Puz = require("./puz.js");

class XwordClue {
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
  get(key) {
    return this.state[key];
  }
}

class XwordCell {
  constructor(options) {
    this.state = {
      'fill': '.',
      'entry': ' ',
      'active': false,
      'focus': false,
      'number': null,
    };
    Object.assign(this.state, options);
  }
  setState(newstate) {
    Object.assign(this.state, newstate);
  }
  get(key) {
    return this.state[key];
  }
  isBlack() {
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

function ClueBar(props) {
  var text = '';
  for (var i=0; i < props.value.length; i++) {
    var clue = props.value[i];
    if (clue.get('active')) {
      text = clue.get('number') + ". " + clue.get('clue');
    }
  }
  return <div className={"xwordjs-clue-bar"}>{text}</div>;
}

function Clue(props) {
  var clue = props.value;
  var contents = clue.get('number') + ". " + clue.get('clue');
  var extraClass = "";

  if (clue.get('active'))
    extraClass = " xwordjs-clue-active";
  else if (clue.get('crossActive'))
    extraClass = " xwordjs-clue-cross-active";

  return (
    <div className={"xwordjs-clue" + extraClass} id={"clue_" + clue.get('index')} onClick={() => props.onClick(clue)}>{contents}</div>
  );
}

function Cluelist(props) {
  var list = [];
  for (var i=0; i < props.value.length; i++) {
    var clue = props.value[i];
    list.push(<Clue key={"clue_" + i} onClick={(x) => props.selectClue(x)} value={clue}/>);
  }
  return (
    <div>
    <h3>{props.title}</h3>
    <div className="xwordjs-cluelist">
    {list}
    </div>
    </div>
  );
}

function Clues(props) {
  var across = [];
  var down = [];
  for (var i=0; i < props.value.length; i++) {
    var clue = props.value[i];

    if (clue.get('direction') === 'A') {
      across.push(props.value[i]);
    } else {
      down.push(props.value[i]);
    }
  }
  return(
    <div className="xwordjs-cluelist-container">
      <Cluelist selectClue={props.selectClue} value={across} title="Across"/>
      <Cluelist selectClue={props.selectClue} value={down} title="Down"/>
    </div>
  );
}

class TimerState {
  constructor(options) {
    this.state = {
      start_time: new Date().getTime(),
      elapsed: 0,
      paused: false,
      stopped: false
    };
    Object.assign(this.state, options);
  }
  setState(newstate) {
    Object.assign(this.state, newstate);
  }
  get(key) {
    return this.state[key];
  }
  elapsedStr() {
    var elapsed = this.state.elapsed / 1000;
    var sec = Math.floor(elapsed % 60);
    var min = Math.floor(elapsed / 60);

    return min + " minutes and " + sec + " seconds";
  }
}

class Timer extends Component {
  constructor(props) {
    super(props);
    this.state = { timer : null };
    this.onInterval = this.onInterval.bind(this);
    this.handleClick = this.handleClick.bind(this);
  }
  onInterval() {
    var now = new Date().getTime();
    var elapsed = this.props.value.state.elapsed + now - this.props.value.state.start_time;
    this.props.onChange({start_time: now, elapsed: elapsed});
  }
  handleClick(e) {
    e.preventDefault();
    if (this.props.value.state.paused) {
      this.start();
    } else {
      this.pause();
    }
  }
  reset() {
    this.props.onChange({start_time: new Date().getTime(), elapsed: 0});
  }
  start() {
    var timer = setInterval(this.onInterval, 1000);
    this.setState({timer: timer});
    this.props.onChange({start_time: new Date().getTime(), paused: false, stopped: false});
  }
  stop() {
    clearInterval(this.state.timer);
    this.props.onChange({stopped: true});
  }
  pause() {
    clearInterval(this.state.timer);
    this.props.onChange({paused: true});
  }
  render() {

    if (this.props.value.state.stopped) {
      clearInterval(this.state.timer);
    }

    var elapsed = this.props.value.state.elapsed / 1000;
    var sec = Math.floor(elapsed % 60);
    var min = Math.floor(elapsed / 60);

    sec = (sec < 10) ? "0" + sec : sec;
    min = (min < 10) ? "0" + min : min;

    var time_text = min + ":" + sec;
    return (
      <div>
      <Modal isOpen={this.props.value.state.paused}>
        <h1>Paused</h1>
        <p>I guess you have something better to do than finish this right now.</p>
        <button onClick={this.handleClick}>Resume</button>
      </Modal>
      <div className="xwordjs-timer">
         <div className="xwordjs-timer-text">{time_text}</div>
         <div className="xwordjs-timer-pause" onClick={this.handleClick}><b>&#8545;</b></div>
      </div>
      </div>
    );
  }
  componentDidMount() {
    this.reset();
    this.start();
  }
  componentWillUnmount() {
    this.pause();
  }
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
        var number = this.props.cells[ind].get('number') || '';
        var black = fill === '#';

        if (fill === '#' || fill === '.') {
          fill = ' ';
        }
        var cell = <Cell id={"cell_" + ind} value={entry} key={"cell_" + ind}
         isBlack={black} isActive={active} isFocus={focus}
         isTop={i===0} isLeft={j===0} number={number}
         onClick={(x)=>this.props.handleClick(x.substring(5))}/>;
        row_cells.push(cell);
      }
      rows[i] = <div className="xwordjs-grid-row" key={"row_" + i}>{row_cells}</div>;
    }
    return (
      <div>
        <div className="xwordjs-grid">{rows}</div>
      </div>
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
  if (props.isBlack) {
    classname += " xwordjs-cell-black";
  }
  if (props.isTop) {
    classname += " xwordjs-cell-top";
  }
  if (props.isLeft) {
    classname += " xwordjs-cell-left";
  }
  if (props.isFocus) {
    classname += " xwordjs-cell-focus";
  } else if (props.isActive) {
    classname += " xwordjs-cell-active";
  }
  return <div className={classname} onClick={() => props.onClick(props.id)}>
          <div className="xwordjs-cell-number">{props.number}</div>
          <div className="xwordjs-cell-text">{props.value}</div>
          </div>;
}

class XwordMain extends Component {
  constructor() {
    super();
    this.state = {
      'height': 15,
      'width': 15,
      'cells': [],
      'clues': [],
      'title': '',
      'author': '',
      'timer': new TimerState(),
      'activecell': 0,
      'direction': 'A',
      'cell_to_clue_table': [],
      'clue_to_cell_table': [],
      'dismissed_modal': false,
    }
    this.closeModal = this.closeModal.bind(this);
    this.showAnswers = this.showAnswers.bind(this);
  }
  loadPuzzle(url) {
    var self = this;
    var request = new Request(url);
    fetch(request).then(function(response) {
      return response.arrayBuffer();
    }).then(function(data) {
      var puz;
      if (url.endsWith("xd")) {
        var decoder = new TextDecoder('utf-8');
        puz = new Xd(decoder.decode(data));
        self.puzzleLoaded(puz);
      } else {
        puz = new Puz(data);
        self.puzzleLoaded(puz);
      }
    });
  }
  cellPos(clue_id) {
    var y = Math.floor(clue_id / this.state.width);
    var x = clue_id % this.state.width;
    return [x, y];
  }
  navRight() {
    console.log("navright");
    var [x, y] = this.cellPos(this.state.activecell);
    while (x < this.state.width) {
      x += 1;
      if (x < this.state.width &&
          this.state.cells[y * this.state.width + x].get('fill') !== '#')
        break;
    }
    if (x === this.state.width)
      return;

    var activecell = y * this.state.width + x;
    this.selectCell(activecell, this.state.direction);
  }
  navLeft() {
    console.log("navleft");
    var [x, y] = this.cellPos(this.state.activecell);
    while (x >= 0) {
      x -= 1;
      if (x >= 0 &&
          this.state.cells[y * this.state.width + x].get('fill') !== '#')
        break;
    }
    if (x < 0)
      return;

    var activecell = y * this.state.width + x;
    this.selectCell(activecell, this.state.direction);
  }
  navUp() {
    console.log("navup");
    var [x, y] = this.cellPos(this.state.activecell);
    while (y >= 0) {
      y -= 1;
      if (y >= 0 &&
          this.state.cells[y * this.state.width + x].get('fill') !== '#')
        break;
    }
    if (y < 0)
      return;
    var activecell = y * this.state.width + x;
    this.selectCell(activecell, this.state.direction);
  }
  navDown() {
    console.log("navdown");
    var [x, y] = this.cellPos(this.state.activecell);
    while (y < this.state.height) {
      y += 1;
      if (y < this.state.height &&
          this.state.cells[y * this.state.width + x].get('fill') !== '#')
        break;
    }
    if (y === this.state.height)
      return;

    var activecell = y * this.state.width + x;
    this.selectCell(activecell, this.state.direction);
  }
  navNextClue() {
    var dind = (this.state.direction === 'A') ? 0 : 1;
    var cur_cell_id = this.state.activecell;
    var clue_id = this.state.cell_to_clue_table[cur_cell_id][dind];
    var next_clue_id = (clue_id + 1) % this.state.clues.length;
    this.selectClue(this.state.clues[next_clue_id]);
  }
  navPrevClue() {
    var dind = (this.state.direction === 'A') ? 0 : 1;
    var cur_cell_id = this.state.activecell;
    var clue_id = this.state.cell_to_clue_table[cur_cell_id][dind];
    var next_clue_id = (clue_id - 1) % this.state.clues.length;
    this.selectClue(this.state.clues[next_clue_id]);
  }
  navNext() {
    var dind = (this.state.direction === 'A') ? 0 : 1;
    var cur_cell_id = this.state.activecell;
    var clue_id = this.state.cell_to_clue_table[cur_cell_id][dind];
    var start_cell_id = this.state.clue_to_cell_table[clue_id];
    var clue = this.state.clues[clue_id];

    var [x, y] = this.cellPos(cur_cell_id);
    var [start_x, start_y] = this.cellPos(start_cell_id);
    var alen = clue.get('answer').length;

    for (var i = 0; i < alen; i++) {
      if (this.state.direction === 'A')
        x += 1;
      else
        y += 1;
      if (x >= start_x + alen)
        x = start_x;
      if (y >= start_y + alen)
        y = start_y;

      var cell = this.state.cells[y * this.state.width + x];
      if (cell.get('entry') === ' ')
        break;
    }
    if (i === alen) {
      // no empty square.
      [x, y] = this.cellPos(cur_cell_id);

      // if end of word, go to next word
      if ((this.state.direction === 'A' && x === start_x + alen - 1) ||
          (this.state.direction === 'D' && y === start_y + alen - 1)) {
        this.navNextClue();
        return;
      }

      if (this.state.direction === 'A')
        x += 1;
      else
        y += 1;
    }
    var activecell = y * this.state.width + x;
    this.selectCell(activecell, this.state.direction);
  }
  navPrev() {
    var dind = (this.state.direction === 'A') ? 0 : 1;
    var cur_cell_id = this.state.activecell;
    var clue_id = this.state.cell_to_clue_table[cur_cell_id][dind];
    var start_cell_id = this.state.clue_to_cell_table[clue_id];

    var [x, y] = this.cellPos(cur_cell_id);
    var [start_x, start_y] = this.cellPos(start_cell_id);

    if (this.state.direction === 'A')
      x -= 1;
    else
      y -= 1;
    if (x < start_x)
      x = start_x;
    if (y < start_y)
      y = start_y;

    var activecell = y * this.state.width + x;
    this.selectCell(activecell, this.state.direction);
  }
  switchDir() {
    var dir = this.state.direction === 'A' ? 'D' : 'A';
    this.selectCell(this.state.activecell, dir);
  }
  type(ch) {
    var cell = this.state.cells[this.state.activecell];

    cell.setState({'entry': ch});
    this.navNext();
  }
  del() {
    var cell = this.state.cells[this.state.activecell];

    cell.setState({'entry': ' '});
    this.selectCell(this.state.activecell, this.state.direction);
  }
  backspace() {
    var cell = this.state.cells[this.state.activecell];
    cell.setState({'entry': ' '});
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
  processKeyCode(keyCode, shift)
  {
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
      default:
        return false;
    }
  }
  handleKeyDown(e) {
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
    if (this.processKeyCode(e.keyCode, e.shiftKey)) {
      e.preventDefault();
    }
  }
  handleClick(i) {
    if (this.state.activecell === i) {
      this.switchDir();
    } else {
      this.selectCell(i, this.state.direction);
    }
  }
  puzzleLoaded(puz) {
    var grid = puz.grid;
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
        var number = null;
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
        cells[y * maxx + x] = new XwordCell({
          'fill': fill,
          'number': number,
          'active': false
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
      for (var j = 0; j < answer.length; j++) {
        var cell = y * maxx + x;
        cell_to_clue_table[cell][ind] = i;
        x += xincr; y += yincr;
      }
    }
    this.setState({
      'title': title, 'author': author,
      'width': maxx, 'height': maxy, 'cells': cells, 'clues': clues,
      'clue_to_cell_table': clue_to_cell_table,
      'cell_to_clue_table': cell_to_clue_table
    });
    this.selectCell(0, 'A');
  }
  highlightClue(clue, active)
  {
    var cluenum = clue.get('index');
    var cind = this.state.clue_to_cell_table[cluenum];

    var incr = clue.get('direction') === 'A' ? 1 : this.state.width;
    for (var i = 0; i < clue.get('answer').length; i++) {
      var cell = this.state.cells[cind];
      cell.setState({"active": active, "focus": false});
      cind += incr;
    }
  }
  selectCell(cell_id, direction)
  {
    var cell = this.state.cells[cell_id];

    if (cell.isBlack())
      return;

    var newclues = this.state.clues.slice();
    var newcells = this.state.cells.slice();

    // unselect existing selected cell and crosses
    var oldcell_id = this.state.activecell;
    var oldcell = this.state.cells[oldcell_id];

    var dind = (direction === 'A') ? 0 : 1;

    var oldclue = this.state.clues[this.state.cell_to_clue_table[oldcell_id][dind]];
    var oldcross = this.state.clues[this.state.cell_to_clue_table[oldcell_id][1 - dind]];

    if (oldclue) {
      oldclue.setState({"active": false, "crossActive": false});
      this.highlightClue(oldclue, false);
    }
    if (oldcross) {
      oldcross.setState({"active": false, "crossActive": false});
      this.highlightClue(oldcross, false);
    }

    oldcell.setState({"active": false});

    // select new cell and crosses
    var clue = this.state.clues[this.state.cell_to_clue_table[cell_id][dind]];
    var cross = this.state.clues[this.state.cell_to_clue_table[cell_id][1 - dind]];

    if (cross) {
      cross.setState({"active": false, "crossActive": true});
      document.getElementById("clue_" + cross.get('index')).scrollIntoView();
    }
    if (clue) {
      clue.setState({"active": true, "crossActive": false});
      document.getElementById("clue_" + clue.get('index')).scrollIntoView();
      this.highlightClue(clue, true);
    }

    cell.setState({"focus": true});
    this.setState({'clues': newclues, 'cells': newcells, 'activecell': cell_id, 'direction': direction});
  }
  selectClue(clue)
  {
    var cluenum = clue.get('index');

    // set first cell in this clue as active
    var cell = this.state.clue_to_cell_table[cluenum];
    this.selectCell(cell, clue.get('direction'));
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
  updateTimer(state) {
    if (state.stopped)
      return;

    if (this.isCorrect()) {
      state.stopped = true;
    }
    this.state.timer.setState(state);
    this.setState({'timer': this.state.timer});
  }
  componentDidMount() {
    var self = this;
    window.addEventListener("keydown", (e) => self.handleKeyDown(e));

    var puzzle = window.location.search.substring(1);
    if (puzzle.match(/^[a-zA-Z0-9-]*.xd$/)) {
      self.loadPuzzle(process.env.PUBLIC_URL + puzzle);
    }
  }
  componentWillUnmount() {
    var self = this;
    window.removeEventListener("keydown", (e) => self.handleKeyDown(e));
  }
  render() {
    if (this.state.cells.length === 0) {
      return (
        <div className="XwordMain">
          <FileInput onChange={(x) => this.loadPuzzle(x)} />
        </div>
      );
    }
    return (
      <div className="XwordMain">
        <Modal isOpen={this.isCorrect() && !this.state.dismissed_modal}>
          <h1>Nice job!</h1>
          <p>You solved it.  Sorry for the anticlimactic dialog.</p>
          <p>It took {this.state.timer.elapsedStr()}.</p>
          <button onClick={this.closeModal}>OK</button>
        </Modal>
        <div className="xwordjs-vertical-container">
          <div className="xwordjs-topbar">
            <Title title={this.state.title} author={this.state.author}/>
          </div>
          <Timer value={this.state.timer} onChange={(x) => this.updateTimer(x)}/>
          <ClueBar value={this.state.clues}/>
          <div className="xwordjs-container">
            <div className="xwordjs-grid">
              <Grid height={this.state.height} width={this.state.width} cells={this.state.cells} handleClick={(x) => this.handleClick(x)}/>
            </div>
            <Clues selectClue={(i) => this.selectClue(i)} value={this.state.clues}/>
          </div>
          <MobileKeyboard onClick={(code) => this.processKeyCode(code, false)}/>
        </div>
        <a href="#" onClick={() => this.showAnswers()}>Answers</a>
      </div>
    );
  }
}

export default XwordMain;
