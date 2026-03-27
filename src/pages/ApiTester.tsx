import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Send, 
  Plus, 
  Trash2, 
  Copy, 
  Check, 
  RefreshCw, 
  Settings, 
  Code, 
  Globe, 
  Zap, 
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Play,
  Save,
  Clock
} from 'lucide-react';
import { ToolActivator } from '../components/ToolActivator';

interface Header {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
}

interface ApiResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  data: any;
  time: number;
  size: string;
}

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

export default function ApiTester() {
  const [url, setUrl] = useState('');
  const [method, setMethod] = useState('GET');
  const [headers, setHeaders] = useState<Header[]>([
    { id: '1', key: 'Content-Type', value: 'application/json', enabled: true }
  ]);
  const [body, setBody] = useState('');
  const [response, setResponse] = useState<ApiResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'params' | 'headers' | 'body'>('headers');
  const [responseTab, setResponseTab] = useState<'body' | 'headers'>('body');

  const addHeader = () => {
    setHeaders([...headers, { id: Math.random().toString(36).substr(2, 9), key: '', value: '', enabled: true }]);
  };

  const removeHeader = (id: string) => {
    setHeaders(headers.filter(h => h.id !== id));
  };

  const updateHeader = (id: string, field: keyof Header, value: any) => {
    setHeaders(headers.map(h => h.id === id ? { ...h, [field]: value } : h));
  };

  const sendRequest = async () => {
    if (!url) {
      setError('Please enter a URL');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResponse(null);

    const startTime = performance.now();

    try {
      const activeHeaders = headers
        .filter(h => h.enabled && h.key)
        .reduce((acc, h) => ({ ...acc, [h.key]: h.value }), {});

      const res = await fetch('/api/proxy-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url,
          method,
          headers: activeHeaders,
          body: ['GET', 'HEAD'].includes(method) ? undefined : body,
        }),
      });

      const endTime = performance.now();
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Request failed');
      }

      setResponse({
        status: data.status,
        statusText: data.statusText,
        headers: data.headers,
        data: data.data,
        time: Math.round(endTime - startTime),
        size: formatSize(JSON.stringify(data.data).length)
      });
    } catch (err: any) {
      setError(err.message || 'An error occurred while sending the request');
    } finally {
      setIsLoading(false);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const copyResponse = () => {
    if (!response) return;
    navigator.clipboard.writeText(JSON.stringify(response.data, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8">
      <ToolActivator name="API Tester" path="api-tester" />
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div>
            <motion.h1 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight"
            >
              API <span className="text-indigo-600">Tester</span> ☠️
            </motion.h1>
            <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">
              Test your REST APIs with zero CORS issues (Proxy enabled)
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Request Panel */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm">
              {/* URL Bar */}
              <div className="flex gap-2 mb-6">
                <div className="relative flex-1 flex items-center">
                  <select 
                    value={method}
                    onChange={(e) => setMethod(e.target.value)}
                    className="absolute left-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-indigo-600 font-bold text-xs rounded-lg border-none focus:ring-2 focus:ring-indigo-500 outline-none appearance-none cursor-pointer"
                  >
                    {HTTP_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                  <input
                    type="text"
                    placeholder="https://api.example.com/v1/resource"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="w-full pl-24 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-white"
                  />
                </div>
                <button
                  onClick={sendRequest}
                  disabled={isLoading}
                  className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 disabled:opacity-50 transition-all flex items-center gap-2 shadow-lg shadow-indigo-500/20"
                >
                  {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  <span className="hidden sm:inline">Send</span>
                </button>
              </div>

              {/* Request Tabs */}
              <div className="flex gap-4 border-b border-slate-100 dark:border-slate-800 mb-6">
                {(['headers', 'body'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`pb-3 text-xs font-bold uppercase tracking-wider transition-all relative ${
                      activeTab === tab 
                        ? 'text-indigo-600' 
                        : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    {tab}
                    {activeTab === tab && (
                      <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600" />
                    )}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div className="min-h-[300px]">
                {activeTab === 'headers' && (
                  <div className="space-y-3">
                    {headers.map((header) => (
                      <div key={header.id} className="flex gap-2 items-center">
                        <input
                          type="checkbox"
                          checked={header.enabled}
                          onChange={(e) => updateHeader(header.id, 'enabled', e.target.checked)}
                          className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        <input
                          type="text"
                          placeholder="Key"
                          value={header.key}
                          onChange={(e) => updateHeader(header.id, 'key', e.target.value)}
                          className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none focus:ring-1 focus:ring-indigo-500 dark:text-white"
                        />
                        <input
                          type="text"
                          placeholder="Value"
                          value={header.value}
                          onChange={(e) => updateHeader(header.id, 'value', e.target.value)}
                          className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none focus:ring-1 focus:ring-indigo-500 dark:text-white"
                        />
                        <button
                          onClick={() => removeHeader(header.id)}
                          className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={addHeader}
                      className="flex items-center gap-2 text-xs font-bold text-indigo-600 hover:text-indigo-700 mt-4"
                    >
                      <Plus className="w-4 h-4" /> Add Header
                    </button>
                  </div>
                )}

                {activeTab === 'body' && (
                  <div className="h-full flex flex-col">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">JSON Body</span>
                      <button 
                        onClick={() => {
                          try {
                            setBody(JSON.stringify(JSON.parse(body), null, 2));
                          } catch (e) {}
                        }}
                        className="text-[10px] font-bold text-indigo-600 hover:underline"
                      >
                        Beautify
                      </button>
                    </div>
                    <textarea
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      placeholder='{ "key": "value" }'
                      className="flex-1 w-full h-[250px] p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-mono outline-none focus:ring-1 focus:ring-indigo-500 dark:text-white resize-none"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Response Panel */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm h-full flex flex-col min-h-[500px]">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Response</h3>
                {response && (
                  <div className="flex gap-3">
                    <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
                      <Clock className="w-3 h-3" /> {response.time}ms
                    </div>
                    <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
                      <Zap className="w-3 h-3" /> {response.size}
                    </div>
                  </div>
                )}
              </div>

              {!response && !isLoading && !error && (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                  <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                    <Globe className="w-8 h-8 text-slate-300" />
                  </div>
                  <p className="text-sm font-bold text-slate-400">No request sent yet</p>
                  <p className="text-xs text-slate-400 mt-1">Enter a URL and hit send to see the response</p>
                </div>
              )}

              {isLoading && (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                  <div className="relative">
                    <div className="w-16 h-16 border-4 border-slate-100 dark:border-slate-800 rounded-full" />
                    <div className="absolute top-0 left-0 w-16 h-16 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin" />
                  </div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white mt-4">Sending Request...</p>
                </div>
              )}

              {error && (
                <div className="flex-1 p-4 bg-red-50 dark:bg-red-950/30 rounded-2xl border border-red-100 dark:border-red-900/50">
                  <div className="flex items-center gap-2 text-red-600 mb-2">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase">Error</span>
                  </div>
                  <p className="text-xs text-red-500 font-medium leading-relaxed">{error}</p>
                </div>
              )}

              {response && (
                <div className="flex-1 flex flex-col">
                  {/* Status Bar */}
                  <div className={`flex items-center gap-3 p-3 rounded-xl mb-6 ${
                    response.status >= 200 && response.status < 300 
                      ? 'bg-green-50 dark:bg-green-950/30 text-green-600 border border-green-100 dark:border-green-900/50' 
                      : 'bg-red-50 dark:bg-red-950/30 text-red-600 border border-red-100 dark:border-red-900/50'
                  }`}>
                    <span className="text-sm font-black">{response.status}</span>
                    <span className="text-xs font-bold uppercase tracking-wider">{response.statusText}</span>
                  </div>

                  {/* Response Tabs */}
                  <div className="flex gap-4 border-b border-slate-100 dark:border-slate-800 mb-4">
                    {(['body', 'headers'] as const).map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setResponseTab(tab)}
                        className={`pb-2 text-[10px] font-bold uppercase tracking-wider transition-all relative ${
                          responseTab === tab 
                            ? 'text-indigo-600' 
                            : 'text-slate-400 hover:text-slate-600'
                        }`}
                      >
                        {tab}
                        {responseTab === tab && (
                          <motion.div layoutId="responseTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600" />
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Response Content */}
                  <div className="flex-1 relative">
                    {responseTab === 'body' && (
                      <div className="h-full">
                        <button
                          onClick={copyResponse}
                          className="absolute top-2 right-2 p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-400 hover:text-indigo-600 transition-all z-10"
                        >
                          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        </button>
                        <pre className="w-full h-[350px] p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-[10px] font-mono overflow-auto dark:text-white">
                          {JSON.stringify(response.data, null, 2)}
                        </pre>
                      </div>
                    )}

                    {responseTab === 'headers' && (
                      <div className="space-y-2 max-h-[350px] overflow-auto pr-2">
                        {Object.entries(response.headers).map(([key, value]) => (
                          <div key={key} className="flex flex-col p-2 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-100 dark:border-slate-800">
                            <span className="text-[9px] font-bold text-slate-400 uppercase">{key}</span>
                            <span className="text-[10px] font-medium text-slate-700 dark:text-slate-300 break-all">{value}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
