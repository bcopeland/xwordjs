import React, { Component } from 'react';

function MobileKeyboardKey(props) {
  return <div className="xwordjs-keyboard-key" onClick={() => props.onClick(props.code)}>{props.value}</div>;
}

class MobileKeyboard extends Component {
  render() {
    var keys = ["qwertyuiop", "asdfghjkl", "␣zxcvbnm⌫"];
    var rows = [];
    for (var i=0; i < keys.length; i++) {
      var rowstr = keys[i];
      var row_keys = [];
      for (var j=0; j < rowstr.length; j++) {
        var ch = rowstr.charAt(j);
        var code;
        if (ch === '␣') {
          code = 0x20;
        } else if (ch === '⌫') {
          code = 0x8;
        } else {
          code = ch.charCodeAt(0);
        }
        var key = <MobileKeyboardKey key={ch} onClick={this.props.onClick} code={code} value={ch}/>;
        row_keys.push(key);
      }
      rows[i] = <div className="xwordjs-keyboard-row" key={i}>{row_keys}</div>;
    }
    return (
      <div className="xwordjs-keyboard">{rows}</div>
    );
  }
}

export {MobileKeyboard};
