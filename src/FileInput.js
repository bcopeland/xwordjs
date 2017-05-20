import React, { Component } from 'react';

class FileInput extends Component {
  constructor() {
    super();
    this.handleChange = this.handleChange.bind(this);
  }
  handleChange(evt) {
    var file = evt.target.files[0];
    var filename = evt.target.value;
    this.props.onChange(file, filename);
  }
  render() {
    return (
      <input type="file" onChange={(evt) => this.handleChange(evt)}/>
    );
  }
}

export default FileInput;
