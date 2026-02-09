
import React, { useState, useCallback, useRef } from 'react';
import type { IdCardData } from './types';
import IdCardForm from './components/IdCardForm';
import IdCardPreview from './components/IdCardPreview';
import { HeaderIcon, UndoIcon, RedoIcon, DownloadIcon, SpinnerIcon } from './components/icons';
import jsPDF from 'jspdf';
import { toPng } from 'html-to-image';

const generateEmployeeId = () => `EMP-${Math.floor(1000 + Math.random() * 9000)}`;

const initialIdCardData: IdCardData = {
  name: '',
  department: '',
  website: '',
  photoUrl: null,
  photoShape: 'circle',
  orientation: 'portrait',
  companyName: '',
  companyLogoUrl: null,
  theme: 'blue-orange',
  themeColor1: '#0047AB',
  themeColor2: '#FF6F00',
  employeeNameFontSize: 17,
  companyNameFontSize: 16,
  textColor: '#FFFFFF',
  photoSize: 128,
  detailsFontSize: 12,
  companyLogoSize: 55,
  photoVerticalOffset: 45,
  photoHorizontalOffset: 50,
  details: [
    { id: 1, label: 'Post', value: '' },
    { id: 2, label: 'ID', value: generateEmployeeId() },
    { id: 3, label: 'Phone', value: '' },
    { id: 4, label: 'Email', value: '' },
    { id: 5, label: 'Issued', value: new Date().toISOString().split('T')[0] },
    { id: 6, label: 'Expires', value: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0] },
  ],
  qrCodeUrl: null,
  qrCodeSize: 72,
  backgroundType: 'gradient',
  backgroundColor: '#4a90e2',
  backgroundImageUrl: null,
  backgroundImageFit: 'cover',
  termsAndConditions: '',
  termsFontSize: 9,
  termsColor: '#E0E0E0',
  websiteFontSize: 10,
  borderWidth: 0,
  borderColor: '#000000',
  borderRadius: 16,
};

const App: React.FC = () => {
  const [state, setState] = useState<{
    past: IdCardData[];
    present: IdCardData;
    future: IdCardData[];
  }>({
    past: [],
    present: initialIdCardData,
    future: [],
  });
  
  const [isDownloading, setIsDownloading] = useState<false | 'PNG' | 'PDF'>(false);
  const [isDownloadMenuOpen, setIsDownloadMenuOpen] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  const idCardData = state.present;
  const canUndo = state.past.length > 0;
  const canRedo = state.future.length > 0;

  const setIdCardData = useCallback((action: React.SetStateAction<IdCardData>) => {
    setState((currentState) => {
      const newPresent = typeof action === 'function'
        ? (action as (prevState: IdCardData) => IdCardData)(currentState.present)
        : action;

      if (JSON.stringify(newPresent) === JSON.stringify(currentState.present)) {
        return currentState;
      }

      const newPast = [...currentState.past, currentState.present];
      if (newPast.length > 50) { // Limit history size
        newPast.shift();
      }

      return {
        past: newPast,
        present: newPresent,
        future: [],
      };
    });
  }, []);

  const handleUndo = useCallback(() => {
    if (!canUndo) return;
    setState((currentState) => {
      const previous = currentState.past[currentState.past.length - 1];
      const newPast = currentState.past.slice(0, currentState.past.length - 1);
      return {
        past: newPast,
        present: previous,
        future: [currentState.present, ...currentState.future],
      };
    });
  }, [canUndo]);

  const handleRedo = useCallback(() => {
    if (!canRedo) return;
    setState((currentState) => {
      const next = currentState.future[0];
      const newFuture = currentState.future.slice(1);
      return {
        past: [...currentState.past, currentState.present],
        present: next,
        future: newFuture,
      };
    });
  }, [canRedo]);
  
  const handleDownload = async (format: 'PNG' | 'PDF') => {
    setIsDownloadMenuOpen(false);
    if (isDownloading || !previewRef.current) return;
    setIsDownloading(format);

    try {
      if (document.fonts) {
        await document.fonts.ready;
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));

      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      const pixelRatio = isMobile ? 2 : 4;

      const dataUrl = await toPng(previewRef.current, {
        quality: 1.0,
        pixelRatio: pixelRatio, 
        cacheBust: true,
        filter: (node) => {
          if (node.tagName === 'LINK' && (node as HTMLLinkElement).rel === 'stylesheet') {
            if ((node as HTMLLinkElement).href.includes('react-image-crop')) {
               return false;
            }
          }
          return true;
        },
        style: {
           boxShadow: `inset 0 0 0 ${idCardData.borderWidth}px ${idCardData.borderColor}`,
           transform: 'none', 
           margin: '0',
           fontFeatureSettings: '"kern" 1', 
           textRendering: 'geometricPrecision',
           WebkitFontSmoothing: 'antialiased',
           MozOsxFontSmoothing: 'grayscale',
        }
      });

      const fileName = `id-card-${idCardData.name.toLowerCase().replace(/\s+/g, '-') || 'employee'}`;
      
      if (format === 'PNG') {
        const link = document.createElement('a');
        link.download = `${fileName}.png`;
        link.href = dataUrl;
        link.click();
      } else { // PDF
        const isPortrait = idCardData.orientation === 'portrait';
        const width = isPortrait ? 53.98 : 85.60;
        const height = isPortrait ? 85.60 : 53.98;

        const pdf = new jsPDF({
            orientation: isPortrait ? 'portrait' : 'landscape',
            unit: 'mm',
            format: [width, height] 
        });
        
        pdf.addImage(dataUrl, 'PNG', 0, 0, width, height);
        pdf.save(`${fileName}.pdf`);
      }
    } catch (e) {
      console.error(`Failed to download card as ${format}:`, e);
      alert(`An error occurred while trying to download the card. If the issue persists, try checking your internet connection as external fonts/images might be failing to load.`);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 dark:bg-gray-900 dark:text-gray-200">
      <header className="bg-white dark:bg-gray-800 shadow-md">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <HeaderIcon />
            {/* Logo text is now inside HeaderIcon SVG */}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleUndo}
              disabled={!canUndo}
              className="p-2 rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
              aria-label="Undo"
            >
              <UndoIcon className="w-5 h-5" />
            </button>
            <button
              onClick={handleRedo}
              disabled={!canRedo}
              className="p-2 rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
              aria-label="Redo"
            >
              <RedoIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>
      
      <main className="container mx-auto p-4 sm:p-6 lg:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
            <h2 className="text-xl font-semibold mb-6 border-b border-gray-200 dark:border-gray-700 pb-4">
              Employee Information
            </h2>
            <IdCardForm
              formData={idCardData}
              setFormData={setIdCardData}
            />
          </div>
          <div className="flex flex-col items-center">
            <div className="w-full max-w-lg">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold">
                        ID Card Preview
                    </h2>
                    <div className="relative">
                        <button
                            onClick={() => setIsDownloadMenuOpen(prev => !prev)}
                            disabled={!!isDownloading}
                            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 transition-all disabled:bg-gray-400 disabled:cursor-not-allowed"
                        >
                            {isDownloading ? (
                            <>
                                <SpinnerIcon className="w-5 h-5" />
                                <span>{isDownloading}...</span>
                            </>
                            ) : (
                            <>
                                <DownloadIcon className="w-5 h-5" />
                                <span>Download</span>
                            </>
                            )}
                        </button>
                        {isDownloadMenuOpen && (
                            <div className="absolute top-full right-0 mt-2 w-48 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black dark:ring-gray-700 ring-opacity-5 z-10">
                            <div className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="options-menu">
                                <button
                                onClick={() => handleDownload('PNG')}
                                className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                role="menuitem"
                                >
                                Download as PNG
                                </button>
                                <button
                                onClick={() => handleDownload('PDF')}
                                className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                role="menuitem"
                                >
                                Download as PDF
                                </button>
                            </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <IdCardPreview ref={previewRef} data={idCardData} />
          </div>
        </div>
      </main>
      
      <footer className="text-center py-6 text-gray-500 dark:text-gray-400 text-sm">
        <p>&copy; {new Date().getFullYear()} IDGEN. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default App;
