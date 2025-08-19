import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL, Transaction } from '@solana/web3.js';
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
  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();

  const [tokenA, setTokenA] = useState('SOL');
  const [tokenB, setTokenB] = useState('USDC');
  const [amountA, setAmountA] = useState('');
  const [amountB, setAmountB] = useState('');
  const [price, setPrice] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

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

        const url = `https://quote-api.jup.ag/v6/quote?inputMint=${TOKEN_MINTS[inToken]}&outputMint=${TOKEN_MINTS[outToken]}&amount=${amountUnits}&slippageBps=100&onlyDirectRoutes=false`;

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
        `https://quote-api.jup.ag/v6/quote?inputMint=${TOKEN_MINTS[tokenA]}&outputMint=${TOKEN_MINTS[tokenB]}&amount=${amountUnits}&slippageBps=50`
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

  const requestAirdrop = async () => {
    if (!publicKey) return alert('Подключите кошелек!');
    setIsLoading(true);
    try {
      const sig = await connection.requestAirdrop(publicKey, 2 * LAMPORTS_PER_SOL);
      await connection.confirmTransaction(sig, 'confirmed');
      alert('Тестовые SOL успешно зачислены!');
    } catch (err) {
      console.error('Airdrop error:', err.message);
      setError('Не удалось получить тестовые SOL. Попробуйте снова или проверьте сеть.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center p-6">
      <div className="flex justify-end gap-2 mb-4">
        <button onClick={() => fetchQuote(tokenA, tokenB, amountA)} disabled={isLoading}>
          <img src={Refresh} alt="Refresh" className="w-6 h-6" />
        </button>
        <button onClick={requestAirdrop} disabled={isLoading}>
          <img src={Setting} alt="Settings" className="w-6 h-6" />
        </button>
      </div>

      <div className="flex gap-4 mb-4">
        <div>
          <label>You pay</label>
          <input
            type="number"
            value={amountA}
            onChange={e => setAmountA(e.target.value)}
            placeholder="0.0"
          />
          <select value={tokenA} onChange={e => setTokenA(e.target.value)}>
            {AVAILABLE_TOKENS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <div>
          <label>You receive</label>
          <input
            type="number"
            value={amountB}
            readOnly
            placeholder="0.0"
          />
          <select value={tokenB} onChange={e => setTokenB(e.target.value)}>
            {AVAILABLE_TOKENS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>

      {price && <div className="mb-2">1 {tokenA} ≈ {price.toFixed(6)} {tokenB}</div>}
      {error && <div className="text-red-500 mb-2">{error}</div>}

      <button
        onClick={handleSwap}
        disabled={isLoading || !amountA}
        className={`px-4 py-2 rounded bg-blue-500 text-white hover:bg-blue-600 transition`}
      >
        {isLoading ? 'Processing...' : 'Swap'}
      </button>
    </div>
  );
}