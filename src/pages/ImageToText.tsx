import React, { useState, useRef, useCallback } from "react";
import { 
  FileText, 
  Upload, 
  Copy, 
  Check, 
  Trash2, 
  Sparkles, 
  Zap,
  Type,
  Maximize2,
  RefreshCw,
  AlertCircle,
  Settings
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { createWorker } from 'tesseract.js';
import { GoogleGenAI } from "@google/genai";

export function ImageToText() {
  const [image, setImage] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [smartFormat, setSmartFormat] = useState(true);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setImage(url);
      processImage(file);
    }
  };

  const processImage = async (file: File) => {
    setIsProcessing(true);
    setError(null);
    setProgress(0);
    setText("");
    
    try {
      setStatus("Initializing AI Engine...");
      const worker = await createWorker('eng', 1, {
        logger: m => {
          if (m.status === 'recognizing text') {
            setProgress(Math.round(m.progress * 100));
            setStatus(`Analyzing Pixels: ${Math.round(m.progress * 100)}%`);
          }
        }
      });

      setStatus("Extracting Raw Text...");
      const { data: { text: rawText } } = await worker.recognize(file);
      
      if (smartFormat) {
        setStatus("AI Smart Formatting...");
        const formatted = await applySmartFormatting(rawText);
        setText(formatted);
      } else {
        setText(rawText);
      }
      
      await worker.terminate();
      setStatus("Extraction Complete!");
    } catch (err: any) {
      console.error("OCR Error:", err);
      setError("Failed to extract text. Please try a clearer image.");
    } finally {
      setIsProcessing(false);
    }
  };

  const basicFormatting = (rawText: string) => {
    // 1. Remove OCR noise (random pipes, dots at start/end of lines)
    let formatted = rawText.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 1) // Remove single char noise
      .map(line => line.replace(/^[|!.:;]+|[|!.:;]+$/g, '').trim())
      .join('\n');

    // 2. Merge broken lines (lines that don't end with punctuation)
    const lines = formatted.split('\n');
    let merged = "";
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const nextLine = lines[i + 1];
      
      merged += line;
      
      // If line doesn't end with . ! ? and there is a next line, add space instead of newline
      if (line && !/[.!?]$/.test(line) && nextLine && /^[a-z]/.test(nextLine)) {
        merged += " ";
      } else {
        merged += "\n\n";
      }
    }

    // 3. Fix common OCR character swaps
    formatted = merged
      .replace(/\b0\b/g, 'O') // Zero to O in text context (simplified)
      .replace(/\|/g, 'I') // Pipe to I
      .replace(/\s+/g, ' ') // Collapse multiple spaces
      .trim();

    // 4. Sentence Case
    formatted = formatted.replace(/(^\s*|[.!?]\s+)([a-z])/g, (m) => m.toUpperCase());

    return formatted;
  };

  const applySmartFormatting = async (rawText: string) => {
    if (!rawText.trim()) return "";
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `You are an expert at fixing OCR errors and formatting text. 
        Below is raw text extracted from an image. 
        Please fix any spelling errors, correct character swaps (like 'Purcnasea' to 'Purchased', 'gooas' to 'goods', '¥' to '₹' if it looks like currency), 
        and format it into a clean, readable structure. 
        
        IMPORTANT: Do NOT use markdown formatting like bold (**), headers (#), or lists with asterisks (*). 
        Return ONLY plain text with proper spacing and line breaks.
        
        Keep the original meaning and data exactly as it is.
        
        Raw OCR Text:
        ${rawText}`,
      });
      
      let result = response.text || basicFormatting(rawText);
      
      // Post-process to strip any accidental markdown characters
      result = result
        .replace(/[*#]/g, '') // Remove * and #
        .replace(/\n{3,}/g, '\n\n') // Normalize multiple newlines
        .trim();
        
      return result;
    } catch (error) {
      console.error("AI Formatting error:", error);
      return basicFormatting(rawText);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const clearAll = () => {
    setImage(null);
    setText("");
    setError(null);
    setProgress(0);
    setStatus("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 text-white selection:bg-indigo-500/30">
      <div className="max-w-7xl mx-auto w-full space-y-6 flex flex-col flex-1">
        
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center border border-indigo-500/20">
                <FileText className="w-5 h-5 text-indigo-400" />
              </div>
              <h1 className="text-2xl font-black tracking-tight">Image <span className="text-indigo-400">to Text</span></h1>
            </div>
            <p className="text-white/40 text-sm font-medium">Extract text offline, format with AI.</p>
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
              disabled={!text}
              className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 text-xs font-bold border shadow-lg ${
                !text ? "opacity-30 cursor-not-allowed grayscale" :
                copied 
                ? "bg-green-500/10 border-green-500/50 text-green-400" 
                : "bg-indigo-600 border-indigo-500 text-white hover:scale-105 active:scale-95"
              }`}
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copied!" : "Copy Text"}
            </button>
          </div>
        </header>

        {/* Main Interface */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0">
          
          {/* Left: Upload & Preview */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between px-2">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20">Source Image</span>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <span className="text-[10px] font-bold text-white/20 group-hover:text-indigo-400 transition-colors">Smart Format</span>
                  <div className="relative w-8 h-4">
                    <input 
                      type="checkbox" 
                      checked={smartFormat}
                      onChange={(e) => setSmartFormat(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-full h-full bg-white/10 rounded-full peer-checked:bg-indigo-500 transition-colors" />
                    <div className="absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform peer-checked:translate-x-4" />
                  </div>
                </label>
              </div>
            </div>

            <div 
              className={`relative flex-1 min-h-[250px] rounded-3xl border-2 border-dashed transition-all flex flex-col items-center justify-center overflow-hidden group ${
                image ? "border-indigo-500/20 bg-indigo-500/5" : "border-white/10 hover:border-indigo-500/30 bg-white/[0.02]"
              }`}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const file = e.dataTransfer.files?.[0];
                if (file) {
                  setImage(URL.createObjectURL(file));
                  processImage(file);
                }
              }}
            >
              {image ? (
                <>
                  <img src={image} alt="Preview" className="w-full h-full object-contain p-4" />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-md">
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2 bg-white text-black rounded-xl font-bold text-xs flex items-center gap-2 hover:scale-105 transition-transform"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Change Image
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-center space-y-3 p-6">
                  <div className="w-16 h-16 bg-indigo-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                    <Upload className="w-8 h-8 text-indigo-400" />
                  </div>
                  <h3 className="text-lg font-bold">Drop image here</h3>
                  <p className="text-white/30 text-[10px] max-w-[150px] mx-auto">Supports JPG, PNG, WEBP. AI Smart Formatting.</p>
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-xl shadow-indigo-500/20 transition-all"
                  >
                    Select File
                  </button>
                </div>
              )}
            </div>

            {/* Hidden File Input (Always in DOM) */}
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              className="hidden" 
              accept="image/*" 
            />

            {/* Progress Bar */}
            <AnimatePresence>
              {isProcessing && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <RefreshCw className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
                      <span className="text-xs font-bold text-indigo-400">{status}</span>
                    </div>
                    <span className="text-[10px] font-black text-indigo-400/60">{progress}%</span>
                  </div>
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-indigo-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-red-400 text-xs font-medium">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}
          </div>

          {/* Right: Extracted Text */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between px-2">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20">Extracted Text</span>
              <div className="flex items-center gap-2">
                <Zap className="w-3 h-3 text-indigo-400" />
                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">AI Formatted</span>
              </div>
            </div>

            <div className="flex-1 relative group min-h-[250px] lg:min-h-0">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Extracted text will appear here..."
                className={`w-full h-full bg-white/[0.02] border border-white/5 rounded-3xl p-6 font-serif text-base leading-relaxed outline-none focus:border-indigo-500/30 focus:bg-white/[0.04] transition-all resize-none placeholder:text-white/5 ${
                  isProcessing ? "opacity-50 pointer-events-none" : ""
                }`}
                spellCheck={false}
              />
              
              <AnimatePresence>
                {text && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="absolute bottom-4 right-4 flex gap-2"
                  >
                    <button
                      onClick={copyToClipboard}
                      className={`p-3 rounded-xl shadow-2xl transition-all ${
                        copied ? "bg-green-500 text-white" : "bg-indigo-600 text-white hover:scale-110 active:scale-95"
                      }`}
                    >
                      {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-white/5 rounded-xl border border-white/5 flex flex-col items-center gap-1 text-center">
                <Type className="w-3.5 h-3.5 text-white/40" />
                <span className="text-[9px] font-bold text-white/20 uppercase">Words</span>
                <span className="text-sm font-black">{text ? text.trim().split(/\s+/).length : 0}</span>
              </div>
              <div className="p-3 bg-white/5 rounded-xl border border-white/5 flex flex-col items-center gap-1 text-center">
                <Sparkles className="w-3.5 h-3.5 text-white/40" />
                <span className="text-[9px] font-bold text-white/20 uppercase">Chars</span>
                <span className="text-sm font-black">{text.length}</span>
              </div>
              <div className="p-3 bg-white/5 rounded-xl border border-white/5 flex flex-col items-center gap-1 text-center">
                <Maximize2 className="w-3.5 h-3.5 text-white/40" />
                <span className="text-[9px] font-bold text-white/20 uppercase">Lines</span>
                <span className="text-sm font-black">{text ? text.split(/[.!?]+/).filter(Boolean).length : 0}</span>
              </div>
            </div>
          </div>

        </div>

        {/* Footer Info */}
        <footer className="flex items-center justify-center gap-6 py-4 border-t border-white/5">
          <div className="flex items-center gap-2 text-white/10">
            <Zap className="w-3 h-3" />
            <span className="text-[9px] font-bold uppercase tracking-widest">Tesseract.js Engine</span>
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
