import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { CreditsProvider } from './context/CreditsContext.jsx';
import './styles/index.css';
import './styles/responsive.css';

// Match Vite `base`: `/app/` on EC2, `/` on Vercel (VITE_BASE_PATH=/).
const basename = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter basename={basename}>
      <AuthProvider>
        <CreditsProvider>
          <App />
        </CreditsProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
