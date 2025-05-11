import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from '@/contexts/AuthContext';
import { disableReactDevTools } from '@fvilers/disable-react-devtools';

if(import.meta.env.NODE_ENV != 'development') {
    disableReactDevTools();
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
)
