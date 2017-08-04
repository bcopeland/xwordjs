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
  scores: { [string] : number };
  len_idx: Map<number,number>;

  constructor(word_array : Array<string>) {
    this.words = [];
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
    }
  }

  at(index: number) : string {
    return this.words[index];
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

  entry(direction: number) : ?Entry {
    return (direction === DIR_DOWN) ? this.down_entry : this.across_entry;
  }

  applyMask(valid_bitmap: number) : void {
    this.valid_letters &= valid_bitmap;
  }

  crossViable(letter: string) : bool {
    if (this.value != UNFILLED_CHAR) {
      return this.value.toLowerCase() === letter;
    }
    return !!((1 << char_to_bitmap(letter)) & this.valid_letters);
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

  completed() : bool
  {
    var pattern = this.cellPattern();
    return pattern.indexOf(".") === -1;
  }

  recomputeValidLetters() : void
  {
    var fills;
    if (this.completed()) {
      fills = [this.cellPattern()];
    } else {
      fills = [];
      for (var i = 0; i < this.valid_words.length; i++) {
        fills.push(this.wordlist.at(i));
      }
      for (i = 0; i < this.cells.length; i++) {
        var valid_letters = 0;
        for (var j = 0; j < fills.length; j++) {
          valid_letters |= (1 << char_to_bitmap(fills[j].charAt(i)));
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

  satisfy(check_crosses) : bool
  {
    var pattern = this.cellPattern();
    var regex = new RegExp(pattern);

    var orig_len = this.valid_words.length;
    var valid_words = [];
    for (var i = 0; i < orig_len; i++) {
      var word = this.wordlist.at(this.valid_words[i]);

      if (this.grid.isUsed(word)) {
        continue;
      }

      if (word.length != pattern.length) {
        continue;
      }

      if (!regex.test(word)) {
        continue;
      }
      valid_words.push(this.valid_words[i]);
    }

    if (check_crosses) {
      var keep = [];
      for (i = 0; i < valid_words.length; i++) {
        var idx = this.valid_words[i];
        var word = this.wordlist.at(idx);
        var drop = false;
        for (var j = 0; j < word.length; j++) {
          if (!this.cells[j].crossViable(word.charAt(j))) {
            drop = true;
            break;
          }
        }
        if (!drop) {
          keep.push(idx);
        }
      }
      valid_words = keep;
    }

    this.valid_words = valid_words;
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
    this.satisfyAll();

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

  fill() : number {

    this.satisfyAll();

    // base case: no solution or nothing to do
    var num_fills = this.numFills();
    if (num_fills <= 1) {
      return num_fills;
    }

    var entry = this.getNextFillVictim();
    while (true) {
      var saved_entries = this.entries.map(function(e) {
        return [e, e.checkpoint()];
      });
      var saved_cells = this.cells.map(function(c) {
        return [c, c.checkpoint()];
      });

      // fill next best word
      var fill = entry.fill();
      if (!fill)
        break;

      console.log(this.toString());

      this.used_words.add(fill);

      // fill next level down
      num_fills = this.fill();
      if (num_fills == 1) {
        // successful fill at bottom of call stack, fill in the grid and
        // unwind
        this.entries.forEach(function(e) {
          if (!e.completed()) {
            e.fill();
          }
        });
        return 1;
      }

      // failed filling in recursion
      // restore saved wordlist state
      saved_cells.map(function(saved) {
        saved[0].restore(saved[1]);
      });
      saved_entries.map(function(saved) {
        saved[0].restore(saved[1]);
      });

      // try next word
      this.used_words.delete(fill);
      entry.nextWord();
    }

    // no more words left
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

  fill() : string {
    this.grid.fill();
    return this.grid.toString();
  }

  getFills(x: number, y: number, direction: number) {
    return this.grid.getFills(x, y, direction);
  }

  estimatedFills() : number {
    return this.grid.numFills();
  }
}

module.exports = {
  filler: Filler,
  wordlist: Wordlist
};

