import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// O drei já configura automaticamente o DRACO quando useGLTF é usado
// Não é necessário configurar manualmente

ReactDOM.createRoot(document.getElementById('root')!).render(
  // StrictMode removido temporariamente para evitar renderizações duplas
  // que podem causar problemas com múltiplos Canvas WebGL
  <App />
)
