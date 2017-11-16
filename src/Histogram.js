
import React, { Component } from 'react';

const Histogram = (props) => {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  var cells = new Array(26);
  for (let i = 0; i < letters.length; i++) {
    cells[i] = 0;
  }
  var total_ct = 0;
  var max_ct = 0;
  for (let i = 0; i < props.cells.length; i++) {
    const idx = props.cells[i].get('entry').toUpperCase().charCodeAt(0) - "A".charCodeAt(0);
    cells[idx] += 1;
    total_ct += 1;
  }
  for (let i = 0; i < letters.length; i++) {
    if (cells[i] > max_ct) {
      max_ct = cells[i];
    }
  }
  var bars = [];
  var labels = [];
  for (let i = 0; i < letters.length; i++) {
    const max_length = 50.0;
    const bar_length = max_length * (cells[i] / max_ct);
    const bar_width = 5;

    bars.push(<rect width={bar_width} height={bar_length} x={10 * i} y={max_length - bar_length} color="blue"/>);
    labels.push(<text x={2 * bar_width * i} y={max_length + 2 * bar_width} fontSize={2 * bar_width}>{letters[i]}</text>);
  }
  return (
    <div>
      <svg>
        {bars}
        {labels}
      </svg>
    </div>
  );
}

export default Histogram;
