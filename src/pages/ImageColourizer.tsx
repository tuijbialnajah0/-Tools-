import React, { useState, useRef } from 'react';
import { Upload, Image as ImageIcon, Download, Loader2, ArrowLeft, Sparkles, RefreshCw, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getGenAI, getAllKeysCount } from '../services/geminiService';

export default function ImageColourizer() {
  const navigate = useNavigate();
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [colourizedImage, setColourizedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasApiKey, setHasApiKey] = useState(false);

  React.useEffect(() => {
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

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Please upload a valid image file.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        setOriginalImage(event.target?.result as string);
        setColourizedImage(null);
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const colourizeImage = async () => {
    if (!originalImage) return;

    setIsProcessing(true);
    setError(null);

    try {
      let ai = getGenAI();
      const totalKeys = getAllKeysCount();
      let keyAttempts = 0;
      
      // Extract base64 data and mime type
      const base64Data = originalImage.split(',')[1];
      const mimeType = originalImage.split(';')[0].split(':')[1];

      const modelsToTry = [
        'gemini-2.5-flash-image',
        'gemini-3.1-flash-image-preview',
        'gemini-3-pro-image-preview'
      ];

      let foundImage = false;
      let lastError: any = null;

      for (const modelName of modelsToTry) {
        // Reset key attempts for each model
        keyAttempts = 0;
        
        while (keyAttempts < totalKeys) {
          try {
            const response = await ai.models.generateContent({
              model: modelName,
              contents: {
                parts: [
                  {
                    inlineData: {
                      data: base64Data,
                      mimeType: mimeType,
                    },
                  },
                  {
                    text: 'Colorize this black and white image. Make it look natural, realistic, and vibrant. Return only the colorized image.',
                  },
                ],
              },
            });

            if (response.candidates && response.candidates[0] && response.candidates[0].content && response.candidates[0].content.parts) {
              for (const part of response.candidates[0].content.parts) {
                if (part.inlineData) {
                  const resultBase64 = part.inlineData.data;
                  setColourizedImage(`data:image/png;base64,${resultBase64}`);
                  foundImage = true;
                  break;
                }
              }
            }

            if (foundImage) {
              break; // Success, exit retry loop
            }
            
            break; // No image but no 403, try next model
          } catch (err: any) {
            console.warn(`Model ${modelName} failed with key attempt ${keyAttempts + 1}:`, err);
            lastError = err;
            
            const errMsg = err.message || "";
            const is403 = errMsg.includes('403') || errMsg.toLowerCase().includes('permission');
            const isQuotaError = errMsg.includes('429') || errMsg.toLowerCase().includes('quota') || errMsg.toLowerCase().includes('resource_exhausted');

            if ((is403 || isQuotaError) && keyAttempts < totalKeys - 1) {
              console.log(`Rotating to next API key due to ${is403 ? 'permission' : 'quota'} error...`);
              ai = getGenAI();
              keyAttempts++;
              continue; // Retry same model
            }

            break; // Try next model
          }
        }

        if (foundImage) break;
      }

      if (!foundImage) {
        const errMsg = lastError?.message || "";
        const isQuotaError = errMsg.includes('429') || errMsg.toLowerCase().includes('quota') || errMsg.toLowerCase().includes('resource_exhausted');
        const isPermissionError = errMsg.includes('403') || errMsg.toLowerCase().includes('permission') || errMsg.toLowerCase().includes('permission_denied');

        if (isQuotaError) {
          setError("Quota exceeded for all available free models. Please select your own API key.");
          return;
        }
        if (isPermissionError) {
          setError("Permission denied for all available API keys. Please check your key configuration.");
          return;
        }
        throw lastError || new Error('AI did not return a colorized image. Please try again.');
      }
    } catch (err: any) {
      console.error('Colorization error:', err);
      setError(err.message || 'An error occurred while colorizing the image.');
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadImage = () => {
    if (!colourizedImage) return;
    const link = document.createElement('a');
    link.href = colourizedImage;
    link.download = 'colorized-image.png';
    link.click();
  };

  const reset = () => {
    setOriginalImage(null);
    setColourizedImage(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <div className="flex items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ImageIcon className="w-8 h-8 text-indigo-600" />
            Image Colourizer
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            Bring old black and white photos to life with AI
          </p>
        </div>
      </div>

      {!originalImage ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-12 text-center hover:border-indigo-500 transition-colors cursor-pointer bg-white dark:bg-slate-900"
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
          />
          <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Upload className="w-8 h-8 text-indigo-600" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Upload Black & White Photo</h3>
          <p className="text-slate-500 dark:text-slate-400">
            Click or drag and drop your image here
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <h3 className="font-semibold text-slate-700 dark:text-slate-300">Original</h3>
            <div className="aspect-square rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <img src={originalImage} alt="Original" className="w-full h-full object-contain" />
            </div>
            {!colourizedImage && !isProcessing && (
              <div className="flex gap-2">
                <button
                  onClick={colourizeImage}
                  className="flex-1 flex items-center justify-center px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20"
                >
                  <Sparkles className="w-5 h-5 mr-2" />
                  Colorize Now
                </button>
                <button
                  onClick={reset}
                  className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  <RefreshCw className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold text-slate-700 dark:text-slate-300">Result</h3>
            <div className="aspect-square rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center relative">
              {isProcessing ? (
                <div className="text-center space-y-4">
                  <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mx-auto" />
                  <p className="text-sm font-medium text-slate-500">AI is painting your photo...</p>
                </div>
              ) : colourizedImage ? (
                <img src={colourizedImage} alt="Colorized" className="w-full h-full object-contain" />
              ) : (
                <div className="text-slate-400 text-sm">Result will appear here</div>
              )}
            </div>
            {colourizedImage && (
              <div className="flex gap-2">
                <button
                  onClick={downloadImage}
                  className="flex-1 flex items-center justify-center px-6 py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition-all shadow-lg shadow-green-500/20"
                >
                  <Download className="w-5 h-5 mr-2" />
                  Download Result
                </button>
                <button
                  onClick={reset}
                  className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  <RefreshCw className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm flex flex-col gap-3">
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

      <div className="bg-indigo-50 dark:bg-indigo-900/10 rounded-2xl p-6 border border-indigo-100 dark:border-indigo-900/30">
        <h3 className="font-bold text-indigo-900 dark:text-indigo-300 mb-2 flex items-center gap-2">
          <Sparkles className="w-4 h-4" />
          How it works
        </h3>
        <p className="text-sm text-indigo-800/70 dark:text-indigo-400/70 leading-relaxed">
          Our AI analyzes the textures, lighting, and objects in your black and white photo to predict the original colors. 
          It uses advanced neural networks to apply realistic skin tones, natural landscapes, and vibrant clothing colors.
          For best results, use high-resolution photos with clear details.
        </p>
      </div>

      <div className="flex flex-col items-center justify-center pt-8 border-t border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-full">
          <Sparkles className="w-4 h-4 text-indigo-600" />
          <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">
            Powered by 𝙱𝙹𝙴 ~ Clan
          </span>
        </div>
        <p className="mt-2 text-[10px] text-slate-400 dark:text-slate-500 text-center max-w-xs">
          Advanced AI colorization technology for professional-grade photo restoration.
        </p>
      </div>
    </div>
  );
}
