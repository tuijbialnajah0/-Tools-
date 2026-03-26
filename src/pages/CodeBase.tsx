import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Code2, 
  Send, 
  Play, 
  Download, 
  ChevronLeft, 
  Sparkles, 
  RefreshCw, 
  Trash2,
  Terminal,
  Eye,
  Maximize2,
  Minimize2,
  Settings,
  MessageSquare,
  FileCode
} from "lucide-react";
import { Link } from "react-router-dom";
import Editor from "@monaco-editor/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { getGenAI } from "../services/geminiService";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";

interface Message {
  role: "user" | "model";
  content: string;
}

export function CodeBase() {
  const [messages, setMessages] = useState<Message[]>([
    { role: "model", content: "Hello! I am your advanced Code Base assistant. I can help you build full web pages, components, or scripts step-by-step. What would you like to build today?" }
  ]);
  const [input, setInput] = useState("");
  const [code, setCode] = useState("<!-- Your code will appear here -->\n<!DOCTYPE html>\n<html>\n<head>\n<style>\n  body { font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #f0f2f5; }\n  .card { background: white; padding: 2rem; border-radius: 1rem; shadow: 0 4px 6px rgba(0,0,0,0.1); }\n</style>\n</head>\n<body>\n  <div class='card'>\n    <h1>Welcome to Code Base</h1>\n    <p>Start chatting to generate code!</p>\n  </div>\n</body>\n</html>");
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<"chat" | "editor" | "preview">("chat");
  const [error, setError] = useState<string | null>(null);
  const [hasApiKey, setHasApiKey] = useState(false);

  useEffect(() => {
    const checkKey = async () => {
      if (window.aistudio?.hasSelectedApiKey) {
        const selected = await window.aistudio.hasSelectedApiKey();
        setHasApiKey(selected);
      }
    };
    checkKey();
  }, []);

  const handleSelectKey = async () => {
    if (window.aistudio?.openSelectKey) {
      await window.aistudio.openSelectKey();
      setHasApiKey(true);
      setError(null);
    }
  };
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeTab === "chat") {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, activeTab]);

  const handleSend = async () => {
    if (!input.trim() || isProcessing) return;

    const userMessage = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setIsProcessing(true);
    setError(null);
    setActiveTab("chat"); // Switch to chat to see the response

    try {
      const ai = getGenAI();

      const systemInstruction = `You are an expert full-stack developer and UI/UX designer. 
      Your goal is to help the user build web applications step-by-step.
      
      RULES:
      1. Provide code in Markdown code blocks. 
      2. If you are generating a full HTML/CSS/JS page, provide it in a single block if possible, or update the existing structure.
      3. After generating a chunk of code or a feature, ALWAYS ask the user for the next step or if they want any modifications.
      4. Do not generate everything at once unless requested. Work iteratively.
      5. Focus on clean, modern, and responsive design.
      6. If you use external libraries (like Tailwind via CDN), include them in the <head>.
      
      Current Code State:
      ${code}`;

      const chat = ai.chats.create({
        model: "gemini-3-flash-preview",
        config: {
          systemInstruction,
        }
      });

      // Fallback logic
      let response;
      try {
        response = await chat.sendMessage({ message: userMessage });
      } catch (err: any) {
        console.warn("Gemini 3 Flash failed, trying fallback...", err);
        const fallbackChat = ai.chats.create({
          model: "gemini-3.1-flash-lite-preview",
          config: { systemInstruction }
        });
        response = await fallbackChat.sendMessage({ message: userMessage });
      }

      const text = response.text;
      
      // Extract code from response
      const codeRegex = /```(?:html|css|javascript|js|xml)?\n([\s\S]*?)```/g;
      const codeBlocks: string[] = [];
      let match;
      while ((match = codeRegex.exec(text)) !== null) {
        codeBlocks.push(match[1].trim());
      }

      if (codeBlocks.length > 0) {
        // Take the last one as the primary code update
        setCode(codeBlocks[codeBlocks.length - 1]);
      }

      // Strip code blocks from the message content for display
      const displayContent = text.replace(/```(?:html|css|javascript|js|xml)?\n[\s\S]*?```/g, "").trim();
      const finalContent = displayContent || "I've updated the code for you. You can see it in the Code tab or check the Preview.";

      setMessages(prev => [...prev, { role: "model", content: finalContent }]);

    } catch (err: any) {
      console.error("CodeBase Error:", err);
      const errMsg = err.message || "";
      const isQuotaError = errMsg.includes('429') || errMsg.toLowerCase().includes('quota') || errMsg.toLowerCase().includes('resource_exhausted');
      const isPermissionError = errMsg.includes('403') || errMsg.toLowerCase().includes('permission') || errMsg.toLowerCase().includes('permission_denied');

      if (isQuotaError || isPermissionError) {
        setError("Quota exceeded for free models. Please select your own API key to continue using high-quality generation.");
      } else {
        setError(err.message || "Something went wrong. Please try again.");
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([code], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "codebase-project.html";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-slate-50 dark:bg-slate-950 overflow-hidden">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-4">
          
          <div className="flex items-center space-x-2">
            <div className="p-1.5 bg-indigo-600 rounded-lg">
              <Code2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">Code Base</h1>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">Iterative AI Developer</p>
            </div>
          </div>
        </div>

        <button 
          onClick={handleDownload}
          className="flex items-center space-x-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold transition-colors"
        >
          <Download className="w-4 h-4" />
          <span>Export</span>
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait">
          {activeTab === "chat" && (
            <motion.div 
              key="chat"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1 flex flex-col min-h-0 bg-white dark:bg-slate-900"
            >
              <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar pb-40">
                {messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[90%] rounded-2xl p-3 text-sm ${
                      msg.role === "user" 
                        ? "bg-indigo-600 text-white rounded-tr-none" 
                        : "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-none border border-slate-200 dark:border-slate-700"
                    }`}>
                      <div className="prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed prose-pre:bg-slate-950 prose-pre:border prose-pre:border-slate-800">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                    </div>
                  </div>
                ))}
                {isProcessing && (
                  <div className="flex justify-start">
                    <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl rounded-tl-none p-4 flex items-center space-x-3 border border-slate-200 dark:border-slate-700">
                      <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />
                      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">AI is thinking...</span>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
            </motion.div>
          )}

          {activeTab === "editor" && (
            <motion.div 
              key="editor"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="h-full bg-slate-950 pb-40"
            >
              <Editor
                height="100%"
                defaultLanguage="html"
                theme="vs-dark"
                value={code}
                onChange={(val) => setCode(val || "")}
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  wordWrap: "on",
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  padding: { top: 20, bottom: 20 }
                }}
              />
            </motion.div>
          )}

          {activeTab === "preview" && (
            <motion.div 
              key="preview"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="h-full bg-white pb-40"
            >
              <iframe
                srcDoc={code}
                title="Preview"
                className="w-full h-full border-none bg-white"
                sandbox="allow-scripts allow-modals"
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bottom Controls (Fixed at bottom of content area) */}
        <div className="absolute bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 p-4 space-y-3 shadow-[0_-10px_20px_rgba(0,0,0,0.05)]">
          {/* Horizontal Message Bar */}
          <div className="max-w-4xl mx-auto relative flex items-center space-x-2">
            <div className="flex-1 relative">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Ask to build or modify something..."
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 pr-12 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none dark:text-white"
                rows={1}
              />
              <button 
                onClick={handleSend}
                disabled={!input.trim() || isProcessing}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-indigo-600 dark:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg disabled:opacity-50 transition-all"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Toggle Bar below Message Bar */}
          <div className="flex justify-center items-center space-x-1 max-w-4xl mx-auto">
            <button 
              onClick={() => setActiveTab("chat")}
              className={`flex-1 flex items-center justify-center space-x-2 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === "chat" ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/30" : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"}`}
            >
              <MessageSquare className="w-4 h-4" />
              <span>Chat</span>
            </button>
            <button 
              onClick={() => setActiveTab("editor")}
              className={`flex-1 flex items-center justify-center space-x-2 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === "editor" ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/30" : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"}`}
            >
              <FileCode className="w-4 h-4" />
              <span>Code</span>
            </button>
            <button 
              onClick={() => setActiveTab("preview")}
              className={`flex-1 flex items-center justify-center space-x-2 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === "preview" ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/30" : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"}`}
            >
              <Eye className="w-4 h-4" />
              <span>Preview</span>
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 bg-red-600 text-white px-4 py-2 rounded-2xl text-xs font-bold shadow-xl flex flex-col items-center space-y-2 z-50 min-w-[300px]">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
            <button onClick={() => setError(null)} className="ml-2 hover:opacity-70">
              <RefreshCw className="w-3 h-3" />
            </button>
          </div>
          {error.includes('Quota exceeded') && (
            <button
              onClick={handleSelectKey}
              className="w-full py-2 px-4 bg-white text-red-600 font-bold rounded-xl hover:bg-slate-100 transition-all text-[10px]"
            >
              Select API Key (Paid)
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function Loader2({ className }: { className?: string }) {
  return (
    <svg 
      className={className} 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

function AlertCircle({ className }: { className?: string }) {
  return (
    <svg 
      className={className} 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" x2="12" y1="8" y2="12" />
      <line x1="12" x2="12.01" y1="16" y2="16" />
    </svg>
  );
}
