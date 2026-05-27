import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  FileText,
  Download,
  BookOpen,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { GlobalWorkerOptions, getDocument, type PDFDocumentProxy } from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { Button, cn } from '../../components/ui';
import { documentService } from '../../services/document.service';

GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export type ViewableDocument = {
  id: number;
  name: string;
  mimeType?: string;
  type?: string;
  filePath?: string;
  size?: string;
};

type Props = {
  document: ViewableDocument;
  onDownload?: () => void;
};

type ContentSize = { width: number; height: number };
type DisplaySize = { width: number; height: number };

const VIEWPORT_PADDING = 28;

function isImageDoc(doc: ViewableDocument): boolean {
  return Boolean(
    doc.mimeType?.startsWith('image/') || doc.type?.toLowerCase().includes('photo'),
  );
}

function isPdfDoc(doc: ViewableDocument): boolean {
  return doc.mimeType === 'application/pdf' || doc.name?.toLowerCase().endsWith('.pdf');
}

/** Ajuste aux dimensions du conteneur en conservant le ratio du document */
function fitContentToContainer(
  content: ContentSize,
  container: ContentSize,
  zoom: number,
): DisplaySize {
  if (content.width <= 0 || content.height <= 0) {
    return { width: 0, height: 0 };
  }
  const availW = Math.max(container.width - VIEWPORT_PADDING, 80);
  const availH = Math.max(container.height - VIEWPORT_PADDING, 80);
  const fit = Math.min(availW / content.width, availH / content.height);
  const scale = fit * zoom;
  return {
    width: Math.round(content.width * scale),
    height: Math.round(content.height * scale),
  };
}

export const DocumentViewer: React.FC<Props> = ({ document: doc, onDownload }) => {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
  const [mode, setMode] = useState<'image' | 'pdf' | 'unsupported'>('unsupported');
  const [containerSize, setContainerSize] = useState<ContentSize>({ width: 0, height: 0 });
  const [contentSize, setContentSize] = useState<ContentSize | null>(null);
  const [displaySize, setDisplaySize] = useState<DisplaySize | null>(null);

  const blobUrlRef = useRef<string | null>(null);
  const pdfRef = useRef<PDFDocumentProxy | null>(null);

  const revokeBlob = useCallback(() => {
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
  }, []);

  const cleanupPdf = useCallback(() => {
    if (pdfRef.current) {
      pdfRef.current.destroy().catch(() => undefined);
      pdfRef.current = null;
    }
    setPdfDoc(null);
  }, []);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return undefined;

    const update = () => {
      setContainerSize({
        width: el.clientWidth,
        height: el.clientHeight,
      });
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [loading, mode]);

  useEffect(() => {
    if (!contentSize || containerSize.width <= 0 || containerSize.height <= 0) {
      setDisplaySize(null);
      return;
    }
    setDisplaySize(fitContentToContainer(contentSize, containerSize, zoom));
  }, [contentSize, containerSize, zoom]);

  useEffect(() => {
    setCurrentPage(1);
    setTotalPages(1);
    setZoom(1);
    setError(null);
    setLoading(true);
    setContentSize(null);
    setDisplaySize(null);
    revokeBlob();
    cleanupPdf();
    setPreviewUrl(null);

    let cancelled = false;

    const load = async () => {
      try {
        if (isImageDoc(doc)) {
          setMode('image');
          const blob = await documentService.fetchPreviewBlob(doc.id);
          if (cancelled) return;
          const url = URL.createObjectURL(blob);
          blobUrlRef.current = url;
          setPreviewUrl(url);
          setTotalPages(1);
          setLoading(false);
          return;
        }

        if (isPdfDoc(doc)) {
          setMode('pdf');
          const blob = await documentService.fetchPreviewBlob(doc.id);
          if (cancelled) return;
          const buffer = await blob.arrayBuffer();
          const pdf = await getDocument({ data: buffer }).promise;
          if (cancelled) {
            pdf.destroy();
            return;
          }
          pdfRef.current = pdf;
          setPdfDoc(pdf);
          setTotalPages(pdf.numPages);
          setLoading(false);
          return;
        }

        setMode('unsupported');
        setLoading(false);
      } catch (e: unknown) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : t('support.viewer.load_error'));
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
      revokeBlob();
      cleanupPdf();
    };
  }, [doc.id, doc.mimeType, doc.name, doc.type, revokeBlob, cleanupPdf, t]);

  const loadPdfPageDimensions = useCallback(async () => {
    if (!pdfDoc) return;
    const page = await pdfDoc.getPage(currentPage);
    const vp = page.getViewport({ scale: 1 });
    setContentSize({ width: vp.width, height: vp.height });
  }, [pdfDoc, currentPage]);

  useEffect(() => {
    if (mode === 'pdf' && pdfDoc && !loading) {
      loadPdfPageDimensions().catch(() => setError(t('support.viewer.render_error')));
    }
  }, [mode, pdfDoc, loading, currentPage, loadPdfPageDimensions, t]);

  const renderPdfPage = useCallback(async () => {
    if (!pdfDoc || !canvasRef.current || !contentSize || !displaySize) return;

    try {
      const page = await pdfDoc.getPage(currentPage);
      const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
      const renderScale = (displaySize.width / contentSize.width) * dpr;
      const viewport = page.getViewport({ scale: renderScale });

      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = viewport.width;
      canvas.height = viewport.height;
      canvas.style.width = `${displaySize.width}px`;
      canvas.style.height = `${displaySize.height}px`;

      await page.render({ canvasContext: ctx, viewport, canvas }).promise;
    } catch {
      setError(t('support.viewer.render_error'));
    }
  }, [pdfDoc, currentPage, contentSize, displaySize, t]);

  useEffect(() => {
    if (mode === 'pdf' && pdfDoc && !loading && displaySize && contentSize) {
      renderPdfPage();
    }
  }, [mode, pdfDoc, loading, displaySize, contentSize, renderPdfPage]);

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setContentSize({ width: img.naturalWidth, height: img.naturalHeight });
  };

  const goToPage = (page: number) => {
    setZoom(1);
    setContentSize(null);
    setCurrentPage(Math.min(Math.max(1, page), totalPages));
  };

  const handleDownload = () => {
    if (onDownload) {
      onDownload();
      return;
    }
    documentService.download(doc.id, doc.name || 'document').catch(() => undefined);
  };

  const openExternal = () => {
    const url = previewUrl || documentService.resolveStaticUrl(doc.filePath);
    if (url) window.open(url, '_blank');
  };

  const isLandscape =
    contentSize && contentSize.width > contentSize.height;

  const previewFrame =
    displaySize && displaySize.width > 0 && displaySize.height > 0 ? (
      <div
        className="shadow-xl rounded-lg bg-white ring-1 ring-slate-200/80 overflow-hidden shrink-0"
        style={{
          width: displaySize.width,
          height: displaySize.height,
          maxWidth: '100%',
          maxHeight: '100%',
        }}
      >
        {mode === 'image' && previewUrl && (
          <img
            src={previewUrl}
            alt={doc.name}
            onLoad={handleImageLoad}
            className="block w-full h-full object-contain"
            draggable={false}
          />
        )}
        {mode === 'pdf' && (
          <canvas ref={canvasRef} className="block w-full h-full" />
        )}
      </div>
    ) : null;

  return (
    <div className="h-full flex flex-col min-h-0">
      <div
        ref={viewportRef}
        className="flex-1 min-h-0 bg-slate-200/80 rounded-2xl overflow-auto flex items-center justify-center p-4 sm:p-6"
      >
        {loading && (
          <div className="flex flex-col items-center gap-3 text-slate-500">
            <Loader2 className="w-10 h-10 animate-spin text-[var(--color-primary)]" />
            <p className="text-sm font-semibold">{t('support.viewer.loading')}</p>
          </div>
        )}

        {!loading && error && (
          <div className="flex flex-col items-center text-center text-slate-500 max-w-md p-6">
            <AlertCircle className="w-14 h-14 text-amber-500 mb-4" />
            <p className="text-sm font-bold text-slate-800 mb-2">{doc.name}</p>
            <p className="text-sm mb-6">{error}</p>
            <div className="flex gap-3">
              <Button onClick={handleDownload}>
                <Download className="w-4 h-4 mr-2" />
                {t('common.download')}
              </Button>
              <Button variant="outline" onClick={openExternal}>
                <BookOpen className="w-4 h-4 mr-2" />
                {t('support.viewer.open_external')}
              </Button>
            </div>
          </div>
        )}

        {!loading && !error && mode === 'image' && previewUrl && (
          displaySize && displaySize.width > 0
            ? previewFrame
            : (
              <img
                src={previewUrl}
                alt={doc.name}
                onLoad={handleImageLoad}
                className="max-w-full max-h-full object-contain shadow-xl rounded-lg bg-white"
              />
            )
        )}

        {!loading && !error && mode === 'pdf' && (
          previewFrame ?? (
            <Loader2 className="w-8 h-8 animate-spin text-[var(--color-primary)]" />
          )
        )}

        {!loading && !error && mode === 'unsupported' && (
          <div className="flex flex-col items-center text-slate-500 p-8">
            <FileText className="w-20 h-20 mb-6 text-slate-300" />
            <h3 className="text-lg font-black text-slate-900 mb-2">{doc.name}</h3>
            <p className="text-sm mb-2">{t('support.viewer.unsupported')}</p>
            <p className="text-xs text-slate-400 mb-6">{doc.type || doc.mimeType}</p>
            <div className="flex gap-3">
              <Button onClick={handleDownload}>
                <Download className="w-4 h-4 mr-2" />
                {t('common.download')}
              </Button>
              <Button variant="outline" onClick={openExternal}>
                <BookOpen className="w-4 h-4 mr-2" />
                {t('support.viewer.open_external')}
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="shrink-0 flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-slate-100 bg-white/80">
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            type="button"
            variant="outline"
            size="icon"
            disabled={currentPage <= 1 || loading || mode !== 'pdf'}
            onClick={() => goToPage(currentPage - 1)}
            aria-label={t('support.viewer.prev_page')}
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>

          <div className="flex items-center gap-2 px-2">
            <label className="sr-only" htmlFor="viewer-page-input">
              {t('support.viewer.page')}
            </label>
            <input
              id="viewer-page-input"
              type="number"
              min={1}
              max={totalPages}
              value={currentPage}
              disabled={loading || totalPages <= 1}
              onChange={(e) => goToPage(Number(e.target.value) || 1)}
              className={cn(
                'w-14 h-9 text-center text-sm font-bold rounded-lg border border-slate-200',
                'focus:ring-2 focus:ring-[var(--color-primary)]/30 focus:border-[var(--color-primary)] outline-none',
                (loading || totalPages <= 1) && 'opacity-50',
              )}
            />
            <span className="text-sm font-bold text-slate-500 whitespace-nowrap">
              {t('support.viewer.page_of', { total: totalPages })}
            </span>
          </div>

          <Button
            type="button"
            variant="outline"
            size="icon"
            disabled={currentPage >= totalPages || loading || mode !== 'pdf'}
            onClick={() => goToPage(currentPage + 1)}
            aria-label={t('support.viewer.next_page')}
          >
            <ChevronRight className="w-5 h-5" />
          </Button>

          {contentSize && displaySize && !loading && mode !== 'unsupported' && (
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider hidden md:inline">
              {isLandscape ? t('support.viewer.landscape') : t('support.viewer.portrait')}
              {' · '}
              {Math.round(contentSize.width)}×{Math.round(contentSize.height)}
            </span>
          )}
        </div>

        {(mode === 'pdf' || mode === 'image') && !loading && (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              disabled={zoom <= 0.5}
              onClick={() => setZoom((z) => Math.max(0.5, z - 0.15))}
              aria-label={t('support.viewer.zoom_out')}
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
            <span className="text-xs font-bold text-slate-500 w-12 text-center">
              {Math.round(zoom * 100)}%
            </span>
            <Button
              type="button"
              variant="outline"
              size="icon"
              disabled={zoom >= 3}
              onClick={() => setZoom((z) => Math.min(3, z + 0.15))}
              aria-label={t('support.viewer.zoom_in')}
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setZoom(1)}
              aria-label={t('support.viewer.fit_page')}
              title={t('support.viewer.fit_page')}
            >
              <Maximize2 className="w-4 h-4" />
            </Button>
          </div>
        )}

        <Button onClick={handleDownload} className="font-bold sm:ml-auto">
          <Download className="w-4 h-4 mr-2" />
          {t('common.download')}
        </Button>
      </div>
    </div>
  );
};
