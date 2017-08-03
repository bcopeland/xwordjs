/*
 * Parse .xd crossword files.
 */
function Xd(data) {

  this.FLAGS = {
    CIRCLED: 0x80,
  };

  this.headers = [];  // list of [header, value]
  this.grid = [];     // [y][x] 2-dim array
  this.flags = [];     // [y][x] 2-dim array
  this.clues = [];    // list of [[direction, num], clue, answer]
  this.notes = "";
  this.number_index = [];
  var self = this;

  /*
   * Parse an XD file.  This is copied mostly verbatim from the
   * original python source by Saul Pwanson in order to ensure
   * compatibility.
   */
  this.parseXd = function(xd_contents) {
    // placeholders, actual numbering starts at 1
    var section = 0;

    // fake blank line at top to allow leading actual blank lines before headers
    var nblanklines = 2;

    var lines = xd_contents.split("\n");
    for (var i=0; i < lines.length; i++) {
      var line = lines[i].trim();

      if (!line) {
        nblanklines += 1;
        continue;
      }
      if (nblanklines >= 2) {
        section += 1;
        nblanklines = 0;
      } else if (nblanklines === 1) {
        nblanklines = 0;
      }

      if (section === 1) {
        // headers first
        var colon = line.indexOf(":");
        if (colon >= 0) {
          var k = line.substr(0, colon).trim();
          var v = line.substr(colon + 1).trim();
          self.headers.push([k, v]);
        } else {
          self.headers.push(["", line]);  // be permissive
        }
      } else if (section === 2) {
        // grid second

        var flags = Array(line.length).fill(0);
        for (var j=0; j < line.length; j++) {
          var ch = line.charAt(j);
          // lowercase -> circled
          if (ch.charCodeAt(0) >= 97 && ch.charCodeAt(0) <= 122) {
            flags[j] |= self.FLAGS.CIRCLED;
          }
        }
        self.grid.push(line.toUpperCase());
        self.flags.push(flags);
      } else if (section === 3) {
        // across or down clues
        var answer_idx = line.lastIndexOf("~");
        var clue;
        var answer;
        if (answer_idx > 0) {
          clue = line.substr(0, answer_idx);
          answer = line.substr(answer_idx + 1);
        } else {
          clue = line;
          answer = "";
        }
        var clue_idx = clue.indexOf(".");

        if (clue_idx <= 0) {
          throw new Error("No clue number: " + clue);
        }
        var pos = clue.substr(0, clue_idx).trim();
        var cluedir;
        var cluenum;
        clue = clue.substr(clue_idx + 1);

        if (pos.charAt(0) === 'A' || pos.charAt(0) === 'D') {
          cluedir = pos.substr(0, 1);
          cluenum = parseInt(pos.substr(1), 10);
        } else {
          cluedir = "";
          cluenum = parseInt(pos, 10);
        }

        self.clues.push([[cluedir, cluenum], clue.trim(), answer.trim()])
      } else {
        if (line)
          self.notes += line + "\n";
      }
    }
    self.numberGrid();
  }

  /*
   * Generate an index of clue number to an x/y grid location.
   */
  this.numberGrid = function() {
    var grid = self.grid;
    var maxx = grid[0].length;
    var maxy = grid.length;

    for (var y = 0; y < maxy; y++) {
      for (var x = 0; x < maxx; x++) {
        if (grid[y][x] === '#') {
          continue;
        }

        var start_of_xlight = ((x === 0 || grid[y][x-1] === '#') &&
                               (x + 1 < maxx && grid[y][x+1] !== '#'));
        var start_of_ylight = ((y === 0 || grid[y-1][x] === '#') &&
                               (y + 1 < maxy && grid[y+1][x] !== '#'));

        if (start_of_xlight || start_of_ylight) {
          self.number_index.push([x,y]);
        }
      }
    }
  }

  /*
   * Generate a "puzzle.js" format object, usable by Matt Wiseley's
   * crossword.js.
   */
  this.toPuzzleJson = function() {

    var title = "unknown";
    var author = "unknown";

    for (var i=0; i < self.headers.length; i++) {
      var header = self.headers[i];
      if (header[0] === "Title") {
        title = header[1];
      } else if (header[0] === "Author") {
        author = header[1];
      }
    }

    var puzzle = {
      "title": title,
      "by": author
    };

    var clues = [];
    for (i=0; i < self.clues.length; i++) {
      var clue = self.clues[i];
      var dir = clue[0][0];
      var num = clue[0][1];
      var clue_str = clue[1];
      var ans_str = clue[2];

      var xy = self.number_index[num-1];

      clues.push({
        "d": dir,
        "n": num,
        "x": xy[0],
        "y": xy[1],
        "c": clue_str,
        "a": ans_str,
      });
    }
    puzzle["clues"] = clues;
    return puzzle;
  }

  // parse the passed-in data.
  self.parseXd(data);
}
if (typeof(module) !== "undefined") {
  module.exports = Xd;
}
