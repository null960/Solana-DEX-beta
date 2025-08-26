import './index.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import '@solana/wallet-adapter-react-ui/styles.css';
import App from './App';
import { ThemeProvider } from './ThemeContext.jsx';
import { RPCProvider } from './RPCContext.jsx';

const root = ReactDOM.createRoot(document.getElementById('root'));
const HELIUS_API_KEY = import.meta.env.VITE_HELIUS_API_KEY;
if (!HELIUS_API_KEY) {
  console.error('VITE_HELIUS_API_KEY not defined in .env');
  throw new Error('Helius API key missing');
}
const HELIUS_RPC = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;
root.render(
  <React.StrictMode>
    <ThemeProvider>
      <RPCProvider>
        <App />
      </RPCProvider>
    </ThemeProvider>
  </React.StrictMode>
);