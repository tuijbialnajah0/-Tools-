import React, { useState, useRef } from 'react';
import { Upload, FileText, Sparkles, Loader2, MonitorPlay, Type } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import Tesseract from 'tesseract.js';
import { generateCinematicHTML, autoFormatToMarkdown } from '../utils/cinematicGenerator';

// Set worker path to local node_modules via Vite URL import
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export default function NotesViewer() {
  const [file, setFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [ocrProgress, setOcrProgress] = useState<string>('');
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      const validTypes = ['application/pdf', 'text/html', 'text/plain'];
      const validExtensions = ['.pdf', '.html', '.htm', '.txt', '.md'];
      
      const isValid = validTypes.includes(selectedFile.type) || 
                      validExtensions.some(ext => selectedFile.name.toLowerCase().endsWith(ext));
                      
      if (isValid) {
        setFile(selectedFile);
        setPastedText(''); // Clear pasted text if file is uploaded
        setErrorMsg('');
      } else {
        alert('Please select a valid PDF, HTML, TXT, or MD file.');
      }
    }
  };

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
          // @ts-ignore
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

  const handleViewCinematic = async () => {
    if (!file && !pastedText.trim()) {
      setErrorMsg("Please upload a file or paste some text first.");
      return;
    }

    setIsProcessing(true);
    setErrorMsg('');
    setOcrProgress('Reading document...');
    setProgressPercent(0);

    try {
      let contentToView = pastedText;
      let title = 'Notes Viewer';

      if (file) {
        title = file.name.replace(/\.[^/.]+$/, ""); // Remove extension
        const lowerName = file.name.toLowerCase();
        
        if (lowerName.endsWith('.pdf') || file.type === 'application/pdf') {
          setOcrProgress('Extracting text from PDF...');
          contentToView = await extractTextFromPDF(file, (p) => setProgressPercent(p));
          
          if (!contentToView || contentToView.trim().length === 0) {
            setOcrProgress('Detecting scanned document. Starting OCR...');
            setProgressPercent(0);
            contentToView = await extractTextWithOCR(file, (p) => setProgressPercent(p));
          }
        } else if (lowerName.endsWith('.html') || lowerName.endsWith('.htm') || file.type === 'text/html') {
          setOcrProgress('Extracting text from HTML...');
          contentToView = await extractTextFromHTML(file, (p) => setProgressPercent(p));
        } else {
          // Fallback for txt, md, etc.
          contentToView = await file.text();
        }
      }

      if (!contentToView || contentToView.trim().length === 0) {
        throw new Error("No text could be extracted from the input.");
      }

      // Auto-format plain text into markdown-like structure for cinematic view
      const formattedContent = autoFormatToMarkdown(contentToView);

      // Generate and open cinematic view
      const html = generateCinematicHTML(title, formattedContent);
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');

    } catch (error: any) {
      console.error("Processing Error:", error);
      setErrorMsg(`An error occurred: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-full bg-[#050505] text-white relative overflow-hidden flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      {/* Atmospheric Background */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] rounded-full bg-indigo-900/20 blur-[120px] mix-blend-screen"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-purple-900/20 blur-[120px] mix-blend-screen"></div>
        <div className="absolute top-[40%] left-[50%] translate-x-[-50%] w-[100%] h-[40%] rounded-full bg-blue-900/10 blur-[150px] mix-blend-screen"></div>
      </div>

      <div className="w-full max-w-4xl relative z-10 space-y-10">
        <div className="text-center space-y-6">
          <div className="inline-flex items-center justify-center p-3 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-xl mb-4 shadow-2xl">
            <MonitorPlay className="w-8 h-8 text-indigo-400" />
          </div>
          <h1 className="text-5xl sm:text-7xl font-light tracking-tighter text-white">
            Notes <span className="font-semibold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">Viewer</span>
          </h1>
          <p className="text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto font-light tracking-wide">
            Transform ordinary documents into an immersive, distraction-free reading experience.
          </p>
        </div>

        <div className="bg-white/5 backdrop-blur-2xl p-8 sm:p-10 rounded-[2rem] shadow-2xl border border-white/10 space-y-10 relative overflow-hidden group">
          {/* Subtle inner glow */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>
          
          {/* File Upload Section */}
          <div className="relative z-10">
            <h2 className="text-sm font-semibold text-indigo-300 uppercase tracking-widest mb-4 flex items-center gap-3">
              <Upload className="w-4 h-4" />
              Upload Source
            </h2>
            <div 
              onClick={() => fileInputRef.current?.click()}
              className={`group/dropzone relative border border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-500 overflow-hidden ${
                file ? 'border-indigo-500/50 bg-indigo-500/10' : 'border-white/20 hover:border-indigo-400/50 hover:bg-white/5'
              }`}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 opacity-0 group-hover/dropzone:opacity-100 transition-opacity duration-500"></div>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept=".pdf,.html,.htm,.txt,.md" 
                className="hidden" 
              />
              <FileText className={`w-12 h-12 mx-auto mb-4 transition-colors duration-300 relative z-10 ${file ? 'text-indigo-400' : 'text-gray-500 group-hover/dropzone:text-indigo-300'}`} />
              <div className="relative z-10">
                {file ? (
                  <div className="space-y-1">
                    <p className="text-lg font-medium text-white">{file.name}</p>
                    <p className="text-sm text-indigo-300">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-lg font-medium text-gray-300">Drop your file here or click to browse</p>
                    <p className="text-sm text-gray-500">Supports PDF, HTML, TXT, MD (Max 50MB)</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="relative flex items-center py-2 z-10">
            <div className="flex-grow border-t border-white/10"></div>
            <span className="flex-shrink-0 mx-6 text-gray-500 text-xs font-bold tracking-widest uppercase">OR</span>
            <div className="flex-grow border-t border-white/10"></div>
          </div>

          {/* Text Paste Section */}
          <div className="relative z-10">
            <h2 className="text-sm font-semibold text-purple-300 uppercase tracking-widest mb-4 flex items-center gap-3">
              <Type className="w-4 h-4" />
              Paste Content
            </h2>
            <div className="relative group/textarea">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500/30 to-purple-500/30 rounded-2xl blur opacity-0 group-focus-within/textarea:opacity-100 transition duration-500"></div>
              <textarea
                value={pastedText}
                onChange={(e) => {
                  setPastedText(e.target.value);
                  if (e.target.value) setFile(null);
                }}
                placeholder="Paste your raw notes, markdown, or text here..."
                className="relative w-full h-40 p-6 bg-black/40 border border-white/10 rounded-2xl focus:outline-none focus:ring-0 text-gray-200 placeholder-gray-600 resize-none transition-all duration-300"
              />
            </div>
          </div>

          {errorMsg && (
            <div className="relative z-10 p-4 bg-red-900/30 border border-red-500/30 text-red-200 rounded-xl text-sm font-medium backdrop-blur-md">
              {errorMsg}
            </div>
          )}

          {isProcessing && ocrProgress && (
            <div className="relative z-10 w-full space-y-3 p-5 bg-indigo-900/20 rounded-xl border border-indigo-500/20 backdrop-blur-md">
              <div className="flex justify-between text-sm font-medium text-indigo-200">
                <span className="truncate pr-4 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {ocrProgress}
                </span>
                <span className="font-mono">{progressPercent}%</span>
              </div>
              <div className="w-full bg-black/50 rounded-full h-1.5 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-indigo-500 to-purple-500 h-1.5 rounded-full transition-all duration-300 ease-out relative" 
                  style={{ width: `${progressPercent}%` }}
                >
                  <div className="absolute top-0 right-0 bottom-0 w-10 bg-white/30 blur-[2px]"></div>
                </div>
              </div>
            </div>
          )}

          {/* Action Button */}
          <div className="relative z-10 pt-4">
            <button
              onClick={handleViewCinematic}
              disabled={isProcessing || (!file && !pastedText.trim())}
              className="group/btn relative w-full flex items-center justify-center gap-3 py-5 px-8 bg-white text-black font-bold rounded-2xl transition-all duration-500 hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-100 to-purple-100 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-500"></div>
              {isProcessing ? (
                <span className="relative flex items-center gap-3 text-lg">
                  <Loader2 className="w-6 h-6 animate-spin" />
                  Orchestrating Experience...
                </span>
              ) : (
                <span className="relative flex items-center gap-3 text-lg tracking-wide">
                  <Sparkles className="w-6 h-6 text-indigo-600" />
                  View Notes
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
