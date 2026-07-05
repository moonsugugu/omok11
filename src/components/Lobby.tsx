import React, { useState, useEffect } from 'react';
import { UserStat } from '../types';
import { collection, query, orderBy, limit, onSnapshot, doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { motion } from 'motion/react';
import { PlusCircle, LogIn, Trophy, User, Medal, Disc, Sparkles } from 'lucide-react';

interface LobbyProps {
  nickname: string;
  myId: string;
  onSetNickname: (name: string) => void;
  onCreateRoom: () => void;
  onJoinRoom: (code: string) => void;
}

export default function Lobby({
  nickname,
  myId,
  onSetNickname,
  onCreateRoom,
  onJoinRoom
}: LobbyProps) {
  const [nameInput, setNameInput] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [leaderboard, setLeaderboard] = useState<UserStat[]>([]);
  const [myStats, setMyStats] = useState<UserStat | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [joinError, setJoinError] = useState('');

  // 1. Fetch real-time leaderboard (Top 10 players by wins)
  useEffect(() => {
    const q = query(
      collection(db, 'user_stats'),
      orderBy('wins', 'desc'),
      limit(10)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const statsList: UserStat[] = [];
      snapshot.forEach((doc) => {
        statsList.push(doc.data() as UserStat);
      });
      setLeaderboard(statsList);
    }, (err) => {
      console.error("Error fetching leaderboard: ", err);
    });

    return () => unsubscribe();
  }, []);

  // 2. Fetch current user's stats in real-time when nickname changes
  useEffect(() => {
    if (!nickname) {
      setMyStats(null);
      return;
    }

    setLoadingStats(true);
    const userDocRef = doc(db, 'user_stats', nickname);
    
    const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        setMyStats(docSnap.data() as UserStat);
      } else {
        // Document doesn't exist yet, we can set default client-side state
        setMyStats({
          nickname,
          wins: 0,
          losses: 0,
          draws: 0,
          lastPlayed: Date.now()
        });
      }
      setLoadingStats(false);
    }, (err) => {
      console.error("Error fetching user stats: ", err);
      setLoadingStats(false);
    });

    return () => unsubscribe();
  }, [nickname]);

  const handleNameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = nameInput.trim();
    if (!trimmed) return;
    if (trimmed.length > 12) {
      alert("이름은 최대 12글자까지만 가능합니다.");
      return;
    }

    // Save user profile in Firestore if it doesn't exist
    try {
      const docRef = doc(db, 'user_stats', trimmed);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
        await setDoc(docRef, {
          nickname: trimmed,
          wins: 0,
          losses: 0,
          draws: 0,
          lastPlayed: Date.now()
        });
      }
    } catch (err) {
      console.error("Error setting up user statistics: ", err);
    }

    onSetNickname(trimmed);
  };

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const code = codeInput.trim().toUpperCase().replace(/\s+/g, '');
    if (code.length !== 6) {
      setJoinError('방 코드는 정확히 6자리여야 합니다.');
      return;
    }
    setJoinError('');
    onJoinRoom(code);
  };

  // If nickname is not set, show the Name Input Screen (Clean & centered cards)
  if (!nickname) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] px-4">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-white border border-natural-border p-8 rounded-3xl shadow-xl flex flex-col gap-6"
        >
          {/* Main Visual Logo */}
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="relative w-16 h-16 flex items-center justify-center bg-natural-sage rounded-2xl shadow-lg shadow-natural-sage/10">
              <Disc className="w-10 h-10 text-white animate-pulse fill-white" />
              <Sparkles className="absolute -top-1.5 -right-1.5 w-5 h-5 text-natural-coral animate-bounce" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-natural-text font-sans">실시간 오목 배틀</h1>
              <p className="text-xs text-natural-muted mt-1.5 leading-relaxed">
                설치 없이 브라우저에서 바로 즐기는<br />실시간 멀티플레이어 온라인 오목 게임
              </p>
            </div>
          </div>

          <form onSubmit={handleNameSubmit} className="flex flex-col gap-4 mt-2">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="nickname-input" className="text-xs font-bold text-natural-muted">닉네임 입력</label>
              <input
                id="nickname-input"
                type="text"
                placeholder="게임에서 사용할 이름을 적어주세요 (최대 12자)"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                maxLength={12}
                autoFocus
                className="w-full bg-natural-bg border border-natural-border focus:border-natural-sage rounded-2xl px-4 py-3 text-sm text-natural-text placeholder-natural-muted/60 outline-none transition-all font-sans"
              />
            </div>

            <button
              id="btn-submit-nickname"
              type="submit"
              disabled={!nameInput.trim()}
              className="w-full py-3.5 bg-natural-sage hover:bg-natural-sage-hover disabled:opacity-40 disabled:pointer-events-none text-white font-extrabold rounded-2xl shadow-lg shadow-natural-sage/20 transition-all flex items-center justify-center gap-2 cursor-pointer text-sm"
            >
              <LogIn className="w-4 h-4 font-black" />
              입장하기
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  const getMyWinRate = () => {
    if (!myStats) return 0;
    const total = myStats.wins + myStats.losses + myStats.draws;
    return total > 0 ? Math.round((myStats.wins / total) * 100) : 0;
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 md:py-10 grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 items-start text-natural-text">
      
      {/* Left Column: Actions & User Info */}
      <div className="flex flex-col gap-6">
        
        {/* User Card (Profile & Personal Stats) */}
        <motion.div
          initial={{ opacity: 0, x: -15 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white border border-natural-border rounded-3xl p-5 shadow-md flex flex-col gap-4 relative overflow-hidden"
        >
          {/* Subtle decoration */}
          <div className="absolute right-0 top-0 w-24 h-24 bg-natural-sage/5 rounded-full blur-2xl pointer-events-none" />
          
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 bg-natural-panel rounded-2xl border border-natural-border flex items-center justify-center text-natural-sage shadow-sm">
              <User className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] text-natural-muted uppercase tracking-widest font-bold">WELCOME BACK</span>
              <h2 className="text-lg font-black text-natural-text">{nickname}님</h2>
            </div>
          </div>

          {/* Stats Breakdown */}
          <div className="grid grid-cols-3 gap-3 pt-2">
            <div className="bg-[#FDFBF7] border border-natural-border p-3 rounded-2xl text-center flex flex-col gap-0.5 shadow-sm">
              <span className="text-[10px] text-natural-muted font-bold">승리</span>
              <span className="text-lg font-extrabold text-natural-coral font-mono">
                {myStats ? myStats.wins : 0}
              </span>
            </div>
            <div className="bg-[#FDFBF7] border border-natural-border p-3 rounded-2xl text-center flex flex-col gap-0.5 shadow-sm">
              <span className="text-[10px] text-natural-muted font-bold">패배</span>
              <span className="text-lg font-extrabold text-natural-muted font-mono">
                {myStats ? myStats.losses : 0}
              </span>
            </div>
            <div className="bg-[#FDFBF7] border border-natural-border p-3 rounded-2xl text-center flex flex-col gap-0.5 shadow-sm">
              <span className="text-[10px] text-natural-muted font-bold">승률</span>
              <span className="text-lg font-extrabold text-natural-sage font-mono">
                {getMyWinRate()}%
              </span>
            </div>
          </div>
        </motion.div>

        {/* Create/Join Room Actions Card */}
        <motion.div
          initial={{ opacity: 0, x: -15 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-white border border-natural-border rounded-3xl p-6 shadow-md flex flex-col gap-6"
        >
          {/* Action 1: Create Game Room */}
          <div className="flex flex-col gap-2.5">
            <h3 className="text-sm font-bold text-natural-muted">새로운 대전 생성</h3>
            <button
              id="btn-create-room-lobby"
              onClick={onCreateRoom}
              className="w-full py-4 bg-natural-sage hover:bg-natural-sage-hover text-white font-extrabold rounded-2xl shadow-lg shadow-natural-sage/10 transition-all flex items-center justify-center gap-2 cursor-pointer text-sm"
            >
              <PlusCircle className="w-5 h-5 font-black" />
              오목 대전방 만들기
            </button>
          </div>

          {/* Divider */}
          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-natural-border"></div>
            <span className="flex-shrink mx-4 text-natural-muted text-xs font-mono font-bold">OR</span>
            <div className="flex-grow border-t border-natural-border"></div>
          </div>

          {/* Action 2: Join via Room Code */}
          <form onSubmit={handleJoinSubmit} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="join-code-input" className="text-xs font-bold text-natural-muted">참여 코드로 입장</label>
              <div className="flex gap-2">
                <input
                  id="join-code-input"
                  type="text"
                  placeholder="6자리 방 코드 입력 (예: 123456)"
                  maxLength={6}
                  value={codeInput}
                  onChange={(e) => {
                    setCodeInput(e.target.value.toUpperCase());
                    setJoinError('');
                  }}
                  className="flex-1 bg-natural-bg border border-natural-border focus:border-natural-sage rounded-2xl px-4 py-3 text-sm text-natural-text placeholder-natural-muted outline-none transition-all uppercase tracking-widest font-mono"
                />
                <button
                  id="btn-join-room-lobby"
                  type="submit"
                  disabled={codeInput.length !== 6}
                  className="px-5 bg-natural-panel hover:bg-natural-border border border-natural-border disabled:opacity-40 disabled:pointer-events-none text-natural-text font-extrabold rounded-2xl transition-all flex items-center justify-center gap-1.5 cursor-pointer text-sm"
                >
                  <LogIn className="w-4 h-4" />
                  입장
                </button>
              </div>
              {joinError && <span className="text-[11px] text-natural-coral font-semibold mt-1 px-1">{joinError}</span>}
            </div>
          </form>
        </motion.div>
      </div>

      {/* Right Column: Live Leaderboard (Leaderboard) */}
      <motion.div
        initial={{ opacity: 0, x: 15 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white border border-natural-border rounded-3xl p-5 shadow-md flex flex-col gap-4 h-full"
      >
        <div className="flex items-center justify-between border-b border-natural-border pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-[#E8F0ED] border border-natural-border text-natural-sage rounded-lg">
              <Trophy className="w-4 h-4" />
            </div>
            <h3 className="font-extrabold text-natural-text text-sm">실시간 명예의 전당</h3>
          </div>
          <span className="text-[10px] text-natural-muted font-bold font-mono">TOP 10</span>
        </div>

        {/* Leaderboard List */}
        <div className="flex flex-col gap-2 max-h-[350px] overflow-y-auto pr-1">
          {leaderboard.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-center text-xs text-natural-muted p-4 gap-2">
              <Medal className="w-8 h-8 text-natural-muted" />
              아직 명예의 전당에 등재된 사용자가 없습니다.<br />첫 승리를 쟁취해 보세요!
            </div>
          ) : (
            leaderboard.map((item, index) => {
              const rank = index + 1;
              const isCurrentUser = item.nickname === nickname;
              const total = item.wins + item.losses + item.draws;
              const winRate = total > 0 ? Math.round((item.wins / total) * 100) : 0;

              return (
                <div
                  key={item.nickname}
                  className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
                    isCurrentUser
                      ? 'bg-natural-panel border-natural-sage shadow-[0_0_12px_rgba(141,163,153,0.15)]'
                      : 'bg-natural-bg/50 border-natural-border hover:bg-natural-panel'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {/* Rank Badge */}
                    <div className="w-6 h-6 flex items-center justify-center text-xs font-black font-mono">
                      {rank === 1 ? (
                        <span className="text-natural-coral text-base" title="1등">🥇</span>
                      ) : rank === 2 ? (
                        <span className="text-[#8DA399] text-base" title="2등">🥈</span>
                      ) : rank === 3 ? (
                        <span className="text-[#c47c4c] text-base" title="3등">🥉</span>
                      ) : (
                        <span className="text-natural-muted">{rank}</span>
                      )}
                    </div>
                    <div className="flex flex-col">
                      <span className={`text-sm font-semibold flex items-center gap-1.5 ${
                        isCurrentUser ? 'text-natural-sage font-bold' : 'text-natural-text'
                      }`}>
                        {item.nickname}
                        {isCurrentUser && <span className="text-[9px] bg-natural-sage text-white px-1.5 py-0.2 rounded font-black">나</span>}
                      </span>
                      <span className="text-[10px] text-natural-muted font-mono font-medium">
                        총 {total}게임 • 승률 {winRate}%
                      </span>
                    </div>
                  </div>
                  
                  {/* Wins Count */}
                  <div className="text-right flex flex-col items-end gap-0.5">
                    <span className="text-sm font-extrabold font-mono text-natural-text">{item.wins}승</span>
                    <span className="text-[9px] text-natural-muted font-medium">
                      {item.losses}패 {item.draws > 0 ? `• ${item.draws}무` : ''}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </motion.div>

    </div>
  );
}
