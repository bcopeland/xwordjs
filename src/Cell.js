// @flow
import React from 'react';

function Cell(props) {
  var classname="xwordjs-cell";
  if (props.isBlack) {
    classname += " xwordjs-cell-black";
  }
  if (props.isTop) {
    classname += " xwordjs-cell-top";
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

  if (props.isIncorrect)
    classname += " xwordjs-cell-incorrect";

  var circleclass = "";
  if (props.isCircled) {
    circleclass = "xwordjs-cell-circled";
  }

  return <div className={classname} onClick={() => props.onClick(props.id)}>
            <div className={circleclass}>
              <div className="xwordjs-cell-number">{props.number}</div>
              <div className="xwordjs-cell-text">{props.value}</div>
            </div>
          </div>;
}

export default Cell;
