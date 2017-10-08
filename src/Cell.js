// @flow
import React, { Component } from 'react';

class XwordCell {
  state: {
    fill: string,
    entry: string,
    committed: boolean,
    active: boolean,
    focus: boolean,
    circled: boolean,
    number: number,
    version: number,
    modified: boolean,
    free: boolean,
    difficulty: ?string,
  };

  constructor(options: any) {
    this.state = {
      fill: '.',
      entry: ' ',
      active: false,
      committed: false,
      focus: false,
      circled: false,
      version: 0,
      modified: false,
      free: true,
      number: 0,
      difficulty: null,
    };
    Object.assign(this.state, options);
  }
  setState(newstate: any) {
    Object.assign(this.state, newstate);
  }
  get(key: string) : any {
    return this.state[key];
  }
  isBlack() : boolean {
    return this.state.fill === '#';
  }
}

type Props = {
  id: string,
  number: string,
  value: string,
  isTop: boolean,
  isLeft: boolean,
  isActive: boolean,
  isFocus: boolean,
  isBlack: boolean,
  isCircled: boolean,
  difficulty: string,
  onClick: Function,
};

function Cell(props: Props) {
  var classname="xwordjs-cell";
  if (props.isTop) {
    classname += " xwordjs-cell-top";
  }
  if (props.isLeft) {
    classname += " xwordjs-cell-left";
  }
  if (props.isActive) {
    classname += " xwordjs-cell-active";
  }
  if (props.isFocus) {
    if (props.isBlack)
      classname += " xwordjs-cell-focus-black";
    else
      classname += " xwordjs-cell-focus";
  } else if (props.isBlack) {
    classname += " xwordjs-cell-black";
  }
  var circleclass = "";
  if (props.isCircled) {
    circleclass = "xwordjs-cell-circled";
  }
  var overlayClass = "xwordjs-cell-overlay";
  if (props.difficulty !== "") {
    overlayClass += " xwordjs-cell-difficulty-" + props.difficulty;
  }

  return <div className={classname} onClick={() => props.onClick(props.id)}>
            <div className={overlayClass}>
            <div className={circleclass}>
              <div className="xwordjs-cell-number">{props.number}</div>
              <div className="xwordjs-cell-text">{props.value}</div>
            </div>
            </div>
          </div>;
}

export { XwordCell, Cell };
