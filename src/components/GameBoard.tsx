import React, { useState } from 'react';
import { Move } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Check, X, Disc } from 'lucide-react';

interface GameBoardProps {
  moves: Move[];
  currentTurn: number; // 1 or 2
  myRole: number; // 1 (Black), 2 (White), 0 (Spectator)
  winner: number;
  winningLine: [number, number][];
  onPlaceStone: (r: number, c: number) => void;
  isMyTurn: boolean;
  gameStarted: boolean;
}

const STAR_POINTS = [
  [3, 3], [3, 7], [3, 11],
  [7, 3], [7, 7], [7, 11],
  [11, 3], [11, 7], [11, 11]
];

export default function GameBoard({
  moves,
  currentTurn,
  myRole,
  winner,
  winningLine,
  onPlaceStone,
  isMyTurn,
  gameStarted
}: GameBoardProps) {
  // Store currently selected preview cell (mobile-friendly pattern)
  const [selectedCell, setSelectedCell] = useState<{ r: number; c: number } | null>(null);

  // Reconstruct board grid
  const grid = Array(15).fill(null).map(() => Array(15).fill(0));
  moves.forEach((m) => {
    grid[m.r][m.c] = m.p;
  });

  const lastMove = moves.length > 0 ? moves[moves.length - 1] : null;

  // Helper to check if a cell is a star point
  const isStarPoint = (r: number, c: number) => {
    return STAR_POINTS.some(([sr, sc]) => sr === r && sc === c);
  };

  // Helper to check if a cell is in the winning line
  const isWinningCell = (r: number, c: number) => {
    return winningLine.some(([wr, wc]) => wr === r && wc === c);
  };

  const handleCellClick = (r: number, c: number) => {
    if (!gameStarted || winner !== 0 || !isMyTurn) return;
    if (grid[r][c] !== 0) return; // Already occupied

    // If already selected, place stone (double tap pattern)
    if (selectedCell && selectedCell.r === r && selectedCell.c === c) {
      onPlaceStone(r, c);
      setSelectedCell(null);
    } else {
      // Select for preview
      setSelectedCell({ r, c });
    }
  };

  const handleConfirmPlacement = () => {
    if (selectedCell && isMyTurn && winner === 0) {
      onPlaceStone(selectedCell.r, selectedCell.c);
      setSelectedCell(null);
    }
  };

  const handleCancelPlacement = () => {
    setSelectedCell(null);
  };

  return (
    <div className="flex flex-col items-center w-full">
      {/* Board wrapper with modern glassmorphism wood-feel or premium dark slate */}
      <div className="relative w-full max-w-[480px] aspect-square bg-natural-board rounded-3xl shadow-xl p-4 md:p-5 border-4 border-natural-board-border overflow-hidden">
        {/* Board Wooden Texture Overlay */}
        <div 
          className="absolute inset-0 opacity-[0.06] pointer-events-none mix-blend-overlay"
          style={{
            backgroundImage: 'repeating-linear-gradient(45deg, #4A443F 0px, #4A443F 2px, transparent 2px, transparent 10px)'
          }}
        />

        {/* 15x15 Grid Layout */}
        <div className="grid grid-cols-15 grid-rows-15 w-full h-full relative z-10">
          {Array.from({ length: 15 }).map((_, r) => (
            <React.Fragment key={r}>
              {Array.from({ length: 15 }).map((_, c) => {
                const stone = grid[r][c];
                const isSelected = selectedCell && selectedCell.r === r && selectedCell.c === c;
                const isLast = lastMove && lastMove.r === r && lastMove.c === c;
                const isWin = isWinningCell(r, c);

                return (
                  <button
                    key={`${r}-${c}`}
                    id={`cell-${r}-${c}`}
                    onClick={() => handleCellClick(r, c)}
                    disabled={!gameStarted || winner !== 0 || (!isMyTurn && !isSelected)}
                    className="relative aspect-square flex items-center justify-center p-0 focus:outline-none cursor-pointer group select-none"
                  >
                    {/* Horizontal grid line */}
                    <div 
                      className="absolute top-1/2 left-0 right-0 h-[1.5px] bg-natural-board-line pointer-events-none"
                      style={{
                        left: c === 0 ? '50%' : '0%',
                        right: c === 14 ? '50%' : '0%',
                      }}
                    />
                    {/* Vertical grid line */}
                    <div 
                      className="absolute left-1/2 top-0 bottom-0 w-[1.5px] bg-natural-board-line pointer-events-none"
                      style={{
                        top: r === 0 ? '50%' : '0%',
                        bottom: r === 14 ? '50%' : '0%',
                      }}
                    />

                    {/* Star Points (Hwajeom) */}
                    {isStarPoint(r, c) && stone === 0 && (
                      <div className="absolute w-[6px] h-[6px] rounded-full bg-natural-board-line pointer-events-none -translate-x-1/2 -translate-y-1/2 top-1/2 left-1/2" />
                    )}

                    {/* Stone rendering */}
                    {stone !== 0 ? (
                      <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                        className={`w-[84%] h-[84%] rounded-full shadow-md relative flex items-center justify-center z-20 ${
                          stone === 1
                            ? 'bg-gradient-to-br from-neutral-700 via-neutral-900 to-black border border-black'
                            : 'bg-gradient-to-br from-white via-neutral-50 to-neutral-200 border border-neutral-300'
                        }`}
                      >
                        {/* 3D Reflection Gloss */}
                        <div className={`absolute top-1 left-1.5 w-1/3 h-1/3 rounded-full opacity-60 pointer-events-none ${
                          stone === 1 ? 'bg-white/10' : 'bg-white/80'
                        }`} />

                        {/* Last move indicator (small glowing ring/dot inside the stone) */}
                        {isLast && winner === 0 && (
                          <span className={`absolute flex h-3 w-3`}>
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-natural-coral opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-natural-coral"></span>
                          </span>
                        )}

                        {/* Winning stones highlight (glowing gold ring or crown) */}
                        {isWin && (
                          <motion.div 
                            animate={{ scale: [1, 1.15, 1] }}
                            transition={{ repeat: Infinity, duration: 1.5 }}
                            className="absolute -inset-1 rounded-full border-2 border-natural-coral shadow-[0_0_12px_rgba(214,140,120,0.8)] pointer-events-none animate-pulse"
                          />
                        )}
                      </motion.div>
                    ) : (
                      <>
                        {/* Hover Preview stone (Desktop only) */}
                        {isMyTurn && winner === 0 && (
                          <div className={`absolute w-[80%] h-[80%] rounded-full opacity-0 group-hover:opacity-35 border border-dashed transition-opacity duration-150 pointer-events-none hidden md:block z-20 ${
                            myRole === 1
                              ? 'bg-black border-black'
                              : 'bg-white border-neutral-400'
                          }`} />
                        )}

                        {/* Selected Preview stone (Mobile & Desktop - persistent tap) */}
                        {isSelected && (
                          <motion.div
                            layoutId="previewStone"
                            className={`absolute w-[84%] h-[84%] rounded-full opacity-70 border-2 border-dashed z-20 animate-pulse flex items-center justify-center ${
                              myRole === 1
                                ? 'bg-black/30 border-black'
                                : 'bg-white/50 border-neutral-400'
                            }`}
                          >
                            <span className="text-natural-coral text-[10px] font-bold">OK?</span>
                          </motion.div>
                        )}
                      </>
                    )}
                  </button>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Mobile-Friendly Confirmation / Instruction Panel */}
      <div className="h-16 mt-4 flex items-center justify-center w-full max-w-[480px]">
        <AnimatePresence mode="wait">
          {selectedCell ? (
            <motion.div
              key="confirm"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center gap-3 w-full justify-between bg-white border border-natural-border text-natural-text rounded-2xl p-3 px-4 shadow-xl"
            >
              <div className="flex items-center gap-2">
                <Disc className={`w-5 h-5 ${myRole === 1 ? 'text-black fill-black stroke-natural-muted' : 'text-white fill-white stroke-natural-muted'}`} />
                <span className="text-sm font-semibold text-natural-text">
                  [{selectedCell.r + 1}행, {selectedCell.c + 1}열] 착수할까요?
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  id="btn-cancel-placement"
                  onClick={handleCancelPlacement}
                  className="p-1.5 px-3 bg-natural-panel hover:bg-natural-border border border-natural-border rounded-xl text-xs font-bold text-natural-text flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <X className="w-3.5 h-3.5 text-natural-coral" />
                  취소
                </button>
                <button
                  id="btn-confirm-placement"
                  onClick={handleConfirmPlacement}
                  className="p-1.5 px-3 bg-natural-sage hover:bg-natural-sage-hover rounded-xl text-xs font-bold text-white flex items-center gap-1 cursor-pointer shadow-md shadow-natural-sage/10 transition-colors"
                >
                  <Check className="w-3.5 h-3.5 font-bold" />
                  확인
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="status"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center text-xs text-natural-muted"
            >
              {winner !== 0 ? (
                <span className="text-natural-coral font-bold text-sm">
                  {winner === 3 ? '무승부입니다!' : `${winner === 1 ? '흑돌' : '백돌'}이 승리하였습니다!`}
                </span>
              ) : !gameStarted ? (
                <span>대전 상대가 입장할 때까지 대기해 주세요.</span>
              ) : isMyTurn ? (
                <span className="text-natural-sage font-black text-sm animate-pulse">
                  내 차례입니다! 둘 곳을 터치하고 한번 더 누르거나 [확인]을 누르세요.
                </span>
              ) : myRole === 0 ? (
                <span>관전 중입니다. 실시간 게임 상황을 지켜보고 있습니다.</span>
              ) : (
                <span className="text-natural-muted text-sm">상대방이 고심하고 있습니다...</span>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
