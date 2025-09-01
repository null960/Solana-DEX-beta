// src/App.jsx
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import React, { useContext, useState } from 'react';
import Navbar from './Navbar.jsx';
import Exchange from './Exchange.jsx';
import Portfolio from './Portfolio.jsx';
import Notification from './Notification.jsx';
import { ThemeContext } from './ThemeContext.jsx';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-wallets';
import { RPCContext } from './RPCContext.jsx';
import TokenPage from './TokenPage.jsx';


export default function App() {
  const [notification, setNotification] = useState({ show: false, message: '' });
  const { theme, themes } = useContext(ThemeContext);
  
  const showNotification = (message) => {
    setNotification({ show: true, message });
    setTimeout(() => setNotification({ show: false, message: '' }), 4000);
  };
  const { endpoint } = useContext(RPCContext);
  return (
  <ConnectionProvider endpoint={endpoint} config={{ commitment: 'confirmed' }}>
    <WalletProvider wallets={[new PhantomWalletAdapter()]} autoConnect={true}>
      <WalletModalProvider>
        <Router>
          <div style={themes[theme].background} className={`${themes[theme].text} fixed top-0 left-0 min-h-screen w-screen`}>
            <Navbar showNotification={showNotification} />
            <main className="flex justify-center items-start px-4 sm:px-6 lg:px-8 py-10">
              <Routes>
                <Route path="/exchange" element={<Exchange />} />
                <Route path="/portfolio" element={<Portfolio />} />
                <Route path="/portfolio/:address" element={<Portfolio />} />
                <Route path="/tokens/:address" element={<TokenPage />} />
              </Routes>
            </main>
            {notification.show && (
              <Notification message={notification.message} onClose={() => setNotification({ show: false, message: '' })} />
            )}
          </div>
        </Router>
      </WalletModalProvider>
    </WalletProvider>
  </ConnectionProvider>
  );
}
