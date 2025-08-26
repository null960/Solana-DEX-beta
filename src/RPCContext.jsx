import React, { createContext, useState } from 'react';

export const RPCContext = createContext();

export const RPCProvider = ({ children }) => {
  const [endpoint, setEndpoint] = useState(`https://mainnet.helius-rpc.com/?api-key=${import.meta.env.VITE_HELIUS_API_KEY}`);

  return (
    <RPCContext.Provider value={{ endpoint, setEndpoint }}>
      {children}
    </RPCContext.Provider>
  );
};