import React from 'react';
import ReactDOM from 'react-dom/client';
import App, { SharedLeagueView } from './App.jsx';
import './index.css';

const shareLeagueId = new URLSearchParams(window.location.search).get('share');

ReactDOM.createRoot(document.getElementById('root')).render(
  shareLeagueId ? <SharedLeagueView leagueId={shareLeagueId} /> : <App />
);
