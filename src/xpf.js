/*
 * Parse .xpf crossword files.
 */
function Xpf() {
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

  this.parse = function(buffer) {

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
    return this;
  }

  this.format = function() {
    var doc = document.implementation.createDocument("", "", null);

    var root = doc.createElement("Puzzles");
    var puzzle = doc.createElement("Puzzle");

    for (var i = 0; i < this.headers.length; i++) {
      var node = doc.createElement(this.headers[i][0]);
      node.appendChild(doc.createTextNode(this.headers[i][1]));
      puzzle.appendChild(node);
    }
    var size = doc.createElement("Size");
    var rows = doc.createElement("Rows");
    rows.appendChild(doc.createTextNode(this.height));
    var cols = doc.createElement("Cols");
    cols.appendChild(doc.createTextNode(this.width));
    size.appendChild(rows);
    size.appendChild(cols);
    puzzle.appendChild(size);

    var grid = doc.createElement("Grid");
    for (i = 0; i < this.height; i++) {
      var row = doc.createElement("Row");
      var grid_row = this.grid[i].replace(/\./g, " ");
      grid_row = grid_row.replace(/#/g, ".");
      row.appendChild(doc.createTextNode(grid_row));
      grid.appendChild(row);
    }
    puzzle.appendChild(grid);

    // TODO clues

    root.appendChild(puzzle);
    doc.appendChild(root);
    return new XMLSerializer().serializeToString(doc);
  }
}
if (typeof(module) !== "undefined") {
  module.exports = Xpf;
}
