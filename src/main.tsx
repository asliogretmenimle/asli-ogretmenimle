import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import '@fontsource-variable/nunito'
import './index.css'
import App from './App'
import { installChunkReload } from './lib/chunkReload'
import { captureSeoArticle } from './lib/seoArticle'

installChunkReload()
captureSeoArticle()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
