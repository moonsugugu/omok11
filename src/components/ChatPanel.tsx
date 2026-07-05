import React, { useState, useRef, useEffect } from 'react';
import { Message } from '../types';
import { Send } from 'lucide-react';

interface ChatPanelProps {
  chat: Message[];
  onSendMessage: (text: string) => void;
  myId: string;
}

export default function ChatPanel({ chat, onSendMessage, myId }: ChatPanelProps) {
  const [inputText, setInputText] = useState('');
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // Auto scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chat]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText);
    setInputText('');
  };

  return (
    <div className="flex flex-col h-full min-h-[300px] max-h-[480px] md:max-h-full bg-white border border-natural-border rounded-2xl overflow-hidden shadow-md">
      {/* Header */}
      <div className="p-3 bg-natural-panel border-b border-natural-border px-4 flex items-center justify-between">
        <h3 className="text-sm font-bold text-natural-text">실시간 채팅</h3>
        <span className="text-xs text-natural-muted font-mono">
          {chat.filter((m) => m.senderId !== 'system').length} 메시지
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {chat.length === 0 ? (
          <div className="h-full flex items-center justify-center text-center text-xs text-natural-muted p-4">
            친구와 자유롭게 이야기를 나누어 보세요!
          </div>
        ) : (
          chat.map((msg) => {
            const isSystem = msg.senderId === 'system';
            const isMe = msg.senderId === myId;

            if (isSystem) {
              return (
                <div key={msg.id} className="flex justify-center my-1.5">
                  <div className="bg-natural-panel border border-natural-border text-natural-muted text-[11px] px-3 py-1 rounded-full text-center">
                    📢 {msg.text}
                  </div>
                </div>
              );
            }

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
              >
                <span className="text-[10px] text-natural-muted mb-0.5 px-1 font-medium">
                  {msg.sender}
                </span>
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm shadow-sm ${
                    isMe
                      ? 'bg-natural-sage text-white rounded-tr-none font-semibold'
                      : 'bg-natural-bg text-natural-text rounded-tl-none border border-natural-border'
                  }`}
                  style={{ wordBreak: 'break-all' }}
                >
                  {msg.text}
                </div>
              </div>
            );
          })
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="p-2 bg-natural-panel border-t border-natural-border flex gap-2">
        <input
          id="chat-input-text"
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="메시지를 입력하세요..."
          maxLength={150}
          className="flex-1 bg-white border border-natural-border rounded-xl px-3 py-2 text-sm text-natural-text focus:outline-none focus:border-natural-sage placeholder-natural-muted font-sans"
        />
        <button
          id="btn-send-message"
          type="submit"
          className="p-2.5 bg-natural-sage hover:bg-natural-sage-hover text-white rounded-xl font-bold flex items-center justify-center transition-colors cursor-pointer shadow-md shadow-natural-sage/10"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
