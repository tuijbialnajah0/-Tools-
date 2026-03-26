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
  const [copied, setCopied] = useState(false);
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
    const html = generateCinematicHTML(generatedTitle, notes);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
          Notes Create
        </h1>
        <p className="text-lg text-gray-500 max-w-2xl mx-auto">
          Convert any PDF or HTML file into smart, bullet-point notes instantly. 100% offline, fast, and secure.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left Column: Upload & Settings */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FileUp className="w-5 h-5 text-indigo-600" />
              Upload Document
            </h2>
            
            <div 
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                file ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 hover:border-indigo-400 hover:bg-gray-50'
              }`}
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept=".pdf,.html,.htm" 
                className="hidden" 
              />
              <Upload className={`w-10 h-10 mx-auto mb-3 ${file ? 'text-indigo-600' : 'text-gray-400'}`} />
              {file ? (
                <div>
                  <p className="text-sm font-medium text-indigo-900">{file.name}</p>
                  <p className="text-xs text-indigo-500 mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              ) : (
                <div>
                  <p className="text-sm font-medium text-gray-900">Click to upload PDF or HTML</p>
                  <p className="text-xs text-gray-500 mt-1">PDF or HTML files only (Max 50MB)</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Settings className="w-5 h-5 text-indigo-600" />
              Notes Settings
            </h2>
            
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <label className="block text-sm font-medium text-gray-700">Summary Length</label>
                <div className="grid grid-cols-3 gap-2 w-full sm:w-auto">
                  {(['short', 'medium', 'long'] as SummaryLength[]).map((len) => (
                    <button
                      key={len}
                      onClick={() => setSummaryLength(len)}
                      className={`px-3 py-2 text-sm font-medium rounded-lg capitalize transition-colors ${
                        summaryLength === len 
                          ? 'bg-indigo-600 text-white' 
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {len}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleGenerateNotes}
                disabled={!file || isProcessing || isGenerating}
                className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isProcessing || isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {isGenerating ? 'Typing Notes...' : 'Processing PDF...'}
                  </>
                ) : (
                  <>
                    <FileText className="w-5 h-5" />
                    Generate Notes
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Results */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col h-[600px]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-600" />
              Generated Notes
            </h2>
            
            {notes && !isGenerating && (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={openCinematicView}
                  className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all shadow-sm hover:shadow-md group"
                  title="Open Cinematic Visual Mode"
                >
                  <Sparkles className="w-4 h-4 animate-pulse group-hover:scale-110 transition-transform" />
                  <span className="text-xs sm:text-sm font-medium">Cinematic View</span>
                </button>

                <button
                  onClick={copyToClipboard}
                  className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                  title="Copy to clipboard"
                >
                  {copied ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
                </button>
                
                <div className="relative" ref={downloadMenuRef}>
                  <button
                    onClick={() => setShowDownloadMenu(!showDownloadMenu)}
                    className="flex items-center gap-1 px-3 py-2 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all border border-transparent hover:border-indigo-100"
                    title="Download options"
                  >
                    <Download className="w-5 h-5" />
                    <ChevronDown className={`w-4 h-4 transition-transform ${showDownloadMenu ? 'rotate-180' : ''}`} />
                  </button>

                  {showDownloadMenu && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50 animate-in fade-in slide-in-from-top-2">
                      <button
                        onClick={() => downloadNotes('pdf')}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                      >
                        <FileType className="w-4 h-4 text-red-500" />
                        Download as PDF
                      </button>
                      <button
                        onClick={() => downloadNotes('docx')}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                      >
                        <FileIcon className="w-4 h-4 text-blue-500" />
                        Download as Word
                      </button>
                      <button
                        onClick={() => downloadNotes('txt')}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                      >
                        <FileOutput className="w-4 h-4 text-gray-500" />
                        Download as Text
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div 
            ref={notesContainerRef}
            className="flex-1 bg-white rounded-xl p-6 overflow-y-auto border border-gray-200 shadow-inner relative custom-scrollbar"
          >
            {isProcessing ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-6 max-w-[80%] mx-auto">
                <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
                <div className="w-full space-y-2">
                  <div className="flex justify-between text-sm font-medium text-gray-600">
                    <span className="truncate pr-4">{ocrProgress}</span>
                    <span>{progressPercent}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                    <div 
                      className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300 ease-out" 
                      style={{ width: `${progressPercent}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ) : errorMsg ? (
              <div className="h-full flex flex-col items-center justify-center text-red-500 space-y-4 text-center px-4">
                <FileText className="w-12 h-12 opacity-50" />
                <p className="text-sm font-medium">{errorMsg}</p>
              </div>
            ) : (notes || isGenerating) ? (
              <div className="prose prose-sm md:prose-base lg:prose-lg max-w-none text-gray-700 
                prose-headings:text-gray-900 prose-headings:font-bold prose-headings:tracking-tight
                prose-h1:text-4xl prose-h1:text-indigo-950 prose-h1:border-b-2 prose-h1:border-indigo-100 prose-h1:pb-8 prose-h1:mb-12
                prose-h2:text-2xl prose-h2:text-indigo-900 prose-h2:mt-16 prose-h2:mb-8 prose-h2:border-l-4 prose-h2:border-indigo-200 prose-h2:pl-6
                prose-h3:text-xl prose-h3:text-indigo-800 prose-h3:mt-10 prose-h3:mb-6
                prose-p:leading-loose prose-p:mb-8
                prose-a:text-indigo-600 prose-a:no-underline hover:prose-a:underline
                prose-blockquote:border-l-4 prose-blockquote:border-indigo-500 prose-blockquote:bg-indigo-50/50 prose-blockquote:py-6 prose-blockquote:px-8 prose-blockquote:rounded-r-2xl prose-blockquote:not-italic prose-blockquote:text-gray-800 prose-blockquote:shadow-sm prose-blockquote:my-10
                prose-li:marker:text-indigo-500 prose-li:mb-4 prose-li:leading-relaxed
                prose-strong:text-gray-900 prose-strong:font-bold
                prose-hr:border-gray-200 prose-hr:my-16
                prose-table:border-collapse prose-table:w-full prose-table:my-12 prose-table:rounded-xl prose-table:overflow-hidden prose-table:border prose-table:border-gray-200
                prose-thead:bg-indigo-50 prose-thead:text-indigo-900 prose-thead:border-b-2 prose-thead:border-indigo-100
                prose-th:px-6 prose-th:py-4 prose-th:text-left prose-th:font-bold prose-th:border prose-th:border-gray-200
                prose-td:px-6 prose-td:py-4 prose-td:border prose-td:border-gray-100
                [&>*:first-child]:mt-0">
                <Markdown remarkPlugins={[remarkGfm]}>{notes}</Markdown>
                {isGenerating && (
                  <div className="flex items-center gap-2 mt-8">
                    <span className="inline-block w-3 h-8 bg-indigo-600 animate-pulse align-middle rounded-sm"></span>
                    {notes.trim().length === 0 && (
                      <span className="text-indigo-600 font-medium animate-pulse text-lg italic">Thinking...</span>
                    )}
                  </div>
                )}
                <div ref={notesEndRef} className="h-20" />
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-2">
                <FileText className="w-12 h-12 opacity-20" />
                <p className="text-sm">Upload a PDF or HTML file and click Generate Notes to see results here.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
