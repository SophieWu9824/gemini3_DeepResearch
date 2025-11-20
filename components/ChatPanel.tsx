import React, { useEffect, useRef } from 'react';
import { Message, Sender, GroundingSource } from '../types';
import { Icons } from './Icons';
import { motion, AnimatePresence } from 'framer-motion';
import MarkdownRenderer from './MarkdownRenderer';

interface ChatPanelProps {
  messages: Message[];
  input: string;
  isTyping: boolean;
  onInputChange: (val: string) => void;
  onSend: () => void;
  className?: string;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
  messages,
  input,
  isTyping,
  onInputChange,
  onSend,
  className,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  // Adjust textarea height
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = inputRef.current.scrollHeight + 'px';
    }
  }, [input]);

  return (
    <div className={`flex flex-col h-full bg-background relative ${className}`}>
      {/* Header */}
      <div className="h-16 border-b border-border flex items-center px-6 bg-background/80 backdrop-blur-md z-10 sticky top-0">
        <div className="flex items-center gap-2 text-zinc-100">
          <div className="p-2 bg-zinc-800 rounded-lg">
            <Icons.Sparkles className="w-5 h-5 text-accent" />
          </div>
          <span className="font-semibold text-lg tracking-tight">DeepRes</span>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-zinc-500 space-y-4 opacity-50">
            <Icons.Search className="w-12 h-12" />
            <p>Start a deep research session...</p>
          </div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-4 ${msg.sender === Sender.USER ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {/* Avatar */}
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                msg.sender === Sender.AI ? 'bg-indigo-900/50 text-indigo-200' : 'bg-zinc-800 text-zinc-300'
              }`}>
                {msg.sender === Sender.AI ? <Icons.Bot size={16} /> : <Icons.User size={16} />}
              </div>

              {/* Content */}
              <div className={`flex flex-col max-w-[85%] sm:max-w-[75%]`}>
                <div className={`p-4 rounded-2xl text-sm leading-relaxed ${
                  msg.sender === Sender.USER 
                    ? 'bg-zinc-800 text-zinc-100 rounded-tr-none' 
                    : 'text-zinc-300 bg-transparent px-0 py-2'
                }`}>
                  {msg.sender === Sender.AI ? (
                    <div className="space-y-2">
                      <MarkdownRenderer content={msg.text} />
                      {msg.isLoading && (
                         <div className="flex items-center gap-2 text-xs text-zinc-500 animate-pulse mt-2">
                            <Icons.Search className="w-3 h-3" />
                            <span>Researching & Generating Artifact...</span>
                         </div>
                      )}
                    </div>
                  ) : (
                    msg.text
                  )}
                </div>

                {/* Sources (Footnotes) */}
                {msg.sources && msg.sources.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {msg.sources.map((src, idx) => (
                      <a 
                        key={idx}
                        href={src.uri}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 text-xs bg-zinc-900 border border-zinc-800 px-2 py-1 rounded-md text-zinc-500 hover:text-accent hover:border-accent transition-colors truncate max-w-[200px]"
                      >
                        <Icons.ExternalLink className="w-3 h-3" />
                        <span className="truncate">{src.title}</span>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 sm:p-6 bg-background z-10 sticky bottom-0">
        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-zinc-800 to-zinc-700 rounded-xl opacity-30 group-hover:opacity-50 transition duration-500 blur"></div>
          <div className="relative flex items-end gap-2 bg-surface rounded-xl border border-border p-2 shadow-2xl">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => onInputChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a deep research question..."
              className="flex-1 bg-transparent border-none focus:ring-0 text-sm text-zinc-100 placeholder-zinc-500 resize-none max-h-32 py-3 px-2 scrollbar-hide"
              rows={1}
              disabled={isTyping}
            />
            <button
              onClick={onSend}
              disabled={!input.trim() || isTyping}
              className={`p-3 rounded-lg transition-all duration-200 ${
                !input.trim() || isTyping 
                  ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed' 
                  : 'bg-zinc-100 text-zinc-900 hover:bg-white shadow-lg hover:shadow-zinc-500/20'
              }`}
            >
              {isTyping ? <Icons.Loader className="w-4 h-4 animate-spin" /> : <Icons.Send className="w-4 h-4" />}
            </button>
          </div>
        </div>
        <p className="text-center text-[10px] text-zinc-600 mt-3">
          AI can make mistakes. Review generated artifacts.
        </p>
      </div>
    </div>
  );
};
