/*
 * Parse .puz crossword files.
 */
function Puz(data) {
  this.FLAGS = {
    INCORRECT_ONCE: 0x10,
    INCORRECT: 0x20,
    REVEALED: 0x40,
    CIRCLED: 0x80,
  };

  this.headers = [];  // list of [header, value]
  this.grid = [];     // [y][x] 2-dim array
  this.clues = [];    // list of [[direction, num], clue, answer]
  this.flags = [];     // [y][x] 2-dim array
  this.width = 0;
  this.height = 0;
  this.notes = "";
  this.decoder = new TextDecoder('iso8859-1');
  var self = this;

  this.parseString = function(ofs, buf) {
    var bytes = new Uint8Array(buf, ofs);
    for (var i=0; i < bytes.length; i++) {
      if (bytes[i] === 0)
        break;
    }
    var str = this.decoder.decode(bytes.slice(0, i));
    ofs += i + 1;
    return [ofs, str];
  }

  this.parseSection = function(ofs, buf) {
    var bytes = new Uint8Array(buf, ofs);
    if (bytes.length < 6)
      return [ofs, null];

    var typestr = this.decoder.decode(bytes.slice(0, 4));
    ofs += 4;
    var len = new DataView(buf).getUint16(ofs, true);
    ofs += 2;
    // eslint-disable-next-line
    var csum = new DataView(buf).getUint16(ofs, true);
    ofs += 2;

    if (len < bytes.length - ofs)
      return [ofs, null];

    var section = {
      name: typestr,
      data: bytes.slice(8, 8 + len)
    };

    ofs += len;
    return [ofs, section];
  }

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

  this.parsePuz = function(buffer) {

    // ArrayBuffer -> DataView
    var data = new DataView(buffer);

    // header
    this.width = data.getUint8(0x2c);
    this.height = data.getUint8(0x2d);
    var num_clues = data.getUint16(0x2e, true);

    // grid
    var ofs = 0x34;
    var grid_text = this.decoder.decode(buffer.slice(ofs, ofs + this.width * this.height));
    ofs += this.width * this.height;

    // solution text
    ofs += this.width * this.height;

    this.grid = Array(this.height);
    this.flags = Array(this.height);
    for (var y = 0; y < this.height; y++) {
      var row = Array(this.width);
      for (var x = 0; x < this.width; x++) {
        row[x] = grid_text.charAt(y * this.width + x);
        if (row[x] === '.') {
          row[x] = '#';
        }
      }
      this.grid[y] = row;
      this.flags[y] = Array(this.width).fill(0);
    }

    // strings: first authorship info and then clues
    var title;
    var author;
    var copyright;
    [ofs, title] = this.parseString(ofs, buffer);
    [ofs, author] = this.parseString(ofs, buffer);
    [ofs, copyright] = this.parseString(ofs, buffer);

    this.headers.push(['Title', title]);
    this.headers.push(['Author', author]);
    this.headers.push(['Copyright', copyright]);

    var clue;
    var clue_list = [];
    for (var i = 0; i < num_clues; i++) {
      [ofs, clue] = this.parseString(ofs, buffer);
      clue_list.push(clue);
    }

    // null terminator
    ofs += 1;

    // sections (incl. flags)
    while (ofs < buffer.byteLength) {
      var section;
      [ofs, section] = this.parseSection(ofs, buffer);
      if (!section)
        break;

      if (section.name === "GEXT") {
        for (i=0; i < section.data.length; i++) {
          y = Math.floor(i / this.width);
          x = i % this.width;
          this.flags[y][x] = section.data[i];
        }
      }
    }

    // now number the grid, assigning clues as we go
    var maxx = this.height;
    var maxy = this.width;

    var across_clues = [];
    var down_clues = [];
    var num = 1;
    for (y = 0; y < maxy; y++) {
      for (x = 0; x < maxx; x++) {
        if (this.grid[y][x] === '#') {
          continue;
        }

        var start_of_xans = ((x === 0 || this.grid[y][x-1] === '#') &&
                             (x + 1 < maxx && this.grid[y][x+1] !== '#'));
        var start_of_yans = ((y === 0 || this.grid[y-1][x] === '#') &&
                             (y + 1 < maxy && this.grid[y+1][x] !== '#'));

        if (start_of_xans) {
          clue = clue_list.shift();
          across_clues.push([['A', num], clue, this.getAnswer('A', x, y)]);
        }
        if (start_of_yans) {
          clue = clue_list.shift();
          down_clues.push([['D', num], clue, this.getAnswer('D', x, y)]);
        }
        if (start_of_xans || start_of_yans)
          num++;
      }
    }
    this.clues = across_clues.concat(down_clues);
  }

  // parse the passed-in data.
  self.parsePuz(data);
}
if (typeof(module) !== "undefined") {
  module.exports = Puz;
}
