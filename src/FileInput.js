import React, { Component } from 'react';

class FileInput extends Component {
  constructor() {
    super();
    this.onLoad = this.onLoad.bind(this);
  }
  onLoad(e) {
    this.props.onLoad(e.target.result);
  }
  handleChange(evt) {
    var file = evt.target.files[0];
    if (file) {
      var r = new FileReader();
      r.onload = this.onLoad;
      r.readAsText(file);
    }
  }
  render() {
    return (
      <input type="file" onChange={(evt) => this.handleChange(evt)}/>
    );
  }
}

export default FileInput;
