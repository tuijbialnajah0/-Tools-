import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

export function TextViewer() {
  const [searchParams] = useSearchParams();
  const [text, setText] = useState('');

  useEffect(() => {
    const t = searchParams.get('t');
    if (t) {
      setText(t);
    } else {
      setText('No text provided.');
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 flex flex-col items-center justify-center p-6 md:p-12">
      <div className="w-full max-w-7xl mx-auto flex-1 flex items-center justify-center">
        <h1 className="text-5xl md:text-7xl lg:text-8xl font-extrabold text-slate-900 dark:text-white text-center break-words w-full leading-tight tracking-tight">
          {text}
        </h1>
      </div>
      <div className="mt-8 text-slate-400 dark:text-slate-600 text-sm font-medium tracking-widest uppercase">
        Created with 𝙱𝙹𝙴 ~ Tools
      </div>
    </div>
  );
}
