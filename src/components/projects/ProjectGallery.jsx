import React, { useEffect, useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

export default function ProjectGallery({ images = [], initialIndex = 0, isOpen = false, onClose, title = '' }) {
    const [index, setIndex] = useState(initialIndex || 0);

    useEffect(() => {
        if (!isOpen) return;
        setIndex(Math.max(0, Math.min(initialIndex || 0, images.length - 1)));

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, [isOpen, initialIndex, images.length]);

    const next = useCallback((e) => {
        if (e) e.stopPropagation();
        if (!images.length) return;
        setIndex((i) => (i + 1) % images.length);
    }, [images.length]);

    const prev = useCallback((e) => {
        if (e) e.stopPropagation();
        if (!images.length) return;
        setIndex((i) => (i - 1 + images.length) % images.length);
    }, [images.length]);

    useEffect(() => {
        if (!isOpen) return undefined;

        const handleKey = (ev) => {
            if (ev.key === 'Escape') onClose && onClose();
            if (ev.key === 'ArrowRight') next();
            if (ev.key === 'ArrowLeft') prev();
        };

        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [isOpen, next, prev, onClose]);

    if (!isOpen) return null;

    const current = images[index] || images[0] || '';

    return (
        <div
            className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-sm flex items-center justify-center"
            onClick={() => onClose && onClose()}
            role="dialog"
            aria-modal="true"
            aria-label="Galeria de fotos do projeto"
        >
            <div className="absolute inset-0 overflow-hidden" onClick={(e) => e.stopPropagation()}>
                <button
                    type="button"
                    onClick={() => onClose && onClose()}
                    className="absolute top-4 right-4 z-50 p-2 rounded-md bg-black/40 hover:bg-black/60 text-white border border-white/10"
                    title="Fechar galeria"
                >
                    <X className="w-6 h-6" />
                </button>

                <div className="absolute inset-0 flex items-center justify-center bg-transparent">
                    {current ? (
                        <img src={current} alt={`${title} - destaque`} className="w-full h-full object-contain" />
                    ) : (
                        <div className="text-white">Sem imagens</div>
                    )}
                </div>

                <button
                    onClick={prev}
                    className="absolute left-4 top-1/2 -translate-y-1/2 z-50 p-3 rounded-full bg-black/40 hover:bg-black/60 text-white"
                    title="Imagem anterior"
                >
                    <ChevronLeft className="w-7 h-7" />
                </button>

                <button
                    onClick={next}
                    className="absolute right-4 top-1/2 -translate-y-1/2 z-50 p-3 rounded-full bg-black/40 hover:bg-black/60 text-white"
                    title="Próxima imagem"
                >
                    <ChevronRight className="w-7 h-7" />
                </button>

                <div className="absolute bottom-6 left-0 right-0 flex items-center justify-center gap-2 z-40 px-4 overflow-x-auto">
                    {images.map((img, i) => (
                        <button
                            key={`gallery-thumb-${i}`}
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setIndex(i); }}
                            className={`w-20 h-12 sm:w-28 sm:h-16 rounded overflow-hidden border-2 transition-opacity ${i === index ? 'border-yellow-300 opacity-100' : 'border-transparent opacity-60 hover:opacity-100'}`}
                            title={`Selecionar foto ${i + 1}`}
                        >
                            <img src={img} alt={`${title} - miniatura ${i + 1}`} className="w-full h-full object-cover" />
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
