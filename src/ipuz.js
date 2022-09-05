/*
 * Parse .ipuz crossword files.
 */
function Ipuz(data) {

  this.FLAGS = {
    INCORRECT_ONCE: 0x10,
    INCORRECT: 0x20,
    REVEALED: 0x40,
    CIRCLED: 0x80,
    HIDDEN: 0x100,
    SHADED: 0x200,
  };

  this.headers = [];  // list of [header, value]
  this.grid = [];     // [y][x] 2-dim array
  this.flags = [];     // [y][x] 2-dim array
  this.clues = [];    // list of [[direction, num], clue, answer]
  this.notes = "";
  this.number_index = [];
  this.rebus_key = {};
  this.width = 0;
  this.height = 0;
  this.BLOCK = "#";

  var self = this;

  this.parseIpuz = function(json) {

    const ipuz = JSON.parse(json);

    const dimensions = ipuz.dimensions;
    const width = parseInt(dimensions.width);
    const height = parseInt(dimensions.height);

    self.width = width;
    self.height = height;

    const puzzle = ipuz.puzzle;
    const solution = ipuz.solution;
    const acrossClues = ipuz.clues.Across;
    const downClues = ipuz.clues.Down;

    for (var i = 0; i < height; i++) {
        var flagsline = Array(width).fill(0);
        var gridline = Array(width);

        var puzzleRow = puzzle[i];
        var solutionRow = solution[i];

        for (var j = 0; j < width; j++) {
            gridline[j] = solutionRow[j] || " ";
            if (puzzleRow[j] === this.BLOCK) {
                gridline[j] = this.BLOCK;
            }

            if (puzzleRow[j] == null) {
                flagsline[j] |= self.FLAGS.HIDDEN;
            }
            if (puzzleRow[j].hasOwnProperty('style')) {
                if (puzzleRow[j]['style'].get('shapebg') === 'circle') {
                    flagsline[j] |= self.FLAGS.CIRCLED;
                }
            }
            const cell = parseInt(puzzleRow[j].cell || puzzleRow[j]);
            if (cell > 0) {
                self.number_index[cell] = [j, i];
            }
        }

        self.grid.push(gridline);
        self.flags.push(flagsline);
    }

    for (var i = 0; i < acrossClues.length; i++) {
        self.addClue('A', acrossClues[i]);
    }

    for (var i = 0; i < downClues.length; i++) {
        self.addClue('D', downClues[i]);
    }
  }

  this.addClue = function(direction, numClue) {
    var num;
    var clue;

    if (numClue.hasOwnProperty('number')) {
        num = numClue.number;
        clue = numClue.clue;
    } else {
        num = parseInt(numClue[0]);
        clue = numClue[1];
    }

    const xy = self.number_index[num];
    self.clues.push([[direction, num], clue,
                    self.getAnswer(direction, xy[0], xy[1])]);
  }

  this.getAnswer = function(direction, x, y) {
    var xinc = direction === 'A' ? 1 : 0;
    var yinc = direction === 'D' ? 1 : 0;

    var str = '';
    while (y < self.height && x < self.width &&
           self.grid[y][x] !== this.BLOCK &&
           !(self.flags[y][x] & self.FLAGS.HIDDEN)) {
      str += self.grid[y][x];
      y += yinc;
      x += xinc;
    }
    return str;
  }

  self.parseIpuz(data);
}

if (typeof(module) !== "undefined") {
  module.exports = Ipuz;
}
