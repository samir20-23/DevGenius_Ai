import React from 'react';
import { Button } from '../ui/Button';
import { OnlineIcon, SettingsIcon } from '../ui/Icons'; // SettingsIcon is a placeholder, replace if needed

interface GameControlsProps {
  onNewGame: () => void;
  onShareGame: () => void; // Conceptual
  isGameActive: boolean;
}

export const GameControls: React.FC<GameControlsProps> = ({ onNewGame, onShareGame, isGameActive }) => {
  return (
    <div className="flex flex-wrap justify-center items-center gap-3 p-4 bg-gray-800/50 backdrop-blur-md rounded-lg shadow-md w-full max-w-md md:max-w-lg lg:max-w-xl">
      <Button onClick={onNewGame} className="bg-green-600 hover:bg-green-500 flex-grow sm:flex-none">
        {isGameActive ? 'Reset Game' : 'New Game'}
      </Button>
      <Button onClick={onShareGame} variant="secondary" className="flex-grow sm:flex-none">
        <OnlineIcon className="w-5 h-5 mr-2"/>
        Share Game (Concept)
      </Button>
      {/* Placeholder for future settings */}
      {/* <Button variant="ghost" className="flex-grow sm:flex-none">
        <SettingsIcon className="w-5 h-5 mr-2"/>
        Settings
      </Button> */}
    </div>
  );
};
