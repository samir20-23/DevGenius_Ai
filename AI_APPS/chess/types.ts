export enum PieceSymbol {
  PAWN = 'P',
  ROOK = 'R',
  KNIGHT = 'N',
  BISHOP = 'B',
  QUEEN = 'Q',
  KING = 'K',
}

export enum PlayerColor {
  WHITE = 'white',
  BLACK = 'black',
}

export interface Piece {
  id: string; // e.g., 'wP1', 'bK'
  type: PieceSymbol;
  color: PlayerColor;
}

export interface SquarePosition {
  row: number;
  col: number;
}

export type SquareState = Piece | null;

export type BoardState = SquareState[][];

export interface Move {
  from: SquarePosition;
  to: SquarePosition;
  piece: Piece;
}

export interface SelectedPieceInfo {
  piece: Piece;
  from: SquarePosition;
}

// Music Player Types
export interface Track {
  id: string;
  name: string;
  url: string; // Object URL for playback
  file: File; // Original file, might be useful for metadata
}
