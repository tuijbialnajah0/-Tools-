import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { Upload, FileAudio, Loader2, Download, Video, AlertCircle } from 'lucide-react';

export default function VideoToAudio() {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateAndSetFile = (selectedFile: File) => {
    if (selectedFile.type.startsWith('video/')) {
      if (selectedFile.size > 100 * 1024 * 1024) {
        setError('File is too large. Please select a video under 100MB.');
        return;
      }
      setFile(selectedFile);
      setAudioUrl(null);
      setError(null);
    } else {
      setError('Please select a valid video file.');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const extractAudio = async () => {
    if (!file) return;
    
    setIsProcessing(true);
    setError(null);
    setProgress(10);
    
    try {
      // Create an offline audio context
      const arrayBuffer = await file.arrayBuffer();
      setProgress(30);
      
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Decode audio data
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      setProgress(60);
      
      // Convert to WAV
      const wavBlob = audioBufferToWav(audioBuffer);
      setProgress(90);
      
      const url = URL.createObjectURL(wavBlob);
      setAudioUrl(url);
      setProgress(100);
    } catch (err) {
      console.error('Error extracting audio:', err);
      setError('Failed to extract audio. The file might be unsupported or too large for the browser to process.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Helper function to convert AudioBuffer to WAV format
  const audioBufferToWav = (buffer: AudioBuffer) => {
    const numOfChan = buffer.numberOfChannels;
    const length = buffer.length * numOfChan * 2 + 44;
    const out = new ArrayBuffer(length);
    const view = new DataView(out);
    const channels = [];
    let sample = 0;
    let offset = 0;
    let pos = 0;

    // write WAVE header
    setUint32(0x46464952); // "RIFF"
    setUint32(length - 8); // file length - 8
    setUint32(0x45564157); // "WAVE"

    setUint32(0x20746d66); // "fmt " chunk
    setUint32(16); // length = 16
    setUint16(1); // PCM (uncompressed)
    setUint16(numOfChan);
    setUint32(buffer.sampleRate);
    setUint32(buffer.sampleRate * 2 * numOfChan); // avg. bytes/sec
    setUint16(numOfChan * 2); // block-align
    setUint16(16); // 16-bit (hardcoded in this demo)

    setUint32(0x61746164); // "data" - chunk
    setUint32(length - pos - 4); // chunk length

    // write interleaved data
    for (let i = 0; i < buffer.numberOfChannels; i++) {
      channels.push(buffer.getChannelData(i));
    }

    while (pos < length) {
      for (let i = 0; i < numOfChan; i++) {
        sample = Math.max(-1, Math.min(1, channels[i][offset])); // clamp
        sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0; // scale to 16-bit signed int
        view.setInt16(pos, sample, true); // write 16-bit sample
        pos += 2;
      }
      offset++; // next source sample
    }

    return new Blob([out], { type: "audio/wav" });

    function setUint16(data: number) {
      view.setUint16(pos, data, true);
      pos += 2;
    }

    function setUint32(data: number) {
      view.setUint32(pos, data, true);
      pos += 4;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-black text-slate-900 dark:text-white">Video to Audio</h1>
        <p className="text-lg text-slate-500 dark:text-slate-400">
          Extract audio from any video file directly in your browser. No server uploads.
        </p>
      </div>

      <div 
        className={`border-2 border-dashed rounded-3xl p-12 text-center transition-colors ${
          file ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10' : 'border-slate-300 dark:border-slate-700 hover:border-indigo-400'
        }`}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        <input 
          type="file" 
          accept="video/*" 
          className="hidden" 
          ref={fileInputRef}
          onChange={handleFileChange}
        />
        
        {!file ? (
          <div className="space-y-6 flex flex-col items-center">
            <div className="w-20 h-20 bg-indigo-100 dark:bg-indigo-900/50 rounded-full flex items-center justify-center">
              <Upload className="w-10 h-10 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <p className="text-xl font-semibold text-slate-900 dark:text-white">
                Drag & drop your video here
              </p>
              <p className="text-slate-500 dark:text-slate-400 mt-2">
                or click to browse files (Max 100MB)
              </p>
            </div>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors"
            >
              Select Video
            </button>
          </div>
        ) : (
          <div className="space-y-6 flex flex-col items-center">
            <div className="w-20 h-20 bg-indigo-100 dark:bg-indigo-900/50 rounded-full flex items-center justify-center">
              <Video className="w-10 h-10 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <p className="text-xl font-semibold text-slate-900 dark:text-white">
                {file.name}
              </p>
              <p className="text-slate-500 dark:text-slate-400 mt-2">
                {(file.size / (1024 * 1024)).toFixed(2)} MB
              </p>
            </div>
            <div className="flex gap-4">
              <button 
                onClick={() => { setFile(null); setAudioUrl(null); }}
                className="px-6 py-3 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-white rounded-xl font-medium transition-colors"
              >
                Change File
              </button>
              {!audioUrl && (
                <button 
                  onClick={extractAudio}
                  disabled={isProcessing}
                  className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Extracting... {progress}%
                    </>
                  ) : (
                    <>
                      <FileAudio className="w-5 h-5" />
                      Extract Audio
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl flex items-center gap-3 text-red-600 dark:text-red-400">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {audioUrl && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 space-y-6 text-center shadow-xl shadow-slate-200/50 dark:shadow-none"
        >
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto">
            <FileAudio className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Audio Extracted Successfully!</h3>
            <p className="text-slate-500 dark:text-slate-400 mt-2">Your audio is ready to download.</p>
          </div>
          
          <audio controls src={audioUrl} className="w-full max-w-md mx-auto" />

          <div className="pt-4">
            <a 
              href={audioUrl} 
              download={`${file?.name.replace(/\.[^/.]+$/, "")}.wav`}
              className="inline-flex items-center gap-2 px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-colors shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50"
            >
              <Download className="w-5 h-5" />
              Download Audio (WAV)
            </a>
          </div>
        </motion.div>
      )}
    </div>
  );
}
