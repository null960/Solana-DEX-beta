import React from 'react';

const tokens = [
  { symbol: 'SOL', name: 'Solana' },
  { symbol: 'USDC', name: 'USD Coin' },
  { symbol: 'USDT', name: 'Tether' },
];

export default function TokenSelector({ onSelect }) {
  return (
    <ul className="max-h-48 overflow-y-auto">
      {tokens.map((token) => (
        <li key={token.symbol} className="border-b last:border-b-0 border-gray-200">
          <button
            onClick={() => onSelect(token)}
            className="w-full text-left px-4 py-3 hover:bg-blue-50 transition flex justify-between items-center"
          >
            <span className="font-medium text-gray-900">{token.symbol}</span>
            <span className="text-sm text-gray-500">{token.name}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
