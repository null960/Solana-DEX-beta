import React, { useContext, useEffect, useState, useRef, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import TokenSelector from './TokenSelector.jsx';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { VersionedTransaction, PublicKey, LAMPORTS_PER_SOL, AddressLookupTableAccount } from '@solana/web3.js';
import { Buffer } from 'buffer';
import { ThemeContext } from './ThemeContext.jsx';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
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

export default function Exchange() {
  const { theme, themes } = useContext(ThemeContext);
  const [openSelector, setOpenSelector] = useState(null);
  const [tokenA, setTokenA] = useState({ symbol: 'SOL' });
  const [tokenB, setTokenB] = useState({ symbol: 'USDC' });
  const [amount, setAmount] = useState('');
  const [amountB, setAmountB] = useState('');
  const [activeInput, setActiveInput] = useState('from');
  const [price, setPrice] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fromRef = useRef(null);
  const toRef = useRef(null);

  const { connection } = useConnection();
  const { publicKey, sendTransaction, signTransaction } = useWallet();

  const debouncedFetchPrice = useCallback(
    debounce(async (tokenA, tokenB, amount) => {
      if (!tokenA || !tokenB || !amount) {
        setPrice(null);
        setAmountB('');
        return;
      }
      try {
        setIsLoading(true);
        setError(null);
        const decimalsA = DECIMALS[tokenA.symbol] || 6;
        const amountUnits = Math.round(parseFloat(amount) * 10 ** decimalsA);
        const res = await fetch(
          `https://quote-api.jup.ag/v6/quote?inputMint=${TOKEN_MINTS[tokenA.symbol]}&outputMint=${TOKEN_MINTS[tokenB.symbol]}&amount=${amountUnits}&slippageBps=50`
        );
        if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
        const data = await res.json();
        if (data && data.outAmount) {
          const decimalsB = DECIMALS[tokenB.symbol] || 6;
          const outAmount = parseFloat(data.outAmount) / 10 ** decimalsB;
          const inAmount = parseFloat(amount);
          const rate = outAmount / inAmount;
          setPrice(rate);
          setAmountB((inAmount * rate).toFixed(6));
        } else {
          setPrice(null);
          setAmountB('');
          setError('Failed to get quote. Check token availability on Devnet.');
        }
      } catch (err) {
        console.error('Quote error:', err);
        setPrice(null);
        setAmountB('');
        setError('Error fetching quote. Ensure tokens are available.');
      } finally {
        setIsLoading(false);
      }
    }, 1000),
    []
  );

  const handleSwap = async () => {
    if (!publicKey || !tokenA || !tokenB || !amount || price === null) {
      setError('Please select tokens and enter an amount.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const balance = await connection.getBalance(publicKey);
      if (balance < 0.002 * LAMPORTS_PER_SOL) {
        setError('Insufficient SOL for fees. Request test SOL (2 SOL recommended).');
        return;
      }

      const decimalsA = DECIMALS[tokenA.symbol] || 6;
      const amountUnits = Math.round(parseFloat(amount) * 10 ** decimalsA);

      // Получение котировки
      const quoteResponse = await fetch(
        `https://quote-api.jup.ag/v6/quote?inputMint=${TOKEN_MINTS[tokenA.symbol]}&outputMint=${TOKEN_MINTS[tokenB.symbol]}&amount=${amountUnits}&slippageBps=50`
      );
      if (!quoteResponse.ok) throw new Error(`Quote HTTP error: ${quoteResponse.status}`);
      const quote = await quoteResponse.json();

      if (!quote || !quote.outAmount) {
        setError('Invalid quote response. Check token availability on Devnet.');
        return;
      }

      // Создание транзакции свопа
      const swapResponse = await fetch('https://quote-api.jup.ag/v6/swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quoteResponse: quote,
          userPublicKey: publicKey.toString(),
          wrapAndUnwrapSol: true,
          feeAccount: null,
          computeUnitPriceMicroLamports: 1000,
          asLegacyTransaction: true, // Попытка использовать устаревший формат для упрощения
        }),
      });
      if (!swapResponse.ok) throw new Error(`Swap HTTP error: ${swapResponse.status}`);
      const { swapTransaction } = await swapResponse.json();

      const transactionBuf = Buffer.from(swapTransaction, 'base64');
      let transaction;
      try {
        // Попытка десериализовать как VersionedTransaction
        transaction = VersionedTransaction.deserialize(transactionBuf);
      } catch (e) {
        console.error('Deserialization error (Versioned):', e);
        // Если VersionedTransaction не работает, попробуем как Legacy
        transaction = Transaction.from(transactionBuf);
      }

      // Получение и загрузка адресной таблицы, если указана
      let addressLookupTableAccounts = [];
      if ('addressTableLookups' in transaction.message) {
        addressLookupTableAccounts = await Promise.all(
          transaction.message.addressTableLookups.map(async (lookup) => {
            const accountInfo = await connection.getAccountInfo(lookup.accountKey);
            if (!accountInfo) {
              throw new Error(`Address lookup table account not found: ${lookup.accountKey.toBase58()}`);
            }
            if (!accountInfo.data || !(accountInfo.data instanceof Uint8Array)) {
              throw new Error(`Invalid data format for address lookup table: ${lookup.accountKey.toBase58()}`);
            }
            try {
              const data = new Uint8Array(accountInfo.data);
              return new AddressLookupTableAccount({
                key: lookup.accountKey,
                state: AddressLookupTableAccount.deserialize(data),
              });
            } catch (err) {
              console.error('Deserialization error:', err);
              throw new Error('Failed to deserialize address lookup table account.');
            }
          })
        );
      }

      // Установка blockhash
      const { blockhash } = await connection.getLatestBlockhash();
      if (transaction instanceof VersionedTransaction) {
        transaction.message.recentBlockhash = blockhash;
      } else {
        transaction.recentBlockhash = blockhash;
      }
      transaction.feePayer = publicKey;

      // Симуляция транзакции
      const simulation = await connection.simulateTransaction(transaction, addressLookupTableAccounts);
      if (simulation.value.err) {
        console.log('Simulation error details:', simulation.value.err);
        throw new Error(`Simulation failed: ${JSON.stringify(simulation.value.err)}`);
      }

      // Подпись и отправка через кошелек
      const signedTransaction = await signTransaction(transaction);
      const signature = await sendTransaction(signedTransaction, connection);
      await connection.confirmTransaction(signature, 'confirmed');

      setAmount('');
      setAmountB('');
      setError(null);
      alert(`Swap successful! Transaction: ${signature}`);
    } catch (err) {
      console.error('Swap error:', err);
      if (err.message.includes('User rejected')) setError('Transaction rejected. Confirm in wallet.');
      else if (err.message.includes('InstructionError')) setError('Unsupported program or invalid transaction. Try different tokens or amount.');
      else setError('Swap failed. Check console for details.');
    } finally {
      setIsLoading(false);
    }
  };

  const requestAirdrop = async () => {
    if (!publicKey) {
      alert('Please connect your wallet');
      return;
    }
    setIsLoading(true);
    try {
      const signature = await connection.requestAirdrop(publicKey, 2 * LAMPORTS_PER_SOL);
      await connection.confirmTransaction(signature, 'confirmed');
      alert('Test SOL (2 SOL) requested successfully!');
    } catch (err) {
      console.error('Airdrop error:', err);
      setError('Failed to request test SOL. Try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = () => {
    debouncedFetchPrice(tokenA, tokenB, amount || '1');
  };

  useEffect(() => {
    if (!tokenA || !tokenB || price === null) return;
    if (activeInput === 'from') {
      const val = parseFloat(amount);
      setAmountB(!isNaN(val) ? (val * price).toFixed(6) : '');
    } else {
      const valB = parseFloat(amountB);
      setAmount(!isNaN(valB) && price !== 0 ? (valB / price).toFixed(6) : '');
    }
  }, [amount, amountB, price, tokenA, tokenB, activeInput]);

  useEffect(() => {
    const handler = (e) => {
      if (openSelector === 'from' && fromRef.current && !fromRef.current.contains(e.target)) setOpenSelector(null);
      if (openSelector === 'to' && toRef.current && !toRef.current.contains(e.target)) setOpenSelector(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [openSelector]);

  const swapTokens = () => {
    const oldA = tokenA;
    const oldB = tokenB;
    const oldAmt = amount;
    setTokenA(oldB);
    setTokenB(oldA);
    setAmount(amountB);
    setAmountB(oldAmt);
    setActiveInput(activeInput === 'from' ? 'to' : 'from');
  };

  return (
    <div className="flex flex-col items-center px-4 mt-8">
      <div style={themes[theme].bgMenu} className="rounded-xl shadow-2xl w-full max-w-md p-6 sm:p-3">
        <div className="flex flex-col space-y-6">
          <div className="relative flex justify-end items-center gap-2">
            <button onClick={handleRefresh} className={`${themes[theme].buttonsRightHover} w-8 h-8 rounded-xl flex items-center justify-center`} disabled={isLoading}>
              <img src={Refresh} alt="Refresh" className={`w-5 h-5 ${themes[theme].imgColor}`} />
            </button>
            <button onClick={requestAirdrop} className={`${themes[theme].buttonsRightHover} w-8 h-8 rounded-xl flex items-center justify-center`} disabled={isLoading}>
              <img src={Setting} alt="Settings" className={`w-7 h-7 ${themes[theme].imgColor}`} />
            </button>
          </div>

          <div className="relative" ref={fromRef}>
            <label className="block text-sm font-medium text-gray-700 mb-1">You pay</label>
            <div className="bg-gray-900 text-white rounded-xl px-4 py-3 flex justify-between items-center">
              <button onClick={() => setOpenSelector(openSelector === 'from' ? null : 'from')} className="bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded-md text-sm font-medium flex items-center">
                {tokenA.symbol}
                <svg className={`w-4 h-4 ml-1 text-gray-300 transform ${openSelector === 'from' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <input
                type="number"
                placeholder="0.0"
                value={amount}
                onChange={(e) => { setAmount(e.target.value); setActiveInput('from'); }}
                className="bg-transparent text-right text-white text-lg font-bold w-1/2 focus:outline-none"
                disabled={isLoading}
              />
            </div>
            {openSelector === 'from' && (
              <div className="absolute mt-2 w-full bg-white border border-gray-300 rounded-lg shadow-lg z-20">
                <TokenSelector onSelect={(token) => { setTokenA(token); setOpenSelector(null); }} />
              </div>
            )}
          </div>

          <div className="flex justify-center pt-2">
            <button onClick={swapTokens} className="bg-gray-800 text-white rounded-full p-2 shadow-md hover:bg-gray-700 transition" disabled={isLoading}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v6h6M20 20v-6h-6M4 10l6 6M20 14l-6-6" />
              </svg>
            </button>
          </div>

          <div className="relative" ref={toRef}>
            <label className="block text-sm font-medium text-gray-700 mb-1">You receive</label>
            <div className="bg-gray-900 text-white rounded-xl px-4 py-3 flex justify-between items-center">
              <button onClick={() => setOpenSelector(openSelector === 'to' ? null : 'to')} className="bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded-md text-sm font-medium flex items-center">
                {tokenB.symbol}
                <svg className={`w-4 h-4 ml-1 text-gray-300 transform ${openSelector === 'to' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <span className="text-lg font-bold">{amountB}</span>
            </div>
            {openSelector === 'to' && (
              <div className="absolute mt-2 w-full bg-white border border-gray-300 rounded-lg shadow-lg z-20">
                <TokenSelector onSelect={(token) => { setTokenB(token); setOpenSelector(null); }} />
              </div>
            )}
          </div>

          {tokenA && tokenB && price !== null && (
            <div className="text-sm text-gray-500 text-center">
              1 {tokenA.symbol} ≈ {price.toFixed(2)} {tokenB.symbol}
            </div>
          )}

          {error && <div className="text-sm text-red-500 text-center">{error}</div>}

          <button
            onClick={handleSwap}
            disabled={!publicKey || !tokenA || !tokenB || !amount || price === null || isLoading}
            className={`w-full py-3 rounded-lg font-semibold text-white transition text-base sm:text-lg ${
              publicKey && tokenA && tokenB && amount && price !== null && !isLoading
                ? 'bg-blue-500 hover:bg-blue-600'
                : 'bg-gray-300 cursor-not-allowed'
            }`}
          >
            {isLoading ? 'Processing...' : 'Swap'}
          </button>
        </div>
      </div>
    </div>
  );
}