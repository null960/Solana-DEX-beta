import React, { useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL, Transaction } from '@solana/web3.js';
import { ThemeContext } from './ThemeContext.jsx';
import debounce from 'lodash/debounce';
import Refresh from './assets/refresh.svg';
import Setting from './assets/setting.svg';

const TOKEN_MINTS = {
  SOL: 'So11111111111111111111111111111111111111112',
  USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  USDT: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
};

const DECIMALS = {
  SOL: 9,
  USDC: 6,
  USDT: 6,
};
const AVAILABLE_TOKENS = ['SOL', 'USDC', 'USDT'];

export default function Exchange() {
  const { theme, setTheme, themes } = useContext(ThemeContext);
  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const [tokenA, setTokenA] = useState('SOL');
  const [tokenB, setTokenB] = useState('USDC');
  const [amountA, setAmountA] = useState('');
  const [amountB, setAmountB] = useState('');
  const [price, setPrice] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [swapmenuOpen, setSwapmenuOpen] = useState(false);
  const SwapButtonRef = useRef(null);

  const fromRef = useRef(null);
  const toRef = useRef(null);

  const fetchQuote = useCallback(
    debounce(async (inToken, outToken, amount) => {
      if (!amount || parseFloat(amount) <= 0) {
        setAmountB('');
        setPrice(null);
        return;
      }

      try {
        setIsLoading(true);
        setError('');

        const decimals = DECIMALS[inToken] || 6;
        const amountUnits = Math.round(parseFloat(amount) * 10 ** decimals);

        const url = `https://quote-api.jup.ag/v6/quote?inputMint=${TOKEN_MINTS[inToken]}&outputMint=${TOKEN_MINTS[outToken]}&amount=${amountUnits}&slippageBps=5&onlyDirectRoutes=false`;

        const res = await fetch(url, { signal: AbortSignal.timeout(5000) }); // Добавил таймаут для надежности
        if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
        const data = await res.json();

        if (!data || !data.outAmount) {
          setError('Нет доступных путей свапа для выбранной пары токенов.');
          setAmountB('');
          setPrice(null);
          return;
        }

        const outAmount = parseFloat(data.outAmount) / 10 ** DECIMALS[outToken];
        const rate = outAmount / parseFloat(amount);
        setPrice(rate);
        setAmountB(outAmount.toFixed(6));
      } catch (err) {
        console.error('Quote error:', err.message);
        setError('Ошибка при получении котировки. Проверьте соединение или пару токенов.');
        setPrice(null);
        setAmountB('');
      } finally {
        setIsLoading(false);
      }
    }, 500),
    []
  );

  useEffect(() => {
    fetchQuote(tokenA, tokenB, amountA);
  }, [tokenA, tokenB, amountA, fetchQuote]);

  const handleSwapTokens = () => {
    setTokenA(tokenB);
    setTokenB(tokenA);
    setAmountA(amountB);
    setAmountB(amountA);
  };

  const handleSwap = async () => {
    if (!publicKey) {
      setError('Подключите кошелек!');
      return;
    }
    if (!amountA || parseFloat(amountA) <= 0) {
      setError('Введите сумму для свапа.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const decimals = DECIMALS[tokenA] || 6;
      const amountUnits = Math.round(parseFloat(amountA) * 10 ** decimals);

      const quoteRes = await fetch(
        `https://quote-api.jup.ag/v6/quote?inputMint=${TOKEN_MINTS[tokenA]}&outputMint=${TOKEN_MINTS[tokenB]}&amount=${amountUnits}&slippageBps=5`
      );
      if (!quoteRes.ok) throw new Error(`Quote HTTP error: ${quoteRes.status}`);
      const quote = await quoteRes.json();

      if (!quote || !quote.outAmount) {
        setError('Нет доступных путей свапа для выбранной пары токенов.');
        return;
      }

      const swapRes = await fetch('https://quote-api.jup.ag/v6/swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quoteResponse: quote,
          userPublicKey: publicKey.toString(),
          wrapAndUnwrapSol: true,
          asLegacyTransaction: true,
        }),
      });

      if (!swapRes.ok) throw new Error(`Swap HTTP error: ${swapRes.status}`);
      const { swapTransaction } = await swapRes.json();
      if (!swapTransaction) throw new Error('No swapTransaction in response');

      const txBuffer = Buffer.from(swapTransaction, 'base64');
      const transaction = Transaction.from(txBuffer);

      const signature = await sendTransaction(transaction, connection);
      await connection.confirmTransaction(signature, 'confirmed');

      setAmountA('');
      setAmountB('');
      setError('');
      alert(`Свап успешен! Подтверждение: ${signature}`);
    } catch (err) {
      console.error('Swap error:', err.message);
      setError(`Свап не выполнен: ${err.message}. Проверьте баланс, slippage или консоль.`);
    } finally {
      setIsLoading(false);
    }
  };

  const swapSettings = () => {
    if (SwapButtonRef.current && swapmenuOpen) {
      const buttonRect = SwapButtonRef.current.getBoundingClientRect();
      const menuElement3 = document.querySelector('.swap-menu');
      if (menuElement3) {
        menuElement3.style.top = `${buttonRect.bottom + window.scrollY + 5}px`;
        menuElement3.style.left = `${buttonRect.left + (buttonRect.width / 2) - (menuElement3.offsetWidth / 2) + window.scrollX}px`;
      }
    }
  };
  useEffect(() => {
      swapSettings();
      window.addEventListener('resize', swapSettings);
      return () => window.removeEventListener('resize', swapSettings);
    }, [swapmenuOpen]);

  return (
  <div className="w-130 h-135 flex flex-col items-center pb-2 pl-2 pr-2 border-1 rounded-3xl mt-15">
    <div className="flex w-full justify-between pt-2 pb-1">
      <button
        className={`${themes[theme].buttonsRightHover} w-7 h-7 rounded-xl font-bold flex items-center justify-center`} 
        ref={SwapButtonRef}
        onClick={() => setSwapmenuOpen(!swapmenuOpen)}
      >
        <img src={Setting} alt="Settings" className={`w-7 h-7 ${themes[theme].imgColor}`} />
      </button>
      <button 
        className={`${themes[theme].buttonsRightHover} w-7 h-7 rounded-xl font-bold flex items-center justify-center`}
        onClick={() => fetchQuote(tokenA, tokenB, amountA)} 
        disabled={isLoading}
      >
        <img src={Refresh} alt="Refresh" className={`w-5 h-5 ${themes[theme].imgColor}`} />
      </button>
    </div>

  <div className="flex flex-col items-center gap-0 mb-4 w-full">
    <div className="border-1 rounded-2xl w-full h-35 p-5 relative">
      <label className="absolute top-4 left-4 text-xs">Selling</label>
      <div className="flex items-center gap-2 mt-8">
        <select value={tokenA} onChange={e => setTokenA(e.target.value)} className="w-1/3 border-1 text-xl">
          {AVAILABLE_TOKENS.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <input
          type="number"
          value={amountA}
          onChange={e => setAmountA(e.target.value)}
          placeholder="0.0"
          className="w-1/1 border-1 text-3xl pt-4 pb-4"
        />
      </div>
    </div>

    <button 
    className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition"
    onClick={() => {
      const tempToken = tokenA;
      const tempAmount = amountA;
      setTokenA(tokenB);
      setTokenB(tempToken);
      setAmountA(amountB);
      setAmountB(tempAmount);
      fetchQuote(tokenB, tokenA, amountB || '');
    }}
    >
    Swap Direction
    </button>

  <div className="border-1 rounded-2xl w-full h-35 p-5 relative">
    <label className="absolute top-4 left-4 text-xs">Buying</label>
    <div className="flex items-center gap-2 mt-8">
      <select value={tokenB} onChange={e => setTokenB(e.target.value)} className="w-1/3 border-1 text-xl">
        {AVAILABLE_TOKENS.map(t => <option key={t} value={t}>{t}</option>)}
      </select>
      <input
        type="number"
        value={amountB}
        readOnly
        placeholder="0.0"
        className="w-1/1 border-1 text-3xl pt-4 pb-4"
      />
    </div>
  </div>
  </div>

  {price && <div className="mb-2">1 {tokenA} ≈ {price.toFixed(6)} {tokenB}</div>}
  {error && <div className="text-red-500 mb-2">{error}</div>}

  <button
    onClick={handleSwap}
    disabled={isLoading || !amountA}
    className="mt-auto w-full h-13 rounded-2xl bg-green-600 text-white hover:bg-green-700 text-xl font-bold pb-1"
  >
    {isLoading ? 'Processing...' : 'Swap'}
  </button>

  {swapmenuOpen && (
    <div
      className="fixed inset-0 bg-transparent backdrop-filter backdrop-blur-md z-40" 
      style={themes[theme].filt}
      onClick={() => setSwapmenuOpen(false)}
    >
      <div
        style={themes[theme].bgMenu}
        className="settings-menu absolute rounded-xl shadow-lg z-50 p-2 w-50"
        onClick={(e) => e.stopPropagation()}
      >
      </div>
    </div>
  )}
  </div>
  );
}