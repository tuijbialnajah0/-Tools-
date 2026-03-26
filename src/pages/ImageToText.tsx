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
  Settings,
  FileCode,
  FileJson,
  File as FileIcon,
  Loader2,
  X
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { createWorker } from 'tesseract.js';
import { GoogleGenAI } from "@google/genai";
import * as pdfjs from 'pdfjs-dist';
import mammoth from 'mammoth';

// Set PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

export function DocumentToText() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [smartFormat, setSmartFormat] = useState(true);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      processFile(selectedFile);
    }
  };

  const processFile = (selectedFile: File) => {
    setFile(selectedFile);
    setText("");
    setError(null);
    setProgress(0);
    setStatus("");

    if (selectedFile.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result as string);
      reader.readAsDataURL(selectedFile);
    } else {
      setPreview(null);
    }
  };

  const extractText = async () => {
    if (!file) return;
    setIsProcessing(true);
    setError(null);
    setProgress(0);
    setStatus("Initializing...");

    try {
      let extractedText = "";

      if (file.type.startsWith('image/')) {
        setStatus("Running OCR Engine...");
        const worker = await createWorker('eng', 1, {
          logger: m => {
            if (m.status === 'recognizing text') {
              setProgress(Math.round(m.progress * 100));
              setStatus(`Analyzing Pixels: ${Math.round(m.progress * 100)}%`);
            }
          }
        });
        const { data: { text: rawText } } = await worker.recognize(file);
        extractedText = rawText;
        await worker.terminate();
      } 
      else if (file.type === 'application/pdf') {
        setStatus("Reading PDF Structure...");
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
        let fullText = "";
        for (let i = 1; i <= pdf.numPages; i++) {
          setProgress(Math.round((i / pdf.numPages) * 100));
          setStatus(`Extracting Page ${i}/${pdf.numPages}...`);
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          const strings = content.items.map((item: any) => item.str);
          fullText += strings.join(" ") + "\n";
        }
        extractedText = fullText;
      }
      else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        setStatus("Converting Word Doc...");
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        extractedText = result.value;
        setProgress(100);
      }
      else if (file.type === 'text/html') {
        setStatus("Parsing HTML Content...");
        const rawHtml = await file.text();
        const doc = new DOMParser().parseFromString(rawHtml, 'text/html');
        extractedText = doc.body.innerText || doc.documentElement.innerText;
        setProgress(100);
      }
      else {
        setStatus("Reading Text File...");
        extractedText = await file.text();
        setProgress(100);
      }

      if (smartFormat) {
        setStatus("Optimizing Layout...");
        const formatted = offlineSmartFormat(extractedText);
        setText(formatted);
      } else {
        setText(extractedText);
      }

      setStatus("Extraction Complete!");
    } catch (err: any) {
      console.error("Extraction Error:", err);
      setError("Failed to process document. Please try another file.");
    } finally {
      setIsProcessing(false);
    }
  };

  // The "AI-Feel" Offline Formatting Algorithm
  const offlineSmartFormat = (raw: string) => {
    if (!raw.trim()) return "";

    // 1. Basic cleaning
    let text = raw
      .replace(/\r\n/g, '\n')
      .replace(/[ \t]+/g, ' ') // Collapse horizontal whitespace
      .replace(/\n{3,}/g, '\n\n'); // Max 2 newlines

    // 2. OCR/PDF Artifact Removal
    text = text
      .replace(/^[|!.:;]+|[|!.:;]+$/gm, '') // Remove start/end noise
      .replace(/(\w)-\n(\w)/g, '$1$2') // Fix hyphenated words at line breaks
      .replace(/(\w)\n(\w)/g, (match, p1, p2) => {
        // If it's a lowercase letter followed by a lowercase, it's likely a broken line
        if (p1 === p1.toLowerCase() && p2 === p2.toLowerCase()) return `${p1} ${p2}`;
        return match;
      });

    // 3. Smart Paragraphing & Header Detection
    const lines = text.split('\n');
    const processedLines = lines.map(line => {
      const trimmed = line.trim();
      if (!trimmed) return "";

      // Header detection: Short lines, all caps, or ending without punctuation
      if (trimmed.length < 60 && (trimmed === trimmed.toUpperCase() || !/[.!?]$/.test(trimmed))) {
        return `\n[ ${trimmed} ]\n`;
      }

      // List detection: Starts with bullet-like chars
      if (/^[-•*]\s/.test(trimmed)) {
        return `  • ${trimmed.substring(2)}`;
      }

      return trimmed;
    });

    // 4. Reconstruct and fix casing
    let final = processedLines.join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    // Sentence Case Fixer
    final = final.replace(/(^\s*|[.!?]\s+)([a-z])/g, (m) => m.toUpperCase());

    return final;
  };

  const applyGeminiFormat = async () => {
    if (!text.trim()) return;
    setIsProcessing(true);
    setStatus("AI Smart Formatting...");
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `You are an expert at fixing OCR errors and formatting text. 
        Below is text extracted from a document. 
        Please fix any spelling errors, correct character swaps, 
        and format it into a clean, readable structure. 
        
        IMPORTANT: Do NOT use markdown formatting like bold (**), headers (#), or lists with asterisks (*). 
        Return ONLY plain text with proper spacing and line breaks.
        
        Keep the original meaning and data exactly as it is.
        
        Text:
        ${text}`,
      });
      
      let result = response.text || text;
      result = result.replace(/[*#]/g, '').replace(/\n{3,}/g, '\n\n').trim();
      setText(result);
      setStatus("AI Formatting Complete!");
    } catch (error) {
      console.error("AI Formatting error:", error);
      setError("AI Formatting failed. Using offline version.");
    } finally {
      setIsProcessing(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const clearAll = () => {
    setFile(null);
    setPreview(null);
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
              <h1 className="text-2xl font-black tracking-tight">Document <span className="text-indigo-400">to Text</span></h1>
            </div>
            <p className="text-white/40 text-sm font-medium">Extract text from PDF, Images, Word & HTML.</p>
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
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20">Source Document</span>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <span className="text-[10px] font-bold text-white/20 group-hover:text-indigo-400 transition-colors">Offline Smart Format</span>
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
                file ? "border-indigo-500/20 bg-indigo-500/5" : "border-white/10 hover:border-indigo-500/30 bg-white/[0.02]"
              }`}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const droppedFile = e.dataTransfer.files?.[0];
                if (droppedFile) {
                  processFile(droppedFile);
                }
              }}
            >
              {file ? (
                <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center">
                  {preview ? (
                    <img src={preview} alt="Preview" className="max-h-[200px] object-contain rounded-xl shadow-2xl mb-4" />
                  ) : (
                    <div className="w-20 h-20 bg-white/5 rounded-2xl flex items-center justify-center mb-4">
                      <FileIcon className="w-10 h-10 text-indigo-400" />
                    </div>
                  )}
                  <h3 className="text-sm font-bold truncate max-w-[200px]">{file.name}</h3>
                  <p className="text-[10px] text-white/40 uppercase tracking-widest mt-1">{(file.size / 1024).toFixed(1)} KB</p>
                  
                  <div className="mt-6 flex flex-col gap-2 w-full max-w-[200px]">
                    <button 
                      onClick={extractText}
                      disabled={isProcessing}
                      className="w-full py-3 bg-white text-black rounded-xl font-black text-xs shadow-xl hover:bg-indigo-50 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                      {isProcessing ? "Processing..." : "Extract Text"}
                    </button>
                    <button 
                      onClick={clearAll}
                      className="w-full py-2 bg-white/5 text-white/40 hover:text-red-400 rounded-lg text-[10px] font-bold transition-all"
                    >
                      Remove File
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center space-y-3 p-6">
                  <div className="w-16 h-16 bg-indigo-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                    <Upload className="w-8 h-8 text-indigo-400" />
                  </div>
                  <h3 className="text-lg font-bold">Drop document here</h3>
                  <p className="text-white/30 text-[10px] max-w-[200px] mx-auto">PDF, DOCX, JPG, PNG, HTML, TXT. Offline Extraction.</p>
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-xl shadow-indigo-500/20 transition-all"
                  >
                    Select File
                  </button>
                </div>
              )}
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                className="hidden" 
                accept=".pdf,.docx,.jpg,.jpeg,.png,.html,.txt" 
              />
            </div>

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
                <div className="flex items-center gap-3">
                  <button 
                    onClick={applyGeminiFormat}
                    disabled={isProcessing || !text}
                    className="flex items-center gap-2 px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 rounded-lg text-[10px] font-bold transition-all border border-indigo-500/20 disabled:opacity-50"
                  >
                    <Sparkles className="w-3 h-3" />
                    AI Refine
                  </button>
                  <div className="flex items-center gap-2">
                    <Zap className="w-3 h-3 text-indigo-400" />
                    <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Smart Formatted</span>
                  </div>
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
            <span className="text-[9px] font-bold uppercase tracking-widest">Multi-Engine Extraction</span>
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
