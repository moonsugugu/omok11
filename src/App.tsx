import React, { useState, useEffect, useRef } from 'react';
import { db } from './firebase';
import { Room, Player, Message, UserStat } from './types';
import { checkWin } from './utils';
import {
  doc,
  onSnapshot,
  setDoc,
  getDoc,
  updateDoc,
  increment,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Disc, 
  Volume2, 
  VolumeX, 
  Trophy, 
  Gamepad2, 
  MessageSquare, 
  Users, 
  Info,
  Sparkles
} from 'lucide-react';

// Import our modular components
import Lobby from './components/Lobby';
import GameBoard from './components/GameBoard';
import ChatPanel from './components/ChatPanel';
import RoomControls from './components/RoomControls';

// Play sound audio context helpers locally (safeguarded)
function playLocalPlaceSound(muted: boolean) {
  if (muted) return;
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(350, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.08);
    
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + 0.08);
  } catch (e) {
    // AudioContext blocked
  }
}

function playLocalWinSound(muted: boolean) {
  if (muted) return;
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const now = ctx.currentTime;
    
    const playNote = (freq: number, delay: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + delay);
      gain.gain.setValueAtTime(0.12, now + delay);
      gain.gain.exponentialRampToValueAtTime(0.01, now + delay + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + delay);
      osc.stop(now + delay + duration);
    };

    playNote(523.25, 0, 0.12);     // C5
    playNote(659.25, 0.12, 0.12);   // E5
    playNote(783.99, 0.24, 0.12);   // G5
    playNote(1046.50, 0.36, 0.35);  // C6
  } catch (e) {
    // AudioContext blocked
  }
}

export default function App() {
  // 1. Identify User (Local Name & Session ID)
  const [nickname, setNickname] = useState<string>(() => {
    return localStorage.getItem('omok_nickname') || '';
  });
  const [userId] = useState<string>(() => {
    let id = localStorage.getItem('omok_userid');
    if (!id) {
      id = 'user_' + Math.random().toString(36).substring(2, 10);
      localStorage.setItem('omok_userid', id);
    }
    return id;
  });

  // 2. Navigation / Room states
  const [roomCode, setRoomCode] = useState<string>('');
  const [roomData, setRoomData] = useState<Room | null>(null);
  const [pendingRoomJoin, setPendingRoomJoin] = useState<string | null>(null);
  
  // 3. User Stats displayed in Room
  const [p1Stats, setP1Stats] = useState<UserStat | null>(null);
  const [p2Stats, setP2Stats] = useState<UserStat | null>(null);

  // 4. Client state helpers
  const [muted, setMuted] = useState<boolean>(() => {
    return localStorage.getItem('omok_muted') === 'true';
  });
  
  const hasUpdatedStatsForCurrentGame = useRef<boolean>(false);
  const previousMovesLength = useRef<number>(0);

  // Parse direct room code from URL parameters (e.g. ?room=123456)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('room');
    if (code && code.length === 6) {
      setPendingRoomJoin(code);
    }
  }, []);

  // Sync mute option with localStorage
  const toggleMute = () => {
    setMuted((prev) => {
      localStorage.setItem('omok_muted', (!prev).toString());
      return !prev;
    });
  };

  // Set local nickname and handle pending redirection
  const handleSetNickname = (name: string) => {
    localStorage.setItem('omok_nickname', name);
    setNickname(name);
    
    // If we have a pending room link from URL scan, join it!
    if (pendingRoomJoin) {
      joinRoomByCode(pendingRoomJoin, name);
      setPendingRoomJoin(null);
    }
  };

  // 5. Room Creation Logic
  const createRoom = async () => {
    if (!nickname) return;
    
    // Generate unique 6-digit numeric room code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const roomRef = doc(db, 'rooms', code);

    const initialRoom: Room = {
      code,
      player1: { id: userId, name: nickname, joinedAt: Date.now() },
      player2: null,
      spectators: [],
      currentTurn: 1, // Black starts
      winner: 0,
      winningLine: [],
      moves: [],
      chat: [
        {
          id: 'sys_create',
          sender: '시스템',
          senderId: 'system',
          text: `[${nickname}]님이 대전방을 개설하였습니다.`,
          time: Date.now()
        }
      ],
      rematchRequests: [],
      createdAt: Date.now(),
      lastActive: Date.now()
    };

    try {
      await setDoc(roomRef, initialRoom);
      setRoomCode(code);
      hasUpdatedStatsForCurrentGame.current = false;
      previousMovesLength.current = 0;
      
      // Update share URL in browser address bar cleanly
      window.history.pushState({}, '', `?room=${code}`);
    } catch (err) {
      console.error("Error creating room:", err);
      alert("대전방을 만드는 중 오류가 발생했습니다.");
    }
  };

  // 6. Join Existing Room
  const joinRoomByCode = async (code: string, currentName: string = nickname) => {
    if (!currentName) {
      setPendingRoomJoin(code);
      return;
    }

    const roomRef = doc(db, 'rooms', code);
    try {
      const docSnap = await getDoc(roomRef);
      if (!docSnap.exists()) {
        alert("해당 방이 존재하지 않거나 만료되었습니다.");
        // Clear query parameters
        window.history.pushState({}, '', window.location.origin);
        return;
      }

      const data = docSnap.data() as Room;

      // Check if already in room
      const isP1 = data.player1?.id === userId;
      const isP2 = data.player2?.id === userId;
      const isSpec = data.spectators.some(s => s.id === userId);

      if (isP1 || isP2 || isSpec) {
        setRoomCode(code);
        window.history.pushState({}, '', `?room=${code}`);
        return;
      }

      const me: Player = { id: userId, name: currentName, joinedAt: Date.now() };

      // Join as player 2 or Spectator
      if (!data.player2 && data.player1?.id !== userId) {
        const updatedChat = [
          ...data.chat,
          {
            id: 'sys_join_' + Date.now(),
            sender: '시스템',
            senderId: 'system',
            text: `[${currentName}]님이 백돌(플레이어 2)로 참가하셨습니다!`,
            time: Date.now()
          }
        ];
        await updateDoc(roomRef, {
          player2: me,
          chat: updatedChat,
          lastActive: Date.now()
        });
      } else {
        const updatedChat = [
          ...data.chat,
          {
            id: 'sys_spec_' + Date.now(),
            sender: '시스템',
            senderId: 'system',
            text: `[${currentName}]님이 관전자로 입장하였습니다.`,
            time: Date.now()
          }
        ];
        await updateDoc(roomRef, {
          spectators: arrayUnion(me),
          chat: updatedChat,
          lastActive: Date.now()
        });
      }

      setRoomCode(code);
      hasUpdatedStatsForCurrentGame.current = false;
      previousMovesLength.current = 0;
      window.history.pushState({}, '', `?room=${code}`);
    } catch (err) {
      console.error("Error joining room:", err);
      alert("방 참가 과정에서 에러가 발생하였습니다.");
    }
  };

  // 7. Listen to Active Room changes
  useEffect(() => {
    if (!roomCode) {
      setRoomData(null);
      return;
    }

    const roomRef = doc(db, 'rooms', roomCode);
    const unsubscribe = onSnapshot(roomRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as Room;
        setRoomData(data);

        // Sound effect on new stones placed
        if (data.moves.length > previousMovesLength.current) {
          playLocalPlaceSound(muted);
          previousMovesLength.current = data.moves.length;
        }

        // Sound effect on game ended with victory
        if (data.winner !== 0 && data.winner !== 3 && !hasUpdatedStatsForCurrentGame.current) {
          playLocalWinSound(muted);
        }
      } else {
        alert("이 방은 방장에 의해 삭제되었거나 존재하지 않습니다.");
        handleExitRoom();
      }
    });

    return () => unsubscribe();
  }, [roomCode, muted]);

  // 8. Load Real-time Stats for Active Players in room
  useEffect(() => {
    if (!roomData) {
      setP1Stats(null);
      setP2Stats(null);
      return;
    }

    let unsubP1 = () => {};
    let unsubP2 = () => {};

    if (roomData.player1) {
      const p1Ref = doc(db, 'user_stats', roomData.player1.name);
      unsubP1 = onSnapshot(p1Ref, (snap) => {
        if (snap.exists()) setP1Stats(snap.data() as UserStat);
      });
    }

    if (roomData.player2) {
      const p2Ref = doc(db, 'user_stats', roomData.player2.name);
      unsubP2 = onSnapshot(p2Ref, (snap) => {
        if (snap.exists()) setP2Stats(snap.data() as UserStat);
      });
    }

    return () => {
      unsubP1();
      unsubP2();
    };
  }, [roomData?.player1?.name, roomData?.player2?.name]);

  // 9. Stat Auto-Increment & Real-time Persistence on Game End (Local idempotent)
  useEffect(() => {
    if (!roomData || !roomCode) return;
    if (roomData.winner === 0) {
      // Game is active, reset stats flag
      hasUpdatedStatsForCurrentGame.current = false;
      return;
    }

    // If game ended and stats have NOT been updated by this client yet:
    if (roomData.winner !== 0 && !hasUpdatedStatsForCurrentGame.current) {
      const myRole = getMyRole();
      if (myRole === 1 || myRole === 2) {
        // Player actually participated in the game
        hasUpdatedStatsForCurrentGame.current = true;
        const myName = nickname;
        const isWinner = roomData.winner === myRole;
        const isDraw = roomData.winner === 3;

        const myStatRef = doc(db, 'user_stats', myName);
        
        try {
          if (isDraw) {
            setDoc(myStatRef, {
              nickname: myName,
              draws: increment(1),
              lastPlayed: Date.now()
            }, { merge: true });
          } else if (isWinner) {
            setDoc(myStatRef, {
              nickname: myName,
              wins: increment(1),
              lastPlayed: Date.now()
            }, { merge: true });
          } else {
            setDoc(myStatRef, {
              nickname: myName,
              losses: increment(1),
              lastPlayed: Date.now()
            }, { merge: true });
          }
        } catch (e) {
          console.error("Failed saving statistics to database: ", e);
        }
      }
    }
  }, [roomData?.winner, roomCode]);

  // Calculate my role: 1 = Black, 2 = White, 0 = Spectator
  const getMyRole = (): number => {
    if (!roomData) return 0;
    if (roomData.player1?.id === userId) return 1;
    if (roomData.player2?.id === userId) return 2;
    return 0;
  };

  // 10. Place Stone Logic
  const handlePlaceStone = async (r: number, c: number) => {
    if (!roomData || !roomCode) return;
    const myRole = getMyRole();
    if (myRole === 0 || roomData.currentTurn !== myRole || roomData.winner !== 0) return;
    if (!roomData.player1 || !roomData.player2) {
      alert("상대방이 아직 대전방에 참가하지 않았습니다.");
      return;
    }

    const roomRef = doc(db, 'rooms', roomCode);

    // Reconstruct board matrix to check win condition
    const boardMatrix = Array(15).fill(null).map(() => Array(15).fill(0));
    roomData.moves.forEach((m) => {
      boardMatrix[m.r][m.c] = m.p;
    });

    // Prevent placing on occupied cells
    if (boardMatrix[r][c] !== 0) return;

    // Apply move
    boardMatrix[r][c] = myRole;
    const newMove = { r, c, p: myRole, t: Date.now() };
    const updatedMoves = [...roomData.moves, newMove];

    let newWinner = 0;
    let newWinningLine: [number, number][] = [];
    let updatedChat = [...roomData.chat];

    // Check win condition
    const winLine = checkWin(boardMatrix, r, c, myRole);
    if (winLine) {
      newWinner = myRole;
      newWinningLine = winLine;
      
      const winnerName = myRole === 1 ? roomData.player1.name : roomData.player2.name;
      updatedChat.push({
        id: 'sys_win_' + Date.now(),
        sender: '시스템',
        senderId: 'system',
        text: `🎉 [${winnerName}]님이 오목 대전에서 최종 승리하셨습니다!`,
        time: Date.now()
      });
    } else if (updatedMoves.length === 225) {
      // Board fully occupied - Draw
      newWinner = 3;
      updatedChat.push({
        id: 'sys_draw_' + Date.now(),
        sender: '시스템',
        senderId: 'system',
        text: `🤝 모든 격자판이 가득 찼습니다! 치열한 승부 끝에 무승부입니다.`,
        time: Date.now()
      });
    }

    const nextTurn = myRole === 1 ? 2 : 1;

    try {
      await updateDoc(roomRef, {
        moves: updatedMoves,
        currentTurn: nextTurn,
        winner: newWinner,
        winningLine: newWinningLine,
        chat: updatedChat,
        lastActive: Date.now()
      });
    } catch (err) {
      console.error("Error submitting move:", err);
    }
  };

  // 11. Send Chat Message
  const handleSendMessage = async (text: string) => {
    if (!roomCode || !roomData) return;
    const roomRef = doc(db, 'rooms', roomCode);
    
    const newMsg: Message = {
      id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      sender: nickname,
      senderId: userId,
      text,
      time: Date.now()
    };

    try {
      await updateDoc(roomRef, {
        chat: arrayUnion(newMsg),
        lastActive: Date.now()
      });
    } catch (err) {
      console.error("Error sending message:", err);
    }
  };

  // 12. Actions Dispatcher (Rematch, Resign, Leave)
  const handleRoomAction = async (type: 'rematch' | 'resign' | 'leave') => {
    if (!roomCode || !roomData) return;
    const roomRef = doc(db, 'rooms', roomCode);
    const myRole = getMyRole();

    if (type === 'resign') {
      if (myRole === 0 || roomData.winner !== 0) return;
      const opponentRole = myRole === 1 ? 2 : 1;
      const opponentName = opponentRole === 1 ? roomData.player1?.name : roomData.player2?.name;
      
      const updatedChat = [
        ...roomData.chat,
        {
          id: 'sys_resign_' + Date.now(),
          sender: '시스템',
          senderId: 'system',
          text: `🏳️ [${nickname}]님이 기권하였습니다. [${opponentName}]님의 승리입니다.`,
          time: Date.now()
        }
      ];

      await updateDoc(roomRef, {
        winner: opponentRole,
        chat: updatedChat,
        lastActive: Date.now()
      });

    } else if (type === 'rematch') {
      if (myRole === 0 || roomData.winner === 0) return;
      
      // Add current player to rematchRequests
      const updatedRequests = [...roomData.rematchRequests];
      if (!updatedRequests.includes(userId)) {
        updatedRequests.push(userId);
      }

      // Check if both active players have accepted
      const p1Joined = roomData.player1 !== null;
      const p2Joined = roomData.player2 !== null;
      const bothAccepted = p1Joined && p2Joined && 
                           updatedRequests.includes(roomData.player1!.id) && 
                           updatedRequests.includes(roomData.player2!.id);

      if (bothAccepted) {
        // SWAP player slots so they switch stones for a fair rematch!
        const originalP1 = roomData.player1;
        const originalP2 = roomData.player2;

        const updatedChat = [
          ...roomData.chat,
          {
            id: 'sys_rematch_' + Date.now(),
            sender: '시스템',
            senderId: 'system',
            text: `🔄 새로운 대전이 시작되었습니다! 돌 색상이 서로 바뀌었습니다.`,
            time: Date.now()
          }
        ];

        await updateDoc(roomRef, {
          player1: originalP2, // original P2 gets Black
          player2: originalP1, // original P1 gets White
          moves: [],
          currentTurn: 1, // Black starts
          winner: 0,
          winningLine: [],
          rematchRequests: [],
          chat: updatedChat,
          lastActive: Date.now()
        });

        // Reset local stats tracking trigger
        hasUpdatedStatsForCurrentGame.current = false;
        previousMovesLength.current = 0;
      } else {
        await updateDoc(roomRef, {
          rematchRequests: updatedRequests,
          lastActive: Date.now()
        });
      }

    } else if (type === 'leave') {
      await handleExitRoom();
    }
  };

  const handleExitRoom = async () => {
    if (roomCode && roomData) {
      const roomRef = doc(db, 'rooms', roomCode);
      const myRole = getMyRole();
      
      try {
        if (myRole === 1) {
          // Player 1 leaves
          if (roomData.player2) {
            // Promote Player 2 to Player 1
            const updatedChat = [
              ...roomData.chat,
              {
                id: 'sys_leave_' + Date.now(),
                sender: '시스템',
                senderId: 'system',
                text: `📢 방장 [${nickname}]님이 퇴장하였습니다. [${roomData.player2.name}]님이 방장으로 임명되었습니다.`,
                time: Date.now()
              }
            ];
            await updateDoc(roomRef, {
              player1: roomData.player2,
              player2: null,
              chat: updatedChat,
              lastActive: Date.now()
            });
          } else {
            // No other players, just delete the empty room document
            await updateDoc(roomRef, {
              player1: null,
              lastActive: Date.now()
            });
          }
        } else if (myRole === 2) {
          // Player 2 leaves
          const updatedChat = [
            ...roomData.chat,
            {
              id: 'sys_leave_' + Date.now(),
              sender: '시스템',
              senderId: 'system',
              text: `📢 백돌 [${nickname}]님이 퇴장하였습니다.`,
              time: Date.now()
            }
          ];
          
          // If game was ongoing and no winner yet, give winner to Player 1 (forfeit)
          const fieldsToUpdate: any = {
            player2: null,
            chat: updatedChat,
            lastActive: Date.now()
          };
          if (roomData.winner === 0 && roomData.moves.length > 0) {
            fieldsToUpdate.winner = 1; // P1 wins by default
            updatedChat.push({
              id: 'sys_leave_win_' + Date.now(),
              sender: '시스템',
              senderId: 'system',
              text: `🏁 백돌의 도중 기권으로 흑돌(플레이어 1)이 승리하였습니다.`,
              time: Date.now()
            });
          }

          await updateDoc(roomRef, { ...fieldsToUpdate });
        } else {
          // Spectator leaves
          const spectatorObj = roomData.spectators.find(s => s.id === userId);
          if (spectatorObj) {
            await updateDoc(roomRef, {
              spectators: arrayRemove(spectatorObj),
              lastActive: Date.now()
            });
          }
        }
      } catch (err) {
        console.error("Error cleaning up on exit: ", err);
      }
    }

    setRoomCode('');
    setRoomData(null);
    hasUpdatedStatsForCurrentGame.current = false;
    previousMovesLength.current = 0;
    // Clear url query params
    window.history.pushState({}, '', window.location.origin);
  };

  const handleLogoClick = () => {
    if (roomCode) {
      if (confirm("진행 중인 방에서 나가고 메인 화면으로 돌아가시겠습니까?")) {
        handleExitRoom();
      }
    }
  };

  return (
    <div className="min-h-screen bg-natural-bg text-natural-text flex flex-col font-sans select-none antialiased">
      
      {/* Universal Sticky Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-natural-border py-3 sm:py-4 px-4 sm:px-6 flex items-center justify-between shadow-sm">
        <button 
          id="btn-header-logo"
          onClick={handleLogoClick}
          className="flex items-center gap-2 cursor-pointer focus:outline-none select-none text-left"
        >
          <div className="w-8 h-8 flex items-center justify-center bg-natural-sage rounded-xl shadow-md shadow-natural-sage/10">
            <Disc className="w-5 h-5 text-white fill-white" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-sm sm:text-base font-bold tracking-tight text-natural-text leading-none">실시간 오목 배틀</h1>
            <span className="text-[9px] text-natural-sage tracking-widest font-extrabold uppercase mt-0.5">ONLINE GOMOKU</span>
          </div>
        </button>

        {/* Header Actions */}
        <div className="flex items-center gap-2">
          {/* Mute toggle button */}
          <button
            id="btn-toggle-sound"
            onClick={toggleMute}
            className={`p-2 rounded-xl border transition-all cursor-pointer ${
              muted 
                ? 'bg-natural-panel border-natural-border text-natural-muted' 
                : 'bg-[#E8F0ED] hover:bg-[#D9E6E1] border-natural-border text-natural-sage font-bold'
            }`}
            title={muted ? '소리 켜기' : '소리 끄기'}
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* Quick Stats shortcut */}
          {nickname && (
            <div className="hidden sm:flex items-center gap-1.5 bg-natural-panel border border-natural-border p-1.5 px-3 rounded-xl text-xs font-mono font-semibold">
              <span className="text-natural-muted">USER:</span>
              <span className="text-natural-text">{nickname}</span>
            </div>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col justify-start w-full relative">
        <AnimatePresence mode="wait">
          {!roomCode ? (
            /* Lobby state (includes leaderboards, join, create) */
            <motion.div
              key="lobby-view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="w-full"
            >
              <Lobby
                nickname={nickname}
                myId={userId}
                onSetNickname={handleSetNickname}
                onCreateRoom={createRoom}
                onJoinRoom={joinRoomByCode}
              />
            </motion.div>
          ) : (
            /* Active Game Room View (Bento Grid split) */
            <motion.div
              key="room-view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="w-full max-w-7xl mx-auto px-4 py-4 sm:py-6 grid grid-cols-1 lg:grid-cols-12 gap-5 items-start"
            >
              {roomData ? (
                <>
                  {/* Left Column: Room controls, invitations, list of users (col-span-3) */}
                  <div className="lg:col-span-3 w-full flex flex-col gap-4">
                    <RoomControls
                      roomCode={roomCode}
                      player1={roomData.player1}
                      player2={roomData.player2}
                      spectators={roomData.spectators}
                      winner={roomData.winner}
                      currentTurn={roomData.currentTurn}
                      myRole={getMyRole()}
                      myId={userId}
                      rematchRequests={roomData.rematchRequests}
                      onAction={handleRoomAction}
                      p1Stats={p1Stats}
                      p2Stats={p2Stats}
                    />
                  </div>

                  {/* Center Column: The Omok grid board (col-span-5) */}
                  <div className="lg:col-span-5 w-full flex justify-center">
                    <GameBoard
                      moves={roomData.moves}
                      currentTurn={roomData.currentTurn}
                      myRole={getMyRole()}
                      winner={roomData.winner}
                      winningLine={roomData.winningLine}
                      onPlaceStone={handlePlaceStone}
                      isMyTurn={roomData.currentTurn === getMyRole() && roomData.winner === 0}
                      gameStarted={roomData.player1 !== null && roomData.player2 !== null}
                    />
                  </div>

                  {/* Right Column: Dynamic Live Chat panel (col-span-4) */}
                  <div className="lg:col-span-4 w-full h-full">
                    <ChatPanel
                      chat={roomData.chat}
                      onSendMessage={handleSendMessage}
                      myId={userId}
                    />
                  </div>
                </>
              ) : (
                <div className="col-span-12 h-64 flex flex-col items-center justify-center text-center gap-2">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-natural-sage"></div>
                  <span className="text-xs text-natural-muted">대전방 데이터를 실시간으로 동기화하는 중입니다...</span>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Universal Footer */}
      <footer className="bg-natural-panel border-t border-natural-border py-3 text-center text-[10px] text-natural-muted font-mono">
        &copy; 2026 실시간 오목 배틀 • Powered by Firebase Firestore Realtime Sync
      </footer>
    </div>
  );
}
