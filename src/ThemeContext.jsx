import React, { createContext, useState } from 'react';

export const ThemeContext = createContext();


const themes = {
  light: {
    background: { backgroundColor: '#f9f9f9ff' }, // Белый фон
    bgMenu: { backgroundColor: '#FFFFFF' },
    filt: { backdropFilter: 'blur(2px) brightness(25%)'},
    text: 'text-[#1F1F1F]', // Чёрный текст
    buttonsRight: 'bg-[#9A00FF]', // Акцент для кнопок справа
    buttonsCentre: { backgroundColor: '#E6E6FA' }, // Темнее для центральных кнопок
    buttonsRightHover: 'hover:bg-[#D8D8EF]', // Ховер для кнопок
    buttonConnect: 'hover:bg-[#B233FF]',
    imgColor: 'filter brightness-200',
    linkActive: 'bg-[#D8D8EF]', // Активная ссылка
    linkNormal: 'text-[#1f1f1f8f] hover:text-[#1F1F1F]', // Неактивная ссылка
  },
  dark: {
    background: { backgroundColor: '#0e1621' }, 
    bgMenu: { backgroundColor: '#1b2430' },
    filt: { backdropFilter: 'blur(2px) brightness(25%)'},
    text: 'text-[#FFFFFF]',
    buttonsRight: 'bg-[#9A00FF]', // Акцент для кнопок справа
    buttonsCentre: { backgroundColor: '#241438' }, // Темнее для центральных кнопок
    buttonsRightHover: 'hover:bg-[#2E1A47]', // Ховер для кнопок
    buttonConnect: 'hover:bg-[#B233FF]',
    imgColor: 'filter brightness-0 invert',
    linkActive: 'bg-[#2E1A47]', // Активная ссылка
    linkNormal: 'text-[#ffffff8f] hover:text-[#FFFFFF]', // Неактивная ссылка
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