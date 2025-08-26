import React, { useContext, useEffect, useState, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { ThemeContext } from './ThemeContext.jsx';
import { RPCContext } from './RPCContext.jsx';

import Settings from './assets/settings.svg';
import Copy from './assets/copy.svg';
import Wallet from './assets/wallet.svg';
import Exit from './assets/exit.svg';
import X from './assets/X.svg';
import Discord from './assets/Discord.svg';
import Telegram from './assets/Telegram.svg';
import Light from './assets/light.svg';
import Dark from './assets/dark.svg';

export default function Navbar({ showNotification }) {
  const { theme, setTheme, themes } = useContext(ThemeContext);
  const { endpoint, setEndpoint } = useContext(RPCContext);
  const location = useLocation();
  const { connected, publicKey, wallet, connect, disconnect } = useWallet();
  const { setVisible } = useWalletModal();
  const [menuOpen, setMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const walletButtonRef = useRef(null);
  const settingsButtonRef = useRef(null);


  useEffect(() => {
    console.log('Wallet state:', {
      connected,
      publicKey: publicKey?.toBase58(),
      wallet: wallet?.adapter?.name,
    });
    if (wallet && !connected) {
      console.log('Попытка подключения:', wallet.adapter.name);
      connect().catch((error) => console.error('Ошибка:', error));
    }
    else if (connected) {
    showNotification('Wallet connected');
  }
  }, [wallet, connected, connect]);

  const linkStyle = (path) =>
  `px-4 py-2 h-8 rounded-xl text-sm font-bold transition ${
    location.pathname === path
      ? themes[theme].linkActive
      : themes[theme].linkNormal
  } flex justify-center items-center`;

  const handleWalletClick = (e) => {
    e.preventDefault();
    console.log('Click detected, menuOpen:', menuOpen);
    if (connected) {
      setMenuOpen(!menuOpen);
    } else if (setVisible) {
      setVisible(true);
    }
  };

  const handleReconnect = () => {
    if (setVisible) setVisible(true);
    setMenuOpen(false);
  };

  const handleDisconnect = () => {
    disconnect().catch((error) => console.error('Ошибка отключения:', error));
    setMenuOpen(false);
  };

  const handleCopyAddress = () => {
    if (publicKey) {
      navigator.clipboard.writeText(publicKey.toBase58()).then(() => {
        setMenuOpen(false);
        showNotification('Wallet address copied');
      });
    }
  };

  const positionMenu = () => {
    if (walletButtonRef.current && menuOpen) {
      const buttonRect = walletButtonRef.current.getBoundingClientRect();
      const menuElement = document.querySelector('.wallet-menu');
      if (menuElement) {
        menuElement.style.top = `${buttonRect.bottom + window.scrollY + 5}px`;
        menuElement.style.left = `${buttonRect.left + (buttonRect.width / 2) - (menuElement.offsetWidth / 2) + window.scrollX}px`;
      }
    }
  };
  const positionSettingsMenu = () => {
    if (settingsButtonRef.current && settingsOpen) {
      const buttonRect = settingsButtonRef.current.getBoundingClientRect();
      const menuElement2 = document.querySelector('.settings-menu');
      if (menuElement2) {
        menuElement2.style.top = `${buttonRect.bottom + window.scrollY + 5}px`;
        menuElement2.style.left = `${buttonRect.left + (buttonRect.width / 2) - (menuElement2.offsetWidth / 2) + window.scrollX}px`;
      }
    }
  };

  useEffect(() => {
    positionMenu();
    window.addEventListener('resize', positionMenu);
    return () => window.removeEventListener('resize', positionMenu);
  }, [menuOpen]);
  useEffect(() => {
    positionSettingsMenu();
    window.addEventListener('resize', positionSettingsMenu);
    return () => window.removeEventListener('resize', positionSettingsMenu);
  }, [settingsOpen]);

  return (
    <nav className={`${themes[theme].text} relative w-full px-4 sm:px-6 mt-3 flex sm:flex-row justify-between items-center`}>
    <h1 className="sm:text-2xl  font-bold text-center sm:text-left">
      Solana DEX
    </h1>
    <div className="absolute left-1/2 transform -translate-x-1/2">
      <div style={themes[theme].buttonsCentre} className={` p-1 rounded-xl`}>
        <div className="flex gap-1">
          <Link to="/exchange" className={linkStyle('/exchange')}>Exchange</Link>
          <Link to="/portfolio" className={linkStyle('/portfolio')}>Portfolio</Link>
        </div>
      </div>
    </div>
      <div className="">
        <div className="relative flex justify-end items-center gap-4">
        <button
          ref={settingsButtonRef}
          onClick={() => setSettingsOpen(!settingsOpen)}
          className={`${themes[theme].buttonsRightHover} w-10 h-10 rounded-xl font-bold flex items-center justify-center`}
        >
          <img src={Settings} alt="Settings Icon" className={`w-7 h-7 object-contain ${themes[theme].imgColor}`}/>
        </button>

        <button
          ref={walletButtonRef}
          onClick={handleWalletClick}
          className={connected
            ? `${themes[theme].buttonsRight} ${themes[theme].buttonConnect} py-2 w-39 h-10 rounded-xl text-sm text-[#FFFFFF] font-bold flex items-center justify-center`
            : `${themes[theme].buttonsRight} ${themes[theme].buttonConnect} py-2 w-39 h-10 rounded-xl text-sm text-[#FFFFFF] font-bold flex items-center justify-center`}
        >
          {connected
            ? `${publicKey?.toBase58().slice(0, 5)}…${publicKey?.toBase58().slice(-5)}`
            : 'Connect Wallet'}
        </button>
      </div>
        {settingsOpen && (
          <div //settings
            className="fixed inset-0 bg-transparent backdrop-filter backdrop-blur-md z-40" 
            style={themes[theme].filt}
            onClick={() => setSettingsOpen(false)}
          >
            <div
              style={themes[theme].bgMenu}
              className="settings-menu absolute rounded-xl shadow-lg z-50 p-2 w-50"
              onClick={(e) => e.stopPropagation()}
            >

            {/* Тема */}
            <div className={`${themes[theme].text} flex flex-col`}>
              <p className={`${themes[theme].linkNormal.split(' ')[0]} w-full text-center text-sm`}>Settings</p>
              <span className="text-sm font-medium pt-1 pb-1">Theme:</span>
              <div className="inline-flex rounded-2xl w-fit border-1">
                <button
                  className={`px-3 py-2 rounded-2xl text-sm flex items-center transition ${theme === 'light' ? themes[theme].linkActive : themes[theme].linkNormal}`}
                  onClick={() => setTheme('light')}
                >
                  <img src={Light} alt="" className={`w-4 h-4 mr-1 ${themes[theme].imgColor}`} />
                  Light
                </button>
                <button
                  className={`px-3 py-2 rounded-2xl text-sm flex items-center transition ${theme === 'dark' ? themes[theme].linkActive : themes[theme].linkNormal}`}
                  onClick={() => setTheme('dark')}
                >
                  <img src={Dark} alt="" className={`w-4 h-4 mr-1 ${themes[theme].imgColor}`} />
                  Dark
                </button>
              </div>
              <span className="text-sm font-medium pt-4 pb-1">RPC Endpoint</span>
              <div className="flex flex-col">
                  <button
                    className={`w-full text-left px-2 py-2 rounded-xl text-sm flex items-center ${endpoint === `https://mainnet.helius-rpc.com/?api-key=${import.meta.env.VITE_HELIUS_API_KEY}` ? themes[theme].linkActive : themes[theme].linkNormal}`}
                    onClick={() => setEndpoint(`https://mainnet.helius-rpc.com/?api-key=${import.meta.env.VITE_HELIUS_API_KEY}`)}
                  >
                    Helius RPC
                  </button>
                  <button
                    className={`w-full text-left px-2 py-2 rounded-xl text-sm flex items-center ${endpoint === 'https://api.mainnet-beta.solana.com' ? themes[theme].linkActive : themes[theme].linkNormal}`}
                    onClick={() => setEndpoint('https://api.mainnet-beta.solana.com')}
                  >
                    Solana RPC
                  </button>
                </div>
            </div>
            </div>
          </div>
        )}
        {connected && menuOpen && (
          <div //wallet menu
            className="fixed inset-0 bg-transparent backdrop-filter backdrop-blur-md z-40" 
            style={themes[theme].filt}
            onClick={() => setMenuOpen(false)}
          >
            <div
              style={themes[theme].bgMenu}
              className="wallet-menu absolute rounded-xl shadow-lg z-50 p-2 w-41"
              onClick={(e) => e.stopPropagation()}
            >


            <div className={`${themes[theme].text} `}>
              <button
                onClick={handleCopyAddress}
                className={`${themes[theme].buttonsRightHover} w-full text-left px-2 py-2 rounded-xl text-sm flex items-center`}
              >
              <img src={Copy} alt="Success Icon" className={`w-5 h-5 mr-2 ${themes[theme].imgColor}`}/>
              Copy Address
              </button>
              <button
                onClick={handleReconnect}
                className={`${themes[theme].buttonsRightHover} w-full text-left px-2 py-2 rounded-xl text-sm flex items-center`}
              >
              <img src={Wallet} alt="Success Icon" className={`w-5 h-5 mr-2 ${themes[theme].imgColor}`} />
                Reconnect
              </button>
              <button
                onClick={handleDisconnect}
                className={`${themes[theme].buttonsRightHover} w-full text-left px-2 py-2 rounded-xl text-sm flex items-center`}
              >
              <img src={Exit} alt="Success Icon" className={`w-5 h-5 mr-2 ${themes[theme].imgColor}`} />
                Disconnect
              </button>
            </div>
            </div>
          </div>
        )}
      </div>
        <div
        className="fixed bottom-0 left-0 right-0 flex justify-center items-center p-3 gap-1"
        >
          <a
            href = 'https://google.com'
            className={`${themes[theme].buttonsRightHover} w-9 h-9 rounded-full font-bold flex items-center justify-center`}
          >
            <img src={X} alt="" className={`w-5 h-5 object-contain ${themes[theme].imgColor}`}/>
          </a>
          <a
            href = 'https://google.com'
            className={`${themes[theme].buttonsRightHover} w-9 h-9 rounded-full font-bold flex items-center justify-center`}
          >
            <img src={Discord} alt="" className={`w-5 h-5 object-contain ${themes[theme].imgColor}`}/>
          </a>
          <a
            href = 'https://google.com'
            className={`${themes[theme].buttonsRightHover} w-9 h-9 rounded-full font-bold flex items-center justify-center`}
          >
            <img src={Telegram} alt="" className={`w-5 h-5 object-contain ${themes[theme].imgColor}`}/>
          </a>
        </div>
    </nav>
  );
}