import React, { useState, useRef, useEffect } from 'react';
import { Image as ImageIcon, Loader2, Download, Sparkles, Wand2, AlertCircle } from 'lucide-react';
import { getGenAI, getAllKeysCount } from '../services/geminiService';


export default function TextToImage() {
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<'1:1' | '3:4' | '4:3' | '9:16' | '16:9'>('1:1');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [hasApiKey, setHasApiKey] = useState(false);

  useEffect(() => {
    const checkKey = async () => {
      if (window.aistudio?.hasSelectedApiKey) {
        const selected = await window.aistudio.hasSelectedApiKey();
        setHasApiKey(selected);
      }
    };
    checkKey();
  }, []);

  const handleSelectKey = async () => {
    if (window.aistudio?.openSelectKey) {
      await window.aistudio.openSelectKey();
      setHasApiKey(true);
      setError(null);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError('Please enter a prompt');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setGeneratedImages([]);

    try {
      let ai = getGenAI();
      const totalKeys = getAllKeysCount();
      let keyAttempts = 0;

      let images: string[] = [];
      let lastError: any = null;

      const freeModels = [
        'gemini-2.5-flash-image',
        'imagen-4.0-generate-001'
      ];

      for (const currentModel of freeModels) {
        // Reset key attempts for each model
        keyAttempts = 0;
        
        while (keyAttempts < totalKeys) {
          try {
            console.log(`Attempting generation with ${currentModel} using key #${keyAttempts + 1}...`);
            
            if (currentModel.startsWith('imagen')) {
              const response = await ai.models.generateImages({
                model: currentModel,
                prompt: prompt,
                config: {
                  numberOfImages: 4,
                  aspectRatio: aspectRatio,
                },
              });

              if (response.generatedImages && response.generatedImages.length > 0) {
                images = response.generatedImages.map(img => `data:image/png;base64,${img.image.imageBytes}`);
              }
            } else {
              // For gemini-2.5-flash-image, we need to make 4 separate calls
              // We'll do them in parallel to be fast, but catch individual errors
              const promises = Array(4).fill(null).map(() => 
                ai.models.generateContent({
                  model: currentModel,
                  contents: { parts: [{ text: prompt }] },
                  config: { imageConfig: { aspectRatio: aspectRatio } },
                })
              );

              const results = await Promise.allSettled(promises);
              
              let modelFailedWith403 = false;
              for (const result of results) {
                if (result.status === 'fulfilled') {
                  const response = result.value;
                  if (response.candidates?.[0]?.content?.parts) {
                    for (const part of response.candidates[0].content.parts) {
                      if (part.inlineData) {
                        images.push(`data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`);
                        break;
                      }
                    }
                  }
                } else {
                  lastError = result.reason;
                  const errMsg = lastError?.message || "";
                  if (errMsg.includes('403') || errMsg.toLowerCase().includes('permission')) {
                    modelFailedWith403 = true;
                  }
                }
              }
              
              if (modelFailedWith403 && images.length === 0) {
                throw lastError; // Trigger retry with next key
              }
            }

            if (images.length > 0) {
              setGeneratedImages(images);
              break; // Success with this model
            }
            
            break; // No images but no 403, try next model
          } catch (err: any) {
            console.warn(`Model ${currentModel} failed with key attempt ${keyAttempts + 1}:`, err);
            lastError = err;
            
            const errMsg = err.message || "";
            const is403 = errMsg.includes('403') || errMsg.toLowerCase().includes('permission');
            
            if (is403 && keyAttempts < totalKeys - 1) {
              console.log("Permission denied, rotating to next API key...");
              ai = getGenAI(); // Get next key
              keyAttempts++;
              continue; // Retry same model with next key
            }
            
            break; // Try next model
          }
        }
        
        if (images.length > 0) break;
      }

      if (images.length === 0) {
        const errMsg = lastError?.message || "";
        const isQuotaError = errMsg.includes('429') || errMsg.toLowerCase().includes('quota') || errMsg.toLowerCase().includes('resource_exhausted');
        const isPermissionError = errMsg.includes('403') || errMsg.toLowerCase().includes('permission') || errMsg.toLowerCase().includes('permission_denied');

        if (isQuotaError) {
          setError("Quota exceeded for free models. Please select your own API key to continue using high-quality generation.");
        } else if (isPermissionError) {
          setError("Permission denied for all available API keys. Please check your key configuration or select a new one.");
        } else {
          throw lastError || new Error('Failed to generate images. Please try again.');
        }
      }
    } catch (err: any) {
      console.error('Generation error:', err);
      setError(err.message || 'Failed to generate images. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = (url: string, index: number) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = `generated-image-${Date.now()}-${index + 1}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="min-h-full bg-slate-50 dark:bg-slate-950 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl mb-4">
            <Sparkles className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
            Text to <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400">Image</span>
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            Transform your text into stunning images instantly using the lightning-fast Nano Banana model.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Controls Section */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-200 dark:border-slate-800">
              
              <div className="space-y-6">
                {/* Prompt Input */}
                <div className="space-y-3">
                  <label htmlFor="prompt" className="block text-sm font-bold text-slate-700 dark:text-slate-300">
                    What do you want to see?
                  </label>
                  <textarea
                    id="prompt"
                    rows={4}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="A futuristic city with flying cars at sunset, cyberpunk style..."
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all resize-none text-slate-900 dark:text-white placeholder:text-slate-400"
                  />
                </div>

                {/* Aspect Ratio Selector */}
                <div className="space-y-3">
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">
                    Aspect Ratio
                  </label>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                    {(['1:1', '3:4', '4:3', '9:16', '16:9'] as const).map((ratio) => (
                      <button
                        key={ratio}
                        onClick={() => setAspectRatio(ratio)}
                        className={`py-2 px-3 rounded-xl text-sm font-medium transition-all ${
                          aspectRatio === ratio
                            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                      >
                        {ratio}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl text-red-600 dark:text-red-400 text-sm break-words flex flex-col gap-3">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-5 h-5 flex-shrink-0" />
                      <span>{error}</span>
                    </div>
                    {error.includes('Quota exceeded') && (
                      <button
                        onClick={handleSelectKey}
                        className="w-full py-2 px-4 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all text-xs"
                      >
                        Select API Key (Paid)
                      </button>
                    )}
                  </div>
                )}

                {/* Generate Button */}
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating || !prompt.trim()}
                  className="w-full py-4 px-6 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-2xl hover:bg-slate-800 dark:hover:bg-slate-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group">
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                      Generate Image
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Preview Section */}
          <div className="lg:col-span-7">
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-200 dark:border-slate-800 h-full min-h-[400px] flex flex-col">
              
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-indigo-500" />
                  Generated Results {generatedImages.length > 0 && `(${generatedImages.length})`}
                </h2>
                {generatedImages.length > 0 && (
                  <button
                    onClick={() => generatedImages.forEach((img, i) => handleDownload(img, i))}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-indigo-500/20"
                  >
                    <Download className="w-4 h-4" />
                    Download All
                  </button>
                )}
              </div>

              <div className="flex-1 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-y-auto relative min-h-[500px]">
                {isGenerating ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50/80 dark:bg-slate-950/80 backdrop-blur-md z-10">
                    <div className="w-16 h-16 relative">
                      <div className="absolute inset-0 border-4 border-indigo-200 dark:border-indigo-900 rounded-full"></div>
                      <div className="absolute inset-0 border-4 border-indigo-600 dark:border-indigo-400 rounded-full border-t-transparent animate-spin"></div>
                    </div>
                    <p className="mt-4 text-sm font-medium text-slate-600 dark:text-slate-400 animate-pulse">
                      Dreaming up your images...
                    </p>
                  </div>
                ) : generatedImages.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4">
                    {generatedImages.map((img, idx) => (
                      <div key={idx} className="flex flex-col gap-3 group">
                        <div className="relative aspect-square rounded-2xl overflow-hidden bg-slate-200 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 shadow-sm group-hover:shadow-md transition-all">
                          <img 
                            src={img} 
                            alt={`Generated ${idx + 1}`} 
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                             <button
                              onClick={() => handleDownload(img, idx)}
                              className="p-3 bg-white text-indigo-600 rounded-full hover:scale-110 transition-transform shadow-xl"
                            >
                              <Download className="w-6 h-6" />
                            </button>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDownload(img, idx)}
                          className="flex items-center justify-center gap-2 w-full py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-bold rounded-xl border border-slate-200 dark:border-slate-700 transition-all"
                        >
                          <Download className="w-4 h-4" />
                          Download Image {idx + 1}
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col min-h-0 items-center justify-center text-center p-8">
                    <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                      <ImageIcon className="w-10 h-10 text-slate-300 dark:text-slate-600" />
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 font-medium">
                      Your generated images will appear here
                    </p>
                  </div>
                )}
              </div>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
