// @flow
import React from 'react';

function Cell(props) {
  var classname="xwordjs-cell";
  if (props.isHidden) {
    classname += " xwordjs-cell-hidden";
  } else if (props.isBlack) {
    classname += " xwordjs-cell-black";
  }
  if (props.isTop) {
    classname += " xwordjs-cell-top";
  }
  if (props.isShaded) {
    classname += " xwordjs-cell-shaded";
  }
  if (props.isLeft) {
    classname += " xwordjs-cell-left";
  }
  if (props.isFocus) {
    classname += " xwordjs-cell-focus";
    if (props.isIncorrect)
      classname += "-incorrect";
  } else if (props.isActive) {
    classname += " xwordjs-cell-active";
    if (props.isIncorrect)
      classname += "-incorrect";
  }

  if (props.isIncorrect && !props.isHidden) {
    classname += " xwordjs-cell-incorrect";
  }
  var circleclass = "";
  if (props.isCircled) {
    circleclass = "xwordjs-cell-circled";
  }

  var fontsize = 14;
  if (props.value.length > 2) {
    fontsize = 30 / props.value.length;
  }

  return <div className={classname} id={props.id} onClick={() => props.onClick(props.id)}>
            <div className={circleclass}>
              <div className="xwordjs-cell-number">{props.number}</div>
              <div className="xwordjs-cell-text" style={{"font-size": fontsize + "px"}}>{props.value}</div>
            </div>
          </div>;
}

export default Cell;
