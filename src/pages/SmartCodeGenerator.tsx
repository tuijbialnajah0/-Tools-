import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { 
  Code2, 
  Download, 
  RefreshCw, 
  ChevronLeft, 
  FileCode2, 
  Search,
  AlertCircle
} from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { collection, query, where, getDocs, limit } from "firebase/firestore";
import { db } from "../firebase";
import { executeTool } from "../lib/toolService";
import Editor from "react-simple-code-editor";
import Prism from "prismjs";
import "prismjs/themes/prism-tomorrow.css";
import "prismjs/components/prism-markup";
import "prismjs/components/prism-css";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-json";
import "prismjs/components/prism-python";
import "prismjs/components/prism-java";
import "prismjs/components/prism-c";
import "prismjs/components/prism-cpp";
import "prismjs/components/prism-markup-templating";
import "prismjs/components/prism-php";
import "prismjs/components/prism-sql";
import "prismjs/components/prism-markdown";

const LANGUAGES = [
  { id: "javascript", name: "JavaScript", ext: "js", prism: "javascript" },
  { id: "html", name: "HTML", ext: "html", prism: "markup" },
  { id: "css", name: "CSS", ext: "css", prism: "css" },
  { id: "json", name: "JSON", ext: "json", prism: "json" },
  { id: "python", name: "Python", ext: "py", prism: "python" },
  { id: "java", name: "Java", ext: "java", prism: "java" },
  { id: "c", name: "C", ext: "c", prism: "c" },
  { id: "cpp", name: "C++", ext: "cpp", prism: "cpp" },
  { id: "php", name: "PHP", ext: "php", prism: "php" },
  { id: "sql", name: "SQL", ext: "sql", prism: "sql" },
  { id: "markdown", name: "Markdown", ext: "md", prism: "markdown" },
  { id: "xml", name: "XML", ext: "xml", prism: "markup" },
  { id: "text", name: "Plain Text", ext: "txt", prism: "text" },
];

export function SmartCodeGenerator() {
  const { user, updateUser } = useAuth();
  const [code, setCode] = useState("");
  const [detectedLangId, setDetectedLangId] = useState("text");
  const [fileName, setFileName] = useState("untitled");
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [toolId, setToolId] = useState<string | null>(null);
  const [creditCost, setCreditCost] = useState(5);

  useEffect(() => {
    const fetchToolId = async () => {
      try {
        const toolsRef = collection(db, "tools");
        const q = query(toolsRef, where("tool_name", "==", "Smart Code Generator"), limit(1));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          const doc = querySnapshot.docs[0];
          setToolId(doc.id);
          setCreditCost(doc.data().credit_cost);
        }
      } catch (err) {
        console.error("Error fetching tool ID:", err);
      }
    };
    fetchToolId();
  }, []);

  const detectLanguage = () => {
    if (!code.trim()) {
      setDetectedLangId("text");
      return;
    }

    let detected = "text";
    
    if (/^\s*[\{\[]/s.test(code)) {
      try { JSON.parse(code); detected = "json"; } catch (e) {}
    } else if (/<\?php/i.test(code)) {
      detected = "php";
    } else if (/<!DOCTYPE html>|<html|<head|<body/i.test(code)) {
      detected = "html";
    } else if (/<\?xml/i.test(code)) {
      detected = "xml";
    } else if (/#include\s*<iostream>|std::cout/.test(code)) {
      detected = "cpp";
    } else if (/#include\s*<stdio\.h>/.test(code)) {
      detected = "c";
    } else if (/public\s+class\s+\w+|public\s+static\s+void\s+main/.test(code)) {
      detected = "java";
    } else if (/def\s+\w+\s*\(|import\s+\w+|print\s*\(/.test(code)) {
      detected = "python";
    } else if (/SELECT\s+.*\s+FROM|INSERT\s+INTO|UPDATE\s+.*\s+SET|CREATE\s+TABLE/i.test(code)) {
      detected = "sql";
    } else if (/function\s+\w+|const\s+\w+\s*=|let\s+\w+\s*=|var\s+\w+\s*=|console\.log|document\.querySelector/.test(code)) {
      detected = "javascript";
    } else if (/[.#a-zA-Z0-9-]+\s*\{[^}]*:[^}]*;/.test(code)) {
      detected = "css";
    } else if (/^#+\s|^\*\s|^-\s|^1\.\s/m.test(code)) {
      detected = "markdown";
    }

    setDetectedLangId(detected);
  };

  const handleDownload = async () => {
    if (!code.trim()) {
      setError("Please enter some code before downloading.");
      return;
    }

    const isAdmin = user?.role === "admin";
    if (!isAdmin && user && user.credit_balance < creditCost) {
      setError("Insufficient credits to download this file.");
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Deduct credits
      if (toolId && user) {
        await executeTool(user.id, toolId);
      }

      if (user && !isAdmin) {
        updateUser({ 
          credit_balance: user.credit_balance - creditCost,
          total_spent: (user.total_spent || 0) + creditCost
        });
      }

      // Generate File
      const currentLang = LANGUAGES.find(l => l.id === detectedLangId) || LANGUAGES[LANGUAGES.length - 1];
      const fullFileName = `${fileName || "untitled"}.${currentLang.ext}`;
      
      const blob = new Blob([code], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fullFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

    } catch (err) {
      console.error(err);
      setError("Failed to generate and download file.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClear = () => {
    setCode("");
    setDetectedLangId("text");
    setFileName("untitled");
    setError(null);
  };

  const currentLang = LANGUAGES.find(l => l.id === detectedLangId) || LANGUAGES[LANGUAGES.length - 1];

  const highlightCode = (input: string) => {
    const prismLang = Prism.languages[currentLang.prism] || Prism.languages.text;
    return Prism.highlight(input, prismLang, currentLang.prism);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <Link 
            to="/" 
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
          >
            <ChevronLeft className="w-6 h-6 text-slate-600 dark:text-slate-400" />
          </Link>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white flex items-center">
              Smart Code Generator
              <Code2 className="w-6 h-6 ml-2 text-indigo-500" />
            </h1>
            <p className="text-slate-500 dark:text-slate-400">Detect language and export code to files instantly</p>
          </div>
        </div>
        
        <div className="hidden sm:flex items-center bg-indigo-50 dark:bg-indigo-900/20 px-4 py-2 rounded-lg border border-indigo-100 dark:border-indigo-800">
          <span className="text-sm font-medium text-indigo-800 dark:text-indigo-300">Cost:</span>
          <div className="flex items-center ml-2 text-indigo-600 dark:text-indigo-400 font-bold">
            <span className="mr-1">💳</span>
            {creditCost} Credits
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Left Column: Editor */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-xl flex flex-col h-[600px]">
            <div className="flex items-center justify-between px-4 py-3 bg-slate-950 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <div className="w-3 h-3 rounded-full bg-amber-500" />
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
              </div>
              <div className="flex items-center space-x-4">
                <button 
                  onClick={detectLanguage}
                  className="flex items-center text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors bg-indigo-900/30 px-3 py-1.5 rounded-lg"
                >
                  <Search className="w-3 h-3 mr-1.5" />
                  Auto-Detect
                </button>
                <button 
                  onClick={handleClear}
                  className="flex items-center text-xs font-bold text-slate-400 hover:text-slate-300 transition-colors"
                >
                  <RefreshCw className="w-3 h-3 mr-1.5" />
                  Clear
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-auto relative bg-[#1d1f21]">
              <Editor
                value={code}
                onValueChange={setCode}
                highlight={highlightCode}
                padding={24}
                style={{
                  fontFamily: '"JetBrains Mono", "Fira Code", monospace',
                  fontSize: 14,
                  minHeight: "100%",
                  color: "#f8f8f2"
                }}
                className="editor-container min-h-full"
                textareaClassName="focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Right Column: Settings & Download */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-6 sticky top-8">
            <h3 className="font-bold text-slate-900 dark:text-white text-lg flex items-center">
              <FileCode2 className="w-5 h-5 mr-2 text-indigo-500" /> File Settings
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Detected Language
                </label>
                <select 
                  value={detectedLangId}
                  onChange={(e) => setDetectedLangId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                >
                  {LANGUAGES.map((lang) => (
                    <option key={lang.id} value={lang.id}>{lang.name} (.{lang.ext})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  File Name
                </label>
                <div className="flex items-center">
                  <input 
                    type="text" 
                    value={fileName}
                    onChange={(e) => setFileName(e.target.value)}
                    placeholder="untitled"
                    className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-l-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all w-full min-w-0"
                  />
                  <div className="bg-slate-100 dark:bg-slate-700 border border-l-0 border-slate-200 dark:border-slate-700 rounded-r-xl px-4 py-3 text-sm font-bold text-slate-500 dark:text-slate-400">
                    .{currentLang.ext}
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between text-sm mb-4">
                <span className="text-slate-500 dark:text-slate-400">Download Cost</span>
                <span className="font-bold text-amber-600 dark:text-amber-400 flex items-center">
                  <span className="mr-1">💳</span>
                  {creditCost} Credits
                </span>
              </div>
              <button 
                onClick={handleDownload}
                disabled={isProcessing || !code.trim()}
                className="w-full py-4 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center"
              >
                {isProcessing ? "Processing..." : (
                  <>
                    <Download className="w-5 h-5 mr-2" />
                    Generate & Download
                  </>
                )}
              </button>
            </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 rounded-xl flex items-start space-x-3"
              >
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
