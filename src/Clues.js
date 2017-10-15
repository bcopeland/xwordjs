// @flow
import React from 'react';

function Clue(props) {
  var clue = props.value;
  var contents = clue.get('number') + ". " + clue.get('clue');
  var extraClass = "";

  if (clue.get('active'))
    extraClass = " xwordjs-clue-active";
  else if (clue.get('crossActive'))
    extraClass = " xwordjs-clue-cross-active";

  return (
    <div className={"xwordjs-clue" + extraClass} id={"clue_" + clue.get('index')} onClick={() => props.onClick(clue)}>{contents}</div>
  );
}

function Clues(props) {
  var across = [];
  var down = [];
  for (var i=0; i < props.value.length; i++) {
    var clue = props.value[i];

    if (clue.get('direction') === 'A') {
      across.push(props.value[i]);
    } else {
      down.push(props.value[i]);
    }
  }
  return(
    <div id="xwordjs-cluelist-container" className="xwordjs-cluelist-container">
      <Cluelist selectClue={props.selectClue} value={across} title="Across"/>
      <Cluelist selectClue={props.selectClue} value={down} title="Down"/>
    </div>
  );
}

function Cluelist(props) {
  var list = [];
  for (var i=0; i < props.value.length; i++) {
    var clue = props.value[i];
    list.push(<Clue key={"clue_" + i} onClick={(x) => props.selectClue(x)} value={clue}/>);
  }
  return (
    <div>
    <h3>{props.title}</h3>
    <div className="xwordjs-cluelist">
    {list}
    </div>
    </div>
  );
}

export default Clues;
