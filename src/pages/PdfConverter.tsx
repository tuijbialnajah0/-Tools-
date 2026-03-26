import React, { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, Upload, CheckCircle2, AlertCircle, Download, FileImage, X, ChevronUp, ChevronDown } from "lucide-react";
import { jsPDF } from "jspdf";

const MAX_FILE_SIZE = 250 * 1024 * 1024; // 250MB per file

interface FileWithPreview {
  file: File;
  preview: string;
}

export function PdfConverter() {
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [compressedResultUrl, setCompressedResultUrl] = useState<string | null>(null);
  const [resultFileName, setResultFileName] = useState<string>("");
  const [compressedResultFileName, setCompressedResultFileName] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cleanup previews on unmount
  useEffect(() => {
    return () => {
      files.forEach(f => URL.revokeObjectURL(f.preview));
    };
  }, []);

  // Calculate dynamic credit cost based on file size (5 credits per 10 MB)
  // (Removed credit logic)
  useEffect(() => {
    if (files.length === 0) {
      return;
    }
  }, [files]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      validateAndAddFiles(Array.from(e.target.files));
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files) {
      validateAndAddFiles(Array.from(e.dataTransfer.files));
    }
  };

  const validateAndAddFiles = (newFiles: File[]) => {
    setError(null);
    setResultUrl(null);
    
    const validFiles: FileWithPreview[] = [];
    let hasError = false;

    for (const file of newFiles) {
      if (!file.type.startsWith("image/")) {
        setError("Unsupported file format. Please upload images only.");
        hasError = true;
        continue;
      }
      
      if (file.size > MAX_FILE_SIZE) {
        setError("One or more files are too large. Please upload images smaller than 250MB.");
        hasError = true;
        continue;
      }

      validFiles.push({
        file,
        preview: URL.createObjectURL(file)
      });
    }

    if (validFiles.length > 0) {
      setFiles((prev) => [...prev, ...validFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => {
      const newFiles = [...prev];
      URL.revokeObjectURL(newFiles[index].preview);
      return newFiles.filter((_, i) => i !== index);
    });
  };

  const moveFile = (index: number, direction: 'up' | 'down') => {
    setFiles((prev) => {
      const newFiles = [...prev];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      
      if (targetIndex < 0 || targetIndex >= newFiles.length) return prev;
      
      [newFiles[index], newFiles[targetIndex]] = [newFiles[targetIndex], newFiles[index]];
      return newFiles;
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Simulated progress
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isProcessing) {
      setProgress(0);
      interval = setInterval(() => {
        setProgress((prev) => {
          if (prev < 85) return prev + Math.floor(Math.random() * 10) + 1;
          if (prev < 95) return prev + 1;
          return prev;
        });
      }, 300);
    } else if (resultUrl) {
      setProgress(100);
    }
    return () => clearInterval(interval);
  }, [isProcessing, resultUrl]);

  const convertToPdf = async () => {
    if (files.length === 0) return null;
    const originalPdf = new jsPDF();
    const compressedPdf = new jsPDF();
    
    for (let i = 0; i < files.length; i++) {
      const { file, preview } = files[i];
      if (i > 0) {
        originalPdf.addPage();
        compressedPdf.addPage();
      }

      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = preview;
      });
      
      const pdfWidth = originalPdf.internal.pageSize.getWidth();
      const pdfHeight = originalPdf.internal.pageSize.getHeight();
      const imgRatio = img.width / img.height;
      const pdfRatio = pdfWidth / pdfHeight;
      
      let finalWidth = pdfWidth;
      let finalHeight = pdfWidth / imgRatio;
      
      if (imgRatio < pdfRatio) {
        finalHeight = pdfHeight;
        finalWidth = pdfHeight * imgRatio;
      }
      
      const x = (pdfWidth - finalWidth) / 2;
      const y = (pdfHeight - finalHeight) / 2;

      // jsPDF can infer the format from the data URL, but we can also provide it
      let format = "JPEG";
      if (file.type === "image/png") format = "PNG";
      else if (file.type === "image/webp") format = "WEBP";
      
      originalPdf.addImage(preview, format, x, y, finalWidth, finalHeight);

      // Create compressed version (approx 75% size reduction)
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      // Scale down by 50% in both dimensions = 25% of original pixels (75% reduction)
      canvas.width = img.width * 0.5;
      canvas.height = img.height * 0.5;
      if (ctx) {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.6);
        compressedPdf.addImage(compressedDataUrl, 'JPEG', x, y, finalWidth, finalHeight);
      } else {
        compressedPdf.addImage(preview, format, x, y, finalWidth, finalHeight);
      }
    }
    
    return {
      original: originalPdf.output("blob"),
      compressed: compressedPdf.output("blob")
    };
  };

  const handleConvert = async () => {
    if (files.length === 0) return;

    setIsProcessing(true);
    setError(null);
    setProgress(0);

    try {
      const resultBlobs = await convertToPdf();
      if (!resultBlobs) throw new Error("Conversion failed to produce a file.");

      const url = URL.createObjectURL(resultBlobs.original);
      const compressedUrl = URL.createObjectURL(resultBlobs.compressed);
      setResultUrl(url);
      setCompressedResultUrl(compressedUrl);
      
      // Generate filename
      const baseName = files[0].file.name.substring(0, files[0].file.name.lastIndexOf('.')) || files[0].file.name;
      setResultFileName(`${files.length > 1 ? 'merged-images' : baseName}-converted.pdf`);
      setCompressedResultFileName(`${files.length > 1 ? 'merged-images' : baseName}-compressed.pdf`);

    } catch (err: any) {
      console.error("Conversion error:", err);
      setError(err.message || "Failed to convert file. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const reset = () => {
    setFiles([]);
    setResultUrl(null);
    setCompressedResultUrl(null);
    setError(null);
    setProgress(0);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center space-x-4">
          
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white flex items-center flex-wrap">
              Image to PDF Converter
              <FileImage className="w-6 h-6 ml-2 text-indigo-500" />
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm sm:text-base">
              Convert multiple images into a single PDF document.
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-xl flex items-start">
          <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        {files.length === 0 ? (
          <div 
            className="p-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-700 m-6 rounded-xl hover:border-indigo-400 dark:hover:border-indigo-500 transition-colors cursor-pointer bg-slate-50 dark:bg-slate-800/50"
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              accept="image/*"
              multiple
            />
            <div className="w-20 h-20 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <Upload className="w-10 h-10 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
              Drag & drop images here
            </h3>
            <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-md mx-auto">
              Select multiple images (JPG, PNG, WEBP) to combine them into a single PDF.
            </p>
            <button className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors shadow-sm">
              Browse Images
            </button>
          </div>
        ) : (
          <div className="p-6 md:p-8">
            <div className="flex flex-col md:flex-row gap-8">
              {/* File List */}
              <div className="flex-1 bg-slate-50 dark:bg-slate-800/50 rounded-xl p-6 border border-slate-100 dark:border-slate-700 flex flex-col">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold text-slate-900 dark:text-white">
                    Selected Images ({files.length})
                  </h3>
                  {!isProcessing && !resultUrl && (
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
                    >
                      + Add more
                    </button>
                  )}
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    accept="image/*"
                    multiple
                  />
                </div>
                
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                  {files.map((fileObj, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                      <div className="flex items-center space-x-3 overflow-hidden">
                        <div className="relative w-12 h-12 rounded bg-slate-100 dark:bg-slate-800 flex-shrink-0 overflow-hidden border border-slate-200 dark:border-slate-700">
                          <img 
                            src={fileObj.preview} 
                            alt="preview" 
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute top-0 left-0 bg-indigo-600 text-white text-[10px] font-bold px-1 rounded-br">
                            {idx + 1}
                          </div>
                        </div>
                        <div className="truncate">
                          <p className="text-sm font-medium text-slate-900 dark:text-white truncate" title={fileObj.file.name}>
                            {fileObj.file.name}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {formatFileSize(fileObj.file.size)}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-1">
                        {!isProcessing && !resultUrl && (
                          <>
                            <div className="flex flex-col">
                              <button
                                onClick={() => moveFile(idx, 'up')}
                                disabled={idx === 0}
                                className="p-1 text-slate-400 hover:text-indigo-500 disabled:opacity-30 disabled:hover:text-slate-400 transition-colors"
                                title="Move up"
                              >
                                <ChevronUp className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => moveFile(idx, 'down')}
                                disabled={idx === files.length - 1}
                                className="p-1 text-slate-400 hover:text-indigo-500 disabled:opacity-30 disabled:hover:text-slate-400 transition-colors"
                                title="Move down"
                              >
                                <ChevronDown className="w-4 h-4" />
                              </button>
                            </div>
                            <button 
                              onClick={() => removeFile(idx)}
                              className="p-1.5 text-slate-400 hover:text-red-500 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                              title="Remove"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                
                {!isProcessing && !resultUrl && (
                  <button 
                    onClick={reset}
                    className="mt-6 text-sm text-red-600 dark:text-red-400 hover:underline self-center"
                  >
                    Clear all images
                  </button>
                )}
              </div>

              {/* Conversion Controls */}
              <div className="flex-1 flex flex-col justify-center">
                {!resultUrl ? (
                  <div className="space-y-6">
                    <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl border border-indigo-100 dark:border-indigo-800">
                      <h4 className="font-medium text-indigo-900 dark:text-indigo-200 mb-1">Ready to convert</h4>
                      <p className="text-sm text-indigo-700 dark:text-indigo-300">
                        {files.length} image{files.length !== 1 ? 's' : ''} will be combined into a single PDF document. Each image will be placed on its own page.
                      </p>
                    </div>

                    {isProcessing ? (
                      <div className="space-y-3">
                        <div className="flex justify-between text-sm font-medium">
                          <span className="text-slate-700 dark:text-slate-300">Converting...</span>
                          <span className="text-indigo-600 dark:text-indigo-400">{progress}%</span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-3 overflow-hidden">
                          <div 
                            className="bg-indigo-600 h-3 rounded-full transition-all duration-300 ease-out"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={handleConvert}
                        className="w-full py-4 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-sm flex items-center justify-center active:scale-[0.98]"
                      >
                        Convert to PDF
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-6 text-center">
                    <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1">
                        Conversion Complete!
                      </h3>
                      <p className="text-slate-500 dark:text-slate-400">
                        Your PDF is ready to download.
                      </p>
                    </div>
                    
                    <div className="flex flex-col gap-3">
                      <a
                        href={resultUrl}
                        download={resultFileName}
                        className="w-full py-4 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-sm flex items-center justify-center"
                      >
                        <Download className="w-5 h-5 mr-2" />
                        Download Original PDF
                      </a>
                      {compressedResultUrl && (
                        <a
                          href={compressedResultUrl}
                          download={compressedResultFileName}
                          className="w-full py-4 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-all shadow-sm flex items-center justify-center"
                        >
                          <Download className="w-5 h-5 mr-2" />
                          Download Compressed PDF (-75%)
                        </a>
                      )}
                      <button
                        onClick={reset}
                        className="w-full py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                      >
                        Convert More Images
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
