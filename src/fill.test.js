import filler from './fill.js';
import fs from 'fs';

it('fills', (done) => {
  fs.readFile('./public/XwiWordList.txt', 'utf8', function(err, s) {
    var words = s.trim().split('\n');
    fs.readFile('./van.txt', 'utf8', function(err, g) {
      var grid = g.trim();
      var wordlist = new filler.wordlist(words);
      var fillobj = new filler.filler(grid, wordlist);
      var result = fillobj.fill();
      var answer=`
cabs#galba#dial
area#eraof#idle
lien#taino#goby
CaravaNroute###
##baht###limper
ima#fib#aok#hrh
norm#pacifiCaVE
atria#scd#sanit
theOdyssey#atno
url#lao#dab#oer
basial###maam##
###sieNnamillEr
ncaa#ladle#cite
edda#adair#omit
acdc#wakes#abcd`;
      expect(result).toEqual(answer.trim());
      done();
    });
  });
});
