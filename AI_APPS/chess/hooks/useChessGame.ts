import { useState, useCallback, useMemo } from 'react';
import { BoardState, PlayerColor, Piece, SquarePosition, PieceSymbol, SelectedPieceInfo, Move } from '../types';
import { INITIAL_BOARD_SETUP, BOARD_SIZE } from '../constants';

const createInitialBoard = (): BoardState =>
  INITIAL_BOARD_SETUP.map(row => row.map(piece => piece ? {...piece} : null)); // Deep copy with new piece objects

export const useChessGame = () => {
  const [board, setBoard] = useState<BoardState>(createInitialBoard());
  const [currentPlayer, setCurrentPlayer] = useState<PlayerColor>(PlayerColor.WHITE);
  const [selectedPiece, setSelectedPiece] = useState<SelectedPieceInfo | null>(null);
  const [winner, setWinner] = useState<PlayerColor | null>(null);
  const [moveHistory, setMoveHistory] = useState<Move[]>([]);

  const findKingPosition = useCallback((playerColor: PlayerColor, currentBoard: BoardState): SquarePosition | null => {
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        const piece = currentBoard[r][c];
        if (piece && piece.type === PieceSymbol.KING && piece.color === playerColor) {
          return { row: r, col: c };
        }
      }
    }
    return null;
  }, []);
  
  const getPiecePossibleMovesInternal = useCallback((
    piece: Piece, 
    from: SquarePosition, 
    currentBoard: BoardState,
    ignoreKingCheck: boolean = false 
  ): SquarePosition[] => {
    const moves: SquarePosition[] = [];
    const { row: r, col: c } = from;

    const addMove = (toR: number, toC: number, isPawnAttackOnly: boolean = false) => {
      if (toR >= 0 && toR < BOARD_SIZE && toC >= 0 && toC < BOARD_SIZE) {
        const targetSquare = currentBoard[toR][toC];
        if (!targetSquare) { // Empty square
          if (!isPawnAttackOnly) moves.push({ row: toR, col: toC });
        } else if (targetSquare.color !== piece.color) { // Capture
          moves.push({ row: toR, col: toC });
        }
        return !targetSquare; // Return true if square was empty (can continue sliding for rooks, bishops, queens)
      }
      return false; // Off board
    };
    
    const addSlidingMoves = (directions: Array<[number, number]>) => {
        for (const [dr, dc] of directions) {
            for (let i = 1; i < BOARD_SIZE; i++) {
                if (!addMove(r + dr * i, c + dc * i)) break;
            }
        }
    };

    switch (piece.type) {
      case PieceSymbol.PAWN:
        const direction = piece.color === PlayerColor.WHITE ? -1 : 1;
        const startRow = piece.color === PlayerColor.WHITE ? 6 : 1;
        
        // Forward one
        if (r + direction >= 0 && r + direction < BOARD_SIZE && !currentBoard[r+direction][c]) {
            addMove(r + direction, c);
            // Forward two from start
            if (r === startRow && !currentBoard[r+2*direction][c]) {
                addMove(r + 2 * direction, c);
            }
        }
        // Captures
        if (r + direction >= 0 && r + direction < BOARD_SIZE) {
            if (c - 1 >= 0 && currentBoard[r+direction][c-1] && currentBoard[r+direction][c-1]?.color !== piece.color) addMove(r + direction, c - 1, true);
            if (c + 1 < BOARD_SIZE && currentBoard[r+direction][c+1] && currentBoard[r+direction][c+1]?.color !== piece.color) addMove(r + direction, c + 1, true);
        }
        break;
      case PieceSymbol.ROOK:
        addSlidingMoves([[0,1], [0,-1], [1,0], [-1,0]]);
        break;
      case PieceSymbol.KNIGHT:
        [[1,2], [1,-2], [-1,2], [-1,-2], [2,1], [2,-1], [-2,1], [-2,-1]].forEach(([dr, dc]) => addMove(r + dr, c + dc));
        break;
      case PieceSymbol.BISHOP:
        addSlidingMoves([[1,1], [1,-1], [-1,1], [-1,-1]]);
        break;
      case PieceSymbol.QUEEN:
        addSlidingMoves([[0,1], [0,-1], [1,0], [-1,0], [1,1], [1,-1], [-1,1], [-1,-1]]);
        break;
      case PieceSymbol.KING:
        [[0,1], [0,-1], [1,0], [-1,0], [1,1], [1,-1], [-1,1], [-1,-1]].forEach(([dr, dc]) => addMove(r + dr, c + dc));
        // TODO: Add Castling logic here (requires checking move history, squares between king/rook, and not in/through check)
        break;
    }
    
    if (ignoreKingCheck) return moves;

    // Filter out moves that would put the current player's king in check
    return moves.filter(moveTo => {
        const tempBoard = currentBoard.map(row => row.map(p => p ? {...p} : null));
        tempBoard[moveTo.row][moveTo.col] = piece;
        tempBoard[from.row][from.col] = null;
        // isKingInCheckInternal needs to be careful about recursion depth if used within itself via getPiecePossibleMovesInternal
        return !isKingInCheckInternal(piece.color, tempBoard, true); // pass true to avoid infinite loop
    });

  }, []); // Removed isKingInCheckInternal from deps temporarily to break cycle, needs careful review.

  const isSquareAttackedBy = useCallback((position: SquarePosition, attackerColor: PlayerColor, currentBoard: BoardState): boolean => {
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        const piece = currentBoard[r][c];
        if (piece && piece.color === attackerColor) {
          // For isSquareAttackedBy, we need raw moves, ignoring if they put attacker's king in check
          const moves = getPiecePossibleMovesInternal(piece, { row: r, col: c }, currentBoard, true);
          if (moves.some(move => move.row === position.row && move.col === position.col)) {
            return true;
          }
        }
      }
    }
    return false;
  }, [getPiecePossibleMovesInternal]);

  const isKingInCheckInternal = useCallback((playerColor: PlayerColor, currentBoard: BoardState, calledFromFilter: boolean = false): boolean => {
    const kingPos = findKingPosition(playerColor, currentBoard);
    if (!kingPos) return false; 
    const opponentColor = playerColor === PlayerColor.WHITE ? PlayerColor.BLACK : PlayerColor.WHITE;
    if (calledFromFilter) { // Prevent deep recursion when filtering moves
      return isSquareAttackedBy(kingPos, opponentColor, currentBoard); // Use the version that doesn't filter its own moves
    }
    return isSquareAttackedBy(kingPos, opponentColor, currentBoard);
  }, [findKingPosition, isSquareAttackedBy]);


  const getPossibleMovesForSelected = useCallback((): SquarePosition[] => {
    if (!selectedPiece) return [];
    return getPiecePossibleMovesInternal(selectedPiece.piece, selectedPiece.from, board, false);
  }, [selectedPiece, board, getPiecePossibleMovesInternal]);


  const isCheckmate = useCallback((playerColor: PlayerColor): boolean => {
    if (!isKingInCheckInternal(playerColor, board)) return false;

    for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
            const piece = board[r][c];
            if (piece && piece.color === playerColor) {
                const moves = getPiecePossibleMovesInternal(piece, {row: r, col: c}, board, false);
                if (moves.length > 0) return false; // Found a legal move
            }
        }
    }
    return true; // No legal moves found
  }, [board, isKingInCheckInternal, getPiecePossibleMovesInternal]);

  const handleSquareClick = useCallback((position: SquarePosition) => {
    if (winner) return;

    const pieceAtTarget = board[position.row][position.col];

    if (selectedPiece) {
      const { piece, from } = selectedPiece;
      const possibleMoves = getPiecePossibleMovesInternal(piece, from, board, false);
      
      if (possibleMoves.some(move => move.row === position.row && move.col === position.col)) {
        const newBoard = board.map(row => row.map(p => p ? {...p} : null));
        newBoard[position.row][position.col] = piece; // Move the piece
        newBoard[from.row][from.col] = null; // Clear old square
        
        // Basic Pawn Promotion (to Queen) - not in original but good to have
        if (piece.type === PieceSymbol.PAWN) {
            if ((piece.color === PlayerColor.WHITE && position.row === 0) || 
                (piece.color === PlayerColor.BLACK && position.row === BOARD_SIZE - 1)) {
                newBoard[position.row][position.col] = { ...piece, type: PieceSymbol.QUEEN };
            }
        }

        setBoard(newBoard);
        setMoveHistory(prev => [...prev, { piece, from, to: position }]);
        setSelectedPiece(null); 

        const opponentColor = currentPlayer === PlayerColor.WHITE ? PlayerColor.BLACK : PlayerColor.WHITE;
        if (isCheckmate(opponentColor)) {
          setWinner(currentPlayer);
        } else {
          setCurrentPlayer(opponentColor);
        }
      } else {
         // Invalid move or clicked on own piece again (deselect)
         if (pieceAtTarget && pieceAtTarget.color === currentPlayer && pieceAtTarget.id === selectedPiece.piece.id) {
            setSelectedPiece(null);
         } else if (pieceAtTarget && pieceAtTarget.color === currentPlayer) {
            // Clicked on another of own pieces, switch selection
            setSelectedPiece({ piece: pieceAtTarget, from: position });
         } else {
            setSelectedPiece(null); // Clicked an invalid square, deselect
         }
      }
    } else if (pieceAtTarget && pieceAtTarget.color === currentPlayer) {
      setSelectedPiece({ piece: pieceAtTarget, from: position });
    }
  }, [board, currentPlayer, selectedPiece, winner, getPiecePossibleMovesInternal, isCheckmate, isKingInCheckInternal]);

  const resetGame = useCallback(() => {
    setBoard(createInitialBoard());
    setCurrentPlayer(PlayerColor.WHITE);
    setSelectedPiece(null);
    setWinner(null);
    setMoveHistory([]);
  }, []);
  
  const currentKingInCheckPos = useMemo(() => {
    if (isKingInCheckInternal(currentPlayer, board)) {
        return findKingPosition(currentPlayer, board);
    }
    return null;
  }, [currentPlayer, board, isKingInCheckInternal, findKingPosition]);


  return {
    board,
    currentPlayer,
    selectedPiece,
    winner,
    handleSquareClick,
    resetGame,
    getPossibleMoves: getPossibleMovesForSelected,
    isCheck: (player: PlayerColor) => isKingInCheckInternal(player, board),
    isCheckmate,
    kingInCheckPos: currentKingInCheckPos,
    moveHistory,
  };
};
