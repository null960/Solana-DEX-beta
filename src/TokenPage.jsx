import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useConnection } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';

export default function TokenPage() {
  const { address } = useParams();
  const { connection } = useConnection();
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchToken = async () => {
      try {
        setLoading(true);
        const pk = new PublicKey(address);
        const info = await connection.getParsedAccountInfo(pk);
        if (!info.value || info.value.data.program !== 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') {
          throw new Error('Not a valid token');
        }
        const res = await fetch('/api/strict');
        if (!res.ok) throw new Error('Failed to fetch token list');
        const data = await res.json();
        const tokenData = data.find(t => t.address === address);
        if (!tokenData) throw new Error('Token not found');
        console.log('Fetched token:', tokenData); // Отладка
        setToken(tokenData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchToken();
  }, [address, connection]);

  if (loading) return <div className="p-4">Loading...</div>;
  if (error) return <div className="p-4 text-red-500">Error: {error}</div>;

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold">{token.name} ({token.symbol})</h1>
      <img src={token.logoURI} alt={token.symbol} className="w-16 h-16 my-2" />
      <p>Address: {token.address}</p>
      <p>Decimals: {token.decimals}</p>
    </div>
  );
}