import { Piece, BoardState, PlayerColor, PieceSymbol } from './types';

export const BOARD_SIZE = 8;

export const UNICODE_PIECES: Record<PlayerColor, Record<PieceSymbol, string>> = {
  [PlayerColor.WHITE]: {
    [PieceSymbol.PAWN]: '♙',
    [PieceSymbol.ROOK]: '♖',
    [PieceSymbol.KNIGHT]: '♘',
    [PieceSymbol.BISHOP]: '♗',
    [PieceSymbol.QUEEN]: '♕',
    [PieceSymbol.KING]: '♔',
  },
  [PlayerColor.BLACK]: {
    [PieceSymbol.PAWN]: '♟︎', // Using a more common variant for black pawn for consistency
    [PieceSymbol.ROOK]: '♜',
    [PieceSymbol.KNIGHT]: '♞',
    [PieceSymbol.BISHOP]: '♝',
    [PieceSymbol.QUEEN]: '♛', // Using a more common variant for black queen
    [PieceSymbol.KING]: '♚',
  },
};

const createPiece = (type: PieceSymbol, color: PlayerColor, idSuffix: string | number): Piece => ({
  id: `${color.charAt(0)}${type}${idSuffix}`,
  type,
  color,
});

export const INITIAL_BOARD_SETUP: BoardState = [
  [
    createPiece(PieceSymbol.ROOK, PlayerColor.BLACK, 1), createPiece(PieceSymbol.KNIGHT, PlayerColor.BLACK, 1), createPiece(PieceSymbol.BISHOP, PlayerColor.BLACK, 1), createPiece(PieceSymbol.QUEEN, PlayerColor.BLACK, 1),
    createPiece(PieceSymbol.KING, PlayerColor.BLACK, 1), createPiece(PieceSymbol.BISHOP, PlayerColor.BLACK, 2), createPiece(PieceSymbol.KNIGHT, PlayerColor.BLACK, 2), createPiece(PieceSymbol.ROOK, PlayerColor.BLACK, 2),
  ],
  Array(8).fill(null).map((_, i) => createPiece(PieceSymbol.PAWN, PlayerColor.BLACK, i + 1)),
  Array(8).fill(null),
  Array(8).fill(null),
  Array(8).fill(null),
  Array(8).fill(null),
  Array(8).fill(null).map((_, i) => createPiece(PieceSymbol.PAWN, PlayerColor.WHITE, i + 1)),
  [
    createPiece(PieceSymbol.ROOK, PlayerColor.WHITE, 1), createPiece(PieceSymbol.KNIGHT, PlayerColor.WHITE, 1), createPiece(PieceSymbol.BISHOP, PlayerColor.WHITE, 1), createPiece(PieceSymbol.QUEEN, PlayerColor.WHITE, 1),
    createPiece(PieceSymbol.KING, PlayerColor.WHITE, 1), createPiece(PieceSymbol.BISHOP, PlayerColor.WHITE, 2), createPiece(PieceSymbol.KNIGHT, PlayerColor.WHITE, 2), createPiece(PieceSymbol.ROOK, PlayerColor.WHITE, 2),
  ],
];
