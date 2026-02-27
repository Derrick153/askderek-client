"use client"
import { ChevronLeft, ChevronRight, ShieldCheck } from "lucide-react";
import React, { useState } from "react";

interface ImagePreviewsProps {
  images: string[];
}

const ImagePreviews = ({ images }: ImagePreviewsProps) => {
  const [current, setCurrent] = useState(0);
  const imgs = images?.length > 0 ? images : ["/placeholder-property.jpg"];

  const prev = () => setCurrent((i) => (i === 0 ? imgs.length - 1 : i - 1));
  const next = () => setCurrent((i) => (i === imgs.length - 1 ? 0 : i + 1));

  return (
    <div className="relative h-[400px] sm:h-[550px] w-full overflow-hidden bg-slate-950 rounded-2xl border border-white/5 shadow-2xl">
      {imgs.map((image, index) => (
        <div key={index} className={`absolute inset-0 transition-all duration-700 ease-in-out ${index === current ? "opacity-100 scale-100 rotate-0" : "opacity-0 scale-105 pointer-events-none"}`}>
          <img src={image} alt={`Property photo ${index + 1}`} className="object-cover w-full h-full transition-transform duration-[2000ms] hover:scale-110" />
        </div>
      ))}
      <div className="absolute top-6 left-6 flex items-center gap-2 bg-slate-950/60 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-lg select-none">
        <ShieldCheck className="w-4 h-4 text-orange-500" />
        <span className="text-[10px] font-black text-white uppercase tracking-widest">Verified <span className="text-orange-500 italic">Property</span></span>
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-slate-950/80 to-transparent pointer-events-none" />
      {imgs.length > 1 && (
        <>
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-20">
            {imgs.map((_, i) => (<button key={i} onClick={() => setCurrent(i)} className={`transition-all duration-300 rounded-full ${i === current ? "w-8 h-1 bg-orange-500" : "w-2 h-1 bg-white/30 hover:bg-white/50"}`} />))}
          </div>
          <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 flex justify-between items-center z-10 pointer-events-none">
            <button onClick={prev} className="pointer-events-auto w-12 h-12 bg-white/10 hover:bg-orange-500 backdrop-blur-md border border-white/20 rounded-xl flex items-center justify-center transition-all active:scale-90 group">
              <ChevronLeft className="w-6 h-6 text-white group-hover:-translate-x-0.5 transition-transform" />
            </button>
            <button onClick={next} className="pointer-events-auto w-12 h-12 bg-white/10 hover:bg-orange-500 backdrop-blur-md border border-white/20 rounded-xl flex items-center justify-center transition-all active:scale-90 group">
              <ChevronRight className="w-6 h-6 text-white group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
          <div className="absolute top-6 right-6 bg-slate-950/60 backdrop-blur-md border border-white/10 text-white text-[10px] font-black px-3 py-1.5 rounded-lg tracking-tighter">
            {current + 1} <span className="text-slate-500 mx-1">/</span> {imgs.length} PHOTOS
          </div>
        </>
      )}
    </div>
  );
};

export default ImagePreviews;
