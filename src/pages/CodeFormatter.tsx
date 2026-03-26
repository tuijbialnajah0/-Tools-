import React, { useState, useEffect } from "react";
import { 
  Code, 
  Copy, 
  Check, 
  Trash2, 
  FileCode, 
  Settings, 
  ChevronDown,
  Sparkles,
  Zap,
  Layout,
  Type
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import * as prettier from "prettier/standalone";
import * as babel from "prettier/plugins/babel";
import * as estree from "prettier/plugins/estree";
import * as html from "prettier/plugins/html";
import * as postcss from "prettier/plugins/postcss";

type Language = "javascript" | "typescript" | "json" | "html" | "css";

const LANGUAGES: { id: Language; name: string; icon: any; parser: string; plugins: any[] }[] = [
  { id: "javascript", name: "JavaScript", icon: Code, parser: "babel", plugins: [babel, estree] },
  { id: "typescript", name: "TypeScript", icon: FileCode, parser: "babel-ts", plugins: [babel, estree] },
  { id: "json", name: "JSON", icon: Type, parser: "json", plugins: [babel, estree] },
  { id: "html", name: "HTML", icon: Layout, parser: "html", plugins: [html] },
  { id: "css", name: "CSS", icon: Zap, parser: "css", plugins: [postcss] },
];

export function CodeFormatter() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [language, setLanguage] = useState<Language>("javascript");
  const [tabSize, setTabSize] = useState(2);
  const [useTabs, setUseTabs] = useState(false);
  const [isFormatting, setIsFormatting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatCode = async () => {
    if (!input.trim()) return;
    
    setIsFormatting(true);
    setError(null);
    
    try {
      const selectedLang = LANGUAGES.find(l => l.id === language);
      if (!selectedLang) return;

      const formatted = await prettier.format(input, {
        parser: selectedLang.parser,
        plugins: selectedLang.plugins,
        tabWidth: tabSize,
        useTabs: useTabs,
        semi: true,
        singleQuote: true,
        trailingComma: "es5",
        bracketSpacing: true,
      });
      
      setOutput(formatted);
    } catch (err: any) {
      console.error("Formatting error:", err);
      setError(err.message || "Failed to format code. Please check your syntax.");
    } finally {
      setIsFormatting(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (input.trim()) formatCode();
    }, 500);
    return () => clearTimeout(timer);
  }, [input, language, tabSize, useTabs]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(output || input);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const clearAll = () => {
    setInput("");
    setOutput("");
    setError(null);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 text-white selection:bg-[#d4ff58]/30">
      <div className="max-w-7xl mx-auto w-full space-y-6 flex flex-col flex-1">
        
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#d4ff58]/10 rounded-xl flex items-center justify-center border border-[#d4ff58]/20">
                <Code className="w-5 h-5 text-[#d4ff58]" />
              </div>
              <h1 className="text-2xl font-black tracking-tight">Code <span className="text-[#d4ff58]">Formatter</span></h1>
            </div>
            <p className="text-white/40 text-sm font-medium">Beautify and clean your code instantly.</p>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={clearAll}
              className="px-3 py-2 rounded-lg bg-white/5 hover:bg-red-500/10 text-white/60 hover:text-red-400 transition-all flex items-center gap-2 text-xs font-bold border border-white/5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear
            </button>
            <button 
              onClick={copyToClipboard}
              className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 text-xs font-bold border shadow-lg ${
                copied 
                ? "bg-green-500/10 border-green-500/50 text-green-400" 
                : "bg-[#d4ff58] border-[#d4ff58] text-black hover:scale-105 active:scale-95"
              }`}
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copied!" : "Copy Result"}
            </button>
          </div>
        </header>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3 p-3 bg-white/5 rounded-2xl border border-white/5 backdrop-blur-md overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest px-1">Language</span>
            <div className="flex bg-black/40 p-1 rounded-lg border border-white/5">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.id}
                  onClick={() => setLanguage(lang.id)}
                  className={`px-3 py-1.5 rounded-md text-[10px] font-bold transition-all flex items-center gap-1.5 ${
                    language === lang.id 
                    ? "bg-[#d4ff58] text-black shadow-lg" 
                    : "text-white/40 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <lang.icon className="w-3 h-3" />
                  <span className="hidden sm:inline">{lang.name}</span>
                  <span className="sm:hidden">{lang.id.toUpperCase().slice(0, 2)}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="h-6 w-px bg-white/10 mx-1 hidden sm:block" />

          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Tab</span>
              <select 
                value={tabSize}
                onChange={(e) => setTabSize(parseInt(e.target.value))}
                className="bg-black/40 border border-white/5 rounded-lg px-2 py-1 text-[10px] font-bold focus:ring-1 focus:ring-[#d4ff58] outline-none"
              >
                <option value={2}>2</option>
                <option value={4}>4</option>
                <option value={8}>8</option>
              </select>
            </div>

            <label className="flex items-center gap-2 cursor-pointer group">
              <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest group-hover:text-white/60 transition-colors">Tabs</span>
              <div className="relative w-8 h-4">
                <input 
                  type="checkbox" 
                  checked={useTabs}
                  onChange={(e) => setUseTabs(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-full h-full bg-white/10 rounded-full peer-checked:bg-[#d4ff58] transition-colors" />
                <div className="absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform peer-checked:translate-x-4 peer-checked:bg-black" />
              </div>
            </label>
          </div>

          {isFormatting && (
            <div className="ml-auto flex items-center gap-1.5 text-[#d4ff58] text-[10px] font-bold animate-pulse">
              <Sparkles className="w-3 h-3" />
              Formatting...
            </div>
          )}
        </div>

        {/* Editor Area */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 min-h-0">
          {/* Input */}
          <div className="flex flex-col gap-2 group min-h-[250px] lg:min-h-0">
            <div className="flex items-center justify-between px-2">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 group-focus-within:text-[#d4ff58] transition-colors">Input Code</span>
              <div className="w-1.5 h-1.5 rounded-full bg-white/10 group-focus-within:bg-[#d4ff58] transition-colors" />
            </div>
            <div className="flex-1 relative">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={`Paste your ${language} code here...`}
                className="w-full h-full bg-white/[0.03] border border-white/10 rounded-2xl p-4 font-mono text-xs sm:text-sm outline-none focus:border-[#d4ff58]/30 focus:bg-white/[0.07] transition-all resize-none placeholder:text-white/5"
                spellCheck={false}
              />
            </div>
          </div>

          {/* Output */}
          <div className="flex flex-col gap-2 group min-h-[250px] lg:min-h-0">
            <div className="flex items-center justify-between px-2">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20">Formatted Result</span>
              {error && <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider animate-bounce">Syntax Error!</span>}
            </div>
            <div className="flex-1 relative">
              <div className={`w-full h-full bg-black/40 border rounded-2xl p-4 font-mono text-xs sm:text-sm overflow-auto whitespace-pre transition-all ${error ? 'border-red-500/30' : 'border-white/5'}`}>
                {error ? (
                  <div className="text-red-400/60 italic text-[10px] leading-relaxed">
                    {error}
                  </div>
                ) : (
                  output || <span className="text-white/5 italic">Formatted code will appear here...</span>
                )}
              </div>
              
              <AnimatePresence>
                {output && !error && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    onClick={copyToClipboard}
                    className="absolute bottom-4 right-4 p-3 bg-[#d4ff58] text-black rounded-xl shadow-2xl hover:scale-110 active:scale-95 transition-all"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Footer Info */}
        <footer className="flex items-center justify-center gap-6 py-4 border-t border-white/5">
          <div className="flex items-center gap-2 text-white/10">
            <Zap className="w-3 h-3" />
            <span className="text-[9px] font-bold uppercase tracking-widest">Powered by Prettier</span>
          </div>
          <div className="flex items-center gap-2 text-white/10">
            <Settings className="w-3 h-3" />
            <span className="text-[9px] font-bold uppercase tracking-widest">100% Client Side</span>
          </div>
        </footer>

      </div>
    </div>
  );
}
