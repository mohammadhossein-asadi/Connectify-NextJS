import React, { useState, useEffect, useRef } from 'react';
import { User, Message } from '../types';
import { Send, MessageSquare, Search, Sparkles, CheckCheck, Circle, Clock, Check, AlertCircle } from 'lucide-react';

interface MessagesProps {
  currentUser: User;
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  selectedChatUser: User | null;
  setSelectedChatUser: React.Dispatch<React.SetStateAction<User | null>>;
}

export default function Messages({
  currentUser,
  messages,
  setMessages,
  selectedChatUser,
  setSelectedChatUser
}: MessagesProps) {
  const [chatUsers, setChatUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(selectedChatUser);
  const [typedMessage, setTypedMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Sync selected user from prop changes
  useEffect(() => {
    if (selectedChatUser) {
      setSelectedUser(selectedChatUser);
    }
  }, [selectedChatUser]);

  // 1. Fetch available chat users
  useEffect(() => {
    const fetchChatUsers = async () => {
      try {
        const res = await fetch('/api/users/recommendations?userId=' + currentUser.id);
        if (res.ok && res.headers.get("content-type")?.includes("application/json")) {
          const recommended = await res.json();
          // Filter out self just in case, make sure to add Gemini Bot as first option always
          const otherUsers = recommended.filter((u: User) => u.id !== currentUser.id);
          
          // Get Gemini Bot info and push to start
          const botRes = await fetch('/api/users/gemini-bot');
          let botUser: User | null = null;
          if (botRes.ok && botRes.headers.get("content-type")?.includes("application/json")) {
            botUser = await botRes.json();
          } else {
            // Fallback bot object
            botUser = {
              id: 'gemini-bot',
              email: 'bot@openrouter.ai',
              username: 'OpenRouterBot',
              bio: 'Official AI Assistant',
              avatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80',
              cover: '',
              followers: [],
              following: [],
              verified: true,
              bookmarks: [],
              createdAt: '',
            };
          }

          let combined = [botUser, ...otherUsers.filter((u: User) => u.id !== 'gemini-bot')];
          
          if (selectedChatUser) {
            const exists = combined.some(u => u.id === selectedChatUser.id);
            if (!exists) {
              combined = [botUser, selectedChatUser, ...otherUsers.filter((u: User) => u.id !== 'gemini-bot' && u.id !== selectedChatUser.id)];
            }
          }

          setChatUsers(combined);
          
          // Select default chat partner
          if (selectedChatUser) {
            setSelectedUser(selectedChatUser);
          } else if (!selectedUser && combined.length > 0) {
            setSelectedUser(combined[0]);
          }
        }
      } catch (err) {
        console.error('Failed to load chat partners:', err);
      }
    };

    fetchChatUsers();
  }, [currentUser.id, selectedChatUser]);

  // 2. Fetch messages in active conversation and setup live syncing
  const fetchActiveConvo = async () => {
    if (!selectedUser) return;
    try {
      const res = await fetch(`/api/messages?senderId=${currentUser.id}&recipientId=${selectedUser.id}`);
      if (res.ok && res.headers.get("content-type")?.includes("application/json")) {
        const data = await res.json();
        setMessages((prev) => {
          // Compare lengths to see if there is a new message from backend (e.g. Gemini Bot reply)
          const currentFilteredLength = prev.filter(m => 
            (m.senderId === currentUser.id && m.recipientId === selectedUser.id) ||
            (m.senderId === selectedUser.id && m.recipientId === currentUser.id)
          ).length;

          if (data.length > currentFilteredLength && data[data.length - 1].senderId === selectedUser.id) {
            // Turn off typing indicator when a new message arrives from partner
            setIsTyping(false);
          }
          
          // Merge safely with other conversations
          const otherConvos = prev.filter(m => 
            !(m.senderId === currentUser.id && m.recipientId === selectedUser.id) &&
            !(m.senderId === selectedUser.id && m.recipientId === currentUser.id)
          );
          return [...otherConvos, ...data];
        });
      }
    } catch (err) {
      console.error('Failed to sync messages:', err);
    }
  };

  // Poll for live messages every 3 seconds
  useEffect(() => {
    fetchActiveConvo();
    const interval = setInterval(fetchActiveConvo, 3000);
    return () => clearInterval(interval);
  }, [selectedUser]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping, selectedUser]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!typedMessage.trim() || !selectedUser) return;

    const bodyContent = typedMessage;
    setTypedMessage('');

    // Optimistic message update
    const tempId = 'temp-' + Date.now();
    const tempMessage: Message = {
      id: tempId,
      senderId: currentUser.id,
      recipientId: selectedUser.id,
      content: bodyContent,
      read: false,
      createdAt: new Date().toISOString()
    };

    setMessages((prev) => [...prev, tempMessage]);

    // If chat partner is GeminiBot, trigger typing indicator feedback!
    if (selectedUser.id === 'gemini-bot') {
      setTimeout(() => {
        setIsTyping(true);
      }, 500);
    }

    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderId: currentUser.id,
          recipientId: selectedUser.id,
          content: bodyContent,
        }),
      });

      if (res.ok && res.headers.get("content-type")?.includes("application/json")) {
        const realMessage = await res.json();
        // Swap out optimistic message for real message
        setMessages((prev) => prev.map(m => m.id === tempId ? realMessage : m));
      } else if (res.ok) {
        // If ok but not JSON, we keep the optimistic message or do nothing
      } else {
        throw new Error('Message delivery failed');
      }
    } catch (err) {
      console.error(err);
      alert('Message failed to deliver.');
      setMessages((prev) => prev.filter(m => m.id !== tempId));
    }
  };

  // Filter messages for active discussion pane
  const activeConversation = selectedUser
    ? messages.filter(m => 
        (m.senderId === currentUser.id && m.recipientId === selectedUser.id) ||
        (m.senderId === selectedUser.id && m.recipientId === currentUser.id)
      ).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    : [];

  const filteredChatUsers = chatUsers.filter((u) =>
    u.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex h-[75vh] overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
      {/* 1. Left Conversation list Panel */}
      <div className="w-1/3 border-r border-gray-100 dark:border-gray-800 flex flex-col h-full bg-gray-50/50 dark:bg-gray-950/20">
        <div className="p-4 border-b border-gray-100 dark:border-gray-800">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3">Chats</h3>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search chat users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border-0 bg-gray-100/80 pl-9 pr-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
            />
          </div>
        </div>

        {/* Users list items */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredChatUsers.map((user) => {
            const isSelected = selectedUser?.id === user.id;
            const isBot = user.id === 'gemini-bot';

            return (
              <div
                key={user.id}
                onClick={() => {
                  setSelectedUser(user);
                  setSelectedChatUser(user);
                }}
                className={`flex items-center space-x-3 rounded-xl p-3 cursor-pointer transition ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/10'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                }`}
              >
                <div className="relative">
                  <img
                    src={user.avatar}
                    alt={user.username}
                    className="h-10 w-10 rounded-full object-cover border border-gray-100 dark:border-gray-800"
                  />
                  {isBot ? (
                    <span className="absolute -bottom-1 -right-1 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-indigo-600 text-[8px] text-white font-bold ring-2 ring-white dark:ring-gray-950">
                      AI
                    </span>
                  ) : (
                    <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-gray-950" />
                  )}
                </div>

                <div className="flex-1 overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className={`truncate text-xs font-bold ${isSelected ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                      {user.username}
                    </span>
                    {user.verified && (
                      <span className="text-[10px] ml-1 bg-blue-500 text-white rounded-full h-3 w-3 flex items-center justify-center font-bold">
                        ✓
                      </span>
                    )}
                  </div>
                  <p className={`truncate text-[10px] ${isSelected ? 'text-blue-100' : 'text-gray-400'}`}>
                    {isBot ? 'Ask Gemini anything...' : user.bio || 'Available'}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Right Discussion Active Pane */}
      <div className="flex-1 flex flex-col h-full bg-white dark:bg-gray-900">
        {selectedUser ? (
          <>
            {/* Header user detail */}
            <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <img
                  src={selectedUser.avatar}
                  alt={selectedUser.username}
                  className="h-10 w-10 rounded-full object-cover border border-gray-100 dark:border-gray-800"
                />
                <div>
                  <div className="flex items-center space-x-1.5">
                    <h4 className="text-xs font-bold text-gray-900 dark:text-white">{selectedUser.username}</h4>
                    {selectedUser.verified && (
                      <span className="bg-blue-500 text-white rounded-full h-3.5 w-3.5 flex items-center justify-center text-[8px] font-bold">✓</span>
                    )}
                  </div>
                  <p className="text-[10px] text-gray-400 flex items-center">
                    {selectedUser.id === 'gemini-bot' ? (
                      <>
                        <Sparkles className="h-3 w-3 mr-1 text-indigo-500" />
                        <span>Online AI Brain Core</span>
                      </>
                    ) : (
                      <>
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mr-1.5" />
                        <span>Active Now</span>
                      </>
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* Chats messages block */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/20 dark:bg-gray-950/10">
              {activeConversation.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6">
                  <MessageSquare className="h-10 w-10 text-gray-300 dark:text-gray-700 mb-2" />
                  <h5 className="text-xs font-bold text-gray-700 dark:text-gray-300">Start of conversation</h5>
                  <p className="text-[10px] text-gray-400 mt-1 max-w-xs leading-relaxed">
                    All conversations are private, secure, and simulated with complete state persistence.
                  </p>
                </div>
              ) : (
                activeConversation.map((m) => {
                  const isMe = m.senderId === currentUser.id;
                  const messageTime = new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                  return (
                    <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[70%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                        <div
                          className={`rounded-2xl px-3.5 py-2.5 text-xs font-sans leading-relaxed ${
                            isMe
                              ? 'bg-blue-600 text-white rounded-br-none shadow-sm'
                              : 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-white rounded-bl-none border border-gray-100 dark:border-gray-800'
                          }`}
                        >
                          {m.content}
                        </div>
                        <span className="text-[8px] text-gray-400 mt-1 flex items-center space-x-1">
                          <span>{messageTime}</span>
                          {isMe && (
                            m.read ? (
                              <CheckCheck className="h-3 w-3 text-emerald-500 dark:text-emerald-400" title="Read" />
                            ) : (
                              <Check className="h-3 w-3 text-gray-400" title="Sent" />
                            )
                          )}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}

              {/* Typing indicator placeholder */}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="flex flex-col items-start">
                    <div className="rounded-2xl px-3.5 py-2.5 bg-indigo-50/60 text-indigo-900 dark:bg-indigo-950/20 dark:text-indigo-300 text-xs rounded-bl-none flex items-center space-x-1">
                      <Sparkles className="h-3.5 w-3.5 animate-spin mr-1 text-indigo-500" />
                      <span className="font-mono text-[10px]">OpenRouterBot is writing response...</span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Message composer */}
            <form onSubmit={handleSendMessage} className="p-3 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 flex items-center space-x-2">
              <input
                type="text"
                placeholder={selectedUser.id === 'gemini-bot' ? "Ask AI Assistant anything, ask for content tips..." : "Write your private message..."}
                value={typedMessage}
                onChange={(e) => setTypedMessage(e.target.value)}
                className="flex-1 rounded-xl border border-gray-200 bg-gray-50 py-2.5 px-4 text-xs text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500 dark:focus:border-blue-500"
              />
              <button
                type="submit"
                disabled={!typedMessage.trim()}
                className="rounded-xl bg-blue-600 p-2.5 text-white hover:bg-blue-700 transition disabled:opacity-40 disabled:pointer-events-none"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-gray-50/10">
            <MessageSquare className="h-12 w-12 text-gray-300 dark:text-gray-700 mb-2 animate-bounce" />
            <h4 className="text-sm font-bold text-gray-800 dark:text-white">Direct Messaging Channel</h4>
            <p className="text-xs text-gray-400 mt-1 max-w-xs">
              Select any profile partner on the left panel to begin a private messaging thread.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
