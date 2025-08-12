import React from 'react';
import checkGoodMark from './assets/check-good-mark.svg';
const Notification = ({ message, onClose }) => {
  return (
    <div className="fixed bottom-4 left-4 text-sm bg-gray-500 text-white px-6 py-4 rounded-2xl sm:text-left flex items-center justify-between">
      <div className="flex items-center">
        <img src={checkGoodMark} alt="Success Icon" className="w-5 h-5 mr-2" />
        <span className="text-left">{message}</span>
      </div>
      <button onClick={onClose} className="ml-5 text-white px-1 py-0.4 rounded-xl hover:bg-gray-600">
        ×
      </button>
    </div>
  );
};

export default Notification;