import './index.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import '@solana/wallet-adapter-react-ui/styles.css';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter} from '@solana/wallet-adapter-wallets';
import App from './App';
import { ThemeProvider } from './ThemeContext.jsx';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <ThemeProvider>
      <ConnectionProvider endpoint="https://api.mainnet-beta.solana.com" config={{ commitment: 'confirmed' }}>
        <WalletProvider
          wallets={[new PhantomWalletAdapter()]}
          autoConnect={true}
        >
          <WalletModalProvider>
            <App />
          </WalletModalProvider>
        </WalletProvider>
      </ConnectionProvider>
    </ThemeProvider>
  </React.StrictMode>
);