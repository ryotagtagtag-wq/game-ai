/** クライアント エントリーポイント */

import { render } from 'preact';
import { Route, Router } from 'preact-router';
import App from './App';
import './styles.css';

render(
  <Router>
    <Route default component={App} />
  </Router>,
  document.getElementById('app')!
);