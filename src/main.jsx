import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './style.css'

if (import.meta.env.DEV && 'serviceWorker' in navigator) {
  ;(async () => {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations()
      await Promise.all(registrations.map((registration) => registration.unregister()))
      if ('caches' in window) {
        const keys = await caches.keys()
        await Promise.all(keys.map((key) => caches.delete(key)))
      }
    } catch (error) {
      console.warn('Não foi possível limpar Service Workers antigos:', error)
    }
  })()
}

ReactDOM.createRoot(document.getElementById('app')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
