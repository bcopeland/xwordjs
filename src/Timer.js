import React, { Component } from 'react';
import Modal from 'react-modal';
import { Button } from 'react-bootstrap';

class TimerState {
  constructor(options) {
    this.state = {
      start_time: new Date().getTime(),
      elapsed: 0,
      paused: false,
      stopped: false
    };
    Object.assign(this.state, options);
  }
  setState(newstate) {
    Object.assign(this.state, newstate);
  }
  get(key) {
    return this.state[key];
  }
  elapsedStr(in_english) {
    var elapsed = this.state.elapsed / 1000;
    var sec = Math.floor(elapsed % 60);
    var min = Math.floor(elapsed / 60);

    if (in_english)
      return min + " minutes and " + sec + " seconds";

    sec = (sec < 10) ? "0" + sec : sec;
    min = (min < 10) ? "0" + min : min;
    return min + ":" + sec;
  }
}

class Timer extends Component {
  constructor(props) {
    super(props);
    this.state = { timer : null };
    this.onInterval = this.onInterval.bind(this);
    this.handleClick = this.handleClick.bind(this);
  }
  onInterval() {
    var now = new Date().getTime();
    var elapsed = this.props.value.state.elapsed + now - this.props.value.state.start_time;
    this.props.onChange({start_time: now, elapsed: elapsed});
  }
  handleClick(e) {
    e.preventDefault();
    if (this.props.value.state.paused) {
      this.start();
    } else {
      this.pause();
    }
  }
  reset() {
    this.props.onChange({start_time: new Date().getTime(), elapsed: 0});
  }
  start() {
    var timer = setInterval(this.onInterval, 1000);
    this.setState({timer: timer});
    this.props.onChange({start_time: new Date().getTime(), paused: false, stopped: false});
  }
  stop() {
    clearInterval(this.state.timer);
    this.props.onChange({stopped: true});
  }
  pause() {
    clearInterval(this.state.timer);
    this.props.onChange({paused: true});
  }
  render() {

    if (this.props.value.state.stopped) {
      clearInterval(this.state.timer);
    }

    var time_text = this.props.value.elapsedStr(false);

    return (
      <div>
      <Modal isOpen={this.props.value.state.paused}>
        <h1>Paused</h1>
        <p>I guess you have something better to do than finish this right now.</p>
        <button onClick={this.handleClick}>Resume</button>
      </Modal>
      <Button className="xwordjs-timer-text" onClick={this.handleClick}>
      <i className="fa fa-pause" aria-hidden="true"></i>&nbsp;&nbsp;{time_text}</Button>
      </div>
    );
  }
  componentDidMount() {
    this.reset();
    this.start();
  }
  componentWillUnmount() {
    this.pause();
  }
}

export { TimerState, Timer };
