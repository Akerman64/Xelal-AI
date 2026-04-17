/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  Paperclip, 
  Smile, 
  Phone, 
  Video, 
  MoreVertical, 
  ArrowLeft,
  Search,
  CheckCheck
} from 'lucide-react';
import { motion } from 'motion/react';
import { MOCK_STUDENTS } from '../constants';
import { generateWhatsAppReply } from '../services/geminiService';

interface ChatMessage {
  id: string;
  text: string;
  sender: 'parent' | 'ia';
  time: string;
}

export default function WhatsAppParent() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: '1', text: "Bonjour, je suis le chatbot Xelal AI de l'école. Comment puis-je vous aider ?", sender: 'ia', time: '10:00' },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      text: input,
      sender: 'parent',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    // AI logic
    const context = MOCK_STUDENTS[0]; // Simulation for child info
    const reply = await generateWhatsAppReply(input, context);

    setTimeout(() => {
      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: reply,
        sender: 'ia',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, aiMsg]);
      setIsTyping(false);
    }, 1000);
  };

  return (
    <div className="h-full flex flex-col bg-[#E5DDD5]">
      {/* WA Header */}
      <header className="bg-[#075E54] text-white px-4 py-3 flex items-center gap-3 shadow-md z-10 shrink-0">
        <ArrowLeft size={24} className="md:hidden" />
        <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center overflow-hidden">
          <div className="w-8 h-8 bg-white/40 rounded-full flex items-center justify-center font-bold text-white">E</div>
        </div>
        <div className="flex-1">
          <h2 className="font-bold text-sm">Xelal AI Bot</h2>
          <p className="text-[10px] opacity-70">en ligne</p>
        </div>
        <div className="flex gap-4 opacity-80">
          <Video size={20} />
          <Phone size={20} />
          <MoreVertical size={20} />
        </div>
      </header>

      {/* Chat Area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-3 wa-container"
      >
        {messages.map((msg) => (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            key={msg.id}
            className={`flex ${msg.sender === 'parent' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`relative max-w-[85%] px-3 py-1.5 rounded-lg shadow-sm ${
              msg.sender === 'parent' ? 'bg-[#DCF8C6] rounded-tr-none' : 'bg-white rounded-tl-none'
            }`}>
              <p className="text-[13px] text-gray-800 leading-relaxed whitespace-pre-wrap">{msg.text}</p>
              <div className="flex items-center justify-end gap-1 mt-1">
                <span className="text-[9px] text-gray-400 font-mono italic uppercase">{msg.time}</span>
                {msg.sender === 'parent' && <CheckCheck size={12} className="text-[#34B7F1]" />}
              </div>
            </div>
          </motion.div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
             <div className="bg-white px-3 py-2 rounded-lg italic text-[11px] text-gray-500 animate-pulse">
               En train d'écrire...
             </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <footer className="p-2 bg-[#F0F2F5] flex items-center gap-2 shrink-0">
        <div className="flex gap-1 text-gray-500 px-1">
          <Smile size={22} className="cursor-pointer hover:text-gray-700" />
          <Paperclip size={22} className="rotate-45 cursor-pointer hover:text-gray-700" />
        </div>
        <div className="flex-1 bg-white rounded-full px-4 py-2 text-sm shadow-inner min-h-[40px] flex items-center">
          <input 
            type="text" 
            placeholder="Écrivez un message..." 
            className="w-full focus:outline-none"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          />
        </div>
        <button 
          onClick={handleSend}
          className="w-11 h-11 bg-[#008069] text-white rounded-full flex items-center justify-center shadow-lg hover:scale-105 transition-all"
        >
          <Send size={20} />
        </button>
      </footer>
    </div>
  );
}
