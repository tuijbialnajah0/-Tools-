import React, { useState, useRef } from "react";
import { 
  FileText, 
  Upload, 
  Copy, 
  Check, 
  Trash2, 
  Sparkles, 
  ArrowLeft,
  Loader2,
  FileCode,
  Globe,
  Zap
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.mjs?url";

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export function DocumentToText() {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [extractedText, setExtractedText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [formatMode, setFormatMode] = useState<"raw" | "smart">("smart");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      processFile(selectedFile);
    }
  };

  const processFile = async (file: File) => {
    setIsProcessing(true);
    setExtractedText("");
    
    try {
      let text = "";
      const fileType = file.type;
      const fileName = file.name.toLowerCase();

      if (fileType === "application/pdf" || fileName.endsWith(".pdf")) {
        text = await extractTextFromPdf(file);
      } else if (fileType === "text/html" || fileName.endsWith(".html") || fileName.endsWith(".htm")) {
        text = await extractTextFromHtml(file);
      } else {
        // Default to text extraction
        text = await file.text();
      }

      setExtractedText(text);
    } catch (error: any) {
      console.error("Extraction error:", error);
      setExtractedText(`Error: ${error.message || "Could not extract text from this document. Please try a different file."}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const extractTextFromPdf = async (file: File): Promise<string> => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      let fullText = "";

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        
        // Group items by their vertical position (y-coordinate)
        const items = textContent.items as any[];
        const lines: { [key: number]: any[] } = {};
        
        items.forEach(item => {
          const y = Math.round(item.transform[5]);
          if (!lines[y]) lines[y] = [];
          lines[y].push(item);
        });

        // Sort lines by y-coordinate (descending for top-to-bottom)
        const sortedY = Object.keys(lines)
          .map(Number)
          .sort((a, b) => b - a);

        const pageText = sortedY.map(y => {
          // Sort items in each line by x-coordinate (ascending)
          return lines[y]
            .sort((a, b) => a.transform[4] - b.transform[4])
            .map(item => item.str)
            .join(" ");
        }).join("\n");

        fullText += pageText + "\n\n";
      }

      return fullText;
    } catch (error: any) {
      console.error("PDF extraction error:", error);
      if (error.message?.includes("worker")) {
        throw new Error("PDF Worker initialization failed. Please try refreshing the page.");
      }
      throw error;
    }
  };

  const extractTextFromHtml = async (file: File): Promise<string> => {
    const html = await file.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    
    // Remove scripts and styles
    const scripts = doc.querySelectorAll("script, style");
    scripts.forEach(s => s.remove());
    
    return doc.body.innerText || doc.body.textContent || "";
  };

  // 100% Original Offline "AI-Feel" Formatter
  const smartFormat = (text: string) => {
    if (!text) return "";
    
    // Step 1: Basic normalization
    let lines = text
      .replace(/\r\n/g, "\n")
      .replace(/\t/g, "  ")
      .split("\n")
      .map(line => line.trim())
      .filter(line => line.length > 0);

    const processedLines: string[] = [];
    
    // Step 2: Process lines with heuristic patterns
    lines.forEach((line, index) => {
      let currentLine = line;

      // Pattern: Date detection (DD/MM/YYYY or similar)
      const datePattern = /\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/;
      const hasDate = datePattern.test(currentLine);

      // Pattern: Time detection (HH:MM AM/PM)
      const timePattern = /\b\d{1,2}:\d{2}\s*(?:AM|PM|NOON|MIDNIGHT)\b/i;
      const hasTime = timePattern.test(currentLine);

      // Pattern: Header detection (All caps or short lines without punctuation)
      const isAllCaps = currentLine === currentLine.toUpperCase() && /[A-Z]/.test(currentLine);
      const isShort = currentLine.length < 50;
      const noPunctuation = !/[.!?]$/.test(currentLine);
      const isHeader = (isAllCaps && isShort) || (isShort && noPunctuation && index === 0);

      // Pattern: List/Shift detection
      const isShift = /\b(?:1st|2nd|3rd|Shift|Batch)\b/i.test(currentLine);

      if (isHeader) {
        processedLines.push(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        processedLines.push(`[ ${currentLine.toUpperCase()} ]`);
        processedLines.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
      } else if (hasDate) {
        // If it has a date, it's likely a new entry/row
        processedLines.push(`\n📅 ${currentLine}`);
      } else if (isShift || hasTime) {
        // If it has shift or time, indent it slightly or mark it
        processedLines.push(`  • ${currentLine}`);
      } else {
        // Regular text, capitalize if it looks like a sentence
        if (/^[a-z]/.test(currentLine)) {
          currentLine = currentLine.charAt(0).toUpperCase() + currentLine.slice(1);
        }
        processedLines.push(currentLine);
      }
    });

    // Step 3: Final cleanup and joining
    return processedLines
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  };

  const displayedText = formatMode === "smart" ? smartFormat(extractedText) : extractedText;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(displayedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const clearAll = () => {
    setFile(null);
    setExtractedText("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 sm:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <button 
            onClick={() => navigate("/")}
            className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-indigo-600 transition-colors shadow-sm"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-600/20">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">Document to Text</h1>
          </div>
          <div className="w-12" /> {/* Spacer */}
        </div>

        {/* Upload Section */}
        {!file ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => fileInputRef.current?.click()}
            className="group relative cursor-pointer"
          >
            <div className="absolute inset-0 bg-indigo-600/5 rounded-[2.5rem] blur-2xl group-hover:bg-indigo-600/10 transition-colors" />
            <div className="relative bg-white dark:bg-slate-900 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-12 text-center space-y-6 hover:border-indigo-500/50 transition-all">
              <div className="w-24 h-24 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                <Upload className="w-10 h-10 text-indigo-600" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Drop your document here</h2>
                <p className="text-slate-500 dark:text-slate-400">Support for PDF, HTML, and Text files. 100% Offline.</p>
              </div>
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".pdf,.html,.htm,.txt"
                className="hidden" 
              />
            </div>
          </motion.div>
        ) : (
          <div className="space-y-6">
            {/* File Info & Controls */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center">
                  {file.type === "application/pdf" ? <FileText className="text-indigo-600" /> : <FileCode className="text-indigo-600" />}
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-slate-900 dark:text-white truncate max-w-[200px] sm:max-w-md">{file.name}</h3>
                  <p className="text-xs text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button 
                  onClick={clearAll}
                  className="flex-1 sm:flex-none px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors flex items-center justify-center gap-2 font-bold"
                >
                  <Trash2 className="w-4 h-4" /> Clear
                </button>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 sm:flex-none px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 font-bold shadow-lg shadow-indigo-600/20"
                >
                  <Upload className="w-4 h-4" /> New File
                </button>
              </div>
            </div>

            {/* Results Area */}
            <div className="relative group">
              <div className="absolute inset-0 bg-indigo-600/5 rounded-[2rem] blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] overflow-hidden flex flex-col min-h-[400px]">
                {/* Toolbar */}
                <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                  <div className="flex bg-slate-200 dark:bg-slate-800 p-1 rounded-xl">
                    <button 
                      onClick={() => setFormatMode("raw")}
                      className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${formatMode === "raw" ? "bg-white dark:bg-slate-700 text-indigo-600 shadow-sm" : "text-slate-500"}`}
                    >
                      Raw
                    </button>
                    <button 
                      onClick={() => setFormatMode("smart")}
                      className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${formatMode === "smart" ? "bg-white dark:bg-slate-700 text-indigo-600 shadow-sm" : "text-slate-500"}`}
                    >
                      <Sparkles className="w-3.5 h-3.5" /> Smart
                    </button>
                  </div>
                  <button 
                    onClick={copyToClipboard}
                    disabled={!displayedText}
                    className="p-2.5 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:text-indigo-600 transition-all active:scale-90 disabled:opacity-50"
                  >
                    {copied ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
                  </button>
                </div>

                {/* Text Content */}
                <div className="flex-1 p-6 font-mono text-sm sm:text-base text-slate-700 dark:text-slate-300 whitespace-pre-wrap overflow-y-auto max-h-[600px] selection:bg-indigo-100 dark:selection:bg-indigo-900/50">
                  {isProcessing ? (
                    <div className="h-full flex flex-col items-center justify-center space-y-4 py-20">
                      <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
                      <p className="text-slate-500 font-bold animate-pulse">Extracting text offline...</p>
                    </div>
                  ) : displayedText ? (
                    displayedText
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 py-20">
                      <FileText className="w-12 h-12 mb-4 opacity-20" />
                      <p>No text found in this document.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Features Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { icon: Globe, title: "100% Offline", desc: "No data leaves your device." },
            { icon: Sparkles, title: "Smart Format", desc: "AI-like text structuring." },
            { icon: Zap, title: "Instant Speed", desc: "Fastest extraction engine." }
          ].map((feature, i) => (
            <div key={i} className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
              <feature.icon className="w-6 h-6 text-indigo-600" />
              <h4 className="font-bold text-slate-900 dark:text-white">{feature.title}</h4>
              <p className="text-sm text-slate-500">{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
