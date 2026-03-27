import React, { useState, useMemo, useRef } from 'react';
import { motion } from 'motion/react';
import { FileText, Type, Hash, AlignLeft, Clock, Copy, Trash2, Upload } from 'lucide-react';

export default function WordCounter() {
  const [text, setText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const stats = useMemo(() => {
    const trimmedText = text.trim();
    
    const words = trimmedText ? trimmedText.split(/\s+/).filter(w => w.length > 0).length : 0;
    const characters = text.length;
    const charactersNoSpaces = text.replace(/\s/g, '').length;
    const sentences = trimmedText ? trimmedText.split(/[.!?]+/).filter(s => s.trim().length > 0).length : 0;
    const paragraphs = trimmedText ? trimmedText.split(/\n+/).filter(p => p.trim().length > 0).length : 0;
    const readingTime = Math.ceil(words / 200); // Average reading speed: 200 wpm

    return {
      words,
      characters,
      charactersNoSpaces,
      sentences,
      paragraphs,
      readingTime
    };
  }, [text]);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
  };

  const handleClear = () => {
    setText('');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (file.name.toLowerCase().endsWith('.html') || file.name.toLowerCase().endsWith('.htm') || file.type === 'text/html') {
        const doc = new DOMParser().parseFromString(content, 'text/html');
        setText(doc.body.textContent || '');
      } else {
        setText(content);
      }
    };
    reader.readAsText(file);
    
    // Reset file input so the same file can be uploaded again if needed
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const statCards = [
    { label: 'Words', value: stats.words, icon: Type, color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/30' },
    { label: 'Characters', value: stats.characters, icon: Hash, color: 'text-indigo-500', bg: 'bg-indigo-100 dark:bg-indigo-900/30' },
    { label: 'Characters (No Spaces)', value: stats.charactersNoSpaces, icon: Hash, color: 'text-purple-500', bg: 'bg-purple-100 dark:bg-purple-900/30' },
    { label: 'Sentences', value: stats.sentences, icon: AlignLeft, color: 'text-pink-500', bg: 'bg-pink-100 dark:bg-pink-900/30' },
    { label: 'Paragraphs', value: stats.paragraphs, icon: FileText, color: 'text-rose-500', bg: 'bg-rose-100 dark:bg-rose-900/30' },
    { label: 'Reading Time', value: `${stats.readingTime} min`, icon: Clock, color: 'text-orange-500', bg: 'bg-orange-100 dark:bg-orange-900/30' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="text-center space-y-4">
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-3xl flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/10"
          >
            <FileText className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
          </motion.div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">
            Word Counter
          </h1>
          <p className="text-lg text-slate-500 dark:text-slate-400 max-w-2xl mx-auto font-medium">
            Count words, characters, sentences, and paragraphs instantly. Paste text or upload a file.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Input Area */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col h-[500px]">
              
              {/* Toolbar */}
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                <div className="flex items-center gap-2">
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileUpload} 
                    accept=".txt,.html,.htm" 
                    className="hidden" 
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 rounded-xl text-sm font-bold transition-all bg-emerald-600 text-white shadow-md shadow-emerald-500/20 hover:bg-emerald-700"
                  >
                    <Upload className="w-4 h-4 inline-block mr-2" />
                    Upload File
                  </button>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopy}
                    className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors"
                    title="Copy text"
                  >
                    <Copy className="w-5 h-5" />
                  </button>
                  <button
                    onClick={handleClear}
                    className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    title="Clear text"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Textarea */}
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Type or paste your text here, or upload a .txt / .html file..."
                className="flex-1 w-full p-6 bg-transparent resize-none outline-none text-slate-700 dark:text-slate-300 placeholder:text-slate-400 dark:placeholder:text-slate-600 text-lg leading-relaxed"
              />
            </div>
          </div>

          {/* Stats Panel */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-1 gap-3 sm:gap-4">
              {statCards.map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-2xl sm:rounded-[2rem] shadow-lg border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 overflow-hidden"
                >
                  <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 ${stat.bg}`}>
                    <stat.icon className={`w-5 h-5 sm:w-6 sm:h-6 ${stat.color}`} />
                  </div>
                  <div className="min-w-0 w-full">
                    <p className="text-[10px] sm:text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider break-words leading-tight mb-1 sm:mb-0">
                      {stat.label}
                    </p>
                    <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white truncate">
                      {stat.value}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
