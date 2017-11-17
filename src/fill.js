// @flow
/**
 * Crossword puzzle filler.
 */
const UNFILLED_CHAR = '.';
const BLOCK_CHAR = '#';

const DIR_ACROSS = 0;
const DIR_DOWN = 1;

/*
 * Bitmap helpers.  We store viable characters as a bit-per-letter; since
 * we have 26 possible letters we can fit it all in a u32.
 */
const ALL_CHARS = "abcdefghijklmnopqrstuvwxyz";
const ALL_CHARS_BITMAP = (1 << (ALL_CHARS.length + 1)) - 1;
const ALL_CHARS_BASE = ALL_CHARS.charCodeAt(0);

function char_to_bitmap(x: string) : number {
  if (x === BLOCK_CHAR)
    return 0;
  return x.toLowerCase().charCodeAt(0) - ALL_CHARS_BASE;
}

function bitmap_to_char(x: number) : string {
  return String.fromCharCode(x + ALL_CHARS_BASE);
}

class Wordlist {

  words: Array<string>;
  word_bitmaps: Array<Array<number>>;
  scores: { [string] : number };
  len_idx: Map<number,number>;

  constructor(word_array : Array<string>) {
    this.words = [];
    this.word_bitmaps = [];
    this.scores = {};
    this.len_idx = new Map();

    for (var i=0; i < word_array.length; i++) {
      var w = word_array[i];
      var [word, score] = w.split(/;|\s/);
      if (word.length < 3)
        continue;
      this.scores[word] = parseInt(score, 10);
      this.words.push(word);
    }

    // Sort by length, then by score descending, then alphabetically.
    // This means we can easily find the highest ranked words of a given
    // length.
    var self = this;
    this.words.sort(function(a, b) {

      if (a.length != b.length)
        return a.length - b.length;

      if (self.scores[b] != self.scores[a])
        return self.scores[b] - self.scores[a];

      return a.localeCompare(b);
    });

    for (var i = 0; i < this.words.length; i++) {
      var wlen = this.words[i].length;
      if (!this.len_idx.has(wlen)) {
        this.len_idx.set(wlen, i);
      }
      var bitmap = [];
      var word = this.words[i];
      for (var j=0; j < word.length; j++) {
        bitmap.push(1 << char_to_bitmap(word[j]));
      }
      this.word_bitmaps.push(bitmap);
    }
  }

  at(index: number) : string {
    return this.words[index];
  }

  bitmap_at(index: number) : Array<number> {
    return this.word_bitmaps[index];
  }

  score(value: string) : number {
    return this.scores[value];
  }

  index(length: number) : number {
    var val = this.len_idx.get(length);
    if (val === undefined) {
      val = this.words.length;
    }
    return val;
  }
}

class Cell {
  valid_letters: number;
  across_entry: ?Entry;
  across_offset: number;
  down_entry: ?Entry;
  down_offset: number;
  value: string;
  cell_id: number;

  constructor(cell_id: number, value: string) {
    this.value = value;
    this.cell_id = cell_id;
    this.resetValid();
  }

  resetValid() {
    if (this.value != UNFILLED_CHAR) {
      this.valid_letters = 1 << char_to_bitmap(this.value);
    } else {
      this.valid_letters = ALL_CHARS_BITMAP;
    }
  }

  set(value: string) {
    this.value = value;
    this.resetValid();
  }

  validLettersString() : string {
    var valid = [];
    for (var i=0; i < ALL_CHARS.length; i++) {
      var ch = ALL_CHARS[i];
      if ((1 << char_to_bitmap(ch)) & this.valid_letters) {
        valid.push(ch);
      }
    }
    return valid.join("");
  }

  checkpoint() : any {
    return [this.value, this.valid_letters];
  }

  restore(state: any) {
    this.value = state[0];
    this.valid_letters = state[1];
  }

  cross(e: Entry) : ?Entry {
    if (e == this.across_entry) {
      return this.down_entry;
    }
    return this.across_entry;
  }

  setEntry(e: Entry, direction: number) {
    if (direction === DIR_ACROSS) {
      this.across_entry = e;
    } else {
      this.down_entry = e;
    }
  }

  getValidLetters(): number {
    return this.valid_letters;
  }

  entry(direction: number) : ?Entry {
    return (direction === DIR_DOWN) ? this.down_entry : this.across_entry;
  }

  applyMask(valid_bitmap: number) : void {
    this.valid_letters &= valid_bitmap;
  }

  getValue() : string {
    return this.value;
  }

  getId() : number {
    return this.cell_id;
  }
}

class Entry {
  cells: Array<Cell>;
  wordlist: Wordlist;
  grid: Grid;
  direction: number;
  valid_words: Array<number>;
  fill_index: number;
  saved_valid_words: Array<number>;

  constructor(cells : Array<Cell>, direction: number, wordlist : Wordlist, grid : Grid) {
    this.cells = cells;
    this.direction = direction;
    this.wordlist = wordlist;
    this.grid = grid;
    this.fill_index = 0;

    this.resetDict();
    this.satisfy();
  }

  resetDict()
  {
    var start = this.wordlist.index(this.cells.length);
    var end = this.wordlist.index(this.cells.length + 1);
    this.valid_words = [];
    for (var i = 0; i < end-start; i++) {
      this.valid_words.push(start + i);
    }
  }

  randomize(amt: number) {
    if (amt <= 0.0 || amt > 1.0)
      return;

    for (let i = 0; i < amt * this.valid_words.length; i++) {
      var x = Math.ceil(Math.random() * this.valid_words.length);
      var y = Math.ceil(Math.random() * this.valid_words.length);
      var tmp = this.valid_words[x];
      this.valid_words[x] = this.valid_words[y];
      this.valid_words[y] = tmp;
    }
  }

  checkpoint() : any
  {
    return [this.valid_words.slice(), this.fill_index];
  }

  restore(state: any)
  {
    this.valid_words = state[0];
    this.fill_index = state[1];
  }

  cellPattern() : string
  {
    var pattern = "";
    for (var i = 0; i < this.cells.length; i++) {
      pattern += this.cells[i].getValue().toLowerCase();
    }
    return pattern;
  }

  bitPattern() : Array<number>
  {
    var pattern = [];
    for (var i = 0; i < this.cells.length; i++) {
      pattern.push(this.cells[i].getValidLetters());
    }
    return pattern;
  }

  completed() : bool
  {
    var pattern = this.cellPattern();
    return pattern.indexOf(".") === -1;
  }

  cellIndex(cell_id: number) : number
  {
    for (var i = 0; i < this.cells.length; i++) {
      if (this.cells[i].getId() == cell_id)
        return i;
    }
    return -1;
  }

  recomputeValidLetters() : void
  {
    var fills;
    if (this.completed()) {
      fills = [this.bitPattern()];
    } else {
      fills = [];
      for (var i = 0; i < this.valid_words.length; i++) {
        fills.push(this.wordlist.bitmap_at(this.valid_words[i]));
      }
      for (i = 0; i < this.cells.length; i++) {
        var valid_letters = 0;
        for (var j = 0; j < fills.length; j++) {
          valid_letters |= fills[j][i];
        }
        this.cells[i].applyMask(valid_letters);
      }
    }
  }

  fill() : ?string
  {
    if (this.fill_index >= this.valid_words.length) {
      return null;
    }

    var fill = this.wordlist.at(this.valid_words[this.fill_index]);
    for (var i = 0; i < fill.length; i++) {
      this.cells[i].set(fill.charAt(i));
    }
    return fill;
  }

  satisfy() : bool
  {
    var pattern = this.bitPattern();

    var orig_len = this.valid_words.length;
    var new_valid = [];
    for (var i = 0; i < orig_len; i++) {
      var word = this.wordlist.at(this.valid_words[i]);

      if (this.grid.isUsed(word)) {
        continue;
      }

      if (word.length != pattern.length) {
        continue;
      }

      var skip = false;
      var bitmap = this.wordlist.bitmap_at(this.valid_words[i]);
      for (var j = 0; j < pattern.length; j++) {
        if (!(pattern[j] & bitmap[j])) {
          skip = true;
          break;
        }
      }
      if (skip) {
        continue;
      }

      new_valid.push(this.valid_words[i]);
    }
    this.valid_words = new_valid;
    this.recomputeValidLetters();
    return orig_len != this.valid_words.length;
  }

  nextWord() {
    this.fill_index += 1;
  }

  numFills()
  {
    if (this.completed()) {
      return 1;
    }
    return this.valid_words.length;
  }

  fills() : Array<string> {
    var self = this;
    return this.valid_words.map(function(i) {
      return self.wordlist.at(i);
    });
  }
}

class StackLevel {
  saved_entries : Array<any>;
  saved_cells : Array<any>;
  filled_word : string;
  entry : Entry;
}

class Grid {

  entries: Array<Entry>;
  cells: Array<Cell>;
  used_words: Set<string>;
  height: number;
  width: number;

  constructor(template : string, wordlist : Wordlist) {
    var rows = template.trim().split("\n");
    this.height = rows.length;
    this.width = rows[0].length;
    this.cells = [];
    this.entries = [];
    this.used_words = new Set();

    for (var y = 0; y < this.height; y++) {
      for (var x = 0; x < this.width; x++) {
        var cell_id = y * this.width + x;

        this.cells.push(new Cell(cell_id, rows[y][x]));
      }
    }

    for (var dir = DIR_ACROSS; dir <= DIR_DOWN; dir++) {

      var xincr = (dir == DIR_ACROSS) ? 1 : 0;
      var yincr = (dir == DIR_DOWN) ? 1 : 0;

      for (var y = 0; y < this.height; y++) {
        for (var x = 0; x < this.width; x++) {

          var is_black = rows[y][x] === BLOCK_CHAR;
          var start_of_row = (dir == DIR_ACROSS && x == 0) ||
                             (dir == DIR_DOWN && y == 0);

          var start_of_entry = ((!is_black) &&
            // previous character was '#' or start of line?
            (start_of_row || rows[y - yincr][x - xincr] == BLOCK_CHAR) &&
            // next character not '#'?, i.e. exclude unchecked squares
            (x + xincr < this.width && y + yincr < this.height &&
             rows[y + yincr][x + xincr] != BLOCK_CHAR))

          if (!start_of_entry)
            continue;

          var cell_list = [];
          var [xt, yt] = [x, y];
          for (; xt < this.width && yt < this.height; xt += xincr, yt += yincr) {
            if (rows[yt][xt] == BLOCK_CHAR)
              break;

            cell_list.push(this.cells[yt * this.width + xt]);
          }
          var entry = new Entry(cell_list, dir, wordlist, this);
          this.entries.push(entry);

          for (var i=0; i < cell_list.length; i++) {
            cell_list[i].setEntry(entry, dir);
          }
        }
      }
    }
    this.satisfyAll();
  }

  satisfyAll() : void {
    var changed = true;
    while (changed) {
      changed = false;
      for (var i = 0; i < this.entries.length; i++) {
        var this_changed = this.entries[i].satisfy();
        changed = changed || this_changed;
      }
    }
  }

  randomize(amt: number) {
    for (var i = 0; i < this.entries.length; i++) {
      this.entries[i].randomize(amt);
    }
  }

  isUsed(word: string) : bool {
    return this.used_words.has(word);
  }

  getNextFillVictim() : Entry {
    var nfills = -1;
    var best = this.entries[0];
    for (var i = 0; i < this.entries.length; i++) {
      var entry = this.entries[i];
      if (entry.completed())
        continue;

      var this_fills = this.entries[i].numFills();
      if (nfills == -1 || this_fills < nfills) {
        best = entry;
        nfills = this_fills;
      }
    }
    return best;
  }

  numFills() : number {
    var fills = this.entries.map(function(x) {
      return x.numFills();
    });
    var sum = 0;
    for (var i = 0; i < fills.length; i++) {
      if (!fills[i])
        return 0;
      sum += fills[i];
    }
    if (sum == fills.length)
      return 1;

    return sum;
  }

  getFills(x: number, y: number, direction: number) : Array<string> {
    // get entry from position
    if (x < 0 || x >= this.width || y < 0 || y >= this.height ||
        direction < DIR_ACROSS || direction > DIR_DOWN) {
      throw "out of range";
    }

    var cell = this.cells[this.width * y + x];
    var entry = cell.entry(direction);

    if (!entry)
      return [];

    return entry.fills();
  }

  getCellLetters(x: number, y: number) : Map<string,number> {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      throw "out of range";
    }

    var cell_id = this.width * y + x;
    var cell = this.cells[cell_id];
    var across_entry = cell.entry(0);
    var down_entry = cell.entry(1);
    var result = new Map();

    for (const entry of [across_entry, down_entry]) {
      if (!entry)
        continue;

      var alphact = new Map();
      var offset = entry.cellIndex(cell_id);
      for (const f of entry.fills()) {
        var alpha = f.charAt(offset);
        var ct = alphact.get(alpha) || 0;
        alphact.set(alpha, ct + 1);
      }
      for (var [k, v] of alphact.entries()) {
        // $FlowFixMe
        if (!result.has(k) || result.get(k) > v) {
          result.set(k, v);
        }
      }
    }
    return result;
  }

  fillStep(stack) : boolean
  {
    var stackLevel = stack.pop();

    // if we already filled at this level, restore pre-fill state
    // and advance to next word
    if (stackLevel.saved_entries) {
      stackLevel.saved_cells.map(function(saved) {
        saved[0].restore(saved[1]);
      });
      stackLevel.saved_entries.map(function(saved) {
        saved[0].restore(saved[1]);
      });
      this.used_words.delete(stackLevel.filled_word);
      stackLevel.entry.nextWord();
      this.satisfyAll();
    }

    // finished?
    var num_fills = this.numFills();
    if (num_fills == 1) {
      this.entries.forEach(function(e) {
        if (!e.completed()) {
          e.fill();
        }
      });
      return true;
    }

    // backtrack?
    if (num_fills == 0) {
      return false;
    }

    stackLevel.saved_entries = this.entries.map(function(e) {
      return [e, e.checkpoint()];
    });
    stackLevel.saved_cells = this.cells.map(function(c) {
      return [c, c.checkpoint()];
    });

    // fill next best word
    var fill = stackLevel.entry.fill();
    if (!fill) {
      return false;
    }

    stackLevel.filled_word = fill;
    this.used_words.add(fill);

    // fill next level down
    stack.push(stackLevel);
    stackLevel = new StackLevel();
    this.satisfyAll();
    stackLevel.entry = this.getNextFillVictim();
    stack.push(stackLevel);
    return false;
  }

  // return [stack, done]
  fillOne(stack: ?Array<any>) : Array<any> {

    if (!stack) {
      stack = [];

      var stackLevel = new StackLevel();
      this.satisfyAll();
      stackLevel.entry = this.getNextFillVictim();
      stack.push(stackLevel);
    }

    if (!stack.length)
      return [stack, true];

    var result = this.fillStep(stack);
    return [stack, result];
  }

  fillAsync(callback, state) {
    var newstate, done;
    var self = this;
    [newstate, done] = this.fillOne(state);
    callback(this.toString(), function() {
      if (!done) {
        self.fillAsync(callback, newstate);
      }
    });
  }

  fill() : number {

    var stack = [];

    var stackLevel = new StackLevel();
    this.satisfyAll();
    stackLevel.entry = this.getNextFillVictim();
    stack.push(stackLevel);

    while (stack.length) {
      if (this.fillStep(stack))
        return 1;
    }
    return 0;
  }

  toString() : string {
    var self = this;
    return this.cells.map(function(c) {
      var str = '';
      if ((c.getId() % self.width) == 0)
        str += "\n";
      str += c.getValue();
      return str;
    }).join("").trim();
  }
}

class Filler {

  grid : Grid;
  wordlist : Wordlist;

  constructor(template : string, wordlist : Wordlist) {
    this.grid = new Grid(template, wordlist);
    this.wordlist = wordlist;
  }

  updateGrid(template : string) {
    this.grid = new Grid(template, this.wordlist);
  }

  fillAsync(randomize: number, callback: Function) : void {
    this.grid.randomize(randomize);
    this.grid.fillAsync(callback);
  }

  fill() : string {
    this.grid.fill();
    return this.grid.toString();
  }

  getFills(x: number, y: number, direction: number) {
    return this.grid.getFills(x, y, direction);
  }

  getCellLetters(x: number, y: number) : Map<string, number> {
    return this.grid.getCellLetters(x, y);
  }

  estimatedFills() : number {
    return this.grid.numFills();
  }
}

module.exports = {
  filler: Filler,
  wordlist: Wordlist
};

