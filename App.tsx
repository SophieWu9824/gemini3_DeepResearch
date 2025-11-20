import React, { useState, useCallback, useEffect } from 'react';
import { Message, Sender, ArtifactState, StreamChunk, GroundingSource } from './types';
import { ChatPanel } from './components/ChatPanel';
import { ArtifactPanel } from './components/ArtifactPanel';
import { streamResearch } from './services/geminiService';
import { ARTIFACT_SEPARATOR_START, ARTIFACT_SEPARATOR_END } from './constants';
import { Icons } from './components/Icons';

function App() {
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isArtifactOpen, setIsArtifactOpen] = useState(false); // Desktop default closed until triggered
  const [mobileTab, setMobileTab] = useState<'chat' | 'artifact'>('chat');
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [artifact, setArtifact] = useState<ArtifactState>({
    content: '',
    title: '',
    isVisible: false,
    isStreaming: false
  });

  // Helper to detect title in markdown
  const extractTitle = (md: string) => {
    const match = md.match(/^#\s+(.+)$/m);
    return match ? match[1] : 'Untitled Report';
  };

  const handleSendMessage = useCallback(async () => {
    if (!input.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      text: input,
      sender: Sender.USER,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    // Placeholder for AI response
    const aiMsgId = (Date.now() + 1).toString();
    const aiMsg: Message = {
      id: aiMsgId,
      text: '',
      sender: Sender.AI,
      timestamp: Date.now(),
      isStreaming: true,
      isLoading: true, // Initial loading state
      sources: []
    };
    setMessages(prev => [...prev, aiMsg]);

    let fullResponseBuffer = '';
    let currentArtifactContent = '';
    let isInArtifactMode = false;
    let accumulatedGroundingSources: GroundingSource[] = [];

    try {
      await streamResearch(input, (chunk: StreamChunk) => {
        const { text, groundingChunks } = chunk;
        fullResponseBuffer += text;

        // Process Grounding Sources
        if (groundingChunks) {
           groundingChunks.forEach((gc: any) => {
              if (gc.web?.uri && gc.web?.title) {
                 // Avoid duplicates
                 if (!accumulatedGroundingSources.find(s => s.uri === gc.web.uri)) {
                    accumulatedGroundingSources.push({
                       uri: gc.web.uri,
                       title: gc.web.title
                    });
                 }
              }
           });
        }

        // Protocol Parsing: Split Chat vs Artifact
        // We check the buffer for the separator tokens
        const startIndex = fullResponseBuffer.indexOf(ARTIFACT_SEPARATOR_START);
        const endIndex = fullResponseBuffer.indexOf(ARTIFACT_SEPARATOR_END);

        let chatText = fullResponseBuffer;

        if (startIndex !== -1) {
           // Artifact has started
           isInArtifactMode = true;
           
           // Open the panel once
           if (!isArtifactOpen) {
              setIsArtifactOpen(true);
              setMobileTab('artifact'); // Switch mobile view
           }

           // The chat text is everything BEFORE the start tag
           chatText = fullResponseBuffer.substring(0, startIndex);
           
           // The artifact content is everything AFTER the start tag
           // If there is an end tag, it's up to that. If not, it's until the end of buffer.
           if (endIndex !== -1) {
              currentArtifactContent = fullResponseBuffer.substring(startIndex + ARTIFACT_SEPARATOR_START.length, endIndex);
           } else {
              currentArtifactContent = fullResponseBuffer.substring(startIndex + ARTIFACT_SEPARATOR_START.length);
           }
        }

        // Update UI State
        setMessages(prev => prev.map(msg => {
          if (msg.id === aiMsgId) {
            return { 
              ...msg, 
              text: chatText.trim(), 
              isLoading: false, // First chunk received, stop loading spinner
              sources: [...accumulatedGroundingSources] 
            };
          }
          return msg;
        }));

        if (isInArtifactMode) {
           setArtifact(prev => ({
             ...prev,
             isVisible: true,
             isStreaming: true,
             content: currentArtifactContent,
             title: extractTitle(currentArtifactContent)
           }));
        }
      });
    } catch (error) {
      console.error(error);
      setMessages(prev => prev.map(msg => {
        if (msg.id === aiMsgId) return { ...msg, text: 'Sorry, an error occurred during research.', isLoading: false, isStreaming: false };
        return msg;
      }));
    } finally {
      setIsTyping(false);
      setArtifact(prev => ({ ...prev, isStreaming: false }));
      setMessages(prev => prev.map(msg => {
        if (msg.id === aiMsgId) return { ...msg, isStreaming: false };
        return msg;
      }));
    }
  }, [input, isArtifactOpen]);

  return (
    <div className="flex flex-col h-screen bg-background text-zinc-100 overflow-hidden">
      {/* Mobile Tab Switcher (only visible on small screens) */}
      <div className="sm:hidden flex border-b border-border bg-surface">
        <button 
          onClick={() => setMobileTab('chat')}
          className={`flex-1 p-3 text-sm font-medium ${mobileTab === 'chat' ? 'text-white border-b-2 border-accent' : 'text-zinc-500'}`}
        >
          Chat
        </button>
        <button 
          onClick={() => setMobileTab('artifact')}
          className={`flex-1 p-3 text-sm font-medium ${mobileTab === 'artifact' ? 'text-white border-b-2 border-accent' : 'text-zinc-500'}`}
        >
          Artifact {artifact.isVisible && '•'}
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Left: Chat Panel */}
        <div className={`
          flex-1 h-full transition-all duration-300 ease-in-out
          ${mobileTab === 'chat' ? 'flex' : 'hidden sm:flex'}
          ${isArtifactOpen ? 'sm:w-1/2 lg:w-[45%]' : 'w-full max-w-4xl mx-auto border-x border-border'}
        `}>
          <ChatPanel 
            messages={messages} 
            input={input} 
            isTyping={isTyping} 
            onInputChange={setInput} 
            onSend={handleSendMessage}
            className="w-full h-full"
          />
        </div>

        {/* Right: Artifact Panel */}
        {/* On Mobile: Renders if tab is active. On Desktop: Renders if isArtifactOpen is true */}
        <div className={`
           ${mobileTab === 'artifact' ? 'flex w-full' : 'hidden'} 
           sm:flex sm:static absolute inset-0 z-20
        `}>
           <ArtifactPanel 
             artifact={artifact} 
             isOpen={isArtifactOpen || mobileTab === 'artifact'} 
             toggleOpen={() => {
               setIsArtifactOpen(!isArtifactOpen);
               if(isArtifactOpen) setMobileTab('chat');
             }}
           />
        </div>
        
        {/* Floating Toggle Button for Desktop when Artifact is closed but has content */}
        {!isArtifactOpen && artifact.content && (
          <button
            onClick={() => setIsArtifactOpen(true)}
            className="hidden sm:flex absolute right-6 top-20 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 p-3 rounded-full shadow-xl border border-zinc-700 z-10 transition-transform hover:scale-105"
            title="Open Research Artifact"
          >
            <Icons.FileText className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
}

export default App;
