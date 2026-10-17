import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import App from './App'
import { AppAuthProvider } from './auth/AppAuth'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AppAuthProvider>
        <App />
      </AppAuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
