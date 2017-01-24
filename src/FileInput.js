import React, { Component } from 'react';

class FileInput extends Component {
  constructor() {
    super();
    this.handleChange = this.handleChange.bind(this);
  }
  handleChange(evt) {
    var file = evt.target.files[0];
    this.props.onChange(window.URL.createObjectURL(file));
  }
  render() {
    return (
      <input type="file" onChange={(evt) => this.handleChange(evt)}/>
    );
  }
}

export default FileInput;
