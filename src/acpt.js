/*
 * Parse ACPT payloads.
 *
 * Note, the ACPT web endpoint doesn't send down the filled grid, we
 * have just the layout and the cluelist.
 */
function Acpt(data) {
  this.FLAGS = {
    INCORRECT_ONCE: 0x10,
    INCORRECT: 0x20,
    REVEALED: 0x40,
    CIRCLED: 0x80,
  };

  this.headers = [];  // list of [header, value]
  this.grid = [];     // [y][x] 2-dim array
  this.flags = [];    // [y][x] 2-dim array
  this.clues = [];    // list of [[direction, num], clue, answer]
  this.flags = [];     // [y][x] 2-dim array
  this.width = 0;
  this.height = 0;
  var self = this;

  this.getAnswer = function(direction, x, y) {
    var xinc = direction === 'A' ? 1 : 0;
    var yinc = direction === 'D' ? 1 : 0;

    var str = '';
    while (y < this.height && x < this.width && this.grid[y][x] !== '#') {
      str += this.grid[y][x];
      y += yinc;
      x += xinc;
    }
    return str;
  }

  this.parseAcpt = function(buffer) {

    var lines = buffer.split("\r\n");

    // parse header, skipping blank lines
    var i = 0;
    var submitted = lines[i++].trim();
    var playtime = lines[i++].trim();
    var puzzle_id = lines[i++].trim();
    i++; // blank
    this.headers.push(['title', lines[i++].trim()]);
    i++; // blank
    this.headers.push(['author', lines[i++].trim()]);
    i++; // blank
    this.width = parseInt(lines[i++].trim());
    i++; // blank
    this.height = parseInt(lines[i++].trim());
    i++; // blank

    // grid: height lines of width, cells: 0=white, 1=black, ?=circled
    for (var j=0; j < this.height; j++) {
      var line = lines[i++].trim();
      var grid_line = '';
      for (var k=0; k < this.width; k++) {
        grid_line += line.charAt(k) === '0' ? '?' : '#'
      }
      this.flags[j] = Array(this.width).fill(0)
      this.grid[j] = grid_line;
    }
    i++; // blank

    var num_across = parseInt(lines[i++].trim(), 10);
    i++; // blank
    var num_down = parseInt(lines[i++].trim(), 10);
    i++; // blank

    var a_clues = [];
    var d_clues = [];

    for (var j=0; j < num_across; j++) {
      a_clues.push(lines[i++].trim());
    }
    i++; // blank
    for (var j=0; j < num_down; j++) {
      d_clues.push(lines[i++].trim());
    }

    // now number the grid
    var maxx = this.height;
    var maxy = this.width;

    var across_clues = [];
    var down_clues = [];
    var num = 1;
    for (var y = 0; y < maxy; y++) {
      for (var x = 0; x < maxx; x++) {
        if (this.grid[y][x] === '#') {
          continue;
        }

        var start_of_xans = ((x === 0 || this.grid[y][x-1] === '#') &&
                             (x + 1 < maxx && this.grid[y][x+1] !== '#'));
        var start_of_yans = ((y === 0 || this.grid[y-1][x] === '#') &&
                             (y + 1 < maxy && this.grid[y+1][x] !== '#'));

        if (start_of_xans) {
          var clue = a_clues.shift();
          across_clues.push([['A', num], clue, this.getAnswer('A', x, y)]);
        }
        if (start_of_yans) {
          var clue = d_clues.shift();
          down_clues.push([['D', num], clue, this.getAnswer('D', x, y)]);
        }
        if (start_of_xans || start_of_yans)
          num++;
      }
    }
    this.clues = across_clues.concat(down_clues);
  }

  // parse the passed-in data.
  self.parseAcpt(data);
}
if (typeof(module) !== "undefined") {
  module.exports = Acpt;
}
