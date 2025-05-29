import React from 'react';
import { BoardState, SquarePosition, PlayerColor, SelectedPieceInfo, PieceSymbol } from '../../types'; // Added PieceSymbol
import { Square } from './Square';
import { BOARD_SIZE } from '../../constants';

interface ChessBoardProps {
  board: BoardState;
  onSquareClick: (position: SquarePosition) => void;
  selectedPiece: SelectedPieceInfo | null;
  possibleMoves: SquarePosition[];
  playerColor: PlayerColor; // Current player's turn
  isFrozen?: boolean; // If true, board interactions are disabled
  kingInCheckPos?: SquarePosition | null; // Position of the king in check
}

export const ChessBoard: React.FC<ChessBoardProps> = ({ 
    board, 
    onSquareClick, 
    selectedPiece, 
    possibleMoves,
    // playerColor, // Not flipping board for now
    isFrozen = false,
    kingInCheckPos
}) => {
  
  const handleSquareClick = (position: SquarePosition) => {
    if (isFrozen) return;
    onSquareClick(position);
  };

  return (
    <div className="w-full max-w-md md:max-w-lg lg:max-w-xl aspect-square grid grid-cols-8 shadow-2xl rounded-lg overflow-hidden border-4 border-purple-800 bg-purple-800">
      {board.map((row, rowIndex) =>
        row.map((piece, colIndex) => {
          const position = { row: rowIndex, col: colIndex };
          const isLight = (rowIndex + colIndex) % 2 === 0;
          const isSelectedSquare = !!selectedPiece && selectedPiece.from.row === rowIndex && selectedPiece.from.col === colIndex;
          const isPossible = possibleMoves.some(move => move.row === rowIndex && move.col === colIndex);
          
          // Check if the current square is the king's square and that king is in check
          const isKingSquareAndInCheck = !!kingInCheckPos && 
                                         kingInCheckPos.row === rowIndex && 
                                         kingInCheckPos.col === colIndex &&
                                         piece?.type === PieceSymbol.KING;


          return (
            <Square
              key={`${rowIndex}-${colIndex}`}
              piece={piece}
              position={position}
              isLight={isLight}
              isSelected={isSelectedSquare}
              isPossibleMove={isPossible}
              onClick={() => handleSquareClick(position)}
              isHighlighted={isKingSquareAndInCheck} // Pass this to Square for specific king-check highlighting
            />
          );
        })
      )}
    </div>
  );
};
