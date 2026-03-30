import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText, Upload, Download, Copy, Check, Loader2, FileUp, Settings } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import Tesseract from 'tesseract.js';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { jsPDF } from 'jspdf';
// @ts-ignore
import html2pdf from 'html2pdf.js';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import { saveAs } from 'file-saver';
import { generateNotes } from '../utils/summarizer';
import { generateCinematicHTML } from '../utils/cinematicGenerator';
import { ChevronDown, FileText as FileIcon, FileType, FileOutput, Sparkles } from 'lucide-react';

// Set worker path to local node_modules via Vite URL import
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

type SummaryLength = 'short' | 'medium' | 'long';

export default function NotesCreate() {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [notes, setNotes] = useState<string>('');
  const [generatedTitle, setGeneratedTitle] = useState<string>('Study Notes');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [ocrProgress, setOcrProgress] = useState<string>('');
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [summaryLength, setSummaryLength] = useState<SummaryLength>('medium');
  const [selectedTheme, setSelectedTheme] = useState<number>(0);
  const [copied, setCopied] = useState(false);

  const themes = [
    'Classic Paper', 'Midnight Neon', 'Emerald Forest', 'Cyberpunk', 
    'Royal Velvet', 'Sakura Blossom', 'Oceanic Depth', 'High Contrast'
  ];
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const downloadMenuRef = useRef<HTMLDivElement>(null);
  const notesContainerRef = useRef<HTMLDivElement>(null);
  const notesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (downloadMenuRef.current && !downloadMenuRef.current.contains(event.target as Node)) {
        setShowDownloadMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type === 'application/pdf' || selectedFile.name.toLowerCase().endsWith('.html') || selectedFile.name.toLowerCase().endsWith('.htm')) {
        setFile(selectedFile);
        setNotes('');
        setErrorMsg('');
      } else {
        alert('Please select a valid PDF or HTML file.');
      }
    }
  };

  // Auto-scroll to bottom of notes while generating
  useEffect(() => {
    if (isGenerating && notesEndRef.current) {
      notesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [notes, isGenerating]);

  const extractTextFromPDF = async (pdfFile: File, onProgress: (percent: number) => void): Promise<string> => {
    try {
      const arrayBuffer = await pdfFile.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      const pdf = await pdfjsLib.getDocument({ data: uint8Array }).promise;
      let fullText = '';
      
      for (let i = 1; i <= pdf.numPages; i++) {
        onProgress(Math.round((i / pdf.numPages) * 100));
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        
        let pageText = '';
        let lastY = -1;
        
        for (const item of textContent.items as any[]) {
          if (lastY !== -1 && Math.abs(item.transform[5] - lastY) > 5) {
            pageText += '\n';
          } else if (lastY !== -1) {
            pageText += ' ';
          }
          pageText += item.str;
          lastY = item.transform[5];
        }
        
        fullText += pageText + '\n\n';
      }
      
      return fullText;
    } catch (error: any) {
      console.error("Error extracting text from PDF:", error);
      throw new Error(error.message || "Failed to read PDF file.");
    }
  };

  const extractTextWithOCR = async (pdfFile: File, onProgress: (percent: number) => void): Promise<string> => {
    try {
      const arrayBuffer = await pdfFile.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      const pdf = await pdfjsLib.getDocument({ data: uint8Array }).promise;
      let fullText = '';
      
      const worker = await Tesseract.createWorker('eng');
      
      for (let i = 1; i <= pdf.numPages; i++) {
        setOcrProgress(`Performing OCR on scanned page ${i} of ${pdf.numPages}...`);
        onProgress(Math.round((i / pdf.numPages) * 100));
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 2.0 }); // Scale up for better OCR
        
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) continue;
        
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        await page.render({ 
          canvasContext: context, 
          viewport: viewport,
          // @ts-ignore - Some versions of pdfjs-dist types require canvas element
          canvas: canvas 
        }).promise;
        
        const { data: { text } } = await worker.recognize(canvas);
        fullText += text + '\n\n';
      }
      
      await worker.terminate();
      return fullText;
    } catch (error: any) {
      console.error("OCR Error:", error);
      throw new Error("Failed to perform OCR on the scanned document.");
    }
  };

  const extractTextFromHTML = async (htmlFile: File, onProgress: (percent: number) => void): Promise<string> => {
    try {
      onProgress(10);
      const text = await htmlFile.text();
      onProgress(50);
      
      const parser = new DOMParser();
      const doc = parser.parseFromString(text, 'text/html');
      
      // Remove script and style elements
      const scripts = doc.querySelectorAll('script, style');
      scripts.forEach(s => s.remove());
      
      onProgress(90);
      const extractedText = doc.body.innerText || doc.body.textContent || '';
      onProgress(100);
      
      return extractedText;
    } catch (error: any) {
      console.error("Error extracting text from HTML:", error);
      throw new Error(error.message || "Failed to read HTML file.");
    }
  };

  const handleGenerateNotes = async () => {
    if (!file) return;

    setIsProcessing(true);
    setIsGenerating(false);
    setNotes('');
    setErrorMsg('');
    setOcrProgress('Reading document...');
    setProgressPercent(0);

    try {
      let extractedText = '';
      
      if (file.name.toLowerCase().endsWith('.html') || file.name.toLowerCase().endsWith('.htm')) {
        setOcrProgress('Extracting text from HTML...');
        extractedText = await extractTextFromHTML(file, (p) => setProgressPercent(p));
      } else {
        // Step 1: Extract text from PDF
        setOcrProgress('Extracting text from PDF...');
        extractedText = await extractTextFromPDF(file, (p) => setProgressPercent(p));
        
        if (!extractedText || extractedText.trim().length === 0) {
          setOcrProgress('Detecting scanned document. Starting OCR...');
          setProgressPercent(0);
          extractedText = await extractTextWithOCR(file, (p) => setProgressPercent(p));
        }
      }

      if (!extractedText || extractedText.trim().length === 0) {
        setErrorMsg("Could not extract any text from this document, even with OCR.");
        setIsProcessing(false);
        return;
      }

      // Step 2: Generate Notes using AI
      setOcrProgress('Generating smart notes...');
      setProgressPercent(100);
      
      // Turn off processing loader and turn on generating state to show typing effect
      setIsProcessing(false);
      setIsGenerating(true);
      setNotes(''); // Clear notes to show "Thinking..."
      
      try {
        const generatedNotes = await generateNotes(extractedText, summaryLength, (currentText) => {
          setNotes(currentText);
          // Try to extract title on the fly
          const titleMatch = currentText.match(/^# (.*$)/m);
          if (titleMatch && titleMatch[1]) {
            setGeneratedTitle(titleMatch[1].trim());
          }
        });
        if (!generatedNotes) {
           setErrorMsg("Could not generate notes. The text might be too short or complex.");
        } else {
          // Final title extraction
          const titleMatch = generatedNotes.match(/^# (.*$)/m);
          if (titleMatch && titleMatch[1]) {
            setGeneratedTitle(titleMatch[1].trim());
          }
        }
      } catch (err: any) {
        console.error("Error generating notes:", err);
        setErrorMsg("An error occurred while generating notes.");
      } finally {
        setIsGenerating(false);
      }

    } catch (error: any) {
      console.error("Document Processing Error:", error);
      setErrorMsg(`An error occurred while processing the document: ${error.message}`);
      setIsProcessing(false);
      setIsGenerating(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(notes);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadNotes = (format: 'txt' | 'pdf' | 'docx') => {
    const fileName = generatedTitle !== 'Study Notes' ? generatedTitle : (file?.name.replace(/\.(pdf|html|htm)$/i, '') || 'Notes');
    const safeFileName = fileName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    
    if (format === 'txt') {
      const blob = new Blob([notes], { type: 'text/plain;charset=utf-8' });
      saveAs(blob, `𝙱𝙹𝙴_Clan_${safeFileName}.txt`);
    } else if (format === 'pdf') {
      if (!notesContainerRef.current) return;
      
      const element = notesContainerRef.current;
      
      // Create a clone to avoid scrollbars and keep the UI intact
      const clone = element.cloneNode(true) as HTMLElement;
      clone.style.height = 'auto';
      clone.style.overflow = 'visible';
      clone.style.width = '100%';
      clone.style.padding = '40px';
      clone.style.backgroundColor = 'white';
      
      // Fix for "oklch" color error in html2canvas
      // We'll inject a style tag into the clone that overrides oklch colors with standard ones
      // or simply try to force the browser to compute them as RGB
      const styleTag = document.createElement('style');
      styleTag.innerHTML = `
        * {
          color-scheme: light !important;
        }
      `;
      clone.appendChild(styleTag);
      
      // Recursive function to clean oklch colors from styles
      const cleanOklch = (el: Element) => {
        const htmlEl = el as HTMLElement;
        const computed = window.getComputedStyle(el);
        const properties = [
          'color', 'backgroundColor', 'background', 'borderColor', 'borderTopColor', 
          'borderBottomColor', 'borderLeftColor', 'borderRightColor', 
          'fill', 'stroke', 'boxShadow', 'textShadow', 'outlineColor'
        ];
        
        properties.forEach(prop => {
          try {
            const val = (htmlEl.style as any)[prop] || computed.getPropertyValue(prop.replace(/([A-Z])/g, "-$1").toLowerCase());
            if (val && val.includes('oklch')) {
              // Force the browser to convert oklch to rgb by setting it on a temp element
              const temp = document.createElement('div');
              temp.style.color = val;
              document.body.appendChild(temp);
              const rgb = window.getComputedStyle(temp).color;
              document.body.removeChild(temp);
              
              if (rgb && !rgb.includes('oklch')) {
                (htmlEl.style as any)[prop] = rgb;
              } else {
                // Fallback to a safe color if conversion fails
                if (prop.toLowerCase().includes('background')) (htmlEl.style as any)[prop] = '#ffffff';
                else if (prop.toLowerCase().includes('border')) (htmlEl.style as any)[prop] = '#e5e7eb';
                else (htmlEl.style as any)[prop] = '#000000';
              }
            }
          } catch (e) {
            // Ignore errors for non-styleable elements
          }
        });
        
        Array.from(el.children).forEach(child => cleanOklch(child));
      };
      
      // We need to append the clone to the body temporarily to get computed styles correctly
      clone.style.position = 'absolute';
      clone.style.left = '-9999px';
      clone.style.top = '-9999px';
      document.body.appendChild(clone);
      cleanOklch(clone);
      document.body.removeChild(clone);
      
      // Reset position for PDF generation
      clone.style.position = 'relative';
      clone.style.left = '0';
      clone.style.top = '0';

      // Remove the "Thinking..." or "End Ref" elements from the clone if they exist
      const endRef = clone.querySelector('.h-20');
      if (endRef) endRef.remove();
      
      const opt = {
        margin: [10, 10, 10, 10] as [number, number, number, number],
        filename: `𝙱𝙹𝙴_Clan_${safeFileName}.pdf`,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { 
          scale: 2, 
          useCORS: true, 
          letterRendering: true,
          scrollY: 0,
          windowWidth: 1200 // Force a wider width for better table rendering
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
      };

      html2pdf().set(opt).from(clone).save();
    } else if (format === 'docx') {
      const doc = new Document({
        sections: [{
          properties: {},
          children: notes.split('\n').map(line => {
            return new Paragraph({
              children: [new TextRun(line)],
              spacing: { after: 200 }
            });
          })
        }]
      });
      Packer.toBlob(doc).then(blob => {
        saveAs(blob, `𝙱𝙹𝙴_Clan_${safeFileName}.docx`);
      });
    }
    setShowDownloadMenu(false);
  };

  const openCinematicView = () => {
    if (!notes || !file) return;
    const html = generateCinematicHTML(generatedTitle, notes, selectedTheme);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#020617] py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/5 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/5 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="max-w-6xl mx-auto space-y-12 relative z-10">
        <div className="text-center space-y-6">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-5xl font-black tracking-tight text-slate-900 dark:text-white sm:text-6xl bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 pb-2">
              Notes Generator
            </h1>
            <div className="h-1.5 w-24 bg-gradient-to-r from-indigo-600 to-purple-600 mx-auto rounded-full mt-2"></div>
          </motion.div>
          
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="text-xl text-slate-500 dark:text-slate-400 max-w-2xl mx-auto font-medium"
          >
            Transform complex documents into structured, beautiful study notes. 
            <span className="block text-sm mt-2 font-mono text-indigo-500 uppercase tracking-widest">Powered by 𝙱𝙹𝙴 ~ Clan</span>
          </motion.p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Upload & Settings */}
          <div className="lg:col-span-4 space-y-6">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-8 rounded-[2rem] shadow-xl shadow-indigo-500/5 border border-white/20 dark:border-slate-800/50"
            >
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                  <FileUp className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                Upload
              </h2>
              
              <div 
                onClick={() => fileInputRef.current?.click()}
                className={`group relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-300 ${
                  file 
                    ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/10' 
                    : 'border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }`}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  accept=".pdf,.html,.htm" 
                  className="hidden" 
                />
                <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center transition-transform group-hover:scale-110 ${file ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                  <Upload className="w-8 h-8" />
                </div>
                {file ? (
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-slate-900 dark:text-white truncate max-w-[200px] mx-auto">{file.name}</p>
                    <p className="text-xs text-indigo-500 font-mono uppercase tracking-tighter">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-slate-900 dark:text-white">Drop your file here</p>
                    <p className="text-xs text-slate-500">PDF or HTML (Max 50MB)</p>
                  </div>
                )}
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-8 rounded-[2rem] shadow-xl shadow-indigo-500/5 border border-white/20 dark:border-slate-800/50"
            >
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                  <Settings className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                Settings
              </h2>
              
              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Summary Depth</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['short', 'medium', 'long'] as SummaryLength[]).map((len) => (
                      <button
                        key={len}
                        onClick={() => setSummaryLength(len)}
                        className={`py-2.5 text-xs font-bold rounded-xl capitalize transition-all duration-300 ${
                          summaryLength === len 
                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 scale-105' 
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                      >
                        {len}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Cinematic Theme</label>
                  <select 
                    value={selectedTheme}
                    onChange={(e) => setSelectedTheme(Number(e.target.value))}
                    className="w-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-sm font-bold rounded-xl px-4 py-3 outline-none border-none cursor-pointer"
                  >
                    {themes.map((t, i) => (
                      <option key={t} value={i}>{t}</option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={handleGenerateNotes}
                  disabled={!file || isProcessing || isGenerating}
                  className="w-full py-4 px-6 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold rounded-2xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-xl shadow-indigo-500/20 active:scale-95"
                >
                  {isProcessing || isGenerating ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span className="animate-pulse">{isGenerating ? 'Generating...' : 'Processing...'}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      Generate Notes
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>

          {/* Right Column: Results */}
          <div className="lg:col-span-8">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl shadow-indigo-500/10 border border-slate-100 dark:border-slate-800 flex flex-col h-[700px] overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-800/30">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white">
                    <FileText className="w-5 h-5" />
                  </div>
                  Preview
                </h2>
                
                {notes && !isGenerating && (
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={openCinematicView}
                      className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20 group"
                    >
                      <Sparkles className="w-4 h-4 animate-pulse group-hover:scale-125 transition-transform" />
                      <span className="text-sm font-bold">Cinematic View</span>
                    </button>

                    <div className="h-8 w-px bg-slate-200 dark:bg-slate-700 mx-1 hidden sm:block"></div>

                    <button
                      onClick={copyToClipboard}
                      className="p-2.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl transition-all"
                      title="Copy to clipboard"
                    >
                      {copied ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
                    </button>
                    
                    <div className="relative" ref={downloadMenuRef}>
                      <button
                        onClick={() => setShowDownloadMenu(!showDownloadMenu)}
                        className="flex items-center gap-2 px-4 py-2 text-slate-600 dark:text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl transition-all border border-slate-200 dark:border-slate-700"
                      >
                        <Download className="w-5 h-5" />
                        <span className="text-sm font-bold">Export</span>
                        <ChevronDown className={`w-4 h-4 transition-transform ${showDownloadMenu ? 'rotate-180' : ''}`} />
                      </button>

                      {showDownloadMenu && (
                        <div className="absolute right-0 mt-3 w-56 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-700 py-3 z-50 animate-in fade-in slide-in-from-top-2">
                          <button
                            onClick={() => downloadNotes('pdf')}
                            className="w-full flex items-center gap-3 px-5 py-3 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:text-indigo-600 transition-colors"
                          >
                            <FileType className="w-4 h-4 text-red-500" />
                            Export as PDF
                          </button>
                          <button
                            onClick={() => downloadNotes('docx')}
                            className="w-full flex items-center gap-3 px-5 py-3 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:text-indigo-600 transition-colors"
                          >
                            <FileIcon className="w-4 h-4 text-blue-500" />
                            Export as Word
                          </button>
                          <button
                            onClick={() => downloadNotes('txt')}
                            className="w-full flex items-center gap-3 px-5 py-3 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:text-indigo-600 transition-colors"
                          >
                            <FileOutput className="w-4 h-4 text-slate-500" />
                            Export as Text
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div 
                ref={notesContainerRef}
                className="flex-1 bg-white dark:bg-slate-900 p-8 sm:p-12 overflow-y-auto relative custom-scrollbar"
              >
                {isProcessing ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-8 max-w-md mx-auto text-center">
                    <div className="relative">
                      <div className="w-20 h-20 border-4 border-indigo-100 dark:border-indigo-900/30 rounded-full"></div>
                      <div className="absolute top-0 left-0 w-20 h-20 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin"></div>
                    </div>
                    <div className="w-full space-y-4">
                      <div className="flex justify-between items-end">
                        <div className="text-left">
                          <p className="text-xs font-black text-indigo-600 uppercase tracking-widest mb-1">Status</p>
                          <p className="text-sm font-bold text-slate-900 dark:text-white truncate max-w-[250px]">{ocrProgress}</p>
                        </div>
                        <span className="text-2xl font-black text-indigo-600">{progressPercent}%</span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-3 overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${progressPercent}%` }}
                          className="bg-gradient-to-r from-indigo-600 to-purple-600 h-full rounded-full" 
                        ></motion.div>
                      </div>
                    </div>
                  </div>
                ) : errorMsg ? (
                  <div className="h-full flex flex-col items-center justify-center text-red-500 space-y-4 text-center px-4">
                    <div className="w-20 h-20 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center">
                      <FileText className="w-10 h-10 opacity-50" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-lg font-bold">Generation Failed</p>
                      <p className="text-sm opacity-80 max-w-xs mx-auto">{errorMsg}</p>
                    </div>
                  </div>
                ) : (notes || isGenerating) ? (
                  <div className="prose prose-slate dark:prose-invert max-w-none 
                    prose-headings:text-slate-900 dark:prose-headings:text-white prose-headings:font-black prose-headings:tracking-tight
                    prose-h1:text-5xl prose-h1:text-indigo-950 dark:prose-h1:text-indigo-400 prose-h1:border-b-4 prose-h1:border-indigo-100 dark:prose-h1:border-indigo-900/50 prose-h1:pb-8 prose-h1:mb-12
                    prose-h2:text-3xl prose-h2:text-indigo-900 dark:prose-h2:text-indigo-300 prose-h2:mt-16 prose-h2:mb-8 prose-h2:border-l-8 prose-h2:border-indigo-200 dark:prose-h2:border-indigo-800 prose-h2:pl-6
                    prose-h3:text-2xl prose-h3:text-indigo-800 dark:prose-h3:text-indigo-400 prose-h3:mt-10 prose-h3:mb-6
                    prose-p:text-lg prose-p:leading-relaxed prose-p:text-slate-600 dark:prose-p:text-slate-200 prose-p:mb-8
                    prose-blockquote:border-l-8 prose-blockquote:border-indigo-500 prose-blockquote:bg-indigo-50/50 dark:prose-blockquote:bg-indigo-900/20 prose-blockquote:py-8 prose-blockquote:px-10 prose-blockquote:rounded-r-[2rem] prose-blockquote:not-italic prose-blockquote:text-slate-800 dark:prose-blockquote:text-slate-200 prose-blockquote:shadow-inner prose-blockquote:my-12
                    prose-li:text-lg prose-li:mb-4 dark:prose-li:text-slate-200 prose-li:marker:text-indigo-500
                    prose-table:block prose-table:overflow-x-auto prose-table:whitespace-nowrap prose-table:border-collapse prose-table:w-full prose-table:my-12 prose-table:rounded-3xl prose-table:border prose-table:border-slate-200 dark:prose-table:border-slate-800
                    prose-thead:bg-slate-50 dark:prose-thead:bg-slate-800 prose-thead:text-slate-900 dark:prose-thead:text-white prose-thead:border-b-2 prose-thead:border-slate-200 dark:prose-thead:border-slate-700
                    prose-th:px-8 prose-th:py-5 prose-th:text-left prose-th:font-black prose-th:uppercase prose-th:tracking-widest prose-th:text-xs prose-th:min-w-[200px]
                    prose-td:px-8 prose-td:py-5 prose-td:border-b prose-td:border-slate-100 dark:prose-td:border-slate-800 prose-td:text-slate-600 dark:prose-td:text-slate-200 prose-td:min-w-[200px]
                    [&>*:first-child]:mt-0">
                    <Markdown remarkPlugins={[remarkGfm]}>{notes}</Markdown>
                    {isGenerating && (
                      <div className="flex items-center gap-3 mt-12">
                        <div className="flex gap-1">
                          <motion.span 
                            animate={{ scale: [1, 1.5, 1] }}
                            transition={{ repeat: Infinity, duration: 1 }}
                            className="w-2 h-2 bg-indigo-600 rounded-full"
                          ></motion.span>
                          <motion.span 
                            animate={{ scale: [1, 1.5, 1] }}
                            transition={{ repeat: Infinity, duration: 1, delay: 0.2 }}
                            className="w-2 h-2 bg-indigo-600 rounded-full"
                          ></motion.span>
                          <motion.span 
                            animate={{ scale: [1, 1.5, 1] }}
                            transition={{ repeat: Infinity, duration: 1, delay: 0.4 }}
                            className="w-2 h-2 bg-indigo-600 rounded-full"
                          ></motion.span>
                        </div>
                        {notes.trim().length === 0 && (
                          <span className="text-indigo-600 font-black animate-pulse text-xl italic tracking-tight">Synthesizing Notes...</span>
                        )}
                      </div>
                    )}
                    <div ref={notesEndRef} className="h-20" />
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-6 text-center">
                    <div className="w-24 h-24 bg-slate-50 dark:bg-slate-800 rounded-[2rem] flex items-center justify-center rotate-12">
                      <FileText className="w-12 h-12 opacity-20 -rotate-12" />
                    </div>
                    <div className="space-y-2">
                      <p className="text-lg font-bold text-slate-900 dark:text-white">Empty Preview</p>
                      <p className="text-sm max-w-[250px] mx-auto">Upload a document and click generate to see your smart notes here.</p>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
