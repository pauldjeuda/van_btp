import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Modal } from '../ui';

interface Props {
  images: string[];
  reportId: number | string;
}

/** Galerie photos rapport — aperçu entier (object-contain) + lightbox */
export function ReportPhotos({ images, reportId }: Props) {
  const { t } = useTranslation();
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  if (!images?.length) return null;

  const open = (index: number) => setLightboxIndex(index);
  const close = () => setLightboxIndex(null);
  const prev = () => setLightboxIndex((i) => (i === null ? null : (i - 1 + images.length) % images.length));
  const next = () => setLightboxIndex((i) => (i === null ? null : (i + 1) % images.length));

  return (
    <>
      <div className="p-4 bg-white rounded-xl border border-slate-200">
        <p className="text-xs font-black text-slate-600 uppercase tracking-wider mb-3">
          {t('common.photos_count', { count: images.length })}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {images.map((src, i) => (
            <button
              key={`report-${reportId}-img-${i}`}
              type="button"
              onClick={() => open(i)}
              className="group relative flex items-center justify-center min-h-[140px] max-h-[220px] rounded-xl border border-slate-200 bg-slate-50 overflow-hidden hover:border-[var(--color-primary)] hover:shadow-md transition-all"
            >
              <img
                src={src}
                alt={t('common.photo_n_of', { current: i + 1, total: images.length })}
                className="max-w-full max-h-[220px] w-auto h-auto object-contain p-2"
              />
              <span className="absolute bottom-2 right-2 text-[10px] font-bold bg-black/50 text-white px-2 py-0.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity">
                {t('common.enlarge')}
              </span>
            </button>
          ))}
        </div>
      </div>

      <Modal
        isOpen={lightboxIndex !== null}
        onClose={close}
        title={t('common.photo_n_of', { current: (lightboxIndex ?? 0) + 1, total: images.length })}
        size="lg"
      >
        {lightboxIndex !== null && (
          <div className="flex flex-col items-center gap-4">
            <div className="w-full flex items-center justify-center min-h-[200px] max-h-[75vh] bg-slate-100 rounded-2xl overflow-hidden p-2">
              <img
                src={images[lightboxIndex]}
                alt=""
                className="max-w-full max-h-[75vh] w-auto h-auto object-contain"
              />
            </div>
            {images.length > 1 && (
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={prev}
                  className="p-2 rounded-full border border-slate-200 hover:bg-slate-50"
                  aria-label={t('common.photo_prev')}
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="text-sm font-bold text-slate-600">
                  {lightboxIndex + 1} / {images.length}
                </span>
                <button
                  type="button"
                  onClick={next}
                  className="p-2 rounded-full border border-slate-200 hover:bg-slate-50"
                  aria-label={t('common.photo_next')}
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}
