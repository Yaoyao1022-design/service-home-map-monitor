import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { publicUrl } from './publicUrl'

document.documentElement.style.setProperty('--select-arrow', `url("${publicUrl('nav/arrow-down.svg')}")`)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
