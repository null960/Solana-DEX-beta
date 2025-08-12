import React, { useState, useEffect } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';

const TOKEN_MINTS = {
  'So11111111111111111111111111111111111111112': 'SOL',
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': 'USDC',
  'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': 'USDT',
};

export default function Portfolio() {
  const { publicKey, connected } = useWallet();
  const { connection } = useConnection(); // Использует Devnet по умолчанию
  const [portfolio, setPortfolio] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!connected || !publicKey) {
      setPortfolio([]);
      setLoading(false);
      return;
    }

    let subscriptionId = null;

    const fetchInitialData = async () => {
      setLoading(true);
      try {
        // Баланс SOL
        const solBal = await connection.getBalance(publicKey);
        const solData = { symbol: 'SOL', amount: solBal / LAMPORTS_PER_SOL, decimals: 9 };

        // Токены SPL
        const tokenAccounts = await connection.getTokenAccountsByOwner(
          publicKey,
          { programId: TOKEN_PROGRAM_ID }
        );
        const splTokens = await Promise.all(tokenAccounts.value.map(async (acc) => {
          const parsedData = (await connection.getParsedAccountInfo(acc.pubkey)).value.data.parsed.info;
          const symbol = TOKEN_MINTS[parsedData.mint] || parsedData.mint.slice(0, 8) + '...';
          return {
            symbol,
            amount: parsedData.tokenAmount.uiAmount,
            decimals: parsedData.tokenAmount.decimals,
          };
        }));

        setPortfolio([solData, ...splTokens]);
      } catch (error) {
        console.error('Fetch error:', error);
        setPortfolio([]);
      } finally {
        setLoading(false);
      }
    };

    const subscribeToChanges = () => {
      subscriptionId = connection.onAccountChange(publicKey, (accountInfo) => {
        const solBal = accountInfo.lamports / LAMPORTS_PER_SOL;
        setPortfolio(prev => [{ symbol: 'SOL', amount: solBal, decimals: 9 }, ...prev.slice(1)]);
      }, 'confirmed');
    };

    fetchInitialData();
    subscribeToChanges();

    const interval = setInterval(fetchInitialData, 10000); // Обновление каждые 10 секунд

    return () => {
      if (subscriptionId) connection.removeAccountChangeListener(subscriptionId);
      clearInterval(interval);
    };
  }, [connected, publicKey, connection]);

  if (!connected) return <div className="text-center text-xl text-white">Please connect your wallet</div>;
  if (loading) return <div className="text-center text-xl text-white">Loading...</div>;
  if (portfolio.length === 0 && !loading) return <div className="text-center text-xl text-white">No assets found</div>;

  return (
    <div className="text-center text-white p-6 max-w-2xl mx-auto">
      <h2 className="text-3xl font-bold mb-6 text-blue-300">Your Portfolio</h2>
      <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
        <h3 className="text-xl font-semibold mb-4 text-green-300">Assets</h3>
        <ul className="space-y-4">
          {portfolio.map((item, index) => (
            <li key={index} className="flex justify-between items-center p-4 bg-gray-700 rounded-lg hover:bg-gray-600 transition">
              <span className="text-lg font-medium">{item.symbol}</span>
              <span className="text-lg font-semibold">{item.amount.toFixed(4)}</span>
            </li>
          ))}
        </ul>
        {portfolio.length > 0 && (
          <div className="mt-6 text-sm text-gray-400">
            * Balances are displayed in their native units (e.g., SOL, USDC, USDT).
          </div>
        )}
      </div>
    </div>
  );
}