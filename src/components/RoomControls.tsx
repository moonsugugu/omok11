import React, { useState } from 'react';
import { Player, UserStat } from '../types';
import { Copy, Check, LogOut, RefreshCw, Flag, QrCode, Share2, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface RoomControlsProps {
  roomCode: string;
  player1: Player | null;
  player2: Player | null;
  spectators: Player[];
  winner: number;
  currentTurn: number;
  myRole: number; // 1 = Black, 2 = White, 0 = Spec
  myId: string;
  rematchRequests: string[];
  onAction: (type: 'rematch' | 'resign' | 'leave') => void;
  p1Stats: UserStat | null;
  p2Stats: UserStat | null;
}

export default function RoomControls({
  roomCode,
  player1,
  player2,
  spectators,
  winner,
  currentTurn,
  myRole,
  myId,
  rematchRequests,
  onAction,
  p1Stats,
  p2Stats
}: RoomControlsProps) {
  const [copied, setCopied] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);

  // Generate shareable URL
  const shareUrl = `${window.location.origin}?room=${roomCode}`;
  // QR Code API (using QR Server, 250x250)
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(shareUrl)}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getStatsText = (stats: UserStat | null) => {
    if (!stats) return '0승 0패';
    const total = stats.wins + stats.losses + stats.draws;
    const rate = total > 0 ? Math.round((stats.wins / total) * 100) : 0;
    return `${stats.wins}승 ${stats.losses}패 (승률 ${rate}%)`;
  };

  return (
    <div className="flex flex-col gap-4 w-full text-natural-text">
      {/* Room Status & Information Card */}
      <div className="bg-white border border-natural-border rounded-3xl p-4 shadow-md flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase tracking-wider text-natural-muted font-bold font-mono">ROOM CODE</span>
            <h2 className="text-2xl font-bold font-mono tracking-wider text-natural-sage flex items-center gap-1.5 leading-none">
              {roomCode.slice(0, 3)} {roomCode.slice(3)}
            </h2>
          </div>
          <div className="flex gap-1.5">
            <button
              id="btn-copy-link"
              onClick={handleCopyLink}
              className="p-2 bg-natural-panel hover:bg-natural-border border border-natural-border rounded-xl text-natural-text transition-all flex items-center justify-center cursor-pointer"
              title="초대 링크 복사"
            >
              {copied ? <Check className="w-4 h-4 text-natural-sage" /> : <Copy className="w-4 h-4" />}
            </button>
            <button
              id="btn-show-qr"
              onClick={() => setShowQRModal(true)}
              className="p-2 bg-natural-panel hover:bg-natural-border border border-natural-border rounded-xl text-natural-text transition-all flex items-center justify-center cursor-pointer"
              title="QR코드 보기"
            >
              <QrCode className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Share Link Info (rendered when Player 2 is missing) */}
        {!player2 && (
          <div className="bg-[#E8F0ED] border border-natural-sage/20 rounded-xl p-3 flex flex-col gap-2">
            <div className="flex items-start gap-2.5">
              <span className="p-1.5 rounded bg-natural-sage text-white font-bold text-[10px] mt-0.5 leading-none">TIP</span>
              <p className="text-xs text-natural-text leading-normal font-medium">
                친구에게 QR코드를 보여주거나 방 코드를 알려주세요! 링크를 복사해 전송할 수도 있습니다.
              </p>
            </div>
            <button
              id="btn-invite-copy-link"
              onClick={handleCopyLink}
              className="mt-1 w-full flex items-center justify-center gap-1.5 py-2 bg-natural-sage hover:bg-natural-sage-hover text-white rounded-lg text-xs font-bold shadow-md shadow-natural-sage/10 transition-all cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5 font-bold" />
              {copied ? '초대 링크 복사 완료!' : '초대 링크 복사하기'}
            </button>
          </div>
        )}
      </div>

      {/* Players Section */}
      <div className="bg-white border border-natural-border rounded-3xl p-4 shadow-md flex flex-col gap-3">
        <h3 className="text-xs font-extrabold text-natural-muted border-b border-natural-border pb-1.5">플레이어</h3>
        
        {/* Player 1 (Black, Creator) */}
        <div className={`flex items-center justify-between p-2.5 rounded-xl border ${
          currentTurn === 1 && winner === 0
            ? 'bg-natural-panel border-natural-sage' 
            : 'bg-natural-bg/50 border-natural-border/60'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-neutral-700 to-black border border-neutral-600 shadow-sm flex items-center justify-center flex-shrink-0">
              <span className="text-[9px] text-white font-mono font-bold">1</span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-natural-text flex items-center gap-1.5">
                {player1 ? player1.name : '대기 중...'}
                {player1?.id === myId && <span className="text-[9px] bg-natural-sage text-white px-1.5 py-0.2 rounded font-bold">나</span>}
              </span>
              <span className="text-[10px] text-natural-muted font-medium">{getStatsText(p1Stats)}</span>
            </div>
          </div>
          {currentTurn === 1 && winner === 0 && (
            <span className="text-[10px] bg-natural-sage text-white font-extrabold px-1.5 py-0.5 rounded animate-pulse">TURN</span>
          )}
        </div>

        {/* Player 2 (White, Opponent) */}
        <div className={`flex items-center justify-between p-2.5 rounded-xl border ${
          currentTurn === 2 && winner === 0
            ? 'bg-natural-panel border-natural-sage' 
            : 'bg-natural-bg/50 border-natural-border/60'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-white to-neutral-100 border border-natural-border shadow-sm flex items-center justify-center flex-shrink-0">
              <span className="text-[9px] text-natural-text font-mono font-bold">2</span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-natural-text flex items-center gap-1.5">
                {player2 ? player2.name : '상대 대기 중...'}
                {player2?.id === myId && <span className="text-[9px] bg-natural-sage text-white px-1.5 py-0.2 rounded font-bold">나</span>}
              </span>
              <span className="text-[10px] text-natural-muted font-medium">
                {player2 ? getStatsText(p2Stats) : '입장 코드를 입력하여 참여해주세요'}
              </span>
            </div>
          </div>
          {currentTurn === 2 && winner === 0 && (
            <span className="text-[10px] bg-natural-sage text-white font-extrabold px-1.5 py-0.5 rounded animate-pulse">TURN</span>
          )}
        </div>
      </div>

      {/* Spectators Panel */}
      {spectators.length > 0 && (
        <div className="bg-white border border-natural-border rounded-3xl p-4 shadow-md flex flex-col gap-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-natural-muted border-b border-natural-border pb-1.5">
            <Users className="w-3.5 h-3.5" />
            <span>관전자 ({spectators.length}명)</span>
          </div>
          <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto pt-1">
            {spectators.map((spec) => (
              <span 
                key={spec.id} 
                className="text-[11px] bg-natural-panel text-natural-text border border-natural-border px-2 py-0.5 rounded-md flex items-center gap-1"
              >
                {spec.name}
                {spec.id === myId && <span className="text-[9px] text-natural-sage font-bold">(나)</span>}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Action Controls */}
      <div className="flex flex-col gap-2 mt-2">
        {/* Rematch action (shown if game ended) */}
        {winner !== 0 && (myRole === 1 || myRole === 2) && (
          <button
            id="btn-request-rematch"
            onClick={() => onAction('rematch')}
            className={`w-full py-3 rounded-xl font-extrabold flex items-center justify-center gap-2 shadow-lg transition-all border cursor-pointer ${
              rematchRequests.includes(myId)
                ? 'bg-natural-panel border-natural-border text-natural-muted'
                : 'bg-natural-sage border-natural-sage/20 hover:bg-natural-sage-hover text-white shadow-natural-sage/15'
            }`}
          >
            <RefreshCw className={`w-4 h-4 ${rematchRequests.includes(myId) ? '' : 'animate-spin'}`} style={{ animationDuration: '4s' }} />
            {rematchRequests.includes(myId)
              ? `다시 하기 수락 대기 중 (${rematchRequests.length}/2)`
              : rematchRequests.length > 0
              ? '상대방의 다시 하기 수락!'
              : '다시 하기 (Rematch)'}
          </button>
        )}

        {/* Resign action (shown if game is ongoing and player is participating) */}
        {winner === 0 && (myRole === 1 || myRole === 2) && (
          <button
            id="btn-resign"
            onClick={() => {
              if (confirm('정말로 오목 대전을 기권하시겠습니까? 상대방에게 즉시 승리가 돌아갑니다.')) {
                onAction('resign');
              }
            }}
            className="w-full py-2.5 bg-white hover:bg-[#FDF3F1] border border-natural-border hover:border-natural-coral/30 text-natural-muted hover:text-natural-coral rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <Flag className="w-3.5 h-3.5" />
            기권하기 (Resign)
          </button>
        )}

        {/* Exit Room action */}
        <button
          id="btn-leave-room"
          onClick={() => {
            if (winner === 0 && (myRole === 1 || myRole === 2)) {
              if (!confirm('게임 진행 중에 방을 나가면 기권으로 간주될 수 있습니다. 정말로 나가시겠습니까?')) {
                return;
              }
            }
            onAction('leave');
          }}
          className="w-full py-2.5 bg-white hover:bg-natural-panel border border-natural-border text-natural-muted hover:text-natural-text rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          방에서 나가기 (Exit)
        </button>
      </div>

      {/* QR Code Modal Overlay */}
      <AnimatePresence>
        {showQRModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowQRModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white border border-natural-border p-6 rounded-3xl max-w-sm w-full flex flex-col items-center text-center gap-5 relative shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div>
                <h3 className="text-lg font-bold text-natural-text">쉽고 빠른 방 참가</h3>
                <p className="text-xs text-natural-muted mt-1 leading-relaxed">
                  모바일 카메라로 아래 QR 코드를 스캔하면<br />설치 없이 즉시 대전방으로 바로 접속할 수 있습니다.
                </p>
              </div>

              {/* QR Image Container with natural border */}
              <div className="bg-white p-3 rounded-2xl shadow-xl border border-natural-border">
                <img 
                  id="qr-modal-image"
                  src={qrCodeUrl} 
                  alt="Join Game QR Code" 
                  className="w-48 h-48 block"
                  referrerPolicy="no-referrer"
                />
              </div>

              <div className="w-full flex flex-col gap-2">
                <div className="bg-natural-panel border border-natural-border rounded-xl p-2.5 flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold text-natural-muted uppercase">ROOM CODE</span>
                  <span className="text-base font-bold font-mono text-natural-sage tracking-wider">
                    {roomCode.slice(0, 3)} {roomCode.slice(3)}
                  </span>
                </div>
                
                <button
                  id="btn-modal-copy-link"
                  onClick={handleCopyLink}
                  className="w-full py-2.5 bg-natural-sage hover:bg-natural-sage-hover text-white font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-natural-sage/10"
                >
                  <Copy className="w-3.5 h-3.5" />
                  {copied ? '링크 복사 완료!' : '초대 링크 복사'}
                </button>
                <button
                  id="btn-close-qr-modal"
                  onClick={() => setShowQRModal(false)}
                  className="w-full py-2 text-natural-muted hover:text-natural-text text-xs mt-1 transition-colors cursor-pointer"
                >
                  닫기 (Close)
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
