import React from 'react';

interface TurnIndicatorProps {
  text: string;
}

export const TurnIndicator: React.FC<TurnIndicatorProps> = ({ text }) => {
  const isWinOrCheckmate = text.toLowerCase().includes('wins') || text.toLowerCase().includes('checkmate');
  const isCheck = text.toLowerCase().includes('check!') && !isWinOrCheckmate;

  let textColor = 'text-purple-300';
  if (isWinOrCheckmate) {
    textColor = 'text-green-400';
  } else if (isCheck) {
    textColor = 'text-red-400 font-bold'; // Emphasize check
  }


  return (
    <div className={`p-3 text-center rounded-lg bg-gray-700/60 backdrop-blur-sm shadow w-full max-w-md md:max-w-lg lg:max-w-xl`}>
      <p className={`text-lg ${isWinOrCheckmate || isCheck ? 'font-semibold' : 'font-medium'} ${textColor} transition-colors duration-300`}>{text}</p>
    </div>
  );
};
