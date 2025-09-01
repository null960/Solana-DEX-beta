import React, { useContext, useState, useEffect } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { useNavigate } from 'react-router-dom';
import { LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { Metadata, METADATA_PROGRAM_ID } from '@metaplex-foundation/mpl-token-metadata';
import { ThemeContext } from './ThemeContext.jsx';

const KNOWN_TOKEN_MINTS = {
  'So11111111111111111111111111111111111111112': { symbol: 'SOL', decimals: 9, name: 'Solana' },
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': { symbol: 'USDC', decimals: 6, name: 'USD Coin' },
  'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': { symbol: 'USDT', decimals: 6, name: 'Tether USD' },
};

export default function Portfolio() {
  const { theme, setTheme, themes } = useContext(ThemeContext);
  const { publicKey, connected } = useWallet();
  const { connection } = useConnection();
  const navigate = useNavigate();
  const [portfolio, setPortfolio] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Redirect to /portfolio/<address> if wallet is connected
  useEffect(() => {
    if (connected && publicKey) {
      navigate(`/portfolio/${publicKey.toBase58()}`);
    }
  }, [connected, publicKey, navigate]);

  const fetchTokenPrice = async (mint) => {
    try {
      const res = await fetch(`https://price.jup.ag/v6/price?ids=${mint}`, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) {
        console.warn(`Price API returned status ${res.status} for ${mint}`);
        return 0;
      }
      const data = await res.json();
      return data.data[mint]?.price || 0;
    } catch (err) {
      console.warn(`Price fetch error for ${mint}: ${err.message}`);
      return 0;
    }
  };

  const fetchTokenMetadata = async (mintPubkey) => {
    try {
      const [metadataPda] = await PublicKey.findProgramAddress(
        [Buffer.from('metadata'), new PublicKey(METADATA_PROGRAM_ID).toBuffer(), mintPubkey.toBuffer()],
        new PublicKey(METADATA_PROGRAM_ID)
      );
      const metadataAccount = await connection.getAccountInfo(metadataPda);
      if (metadataAccount) {
        try {
          const metadata = Metadata.deserialize(metadataAccount.data)[0];
          const symbol = metadata.data.symbol.trim();
          const name = metadata.data.name.trim();
          return {
            symbol: symbol || mintPubkey.toBase58().slice(0, 8) + '...',
            name: name || 'Unknown',
            hasValidMetadata: !!symbol || !!name
          };
        } catch (desErr) {
          console.warn(`Deserialize error for ${mintPubkey}: ${desErr.message}`);
          return { symbol: mintPubkey.toBase58().slice(0, 8) + '...', name: 'Unknown', hasValidMetadata: false };
        }
      }
      return { symbol: mintPubkey.toBase58().slice(0, 8) + '...', name: 'Unknown', hasValidMetadata: false };
    } catch (err) {
      console.warn(`Metadata fetch error for ${mintPubkey}: ${err.message}`);
      return { symbol: mintPubkey.toBase58().slice(0, 8) + '...', name: 'Unknown', hasValidMetadata: false };
    }
  };

  useEffect(() => {
    if (!connected || !publicKey) {
      setPortfolio([]);
      setLoading(false);
      return;
    }

    const fetchPortfolio = async () => {
      setLoading(true);
      setError('');
      try {
        // Fetch SOL balance
        let solBalance;
        try {
          solBalance = await connection.getBalance(publicKey);
        } catch (err) {
          throw new Error(`Failed to fetch SOL balance: ${err.message}`);
        }
        const solPrice = await fetchTokenPrice('So11111111111111111111111111111111111111112');
        const solData = {
          mint: 'So11111111111111111111111111111111111111112',
          symbol: 'SOL',
          name: 'Solana',
          amount: solBalance / LAMPORTS_PER_SOL,
          price: solPrice,
          value: solPrice ? (solBalance / LAMPORTS_PER_SOL) * solPrice : null,
          hasValidMetadata: true
        };

        // Fetch SPL tokens
        let tokenAccounts;
        try {
          tokenAccounts = await connection.getTokenAccountsByOwner(publicKey, { programId: TOKEN_PROGRAM_ID });
        } catch (err) {
          throw new Error(`Failed to fetch token accounts: ${err.message}`);
        }
        const splTokens = await Promise.all(
          tokenAccounts.value.map(async (acc) => {
            const info = await connection.getParsedAccountInfo(acc.pubkey);
            if (!info.value || !info.value.data) return null;
            const parsed = info.value.data.parsed?.info;
            if (!parsed || parsed.tokenAmount.uiAmount <= 0) return null;

            const mint = parsed.mint;
            const mintPubkey = new PublicKey(mint);
            const tokenInfo = KNOWN_TOKEN_MINTS[mint] || {};
            const metadata = await fetchTokenMetadata(mintPubkey);

            // Skip if not known and no valid metadata
            if (!tokenInfo.symbol && !metadata.hasValidMetadata) return null;

            // Fetch price only for known tokens or tokens with valid metadata
            const price = (tokenInfo.symbol || metadata.hasValidMetadata) ? await fetchTokenPrice(mint) : 0;

            return {
              mint,
              symbol: tokenInfo.symbol || metadata.symbol,
              name: tokenInfo.name || metadata.name,
              amount: parsed.tokenAmount.uiAmount,
              price,
              value: price ? parsed.tokenAmount.uiAmount * price : null,
              hasValidMetadata: tokenInfo.symbol || metadata.hasValidMetadata
            };
          })
        );

        const filteredTokens = splTokens.filter(Boolean);
        setPortfolio([solData, ...filteredTokens]);
      } catch (err) {
        console.error('Error fetching portfolio:', err.message);
        if (err.message.includes('403')) {
          setError('Доступ к Solana RPC ограничен (403 Forbidden)');
        } else if (err.message.includes('429')) {
          setError('Превышен лимит запросов (429 Too Many Requests)');
        } else {
          setError(`Не удалось загрузить портфолио: ${err.message}`);
        }
        setPortfolio([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPortfolio();
    const interval = setInterval(fetchPortfolio, 120000); // Обновление каждые 2 минуты
    return () => clearInterval(interval);
  }, [connected, publicKey, connection]);

  if (!connected) {
    return (
      <div className="text-center text-xl text-white p-6">
        Пожалуйста, подключите кошелёк
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-center text-xl text-white p-6">
        Загрузка портфолио...
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-xl text-red-400 p-6">
        {error}
      </div>
    );
  }

  if (portfolio.length === 0) {
    return (
      <div className="text-center text-xl text-white p-6">
        Активы не найдены
      </div>
    );
  }

  return (
    <div className="text-center text-white p-6 max-w-3xl mx-auto">
      <h2 className="text-3xl font-bold mb-6 text-blue-300">Портфолио</h2>
      <div className="bg-gray-800 p-6 rounded-lg shadow-lg relative">
        <h3 className="text-xl font-semibold mb-4 text-green-300">Активы</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-gray-300">
                <th className="p-3">Название токена</th>
                <th className="p-3">Количество</th>
                <th className="p-3">Стоимость (USD)</th>
              </tr>
            </thead>
            <tbody>
              {portfolio.map((item, idx) => (
                <tr key={idx} className="border-t border-gray-700 hover:bg-gray-600 transition">
                  <td className="p-3">{item.symbol} ({item.name || 'N/A'})</td>
                  <td className="p-3">{item.amount.toFixed(5)}</td>
                  <td className="p-3">{item.value ? `$${item.value.toFixed(2)}` : 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-6 text-sm text-gray-400 flex justify-between">
          <span>* Стоимость приблизительная, данные из Jupiter API. Обновляется каждые 2 минуты.</span>
          <span>Найдено токенов: {portfolio.length}</span>
        </div>
      </div>
    </div>
  );
}