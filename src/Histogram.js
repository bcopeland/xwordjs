
import React from 'react';

const Histogram = (props) => {
  var counts = new Array(props.keys.length);
  var key_table = {};
  for (let i = 0; i < props.keys.length; i++) {
    counts[i] = 0;
    key_table[props.keys[i]] = i;
  }
  var max_ct = 0;
  for (let i = 0; i < props.samples.length; i++) {
    const sample = props.samples[i];
    const idx = key_table[sample];
    if (idx === undefined) {
      continue;
    }
    counts[idx] += 1;
  }
  for (let i = 0; i < props.keys.length; i++) {
    if (counts[i] > max_ct) {
      max_ct = counts[i];
    }
  }
  var bars = [];
  var labels = [];
  for (let i = 0; i < props.keys.length; i++) {
    const max_length = 50.0;
    const bar_length = max_length * (counts[i] / max_ct);
    const bar_width = 5;

    bars.push(<rect width={bar_width} height={bar_length} x={10 * i} y={max_length - bar_length} color="blue"/>);
    labels.push(<text x={2 * bar_width * i} y={max_length + 2 * bar_width} fontSize={2 * bar_width}>{props.keys[i]}</text>);
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
