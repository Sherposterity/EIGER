import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { applyHashRedirect } from './lib/hashRedirect.js'

// Rewrite legacy #/ links and the 404.html hand-off into real paths before
// the router reads the URL. See docs/ROUTING.md.
applyHashRedirect()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
