import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Initialize analytics in production
import { initializeAnalytics } from '@/utils/analytics';

// Initialize analytics when the app starts
if (process.env.NODE_ENV === 'production') {
  initializeAnalytics();
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
