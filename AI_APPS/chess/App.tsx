import React, { useState, useCallback, useMemo } from 'react';
import { ChessBoard } from './components/chess/ChessBoard';
import { GameControls } from './components/chess/GameControls';
import { TurnIndicator } from './components/chess/TurnIndicator';
import { MusicPlayer } from './components/music/MusicPlayer';
import { useChessGame } from './hooks/useChessGame';
import { PlayerColor, Piece, SquarePosition } from './types'; // Corrected import location for PlayerColor and Piece
import { Modal } from './components/ui/Modal';
import { Button } from './components/ui/Button';
import { ChessIcon, MusicIcon, OnlineIcon, SettingsIcon, HelpIcon } from './components/ui/Icons';

enum AppView {
  Chess = 'chess',
  Music = 'music',
  Online = 'online',
}

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>(AppView.Chess);
  const {
    board,
    currentPlayer,
    selectedPiece,
    winner,
    handleSquareClick,
    resetGame,
    getPossibleMoves,
    isCheck,
    isCheckmate,
    kingInCheckPos, // Added to use for highlighting king in check
  } = useChessGame();

  const [isGameCodeModalOpen, setIsGameCodeModalOpen] = useState(false);
  const [gameCode, setGameCode] = useState('');
  const [showHelpModal, setShowHelpModal] = useState(false);

  const activeGame = useMemo(() => !winner, [winner]);

  const generateGameCode = useCallback(() => {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    setGameCode(code);
    setIsGameCodeModalOpen(true);
  }, []);

  const gameStatus = useMemo(() => {
    if (winner) return `${winner === PlayerColor.WHITE ? 'White' : 'Black'} wins!`;
    if (isCheckmate(currentPlayer)) return `Checkmate! ${currentPlayer === PlayerColor.WHITE ? 'Black' : 'White'} wins!`;
    if (isCheck(currentPlayer)) return `${currentPlayer === PlayerColor.WHITE ? 'White' : 'Black'} is in Check!`;
    return `Turn: ${currentPlayer === PlayerColor.WHITE ? 'White' : 'Black'}`;
  }, [winner, currentPlayer, isCheck, isCheckmate]);


  const renderView = () => {
    switch (currentView) {
      case AppView.Chess:
        return (
          <div className="flex flex-col items-center p-4 md:p-6 space-y-6">
            <GameControls 
              onNewGame={resetGame} 
              onShareGame={generateGameCode} 
              isGameActive={activeGame}
            />
            <TurnIndicator text={gameStatus} />
            <ChessBoard
              board={board}
              onSquareClick={handleSquareClick}
              selectedPiece={selectedPiece}
              possibleMoves={selectedPiece ? getPossibleMoves() : []} // getPossibleMoves now takes no args from useChessGame export
              playerColor={currentPlayer}
              isFrozen={!!winner || isCheckmate(currentPlayer)}
              kingInCheckPos={kingInCheckPos} // Pass kingInCheckPos to ChessBoard
            />
             <Button onClick={() => setShowHelpModal(true)} className="mt-4">
              <HelpIcon className="w-5 h-5 mr-2" /> How to Play
            </Button>
          </div>
        );
      case AppView.Music:
        return <MusicPlayer />;
      case AppView.Online:
        return (
          <div className="p-8 text-center">
            <h2 className="text-3xl font-bold mb-6 text-teal-400">Online Play (Conceptual)</h2>
            <p className="mb-4 text-gray-300">
              This section demonstrates how online game sharing might look.
              In a full version, this would involve server-side logic for real-time multiplayer.
            </p>
            <div className="space-y-4 max-w-md mx-auto">
              <Button onClick={generateGameCode} className="w-full bg-blue-500 hover:bg-blue-600">
                <OnlineIcon className="w-5 h-5 mr-2" /> Create New Game Room
              </Button>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  placeholder="Enter Game Code"
                  className="p-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none flex-grow text-gray-100"
                />
                <Button className="bg-green-500 hover:bg-green-600">Join Game</Button>
              </div>
            </div>
             <p className="mt-8 text-sm text-gray-500">
              Note: Actual online functionality is not implemented in this demo.
            </p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-800 text-gray-100 flex flex-col">
      <header className="p-4 bg-gray-800/50 backdrop-blur-md shadow-lg sticky top-0 z-50">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-500 to-red-500">
            Chess & Music Fusion
          </h1>
          <nav className="flex space-x-2 md:space-x-3">
            {[
              { view: AppView.Chess, label: 'Chess', Icon: ChessIcon },
              { view: AppView.Music, label: 'Music', Icon: MusicIcon },
              { view: AppView.Online, label: 'Online', Icon: OnlineIcon },
            ].map(({ view, label, Icon }) => (
              <Button
                key={view}
                onClick={() => setCurrentView(view)}
                className={`px-3 py-2 text-sm md:text-base rounded-lg transition-all duration-200 ease-in-out
                  ${currentView === view ? 'bg-purple-600 text-white shadow-md' : 'bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white'}`}
                title={label}
              >
                <Icon className="w-5 h-5 sm:mr-2" />
                <span className="hidden sm:inline">{label}</span>
              </Button>
            ))}
          </nav>
        </div>
      </header>

      <main className="flex-grow container mx-auto py-4 md:py-8">
        {renderView()}
      </main>

      <footer className="p-4 bg-gray-800/30 text-center text-sm text-gray-400">
        © {new Date().getFullYear()} Chess & Music Fusion. All rights reserved. (Conceptual Demo)
      </footer>

      <Modal isOpen={isGameCodeModalOpen} onClose={() => setIsGameCodeModalOpen(false)} title="Game Code">
        <p className="text-gray-300 mb-4">Share this code with your friend (conceptually):</p>
        <div className="p-4 bg-gray-700 rounded-lg text-center text-2xl font-mono tracking-widest text-teal-400">
          {gameCode}
        </div>
        <Button onClick={() => { navigator.clipboard.writeText(gameCode); alert('Code copied!'); }} className="mt-6 w-full bg-teal-500 hover:bg-teal-600">
          Copy Code
        </Button>
      </Modal>

      <Modal isOpen={showHelpModal} onClose={() => setShowHelpModal(false)} title="How to Play Chess" size="lg">
        <div className="text-gray-300 space-y-3 leading-relaxed max-h-[70vh] overflow-y-auto pr-2">
          <p>This is a standard chess game with a simplified ruleset for this demo.</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Click on one of your pieces to select it. Possible moves will be highlighted.</li>
            <li>Click on a highlighted square to move your piece.</li>
            <li><strong>Objective:</strong> Checkmate the opponent's King.</li>
            <li><strong>Pieces & Basic Moves:</strong></li>
            <ul className="list-disc list-inside ml-6 space-y-1">
                <li><strong>Pawn (♟︎/♙):</strong> Moves 1 square forward (or 2 on its first move). Captures one square diagonally forward.</li>
                <li><strong>Rook (♜/♖):</strong> Moves any number of squares horizontally or vertically.</li>
                <li><strong>Knight (♞/♘):</strong> Moves in an 'L' shape (2 squares in one direction, then 1 square perpendicular). The Knight is the only piece that can jump over other pieces.</li>
                <li><strong>Bishop (♝/♗):</strong> Moves any number of squares diagonally.</li>
                <li><strong>Queen (♛/♕):</strong> Moves any number of squares horizontally, vertically, or diagonally. Combines Rook and Bishop powers.</li>
                <li><strong>King (♚/♔):</strong> Moves 1 square in any direction (horizontally, vertically, or diagonally). Cannot move into a square that is attacked by an opponent's piece (moving into check).</li>
            </ul>
            <li><strong>Check:</strong> When the King is under attack by one or more opponent pieces. If in check, the player must make a move that gets the King out of check.</li>
            <li><strong>Checkmate:</strong> When the King is in check and there are no legal moves to get out of check. The game ends, and the player who delivered checkmate wins.</li>
            <li><strong>Simplified Rules:</strong> This demo includes basic piece movements, captures, check, and checkmate detection. Advanced rules such as castling, en passant, pawn promotion, and stalemate are not implemented.</li>
          </ul>
          <p>Have fun playing!</p>
        </div>
      </Modal>
    </div>
  );
};

export default App;
