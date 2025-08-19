import React, { useState, useEffect } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';

const TOKEN_MINTS = {
  'So11111111111111111111111111111111111111112': 'SOL',
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': 'USDC',
  'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': 'USDT',
};

export default function Portfolio() {
  const { publicKey, connected } = useWallet();
  const { connection } = useConnection();
  const [portfolio, setPortfolio] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!connected || !publicKey) {
      setPortfolio([]);
      setLoading(false);
      return;
    }

    const fetchPortfolio = async () => {
      setLoading(true);
      try {
        // Получаем баланс SOL
        const solBalance = await connection.getBalance(publicKey);
        const solData = { symbol: 'SOL', amount: solBalance / LAMPORTS_PER_SOL };

        // Получаем SPL токены
        const tokenAccounts = await connection.getTokenAccountsByOwner(publicKey, { programId: TOKEN_PROGRAM_ID });
        const splTokens = await Promise.all(
          tokenAccounts.value.map(async (acc) => {
            const info = await connection.getParsedAccountInfo(acc.pubkey);
            if (!info.value || !info.value.data) return null;
            const parsed = info.value.data.parsed?.info;
            if (!parsed) return null;

            const symbol = TOKEN_MINTS[parsed.mint] || parsed.mint.slice(0, 8) + '...';
            return {
              symbol,
              amount: parsed.tokenAmount.uiAmount || 0,
            };
          })
        );

        const filteredTokens = splTokens.filter(Boolean);
        setPortfolio([solData, ...filteredTokens]);
      } catch (err) {
        console.error('Error fetching portfolio:', err);
        setPortfolio([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPortfolio();

    const interval = setInterval(fetchPortfolio, 10000); // обновление каждые 10 секунд

    return () => clearInterval(interval);
  }, [connected, publicKey, connection]);

  if (!connected) return <div className="text-center text-xl text-white">Please connect your wallet</div>;
  if (loading) return <div className="text-center text-xl text-white">Loading...</div>;
  if (portfolio.length === 0) return <div className="text-center text-xl text-white">No assets found</div>;

  return (
    <div className="text-center text-white p-6 max-w-2xl mx-auto">
      <h2 className="text-3xl font-bold mb-6 text-blue-300">Your Portfolio</h2>
      <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
        <h3 className="text-xl font-semibold mb-4 text-green-300">Assets</h3>
        <ul className="space-y-4">
          {portfolio.map((item, idx) => (
            <li key={idx} className="flex justify-between items-center p-4 bg-gray-700 rounded-lg hover:bg-gray-600 transition">
              <span className="text-lg font-medium">{item.symbol}</span>
              <span className="text-lg font-semibold">{item.amount.toFixed(4)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-6 text-sm text-gray-400">
          * Balances are displayed in their native units (SOL, USDC, USDT, etc.)
        </div>
      </div>
    </div>
  );
}
