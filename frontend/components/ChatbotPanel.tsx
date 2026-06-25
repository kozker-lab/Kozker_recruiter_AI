"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChatMessage } from "../types";
import { apiRequest } from "../lib/api";
import { Sparkles, Send, X, ChevronRight, MessageSquare, Bot, User } from "lucide-react";

interface ChatbotPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onOpen: () => void;
  currentPage: string;
}

export default function ChatbotPanel({ isOpen, onClose, onOpen, currentPage }: ChatbotPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: "Hi! I'm your Kozker Recruiter AI assistant. Ask me questions about active jobs, candidate ranks, or pipelines. Try clicking a suggestion below!"
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const suggestions = [
    "Check active jobs summary",
    "Who is the top candidate?",
    "Show interview pipeline stages"
  ];

  const [pageContext, setPageContext] = useState<any>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    const handleContextUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      setPageContext(customEvent.detail);
    };
    window.addEventListener("copilot-context-update", handleContextUpdate);
    return () => {
      window.removeEventListener("copilot-context-update", handleContextUpdate);
    };
  }, []);

  useEffect(() => {
    // Clear context on page navigation so we don't send stale data
    setPageContext(null);
  }, [currentPage]);

  const handleSend = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: ChatMessage = { role: "user", content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const reply = await apiRequest<{ role: "assistant"; content: string }>(
        "POST",
        "/chatbot/message",
        { 
          message: text, 
          current_page: currentPage,
          context: pageContext
        }
      );
      setMessages(prev => [...prev, reply]);
    } catch (err) {
      setMessages(prev => [
        ...prev,
        { role: "assistant", content: "Error: Failed to connect to Recruiter AI service." }
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={onOpen}
        className="fixed right-6 bottom-6 p-4 bg-primary text-neutral-white shadow-lg border border-primary/20 hover:bg-primary/95 transition-all rounded-sm cursor-pointer z-50 flex items-center gap-2"
        title="Open AI Assistant"
      >
        <Sparkles className="w-5 h-5 animate-pulse" />
        <span className="font-tight text-xs font-semibold uppercase tracking-wider">AI Copilot</span>
      </button>
    );
  }

  return (
    <div className="w-80 border-l border-neutral-200 bg-neutral-white flex flex-col h-full font-sans transition-all z-40 select-none">
      {/* Header */}
      <div className="p-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-50">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="font-tight font-bold text-xs uppercase tracking-wider text-neutral-800">Kozker AI Assistant</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-neutral-200 rounded-sm text-neutral-500 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Message Feed */}
      <div ref={scrollRef} className="flex-1 p-4 overflow-y-auto space-y-4 text-xs scrollbar-thin">
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`flex items-start gap-2.5 max-w-[85%] ${m.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
              }`}
          >
            <div
              className={`p-1.5 rounded-sm flex items-center justify-center ${m.role === "user" ? "bg-primary text-neutral-white" : "bg-neutral-100 text-neutral-600"
                }`}
            >
              {m.role === "user" ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5 text-primary" />}
            </div>
            <div
              className={`p-2.5 rounded-sm border leading-relaxed ${m.role === "user"
                  ? "bg-neutral-900 border-neutral-800 text-neutral-white"
                  : "bg-neutral-50 border-neutral-200 text-neutral-700"
                }`}
            >
              {m.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 text-neutral-400">
            <span className="w-2 h-2 bg-primary rounded-full animate-bounce"></span>
            <span className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:0.2s]"></span>
            <span className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:0.4s]"></span>
          </div>
        )}
      </div>

      {/* Suggestion Prompts */}
      <div className="p-3 border-t border-neutral-100 space-y-1.5">
        <span className="text-[10px] uppercase tracking-wider text-neutral-400 font-semibold block">Suggested Questions</span>
        <div className="flex flex-wrap gap-1.5">
          {suggestions.map((s, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(s)}
              className="text-[10px] text-left px-2 py-1 bg-neutral-50 border border-neutral-200 hover:border-primary/45 rounded-sm text-neutral-600 hover:text-primary transition-all cursor-pointer truncate max-w-full block"
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Input Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend(input);
        }}
        className="p-3 border-t border-neutral-200 bg-neutral-50 flex gap-2"
      >
        <input
          type="text"
          placeholder="Ask about active pipelines..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 px-2.5 py-1.5 bg-neutral-white border border-neutral-200 rounded-sm text-xs focus:ring-1 focus:ring-primary"
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="p-1.5 bg-primary disabled:opacity-50 text-neutral-white hover:bg-primary/95 transition-colors rounded-sm cursor-pointer flex items-center justify-center"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
}
