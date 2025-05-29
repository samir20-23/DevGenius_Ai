import React from 'react';
import { Piece, SquarePosition, PlayerColor, PieceSymbol } from '../../types';
import { UNICODE_PIECES } from '../../constants';

interface SquareProps {
  piece: Piece | null;
  position: SquarePosition;
  isLight: boolean;
  isSelected: boolean;
  isPossibleMove: boolean;
  onClick: (position: SquarePosition) => void;
  isHighlighted: boolean; // For check
}

export const Square: React.FC<SquareProps> = ({ piece, position, isLight, isSelected, isPossibleMove, onClick, isHighlighted }) => {
  const baseBgColor = isLight ? 'bg-purple-200' : 'bg-purple-700'; // Softer purple, or more contrasting like beige/brown
  const selectedPieceBgColor = 'bg-yellow-400'; // Color for the square of the currently selected piece
  const kingInCheckBgColor = 'bg-red-500/70'; // Color for the king's square when in check
  
  // Determine current background color
  let currentBgColor = baseBgColor;
  if (isSelected) {
    currentBgColor = selectedPieceBgColor;
  } else if (isHighlighted && piece?.type === PieceSymbol.KING) { // Only apply kingInCheckBgColor if it's the king's square
     currentBgColor = kingInCheckBgColor;
  }


  const pieceColorClass = piece?.color === PlayerColor.WHITE ? 'text-gray-50' : 'text-gray-900'; // Ensure contrast

  return (
    <div
      className={`w-full h-full flex items-center justify-center relative transition-colors duration-150 ${currentBgColor} hover:bg-purple-400/50 group cursor-pointer`}
      onClick={() => onClick(position)}
      role="button"
      aria-label={`Square ${String.fromCharCode(97 + position.col)}${8 - position.row}${piece ? `, ${piece.color} ${piece.type}` : ''}`}
    >
      {piece && (
        <span 
          className={`text-4xl md:text-5xl chess-piece ${pieceColorClass} transition-transform duration-100 group-hover:scale-110 select-none`}
          style={{ textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}
        >
          {UNICODE_PIECES[piece.color][piece.type]}
        </span>
      )}
      {isPossibleMove && !piece && ( // Dot for empty possible move square
         <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-1/3 h-1/3 bg-green-500/50 rounded-full transition-opacity duration-150 group-hover:opacity-100 opacity-70"></div>
         </div>
      )}
       {isPossibleMove && piece && ( // Ring for possible capture square
         <div className="absolute inset-0 border-4 border-green-500/70 rounded-sm box-border pointer-events-none"></div>
      )}
    </div>
  );
};
