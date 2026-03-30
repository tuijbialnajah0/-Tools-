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
  const [selectedTheme, setSelectedTheme] = useState<number>(0);
  const [copied, setCopied] = useState(false);

  const themes = [
    'Classic Paper', 'Midnight Neon', 'Emerald Forest', 'Cyberpunk', 
    'Royal Velvet', 'Sakura Blossom', 'Oceanic Depth', 'High Contrast'
  ];
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
    const html = generateCinematicHTML(generatedTitle, notes, selectedTheme);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const safeTitle = generatedTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    saveAs(blob, `𝙱𝙹𝙴_Clan_${safeTitle}_notes.html`);
  };

  const openCinematicView = () => {
    if (!notes) return;
    const html = generateCinematicHTML(generatedTitle, notes, selectedTheme);
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
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#020617] py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-500/5 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-500/5 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="max-w-7xl mx-auto space-y-12 relative z-10">
        <div className="text-center space-y-6">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-5xl font-black tracking-tight text-slate-900 dark:text-white sm:text-6xl bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 pb-2">
              Text to Cinematic Notes
            </h1>
            <div className="h-1.5 w-24 bg-gradient-to-r from-indigo-600 to-purple-600 mx-auto rounded-full mt-2"></div>
          </motion.div>
          
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="text-xl text-slate-500 dark:text-slate-400 max-w-2xl mx-auto font-medium"
          >
            Paste raw text and transform it into a stunning cinematic study experience.
            <span className="block text-sm mt-2 font-mono text-indigo-500 uppercase tracking-widest">Powered by 𝙱𝙹𝙴 ~ Clan</span>
          </motion.p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* Left Column: Input */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-8 rounded-[2.5rem] shadow-xl shadow-indigo-500/5 border border-white/20 dark:border-slate-800/50 flex flex-col h-[700px]"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                Input Content
              </h2>
              <div className="flex flex-col items-end gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Length</span>
                  <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                    {(['short', 'medium', 'long'] as SummaryLength[]).map((len) => (
                      <button
                        key={len}
                        onClick={() => setSummaryLength(len)}
                        className={`px-2 py-1 text-[9px] font-black uppercase tracking-tighter rounded-lg transition-all ${
                          summaryLength === len 
                            ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' 
                            : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                        }`}
                      >
                        {len}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Theme</span>
                  <select 
                    value={selectedTheme}
                    onChange={(e) => setSelectedTheme(Number(e.target.value))}
                    className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[9px] font-black uppercase tracking-tighter rounded-lg px-2 py-1 outline-none border-none cursor-pointer"
                  >
                    {themes.map((t, i) => (
                      <option key={t} value={i}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 mb-6">
              <button
                onClick={() => setInputMode('paste')}
                className={`flex-1 py-3 rounded-2xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                  inputMode === 'paste' 
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' 
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <FileText className="w-4 h-4" />
                Paste Text
              </button>
              <button
                onClick={() => setInputMode('prompt')}
                className={`flex-1 py-3 rounded-2xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                  inputMode === 'prompt' 
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' 
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                AI Prompt
              </button>
            </div>
            
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={inputMode === 'paste' 
                ? "Paste your long text, articles, or research papers here..." 
                : "Enter a topic or prompt (e.g., 'Explain Quantum Computing', 'History of the Roman Empire')..."
              }
              className="flex-1 w-full p-6 bg-slate-50/50 dark:bg-slate-800/30 border-2 border-slate-100 dark:border-slate-800 rounded-3xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all resize-none text-slate-700 dark:text-slate-300 font-medium leading-relaxed custom-scrollbar"
            />

            <div className="mt-6 flex gap-4">
              <button
                onClick={handleGenerateNotes}
                disabled={!inputText.trim() || isGenerating}
                className="flex-1 py-4 px-6 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold rounded-2xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-xl shadow-indigo-500/20 active:scale-95"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span className="animate-pulse">Transforming...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Transform to Cinematic
                  </>
                )}
              </button>
              
              <button
                onClick={clearAll}
                className="p-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                title="Clear input"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </motion.div>

          {/* Right Column: Preview */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl shadow-indigo-500/10 border border-slate-100 dark:border-slate-800 flex flex-col h-[700px] overflow-hidden"
          >
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-800/30">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white">
                  <Sparkles className="w-5 h-5" />
                </div>
                Cinematic Preview
              </h2>
              
              {notes && !isGenerating && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={openCinematicView}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20 group"
                  >
                    <Download className="w-4 h-4 group-hover:translate-y-0.5 transition-transform" />
                    <span className="text-sm font-bold">Open Full View</span>
                  </button>
                  <button
                    onClick={copyToClipboard}
                    className="p-2.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl transition-all"
                    title="Copy notes"
                  >
                    {copied ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
                  </button>
                </div>
              )}
            </div>

            <div 
              className="flex-1 bg-white dark:bg-slate-900 p-8 sm:p-12 overflow-y-auto relative custom-scrollbar"
            >
              {errorMsg ? (
                <div className="h-full flex flex-col items-center justify-center text-red-500 space-y-4 text-center px-4">
                  <div className="w-20 h-20 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center">
                    <FileText className="w-10 h-10 opacity-50" />
                  </div>
                  <p className="text-sm font-bold">{errorMsg}</p>
                </div>
              ) : (notes || isGenerating) ? (
                <div className="prose prose-slate dark:prose-invert max-w-none 
                  prose-headings:text-slate-900 dark:prose-headings:text-white prose-headings:font-black prose-headings:tracking-tight
                  prose-h1:text-5xl prose-h1:text-indigo-950 dark:prose-h1:text-indigo-400 prose-h1:border-b-4 prose-h1:border-indigo-100 dark:prose-h1:border-indigo-900/50 prose-h1:pb-8 prose-h1:mb-12
                  prose-h2:text-3xl prose-h2:text-indigo-900 dark:prose-h2:text-indigo-300 prose-h2:mt-16 prose-h2:mb-8 prose-h2:border-l-8 prose-h2:border-indigo-200 dark:prose-h2:border-indigo-800 prose-h2:pl-6
                  prose-p:text-lg prose-p:leading-relaxed prose-p:text-slate-600 dark:prose-p:text-slate-200 prose-p:mb-8
                  prose-blockquote:border-l-8 prose-blockquote:border-indigo-500 prose-blockquote:bg-indigo-50/50 dark:prose-blockquote:bg-indigo-900/20 prose-blockquote:py-8 prose-blockquote:px-10 prose-blockquote:rounded-r-[2rem] prose-blockquote:not-italic prose-blockquote:text-slate-800 dark:prose-blockquote:text-slate-200 prose-blockquote:shadow-inner prose-blockquote:my-12
                  prose-li:text-lg prose-li:mb-4 dark:prose-li:text-slate-200 prose-li:marker:text-indigo-500
                  prose-table:block prose-table:overflow-x-auto prose-table:whitespace-nowrap prose-table:border-collapse prose-table:w-full prose-table:my-8 prose-table:rounded-xl prose-table:border prose-table:border-indigo-100 dark:prose-table:border-indigo-900/50
                  prose-thead:bg-indigo-50 dark:prose-thead:bg-indigo-900/20 prose-thead:text-indigo-900 dark:prose-thead:text-indigo-300 prose-thead:border-b-2 prose-thead:border-indigo-100 dark:prose-thead:border-indigo-900/50
                  prose-th:px-6 prose-th:py-4 prose-th:text-left prose-th:font-bold prose-th:border prose-th:border-indigo-100 dark:prose-th:border-indigo-900/50 prose-th:min-w-[200px]
                  prose-td:px-6 prose-td:py-4 prose-td:border prose-td:border-indigo-50 dark:prose-td:border-indigo-900/30 dark:prose-td:text-slate-200 prose-td:min-w-[200px]
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
                    <Sparkles className="w-12 h-12 opacity-20 -rotate-12" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-lg font-bold text-slate-900 dark:text-white">Empty Preview</p>
                    <p className="text-sm max-w-[250px] mx-auto">Paste text and click Transform to see the cinematic preview.</p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
