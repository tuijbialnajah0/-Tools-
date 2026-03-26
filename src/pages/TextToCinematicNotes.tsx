import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText, Download, Copy, Check, Loader2, Sparkles, Settings, Trash2, Clipboard } from 'lucide-react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { saveAs } from 'file-saver';
import { generateNotes } from '../utils/summarizer';
import { generateCinematicHTML } from '../utils/cinematicGenerator';

type SummaryLength = 'short' | 'medium' | 'long';

export default function TextToCinematicNotes() {
  const [inputText, setInputText] = useState<string>('');
  const [inputMode, setInputMode] = useState<'paste' | 'prompt'>('paste');
  const [isGenerating, setIsGenerating] = useState(false);
  const [notes, setNotes] = useState<string>('');
  const [generatedTitle, setGeneratedTitle] = useState<string>('Study Notes');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [summaryLength, setSummaryLength] = useState<SummaryLength>('medium');
  const [copied, setCopied] = useState(false);
  const notesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of notes while generating
  useEffect(() => {
    if (isGenerating && notesEndRef.current) {
      notesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [notes, isGenerating]);

  const handleGenerateNotes = async () => {
    if (!inputText.trim()) return;

    setIsGenerating(true);
    setNotes('');
    setErrorMsg('');
    
    try {
      const generatedNotes = await generateNotes(inputText, summaryLength, (currentText) => {
        setNotes(currentText);
        // Try to extract title on the fly or at the end
        const titleMatch = currentText.match(/^# (.*$)/m);
        if (titleMatch && titleMatch[1]) {
          setGeneratedTitle(titleMatch[1].trim());
        }
      }, inputMode);
      
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
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(notes);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadCinematicHTML = () => {
    if (!notes) return;
    const html = generateCinematicHTML(generatedTitle, notes);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const safeTitle = generatedTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    saveAs(blob, `𝙱𝙹𝙴_Clan_${safeTitle}_notes.html`);
  };

  const openCinematicView = () => {
    if (!notes) return;
    const html = generateCinematicHTML(generatedTitle, notes);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  const clearAll = () => {
    setInputText('');
    setNotes('');
    setErrorMsg('');
  };

  const pasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setInputText(text);
    } catch (err) {
      console.error('Failed to read clipboard:', err);
      setErrorMsg('Clipboard access blocked. Please use Ctrl+V (Cmd+V) to paste manually.');
      setTimeout(() => setErrorMsg(''), 5000);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white sm:text-5xl flex items-center justify-center gap-4">
          <Sparkles className="w-10 h-10 text-indigo-600" />
          Text to Cinematic Notes
        </h1>
        <p className="text-lg text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">
          Paste your raw text or provide a prompt to transform it into a high-end cinematic study experience.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column: Input */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col h-[600px]">
            <div className="flex items-center justify-between mb-6">
              <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl">
                <button
                  onClick={() => setInputMode('paste')}
                  className={`px-4 py-2 text-sm font-black rounded-xl transition-all ${
                    inputMode === 'paste' 
                      ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' 
                      : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  Paste Text
                </button>
                <button
                  onClick={() => setInputMode('prompt')}
                  className={`px-4 py-2 text-sm font-black rounded-xl transition-all ${
                    inputMode === 'prompt' 
                      ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' 
                      : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  AI Prompt
                </button>
              </div>
              <div className="flex items-center gap-2">
                {inputMode === 'paste' && (
                  <button
                    onClick={pasteFromClipboard}
                    className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl transition-colors"
                    title="Paste from clipboard"
                  >
                    <Clipboard className="w-5 h-5" />
                  </button>
                )}
                <button
                  onClick={clearAll}
                  className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
                  title="Clear all"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={inputMode === 'paste' 
                ? "Paste your long text, articles, or research papers here..." 
                : "Enter a topic or prompt (e.g., 'Explain Quantum Computing', 'History of the Roman Empire')..."
              }
              className="flex-1 w-full p-6 bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-100 dark:border-slate-800 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none text-slate-700 dark:text-slate-300 custom-scrollbar"
            />

            <div className="mt-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  {inputMode === 'paste' ? 'Summary Length' : 'Content Depth'}
                </span>
                <div className="flex flex-wrap gap-2">
                  {(['short', 'medium', 'long'] as SummaryLength[]).map((len) => (
                    <button
                      key={len}
                      onClick={() => setSummaryLength(len)}
                      className={`flex-1 sm:flex-none px-4 py-2 text-xs font-black rounded-xl capitalize transition-all ${
                        summaryLength === len 
                          ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' 
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {len}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleGenerateNotes}
                disabled={!inputText.trim() || isGenerating}
                className="w-full py-4 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-lg shadow-indigo-500/20"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    {inputMode === 'paste' ? 'Generating Cinematic Notes...' : 'AI is Researching & Writing...'}
                  </>
                ) : (
                  <>
                    <Sparkles className="w-6 h-6" />
                    {inputMode === 'paste' ? 'Transform to Cinematic' : 'Generate Cinematic Notes'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Results */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col h-[600px]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-600" />
              Cinematic Preview
            </h2>
            
            {notes && !isGenerating && (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={openCinematicView}
                  className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg shadow-indigo-500/20 group"
                  title="Open Cinematic Visual Mode"
                >
                  <Sparkles className="w-4 h-4 animate-pulse group-hover:scale-110 transition-transform" />
                  <span className="text-xs sm:text-sm font-black">View</span>
                </button>

                <button
                  onClick={downloadCinematicHTML}
                  className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                  title="Download as 𝙱𝙹𝙴 ~Clan - notes.html"
                >
                  <Download className="w-4 h-4" />
                  <span className="text-xs sm:text-sm font-black">Download</span>
                </button>

                <button
                  onClick={copyToClipboard}
                  className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl transition-colors"
                  title="Copy to clipboard"
                >
                  {copied ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
                </button>
              </div>
            )}
          </div>

          <div 
            className="flex-1 bg-slate-50 dark:bg-slate-800/30 rounded-2xl p-6 overflow-y-auto border border-slate-100 dark:border-slate-800 shadow-inner relative custom-scrollbar"
          >
            {errorMsg ? (
              <div className="h-full flex flex-col items-center justify-center text-red-500 space-y-4 text-center px-4">
                <FileText className="w-12 h-12 opacity-50" />
                <p className="text-sm font-bold">{errorMsg}</p>
              </div>
            ) : (notes || isGenerating) ? (
              <div className="prose prose-sm md:prose-base dark:prose-invert max-w-none text-slate-700 dark:text-slate-300 
                prose-headings:text-slate-900 dark:prose-headings:text-white prose-headings:font-black prose-headings:tracking-tight
                prose-h1:text-3xl prose-h1:text-indigo-950 dark:prose-h1:text-indigo-400 prose-h1:border-b-2 prose-h1:border-indigo-100 dark:prose-h1:border-indigo-900/50 prose-h1:pb-4 prose-h1:mb-8
                prose-h2:text-xl prose-h2:text-indigo-900 dark:prose-h2:text-indigo-300 prose-h2:mt-12 prose-h2:mb-6 prose-h2:border-l-4 prose-h2:border-indigo-200 dark:prose-h2:border-indigo-800 prose-h2:pl-4
                prose-p:leading-relaxed prose-p:mb-6
                prose-blockquote:border-l-4 prose-blockquote:border-indigo-500 prose-blockquote:bg-indigo-50/50 dark:prose-blockquote:bg-indigo-900/20 prose-blockquote:py-4 prose-blockquote:px-6 prose-blockquote:rounded-r-xl prose-blockquote:not-italic
                prose-li:mb-2
                [&>*:first-child]:mt-0">
                <Markdown remarkPlugins={[remarkGfm]}>{notes}</Markdown>
                {isGenerating && (
                  <div className="flex items-center gap-2 mt-8">
                    <span className="inline-block w-3 h-8 bg-indigo-600 animate-pulse align-middle rounded-sm"></span>
                    {notes.trim().length === 0 && (
                      <span className="text-indigo-600 font-black animate-pulse text-lg italic">Thinking...</span>
                    )}
                  </div>
                )}
                <div ref={notesEndRef} className="h-20" />
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4">
                <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center">
                  <Sparkles className="w-10 h-10 opacity-20" />
                </div>
                <p className="text-sm font-bold">Paste text and click Transform to see the cinematic preview.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
