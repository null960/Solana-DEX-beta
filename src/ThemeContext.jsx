import React, { createContext, useState } from 'react';

export const ThemeContext = createContext();


const themes = {
  light: {
    background: { backgroundColor: '#f9f9f9ff' },
    bgMenu: { backgroundColor: '#FFFFFF' },
    filt: { backdropFilter: 'blur(3px) brightness(25%)'},
    text: 'text-[#1F1F1F]',
    buttonsRight: 'bg-[#9A00FF]',
    buttonsCentre: { backgroundColor: '#E6E6FA' },
    buttonsRightHover: 'hover:bg-[#D8D8EF]',
    buttonConnect: 'hover:bg-[#B233FF]',
    imgColor: 'filter brightness-200',
    linkActive: 'bg-[#D8D8EF]',
    linkNormal: 'text-[#1f1f1f8f] hover:text-[#1F1F1F]',
  },
  dark: {
    background: { backgroundColor: '#0e1621' }, 
    bgMenu: { backgroundColor: '#1b2430' },
    filt: { backdropFilter: 'blur(3px) brightness(25%)'},
    text: 'text-[#FFFFFF]',
    buttonsRight: 'bg-[#9A00FF]',
    buttonsCentre: { backgroundColor: '#3A1D5C' }, //  #241438
    buttonsRightHover: 'hover:bg-[#502973]', // #2E1A47
    buttonConnect: 'hover:bg-[#B233FF]',
    imgColor: 'filter brightness-0 invert',
    linkActive: 'bg-[#502973]',
    linkNormal: 'text-[#ffffff8f] hover:text-[#FFFFFF]',
  },
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState('light');

  return (
    <ThemeContext.Provider value={{ theme, setTheme, themes }}>
      {children}
    </ThemeContext.Provider>
  );
};