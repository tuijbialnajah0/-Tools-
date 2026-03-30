import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileUp, 
  Download, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  FileImage,
  Trash2,
  Image as ImageIcon,
  Files
} from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
// @ts-ignore
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

// Set up PDF.js worker using Vite's URL import
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

interface PageImage {
  id: number;
  dataUrl: string;
  blob: Blob;
}

export function PdfToImage() {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [images, setImages] = useState<PageImage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
      setImages([]);
      setError(null);
      setProgress(0);
    } else if (selectedFile) {
      setError('Please select a valid PDF file.');
    }
  };

  const convertPdfToImages = async () => {
    if (!file) return;

    setIsProcessing(true);
    setError(null);
    setImages([]);
    setProgress(0);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const totalPages = pdf.numPages;
      const newImages: PageImage[] = [];

      for (let i = 1; i <= totalPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 2.0 }); // High quality scale
        
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Could not get canvas context');

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({ 
          canvasContext: context, 
          viewport,
          // @ts-ignore - Some versions of pdfjs-dist types are inconsistent
          canvas: canvas 
        }).promise;
        
        const dataUrl = canvas.toDataURL('image/png');
        
        // Convert dataUrl to Blob
        const response = await fetch(dataUrl);
        const blob = await response.blob();

        newImages.push({
          id: i,
          dataUrl,
          blob
        });

        setProgress(Math.round((i / totalPages) * 100));
      }

      setImages(newImages);
    } catch (err) {
      console.error('PDF Conversion Error:', err);
      setError('Failed to convert PDF. The file might be corrupted or protected.');
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadAll = async () => {
    if (images.length === 0) return;

    const zip = new JSZip();
    const folderName = file?.name.replace('.pdf', '') || 'pdf-images';
    const imgFolder = zip.folder(folderName);

    if (!imgFolder) return;

    images.forEach((img) => {
      imgFolder.file(`page-${img.id}.png`, img.blob);
    });

    const content = await zip.generateAsync({ type: 'blob' });
    saveAs(content, `${folderName}-images.zip`);
  };

  const downloadIndividually = async () => {
    if (images.length === 0) return;

    const folderName = file?.name.replace('.pdf', '') || 'pdf-images';
    
    for (const img of images) {
      saveAs(img.blob, `${folderName}-page-${img.id}.png`);
      // Small delay to prevent browser from blocking multiple downloads
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  };

  const reset = () => {
    setFile(null);
    setImages([]);
    setProgress(0);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-rose-600 text-white shadow-xl shadow-rose-500/20 mb-4"
          >
            <FileImage className="w-10 h-10" />
          </motion.div>
          <h1 className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
            PDF to <span className="text-rose-600">Image</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-lg max-w-2xl mx-auto">
            Convert your PDF pages into high-quality PNG images and download them all in a single ZIP file.
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 p-8 shadow-xl">
          {!file ? (
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="group relative border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[2rem] p-12 text-center cursor-pointer hover:border-rose-500/50 hover:bg-rose-50/30 dark:hover:bg-rose-950/10 transition-all duration-300"
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".pdf"
                className="hidden"
              />
              <div className="space-y-4">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 group-hover:bg-rose-100 dark:group-hover:bg-rose-900/30 group-hover:text-rose-600 transition-colors duration-300">
                  <FileUp className="w-8 h-8" />
                </div>
                <div className="space-y-2">
                  <p className="text-xl font-bold text-slate-900 dark:text-white">
                    Drop your PDF here
                  </p>
                  <p className="text-slate-500 dark:text-slate-400">
                    or click to browse from your device
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-rose-100 dark:bg-rose-900/30 text-rose-600 flex items-center justify-center">
                    <Files className="w-6 h-6" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900 dark:text-white truncate max-w-[200px] sm:max-w-md">
                      {file.name}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {(file.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <button
                  onClick={reset}
                  disabled={isProcessing}
                  className="p-2 text-slate-400 hover:text-rose-600 transition-colors disabled:opacity-50"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>

              {isProcessing && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-sm font-bold">
                    <span className="text-slate-600 dark:text-slate-400">Converting pages...</span>
                    <span className="text-rose-600">{progress}%</span>
                  </div>
                  <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-rose-600"
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}

              {error && (
                <div className="flex items-center gap-3 p-4 bg-rose-50 dark:bg-rose-950/30 text-rose-600 rounded-2xl border border-rose-200 dark:border-rose-900/50">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <p className="text-sm font-medium">{error}</p>
                </div>
              )}

              {!isProcessing && images.length === 0 && (
                <button
                  onClick={convertPdfToImages}
                  className="w-full py-4 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl font-bold shadow-lg shadow-rose-600/20 transition-all flex items-center justify-center gap-2"
                >
                  <ImageIcon className="w-5 h-5" />
                  Convert to Images
                </button>
              )}

              {images.length > 0 && (
                <div className="space-y-6">
                  <div className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 rounded-2xl border border-emerald-200 dark:border-emerald-900/50">
                    <CheckCircle2 className="w-5 h-5 shrink-0" />
                    <p className="text-sm font-medium">Successfully converted {images.length} pages!</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button
                      onClick={downloadAll}
                      className="py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center gap-2"
                    >
                      <Download className="w-5 h-5" />
                      Download All as ZIP
                    </button>

                    <button
                      onClick={downloadIndividually}
                      className="py-4 bg-slate-800 hover:bg-slate-900 text-white rounded-2xl font-bold shadow-lg shadow-slate-800/20 transition-all flex items-center justify-center gap-2"
                    >
                      <ImageIcon className="w-5 h-5" />
                      Download Individually
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {images.slice(0, 6).map((img) => (
                      <div key={img.id} className="relative aspect-[3/4] rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800">
                        <img 
                          src={img.dataUrl} 
                          alt={`Page ${img.id}`} 
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute bottom-2 right-2 bg-black/50 backdrop-blur-sm text-white text-[10px] px-2 py-1 rounded-md font-bold">
                          Page {img.id}
                        </div>
                      </div>
                    ))}
                    {images.length > 6 && (
                      <div className="aspect-[3/4] rounded-xl border border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-400 font-bold text-sm">
                        +{images.length - 6} more
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[
            { title: 'High Quality', desc: 'Rendered at 2x scale for crisp results.' },
            { title: 'Privacy First', desc: 'All processing happens in your browser.' },
            { title: 'Batch Export', desc: 'Download all pages in a single ZIP.' }
          ].map((feature, i) => (
            <div key={i} className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-white mb-1">{feature.title}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
