import React from 'react';
import ReactDOM from 'react-dom';
import { HashRouter } from 'react-router-dom';
import XwordMain from './Xword';
import './index.css';

ReactDOM.render(
  (<HashRouter>
    <XwordMain />
  </HashRouter>),
  document.getElementById('root')
);
