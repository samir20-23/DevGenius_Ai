
/**
 * @fileoverview Control local music playback with a MIDI controller and play chess.
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { css, html, LitElement, svg, CSSResultGroup, nothing } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import { styleMap } from 'lit/directives/style-map.js';
import { classMap } from 'lit/directives/class-map.js';

import { GoogleGenAI } from '@google/genai'; // Keep for potential future API use, though Lyria is removed.

// Use API_KEY from environment variables as per guidelines
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY }); // Remains, but Lyria model usage is removed.

// --- START CHESS LOGIC AND TYPES ---
type PieceSymbol = 'P' | 'R' | 'N' | 'B' | 'Q' | 'K';
type PieceColor = 'white' | 'black';
interface ChessPiece {
  symbol: PieceSymbol;
  color: PieceColor;
  unicode: string;
}
interface SquareState {
  piece: ChessPiece | null;
  selected?: boolean;
  validMove?: boolean;
  inCheck?: boolean;
  lastMove?: boolean;
}
type BoardState = (SquareState | null)[][];
type Position = { row: number; col: number };

const UNICODE_PIECES: Record<PieceColor, Record<PieceSymbol, string>> = {
  white: { P: '♙', R: '♖', N: '♘', B: '♗', Q: '♕', K: '♔' },
  black: { P: '♟', R: '♜', N: '♞', B: '♝', Q: '♛', K: '♚' },
};

function getInitialBoard(): BoardState {
  const board: BoardState = Array(8)
    .fill(null)
    .map(() => Array(8).fill(null).map(() => ({ piece: null })));

  const setupPiece = (row: number, col: number, symbol: PieceSymbol, color: PieceColor) => {
    board[row][col] = { piece: { symbol, color, unicode: UNICODE_PIECES[color][symbol] } };
  };

  // Pawns
  for (let i = 0; i < 8; i++) {
    setupPiece(1, i, 'P', 'black');
    setupPiece(6, i, 'P', 'white');
  }
  // Rooks
  setupPiece(0, 0, 'R', 'black'); setupPiece(0, 7, 'R', 'black');
  setupPiece(7, 0, 'R', 'white'); setupPiece(7, 7, 'R', 'white');
  // Knights
  setupPiece(0, 1, 'N', 'black'); setupPiece(0, 6, 'N', 'black');
  setupPiece(7, 1, 'N', 'white'); setupPiece(7, 6, 'N', 'white');
  // Bishops
  setupPiece(0, 2, 'B', 'black'); setupPiece(0, 5, 'B', 'black');
  setupPiece(7, 2, 'B', 'white'); setupPiece(7, 5, 'B', 'white');
  // Queens
  setupPiece(0, 3, 'Q', 'black');
  setupPiece(7, 3, 'Q', 'white');
  // Kings
  setupPiece(0, 4, 'K', 'black');
  setupPiece(7, 4, 'K', 'white');

  return board;
}
// --- END CHESS LOGIC AND TYPES ---

// --- START LOCAL MUSIC PLAYER TYPES ---
interface LocalTrack {
  id: string; // Unique ID for the track (e.g., timestamp + name)
  file: File;
  name: string;
  url: string; // Object URL for playback
  duration?: number; // Duration in seconds
}
// --- END LOCAL MUSIC PLAYER TYPES ---


interface ControlChange { // For MIDI
  channel: number;
  cc: number;
  value: number;
}

type PlaybackState = 'stopped' | 'playing' | 'loading' | 'paused';
type GameStatus = 'ongoing' | 'checkmate_white_wins' | 'checkmate_black_wins' | 'stalemate_draw' | 'draw';


// Toast Message component (no changes)
// -----------------------------------------------------------------------------
@customElement('toast-message')
class ToastMessage extends LitElement {
  static override styles = css`
    .toast {
      line-height: 1.6;
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background-color: #1a1a1a;
      color: white;
      padding: 15px 25px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 15px;
      min-width: 250px;
      max-width: 80vw;
      box-shadow: 0 4px 15px rgba(0,0,0,0.3);
      transition: transform 0.5s cubic-bezier(0.19, 1, 0.22, 1), opacity 0.5s ease;
      opacity: 0;
      z-index: 1000;
    }
    button {
      background: transparent;
      border-radius: 100px;
      aspect-ratio: 1;
      border: none;
      color: #aaa;
      cursor: pointer;
      font-size: 1.2em;
      padding: 0;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    button:hover {
      color: #fff;
    }
    .toast.showing {
      opacity: 1;
      transform: translate(-50%, 0);
    }
    .toast:not(.showing) {
      transition-duration: 1s;
      transform: translate(-50%, 150%);
      opacity: 0;
    }
  `;

  @property({ type: String }) message = '';
  @property({ type: Boolean }) showing = false;
  private timeoutId: number | undefined;

  override render() {
    return html`<div class=${classMap({ showing: this.showing, toast: true })} role="alert" aria-live="assertive">
      <div class="message">${this.message}</div>
      <button @click=${this.hide} aria-label="Close message">✕</button>
    </div>`;
  }

  show(message: string, duration: number = 3000) {
    this.message = message;
    this.showing = true;
    clearTimeout(this.timeoutId);
    if (duration > 0) {
      this.timeoutId = window.setTimeout(() => this.hide(), duration);
    }
  }

  hide() {
    this.showing = false;
  }
}


// Base class for icon buttons. (no changes)
class IconButton extends LitElement {
  static override styles = css`
    :host {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      pointer-events: none;
    }
    :host(:hover) svg {
      transform: scale(1.2);
    }
    svg {
      width: 100%;
      height: 100%;
      transition: transform 0.5s cubic-bezier(0.25, 1.56, 0.32, 0.99);
    }
    .hitbox {
      pointer-events: all;
      position: absolute;
      width: 65%;
      aspect-ratio: 1;
      top: 9%;
      left: 50%;
      transform: translateX(-50%);
      border-radius: 50%;
      cursor: pointer;
    }
  ` as CSSResultGroup;

  protected renderIcon() { return svg``; }
  private renderSVG() {
    return html`<svg width="140" height="140" viewBox="0 -10 140 150" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="22" y="6" width="96" height="96" rx="48" fill="black" fill-opacity="0.05" />
      <rect x="23.5" y="7.5" width="93" height="93" rx="46.5" stroke="black" stroke-opacity="0.3" stroke-width="3" />
      <g filter="url(#filter0_ddi_1048_7373)">
        <rect x="25" y="9" width="90" height="90" rx="45" fill="white" fill-opacity="0.05" shape-rendering="crispEdges" />
      </g>
      ${this.renderIcon()}
      <defs>
        <filter id="filter0_ddi_1048_7373" x="0" y="0" width="140" height="140" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
          <feFlood flood-opacity="0" result="BackgroundImageFix" /><feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
          <feOffset dy="2" /><feGaussianBlur stdDeviation="4" /><feComposite in2="hardAlpha" operator="out" /><feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0" />
          <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_1048_7373" />
          <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
          <feOffset dy="16" /><feGaussianBlur stdDeviation="12.5" /><feComposite in2="hardAlpha" operator="out" /><feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0" />
          <feBlend mode="normal" in2="effect1_dropShadow_1048_7373" result="effect2_dropShadow_1048_7373" />
          <feBlend mode="normal" in="SourceGraphic" in2="effect2_dropShadow_1048_7373" result="shape" />
          <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
          <feOffset dy="3" /><feGaussianBlur stdDeviation="1.5" /><feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1" />
          <feColorMatrix type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.05 0" /><feBlend mode="normal" in2="shape" result="effect3_innerShadow_1048_7373" />
        </filter>
      </defs>
    </svg>`;
  }
  override render() { return html`${this.renderSVG()}<div class="hitbox" @click=${() => this.dispatchEvent(new Event('click'))}></div>`; }
}

// PlayPauseButton (no changes)
@customElement('play-pause-button')
export class PlayPauseButton extends IconButton {
  @property({ type: String }) playbackState: PlaybackState = 'stopped';
  static override styles = [ IconButton.styles, css`
      .loader { stroke: #ffffff; stroke-width: 3; stroke-linecap: round; animation: spin linear 1s infinite; transform-origin: center; transform-box: fill-box; }
      @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(359deg); } }
    `];
  private renderPause() { return svg`<path d="M75.0037 69V39H83.7537V69H75.0037ZM56.2537 69V39H65.0037V69H56.2537Z" fill="#FEFEFE"/>`; }
  private renderPlay() { return svg`<path d="M60 71.5V36.5L87.5 54L60 71.5Z" fill="#FEFEFE" />`; }
  private renderLoading() { return svg`<path shape-rendering="crispEdges" class="loader" d="M70,74.2L70,74.2c-10.7,0-19.5-8.7-19.5-19.5l0,0c0-10.7,8.7-19.5,19.5-19.5l0,0c10.7,0,19.5,8.7,19.5,19.5l0,0"/>`; }
  override renderIcon() {
    if (this.playbackState === 'playing') return this.renderPause();
    if (this.playbackState === 'loading') return this.renderLoading();
    return this.renderPlay();
  }
}

/** Simple class for dispatching MIDI CC messages as events. (no changes) */
class MidiDispatcher extends EventTarget {
  private access: MIDIAccess | null = null;
  activeMidiInputId: string | null = null;

  async getMidiAccess(): Promise<string[]> {
    if (this.access) return Array.from(this.access.inputs.keys());
    try {
      this.access = await navigator.requestMIDIAccess({ sysex: false });
    } catch (error) {
      console.warn('MIDI access not supported or denied.', error);
      return [];
    }
    if (!(this.access instanceof MIDIAccess)) {
      console.warn('MIDI access not an instance of MIDIAccess.', this.access);
      return [];
    }
    const inputIds = Array.from(this.access.inputs.keys());
    if (inputIds.length > 0 && this.activeMidiInputId === null) this.activeMidiInputId = inputIds[0];
    for (const input of this.access.inputs.values()) {
      input.onmidimessage = (event: MIDIMessageEvent) => {
        if (input.id !== this.activeMidiInputId) return;
        const { data } = event; if (!data) { console.error('MIDI message has no data'); return; }
        const statusByte = data[0]; const channel = statusByte & 0x0f; const messageType = statusByte & 0xf0;
        if (messageType !== 0xb0 /* Control Change */) return;
        const detail: ControlChange = { cc: data[1], value: data[2], channel };
        this.dispatchEvent(new CustomEvent<ControlChange>('cc-message', { detail }));
      };
    }
    return inputIds;
  }
  getDeviceName(id: string): string | null {
    if (!this.access) return null;
    const input = this.access.inputs.get(id); return input ? input.name : null;
  }
}

/** Simple class for getting the current level from our audio element. (no changes) */
class AudioAnalyser {
  readonly node: AnalyserNode; private readonly freqData: Uint8Array;
  constructor(context: AudioContext) {
    this.node = context.createAnalyser(); this.node.smoothingTimeConstant = 0;
    this.freqData = new Uint8Array(this.node.frequencyBinCount);
  }
  getCurrentLevel() {
    this.node.getByteFrequencyData(this.freqData);
    const avg = this.freqData.reduce((a, b) => a + b, 0) / this.freqData.length;
    return avg / 0xff;
  }
}


// ChessBoard Element (no changes)
@customElement('chess-board')
class ChessBoardElement extends LitElement {
  static override styles = css`
    :host { display: flex; flex-direction: column; align-items: center; justify-content: center; }
    .board { display: grid; grid-template-columns: repeat(8, 1fr); grid-template-rows: repeat(8, 1fr); width: 100%; height: 100%; border: 2px solid #555; box-shadow: 0 0 20px rgba(0,0,0,0.5); }
    .square { display: flex; align-items: center; justify-content: center; font-size: var(--chess-piece-size, 3vmin); user-select: none; transition: background-color 0.2s ease; }
    .square.light { background-color: var(--chess-light-square-bg, #4a8ed0); }
    .square.dark { background-color: var(--chess-dark-square-bg, #2c3e50); }
    .square.selected { background-color: var(--chess-selected-square-bg, #ff25f6) !important; box-shadow: inset 0 0 10px rgba(255,255,255,0.5); }
    .square.valid-move::before { content: ''; display: block; width: 30%; height: 30%; background-color: var(--chess-valid-move-indicator, rgba(255,255,255,0.4)); border-radius: 50%; }
    .square.in-check .piece-K { animation: pulse-red 1s infinite; } /* King in check */
    .square.last-move { outline: 2px solid var(--chess-last-move-highlight, #ffdd28); outline-offset: -2px; }
    .piece-white { color: var(--chess-white-piece-color, #00e0e0); text-shadow: 0 0 5px #00e0e0, 0 0 10px #00e0e0; }
    .piece-black { color: var(--chess-black-piece-color, #ff00aa); text-shadow: 0 0 5px #ff00aa, 0 0 10px #ff00aa; }
    @keyframes pulse-red { 0% { text-shadow: 0 0 5px #f00, 0 0 10px #f00; } 50% { text-shadow: 0 0 15px #f00, 0 0 25px #f00; } 100% { text-shadow: 0 0 5px #f00, 0 0 10px #f00; } }
  `;

  @state() private boardState: BoardState = getInitialBoard();
  @state() private currentPlayer: PieceColor = 'white';
  @state() private selectedSquare: Position | null = null;
  @state() private validMoves: Position[] = [];
  @state() private kingInCheck: { white: boolean; black: boolean } = { white: false, black: false };
  @state() private lastMove: { from: Position; to: Position } | null = null;
  @property({ type: Function }) onGameOver: (status: GameStatus) => void = () => {};
  @property({ type: Function }) onCheck: (color: PieceColor) => void = () => {};


  private findKingPosition(color: PieceColor, board: BoardState): Position | null {
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const sq = board[r][c];
        if (sq?.piece?.symbol === 'K' && sq.piece.color === color) return { row: r, col: c };
      }
    }
    return null;
  }

  private isSquareAttackedBy(pos: Position, attackerColor: PieceColor, board: BoardState): boolean {
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const square = board[r][c];
        if (square?.piece && square.piece.color === attackerColor) {
          const attackerMoves = this.getValidMovesForPiece({ row: r, col: c }, square.piece, board, true); // pass true for isCheckingAttacks
          if (attackerMoves.some(m => m.row === pos.row && m.col === pos.col)) return true;
        }
      }
    }
    return false;
  }

  private isKingInCheck(kingColor: PieceColor, board: BoardState): boolean {
    const kingPos = this.findKingPosition(kingColor, board);
    if (!kingPos) return false; 
    return this.isSquareAttackedBy(kingPos, kingColor === 'white' ? 'black' : 'white', board);
  }

  private getValidMovesForPiece(pos: Position, piece: ChessPiece, board: BoardState, isCheckingAttacks = false): Position[] {
    const moves: Position[] = [];
    const { row, col } = pos;
    const { symbol, color } = piece;

    const addMove = (r: number, c: number) => {
        if (r < 0 || r >= 8 || c < 0 || c >= 8) return;
        const targetSquare = board[r][c];
        if (targetSquare?.piece?.color === color && !isCheckingAttacks) return; 

        if (!isCheckingAttacks) {
            const tempBoard = JSON.parse(JSON.stringify(board)); 
            tempBoard[r][c] = { piece };
            tempBoard[row][col] = { piece: null };
            if (this.isKingInCheck(color, tempBoard)) return;
        }
        moves.push({ row: r, col: c });
    };
    
    const addLineMoves = (dr: number, dc: number) => {
        for (let i = 1; i < 8; i++) {
            const r = row + i * dr;
            const c = col + i * dc;
            if (r < 0 || r >= 8 || c < 0 || c >= 8) break;
            const targetSquare = board[r][c];
            if (targetSquare?.piece) {
                if (targetSquare.piece.color !== color) addMove(r,c); 
                break; 
            }
            addMove(r, c); 
        }
    };

    switch (symbol) {
      case 'P': 
        const direction = color === 'white' ? -1 : 1;
        if (row + direction >= 0 && row + direction < 8 && !board[row + direction][col]?.piece) {
            addMove(row + direction, col);
            if ((color === 'white' && row === 6) || (color === 'black' && row === 1)) {
                if (!board[row + 2 * direction][col]?.piece) addMove(row + 2 * direction, col);
            }
        }
        [-1, 1].forEach(offset => {
            if (col + offset >= 0 && col + offset < 8 && row + direction >=0 && row + direction < 8) {
                 const target = board[row + direction][col + offset]?.piece;
                 if(target && target.color !== color) addMove(row + direction, col + offset);
                 else if (isCheckingAttacks && !target) addMove(row + direction, col + offset); 
            }
        });
        break;
      case 'N': 
        const knightMoves = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
        knightMoves.forEach(([dr, dc]) => addMove(row + dr, col + dc));
        break;
      case 'B': 
        addLineMoves(1,1); addLineMoves(1,-1); addLineMoves(-1,1); addLineMoves(-1,-1);
        break;
      case 'R': 
        addLineMoves(1,0); addLineMoves(-1,0); addLineMoves(0,1); addLineMoves(0,-1);
        break;
      case 'Q': 
        addLineMoves(1,1); addLineMoves(1,-1); addLineMoves(-1,1); addLineMoves(-1,-1);
        addLineMoves(1,0); addLineMoves(-1,0); addLineMoves(0,1); addLineMoves(0,-1);
        break;
      case 'K': 
        const kingMoves = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
        kingMoves.forEach(([dr, dc]) => addMove(row + dr, col + dc));
        break;
    }
    return moves;
  }
  
  private hasAnyLegalMoves(playerColor: PieceColor, board: BoardState): boolean {
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const square = board[r][c];
            if (square?.piece && square.piece.color === playerColor) {
                if (this.getValidMovesForPiece({ row: r, col: c }, square.piece, board).length > 0) {
                    return true;
                }
            }
        }
    }
    return false;
  }

  private checkGameStatus() {
    const opponentColor = this.currentPlayer === 'white' ? 'black' : 'white';
    const isCurrentPlayerInCheck = this.isKingInCheck(this.currentPlayer, this.boardState);
    this.kingInCheck = { ...this.kingInCheck, [this.currentPlayer]: isCurrentPlayerInCheck };

    if (isCurrentPlayerInCheck) {
      this.onCheck(this.currentPlayer);
    }

    const hasMoves = this.hasAnyLegalMoves(this.currentPlayer, this.boardState);

    if (!hasMoves) {
        if (isCurrentPlayerInCheck) {
            this.onGameOver(this.currentPlayer === 'white' ? 'checkmate_black_wins' : 'checkmate_white_wins');
        } else {
            this.onGameOver('stalemate_draw');
        }
    }
    this.requestUpdate();
  }


  handleSquareClick(row: number, col: number) {
    const clickedSquare = this.boardState[row][col];

    if (this.selectedSquare) {
      const isValid = this.validMoves.some(m => m.row === row && m.col === col);
      if (isValid) { 
        const newBoard = JSON.parse(JSON.stringify(this.boardState)) as BoardState; 
        newBoard[row][col] = newBoard[this.selectedSquare.row][this.selectedSquare.col];
        newBoard[this.selectedSquare.row][this.selectedSquare.col] = { piece: null };
        
        const movedPiece = newBoard[row][col]?.piece;
        if (movedPiece?.symbol === 'P' && ((movedPiece.color === 'white' && row === 0) || (movedPiece.color === 'black' && row === 7))) {
            newBoard[row][col]!.piece = { ...movedPiece, symbol: 'Q', unicode: UNICODE_PIECES[movedPiece.color]['Q'] };
        }

        this.boardState = newBoard;
        this.lastMove = { from: this.selectedSquare, to: {row, col} };
        this.selectedSquare = null;
        this.validMoves = [];
        this.currentPlayer = this.currentPlayer === 'white' ? 'black' : 'white';
        this.kingInCheck = { white: false, black: false };
        this.checkGameStatus();

      } else if (clickedSquare?.piece?.color === this.currentPlayer) { 
        this.selectPiece(row, col, clickedSquare.piece);
      } else { 
        this.selectedSquare = null;
        this.validMoves = [];
      }
    } else if (clickedSquare?.piece?.color === this.currentPlayer) { 
      this.selectPiece(row, col, clickedSquare.piece);
    }
    this.requestUpdate();
  }
  
  private selectPiece(row: number, col: number, piece: ChessPiece) {
    this.selectedSquare = { row, col };
    this.validMoves = this.getValidMovesForPiece({ row, col }, piece, this.boardState);
  }

  resetGame() {
    this.boardState = getInitialBoard();
    this.currentPlayer = 'white';
    this.selectedSquare = null;
    this.validMoves = [];
    this.kingInCheck = { white: false, black: false };
    this.lastMove = null;
    this.requestUpdate();
    this.dispatchEvent(new CustomEvent('game-reset'));
  }


  override render() {
    return html`
      <div class="board" role="grid" aria-label="Chess board">
        ${this.boardState.map((rowArr, r) =>
          rowArr.map((square, c) => {
            const isLight = (r + c) % 2 === 0;
            const isSelected = this.selectedSquare?.row === r && this.selectedSquare?.col === c;
            const isValidMoveTarget = this.validMoves.some(m => m.row === r && m.col === c);
            const isKingCurrentlyInCheck = (square?.piece?.symbol === 'K' && square?.piece?.color === 'white' && this.kingInCheck.white) ||
                                        (square?.piece?.symbol === 'K' && square?.piece?.color === 'black' && this.kingInCheck.black);
            const isLastMoveSquare = (this.lastMove?.from.row === r && this.lastMove?.from.col === c) || 
                                     (this.lastMove?.to.row === r && this.lastMove?.to.col === c);

            const squareClasses = classMap({
              square: true,
              light: isLight, dark: !isLight,
              selected: !!isSelected,
              'valid-move': !!isValidMoveTarget,
              'in-check': !!isKingCurrentlyInCheck,
              'last-move': !!isLastMoveSquare,
            });
            
            const pieceClasses = classMap({
              [`piece-${square?.piece?.color}`]: !!square?.piece,
              [`piece-${square?.piece?.symbol}`]: !!square?.piece?.symbol,
            });

            return html`
              <div
                class=${squareClasses}
                role="gridcell"
                aria-selected=${isSelected ? 'true' : 'false'}
                tabindex=${(r*8+c) === 0 ? '0' : '-1'}
                @click=${() => this.handleSquareClick(r, c)}
                @keydown=${(e: KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') this.handleSquareClick(r, c);}}
                aria-label=${`${square?.piece ? `${square.piece.color} ${square.piece.symbol}` : 'Empty'} at ${String.fromCharCode(97+c)}${8-r}`}>
                ${square?.piece ? html`<span class=${pieceClasses}>${square.piece.unicode}</span>` : ''}
              </div>`;
          })
        )}
      </div>
    `;
  }
}


/** The main application combining Chess and Local Music DJ. */
@customElement('prompt-dj-app')
class PromptDjApp extends LitElement {
  static override styles = css`
    :host {
      height: 100vh; 
      width: 100vw; 
      display: flex;
      flex-direction: column; 
      justify-content: center;
      align-items: center;
      box-sizing: border-box;
      position: relative;
      overflow: hidden; 
       --chess-piece-size: 5vmin;
       --chess-light-square-bg: #74aae8; 
       --chess-dark-square-bg: #3b5998;  
       --chess-selected-square-bg: #ff4081; 
       --chess-valid-move-indicator: rgba(224, 224, 224, 0.6); 
       --chess-last-move-highlight: #ffeb3b; 
       --chess-white-piece-color: #00e5ff; 
       --chess-black-piece-color: #f50057; 
    }
    #main-container {
      display: flex;
      flex-direction: row; 
      width: 100%;
      height: 100%;
      max-width: 1600px; 
      padding: 2vmin;
      box-sizing: border-box;
      gap: 2vmin;
    }
    #chess-panel {
      flex: 3; 
      display: flex;
      justify-content: center;
      align-items: center;
      aspect-ratio: 1 / 1; 
      max-height: 90vh; 
      max-width: 90vh; 
    }
    chess-board {
        width: 100%;
        height: 100%;
    }
    #music-panel {
      flex: 2; 
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-start; /* Align content to top */
      padding: 2vmin;
      background: rgba(0,0,0,0.2);
      border-radius: 10px;
      gap: 1.5vmin; /* Overall gap for items in music panel */
      max-height: 90vh;
      overflow-y: auto;
    }
    #background {
      will-change: background-image;
      position: absolute;
      height: 100%;
      width: 100%;
      z-index: -1;
      background: linear-gradient(45deg, #1e3c72 0%, #2a5298 100%); /* Simplified default background */
    }
    
    .controls-cluster {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1.5vmin;
      width: 100%; /* Make cluster take full width */
    }
    #midi-controls { display: flex; gap: 1vmin; align-items: center; margin-top: 1vmin; }
    play-pause-button { width: 12vmin; min-width: 80px; max-width: 120px; }
    
    button.app-button, label.app-button, select.app-select { 
      font: inherit;
      font-weight: 600;
      cursor: pointer;
      color: #fff;
      background: rgba(0,0,0,0.3);
      -webkit-font-smoothing: antialiased;
      border: 1.5px solid rgba(255,255,255,0.5);
      border-radius: 6px;
      user-select: none;
      padding: 8px 12px;
      transition: background-color 0.2s, border-color 0.2s;
      text-align: center;
    }
    button.app-button:hover, label.app-button:hover, select.app-select:hover {
      background: rgba(0,0,0,0.5);
      border-color: #fff;
    }
    button.app-button.active { background-color: #fff; color: #000; }
    select.app-select { padding: 8px; background: rgba(255,255,255,0.9); color: #000; }

    #file-upload-input { display: none; } /* Hide actual file input */

    #track-list {
      list-style: none;
      padding: 0;
      margin: 0;
      width: 100%;
      max-height: 30vh; /* Limit height of tracklist */
      overflow-y: auto;
      background: rgba(0,0,0,0.1);
      border-radius: 5px;
    }
    #track-list li {
      padding: 8px 10px;
      border-bottom: 1px solid rgba(255,255,255,0.1);
      cursor: pointer;
      font-size: 1.5vmin;
      color: #eee;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    #track-list li:last-child { border-bottom: none; }
    #track-list li:hover { background-color: rgba(255,255,255,0.1); }
    #track-list li.playing { background-color: var(--chess-selected-square-bg, #ff4081); color: #fff; font-weight: bold; }

    .playback-info { text-align: center; margin-bottom: 1vmin; font-size: 1.6vmin; color: #f0f0f0; }
    .playback-info .track-name { font-weight: bold; display: block; margin-bottom: 0.5vmin; max-width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .playback-info .time { font-size: 1.4vmin; }

    .slider-container { display: flex; align-items: center; width: 90%; gap: 1vmin; margin: 0.5vmin 0; }
    .slider-container input[type="range"] { flex-grow: 1; cursor: pointer; }
    .slider-container .icon { font-size: 2vmin; color: #ccc; }


    #game-status-controls { display: flex; flex-direction: column; align-items: center; gap: 10px; margin-top: auto; /* Push to bottom */ }
    .game-over-message { font-size: 1.8em; color: #fff; text-shadow: 0 0 5px #000; margin-bottom: 10px; }

    /* Responsive adjustments */
    @media (max-width: 768px) {
      #main-container { flex-direction: column; align-items: center; }
      #chess-panel { flex: 0 1 auto; width: 90vmin; height: 90vmin; max-width: 500px; max-height: 500px; order: 1; } 
      #music-panel { flex: 0 1 auto; width: 90vmin; max-width: 500px; order: 2; padding: 3vmin; }
      #track-list li { font-size: 2vmin; }
      .playback-info { font-size: 2vmin; }
      .playback-info .time { font-size: 1.8vmin; }
      play-pause-button { width: 18vmin; }
      :host { --chess-piece-size: 7vmin; }
    }
  `;

  private midiDispatcher: MidiDispatcher;
  private audioAnalyser: AudioAnalyser;
  private audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 48000 });
  
  @query('#audio-player') private audioPlayerElement!: HTMLAudioElement;
  @query('toast-message') private toastMessage!: ToastMessage;
  @query('chess-board') private chessBoard!: ChessBoardElement;

  @state() private playbackState: PlaybackState = 'stopped';
  @state() private gameStatus: GameStatus = 'ongoing';
  
  @state() private uploadedTracks: LocalTrack[] = [];
  @state() private currentTrackIndex: number | null = null;
  @state() private currentTrackTime: number = 0;
  @state() private currentTrackDuration: number = 0;
  @state() private volume: number = 0.8; // Default volume 80%

  @state() private showMidi = false;
  @state() private audioLevel = 0; // Still can be used for visualization if desired
  @state() private midiInputIds: string[] = [];
  @state() private activeMidiInputId: string | null = null;
  private audioLevelRafId: number | null = null;
  private audioSourceNode: MediaElementAudioSourceNode | null = null;


  constructor() {
    super();
    this.midiDispatcher = new MidiDispatcher();
    this.audioAnalyser = new AudioAnalyser(this.audioContext);
    // Connect analyser to destination. Audio element will connect to analyser later.
    this.audioAnalyser.node.connect(this.audioContext.destination); 
    this.updateAudioLevel = this.updateAudioLevel.bind(this);
    this.handleGameReset = this.handleGameReset.bind(this);
  }

  override connectedCallback() {
    super.connectedCallback();
    this.updateAudioLevel();
     // Attempt to load stored MIDI device preference
    this.midiDispatcher.getMidiAccess().then(ids => {
        if (ids.length > 0) {
            this.midiInputIds = ids;
            this.activeMidiInputId = this.midiDispatcher.activeMidiInputId; // It might have a stored one
        }
    });
    this.midiDispatcher.addEventListener('cc-message', this.handleMidiCC as EventListener);
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    if (this.audioLevelRafId) cancelAnimationFrame(this.audioLevelRafId);
    this.uploadedTracks.forEach(track => URL.revokeObjectURL(track.url)); // Clean up object URLs
    this.midiDispatcher.removeEventListener('cc-message', this.handleMidiCC as EventListener);
  }
  
  private handleMidiCC = (e: CustomEvent<ControlChange>) => {
    const { cc, value } = e.detail;
    // Example: Map CC 7 to volume
    if (cc === 7) {
      this.volume = value / 127;
      if (this.audioPlayerElement) {
        this.audioPlayerElement.volume = this.volume;
      }
    }
    // Add more mappings here if needed, e.g., play/pause, next/prev track
  }

  private updateAudioLevel() {
    this.audioLevelRafId = requestAnimationFrame(this.updateAudioLevel);
    this.audioLevel = this.audioAnalyser.getCurrentLevel();
    // This audioLevel can be passed to other components if needed for visualization
  }

  private handleFileUpload(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files) return;

    const newTracks: LocalTrack[] = [];
    for (const file of Array.from(input.files)) {
      if (file.type.startsWith('audio/')) {
        newTracks.push({
          id: `${Date.now()}-${file.name}`,
          file,
          name: file.name,
          url: URL.createObjectURL(file),
        });
      } else {
        this.toastMessage.show(`File ignored: ${file.name} (not an audio file)`, 3000);
      }
    }
    
    // Revoke old URLs if replacing entire list, or manage individually
    // For simplicity, if we append, we don't revoke previous ones unless they are explicitly removed.
    this.uploadedTracks = [...this.uploadedTracks, ...newTracks];
    if (this.uploadedTracks.length > 0 && this.currentTrackIndex === null) {
      // If no track was playing and we uploaded some, select the first one automatically
      this.selectTrack(0); 
    }
    input.value = ''; // Reset file input
  }

  private selectTrack(index: number) {
    if (index < 0 || index >= this.uploadedTracks.length) return;
    this.currentTrackIndex = index;
    const track = this.uploadedTracks[index];
    this.audioPlayerElement.src = track.url;
    this.audioPlayerElement.load(); // Important to load new source
    
    // If audio context was suspended, resume it.
    if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
    }

    // Connect audio element to analyser if not already
    if (!this.audioSourceNode) {
        this.audioSourceNode = this.audioContext.createMediaElementSource(this.audioPlayerElement);
        this.audioSourceNode.connect(this.audioAnalyser.node);
        // No need to connect to audioAnalyser.node.connect(this.audioContext.destination)
        // as audioAnalyser.node is already connected to destination.
    }
    
    if (this.playbackState === 'playing' || this.playbackState === 'loading') {
       this.audioPlayerElement.play().catch(e => console.error("Error playing track:", e));
    }
  }
  
  private handleAudioEvents(event: Event) {
    const audioElement = event.target as HTMLAudioElement;
    switch(event.type) {
      case 'loadedmetadata':
        this.currentTrackDuration = audioElement.duration;
        const track = this.uploadedTracks[this.currentTrackIndex!];
        if (track) track.duration = audioElement.duration; // Store duration
        break;
      case 'timeupdate':
        this.currentTrackTime = audioElement.currentTime;
        break;
      case 'play':
        this.playbackState = 'playing';
        break;
      case 'pause':
        if (this.playbackState !== 'stopped') { // Don't change to paused if explicitly stopped
          this.playbackState = 'paused';
        }
        break;
      case 'ended':
        this.playbackState = 'stopped';
        // Optional: play next track
        if (this.currentTrackIndex !== null && this.currentTrackIndex < this.uploadedTracks.length - 1) {
            this.selectTrack(this.currentTrackIndex + 1);
            this.playMusic();
        } else {
            this.currentTrackIndex = null; // Reset if end of list
        }
        break;
      case 'error':
        this.toastMessage.show('Error playing audio file.', 3000);
        this.playbackState = 'stopped';
        break;
      case 'waiting':
        this.playbackState = 'loading';
        break;
      case 'canplay':
        if(this.playbackState === 'loading' && this.audioPlayerElement.paused === false) {
           // If we were loading and audio is ready to play (and was told to play), set to playing
           this.playbackState = 'playing';
        }
        break;
    }
  }

  private formatTime(seconds: number): string {
    if (isNaN(seconds) || seconds === Infinity) return '00:00';
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min < 10 ? '0' : ''}${min}:${sec < 10 ? '0' : ''}${sec}`;
  }

  private playMusic() {
    if (this.currentTrackIndex === null && this.uploadedTracks.length > 0) {
      this.selectTrack(0); // Select first track if none is selected
    }
    if (this.currentTrackIndex !== null) {
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }
      this.audioPlayerElement.play().catch(e => {
        console.error("Error playing track:", e);
        this.toastMessage.show("Could not play audio. User interaction might be needed.", 3000);
      });
      this.playbackState = 'playing'; // Optimistically set, events will confirm
    } else {
      this.toastMessage.show('No music uploaded or selected.', 3000);
    }
  }

  private pauseMusic() {
    this.audioPlayerElement.pause();
    this.playbackState = 'paused';
  }

  private stopMusic() {
    this.audioPlayerElement.pause();
    this.audioPlayerElement.currentTime = 0;
    this.playbackState = 'stopped';
  }

  private async handlePlayPause() {
    if (this.gameStatus !== 'ongoing' && (this.playbackState === 'paused' || this.playbackState === 'stopped')) {
        this.toastMessage.show("Game is over. Reset the game to play music.", 3000);
        return;
    }
    if (this.playbackState === 'playing') this.pauseMusic();
    else await this.playMusic();
  }

  private handleVolumeChange(event: Event) {
    const newVolume = parseFloat((event.target as HTMLInputElement).value);
    this.volume = newVolume;
    this.audioPlayerElement.volume = newVolume;
  }

  private handleSeek(event: Event) {
    const newTime = parseFloat((event.target as HTMLInputElement).value);
    this.audioPlayerElement.currentTime = newTime;
    this.currentTrackTime = newTime;
  }
  
  private handleChessGameOver(status: GameStatus) {
    this.gameStatus = status;
    let message = "Game Over!";
    if (status === 'checkmate_white_wins') message = "Checkmate! White wins!";
    else if (status === 'checkmate_black_wins') message = "Checkmate! Black wins!";
    else if (status === 'stalemate_draw') message = "Stalemate! It's a draw!";
    this.toastMessage.show(message, 0); 
    if (this.playbackState === 'playing' || this.playbackState === 'loading') {
        this.pauseMusic();
    }
  }

  private handleCheck(color: PieceColor) {
    this.toastMessage.show(`${color.charAt(0).toUpperCase() + color.slice(1)} is in Check!`, 2000);
  }

  private handleGameReset() {
    this.gameStatus = 'ongoing';
    if (this.chessBoard) {
        this.chessBoard.resetGame();
    }
    this.toastMessage.hide(); 
  }

  private async toggleShowMidi() {
    this.showMidi = !this.showMidi;
    if (!this.showMidi) return;
    const inputIds = await this.midiDispatcher.getMidiAccess();
    this.midiInputIds = inputIds;
    this.activeMidiInputId = this.midiDispatcher.activeMidiInputId;
  }
  private handleMidiInputChange(event: Event) {
    const newMidiId = (event.target as HTMLSelectElement).value;
    this.activeMidiInputId = newMidiId;
    this.midiDispatcher.activeMidiInputId = newMidiId;
  }

  override render() {
    const currentTrack = this.currentTrackIndex !== null ? this.uploadedTracks[this.currentTrackIndex] : null;

    return html`
      <div id="background"></div>
      <audio 
        id="audio-player"
        @loadedmetadata=${this.handleAudioEvents}
        @timeupdate=${this.handleAudioEvents}
        @play=${this.handleAudioEvents}
        @pause=${this.handleAudioEvents}
        @ended=${this.handleAudioEvents}
        @error=${this.handleAudioEvents}
        @waiting=${this.handleAudioEvents}
        @canplay=${this.handleAudioEvents}
        .volume=${this.volume}
      ></audio>

      <div id="main-container">
        <div id="chess-panel">
          <chess-board
            .onGameOver=${(status: GameStatus) => this.handleChessGameOver(status)}
            .onCheck=${(color: PieceColor) => this.handleCheck(color)}
            @game-reset=${this.handleGameReset}
           ></chess-board>
        </div>
        <div id="music-panel">
          <label for="file-upload-input" class="app-button">Upload Music</label>
          <input id="file-upload-input" type="file" accept="audio/*" multiple @change=${this.handleFileUpload}>

          ${this.uploadedTracks.length > 0 ? html`
            <ul id="track-list" role="listbox" aria-label="Uploaded music tracks">
              ${this.uploadedTracks.map((track, index) => html`
                <li 
                  role="option"
                  aria-selected=${this.currentTrackIndex === index}
                  class=${classMap({ playing: this.currentTrackIndex === index })}
                  @click=${() => this.selectTrack(index)}
                  tabindex="0"
                  @keydown=${(e:KeyboardEvent) => { if(e.key === 'Enter' || e.key === ' ') this.selectTrack(index);}}
                  title=${track.name}
                >
                  ${track.name}
                </li>
              `)}
            </ul>
          ` : html`<p>No music uploaded yet.</p>`}
          
          <div class="controls-cluster">
            ${currentTrack ? html`
              <div class="playback-info">
                <span class="track-name">${currentTrack.name}</span>
                <span class="time">
                  ${this.formatTime(this.currentTrackTime)} / ${this.formatTime(this.currentTrackDuration)}
                </span>
              </div>
              <div class="slider-container">
                <input 
                  type="range" 
                  min="0" 
                  .max=${this.currentTrackDuration || 0} 
                  .value=${this.currentTrackTime || 0} 
                  @input=${this.handleSeek}
                  aria-label="Seek track"
                >
              </div>
              <div class="slider-container">
                <span class="icon" aria-hidden="true">🔊</span>
                <input 
                  type="range" 
                  min="0" 
                  max="1" 
                  step="0.01" 
                  .value=${this.volume} 
                  @input=${this.handleVolumeChange}
                  aria-label="Volume"
                >
              </div>
            ` : nothing}

            <play-pause-button .playbackState=${this.playbackState} @click=${this.handlePlayPause}></play-pause-button>
            
            <div id="midi-controls">
                <button class="app-button ${this.showMidi ? 'active' : ''}" @click=${this.toggleShowMidi} aria-pressed=${this.showMidi}>MIDI</button>
                ${this.showMidi ? html`
                    <select class="app-select" @change=${this.handleMidiInputChange} .value=${this.activeMidiInputId || ''} aria-label="Select MIDI Input Device">
                    ${this.midiInputIds.length > 0
                        ? this.midiInputIds.map(id => html`<option value=${id}>${this.midiDispatcher.getDeviceName(id) || `Device ${id.substring(0,6)}`}</option>`)
                        : html`<option value="">No MIDI devices</option>`
                    }
                    </select>` : nothing
                }
            </div>
          </div>

           ${this.gameStatus !== 'ongoing' ? html`
            <div id="game-status-controls">
                ${this.gameStatus === 'checkmate_white_wins' ? html`<p class="game-over-message">White Wins!</p>` : nothing}
                ${this.gameStatus === 'checkmate_black_wins' ? html`<p class="game-over-message">Black Wins!</p>` : nothing}
                ${this.gameStatus === 'stalemate_draw' ? html`<p class="game-over-message">Draw by Stalemate!</p>` : nothing}
                <button class="app-button" @click=${this.handleGameReset}>Reset Game</button>
            </div>` : nothing
            }
        </div>
      </div>
      <toast-message></toast-message>
    `;
  }
}


async function main(parent: HTMLElement) {
  const app = new PromptDjApp();
  parent.appendChild(app);
}

main(document.body);

declare global {
  interface HTMLElementTagNameMap {
    'prompt-dj-app': PromptDjApp;
    // 'prompt-controller': PromptController; // Removed
    // 'weight-knob': WeightKnob; // Removed
    'play-pause-button': PlayPauseButton;
    'toast-message': ToastMessage;
    'chess-board': ChessBoardElement;
  }
}
