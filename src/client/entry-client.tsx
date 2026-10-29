/** クライアント エントリーポイント */

import { render } from 'preact';
import { Router } from 'preact-router';
import App from './App';
import './styles.css';

render(
  <Router>
    <App />
  </Router>,
  document.getElementById('app')!
);