/*
 * Parse .xpf crossword files.
 */
function Xpf(data) {
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

  this.parseXpf = function(buffer) {

    var parser = new DOMParser();
    var doc = parser.parseFromString(buffer, "text/xml");

    var puzzles = doc.getElementsByTagName("Puzzle");
    if (puzzles.length < 0) {
      return;
    }

    var puz = puzzles[0];
    for (var i = 0; i < puz.children.length; i++) {
      var node = puz.children[i];
      switch (node.nodeName) {
      case "Title":
        this.headers.push(['Title', node.textContent]);
        break;
      case "Author":
        this.headers.push(['Author', node.textContent]);
        break;
      case "Size":
        for (var j = 0; j < node.children.length; j++) {
          var child = node.children[j];
          if (child.nodeName === 'Rows')
            this.height = parseInt(child.textContent, 10);
          if (child.nodeName === 'Cols')
            this.width = parseInt(child.textContent, 10);
        }
        this.grid = Array(this.height);
        this.flags = Array(this.height);
        break;
      case "Grid":
        for (var j = 0; j < node.children.length; j++) {
          var row = node.children[j];
          this.grid[j] = row.textContent.replace(/\./g, "#");
          this.flags[j] = Array(this.width).fill(0);
        }
        break;
      case "Clues":
        for (var j=0; j < node.children.length; j++) {
          var clue = node.children[j];
          var text = clue.textContent;
          var direction = clue.getAttribute("Dir").charAt(0);
          var number = parseInt(clue.getAttribute("Num"), 10);
          var answer = clue.getAttribute("Ans");
          this.clues.push([[direction, number], text, answer]);
        }
        break;
      case "Circles":
        for (var j=0; j < node.children.length; j++) {
          var circle = node.children[j];
          var row = parseInt(circle.getAttribute("Row"), 10);
          var col = parseInt(circle.getAttribute("Col"), 10);
          if (row < 1 || row > this.height ||
              col < 1 || col > this.width) {
            continue;
          }
          this.flags[row-1][col-1] |= this.FLAGS.CIRCLED;
        }
      }
    }
  }

  // parse the passed-in data.
  self.parseXpf(data);
}
if (typeof(module) !== "undefined") {
  module.exports = Xpf;
}
