import filler from './fill.js';
import fs from 'fs';

it('fills', () => {
  fs.readFile('./public/XwiWordList.txt', 'utf8', function(err, s) {
    var words = s.trim().split('\n');
    fs.readFile('./van.txt', 'utf8', function(err, g) {
      var grid = g.trim();
      var wordlist = new filler.wordlist(words);
      var fillobj = new filler.filler(grid, wordlist);
      var result = fillobj.fill();
      console.log(result);
    });
  });
});
