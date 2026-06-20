
import React, { useState, useCallback, useRef } from 'react';
import type { IdCardData } from './types';
import IdCardForm from './components/IdCardForm';
import IdCardPreview from './components/IdCardPreview';
import { 
  HeaderIcon, 
  UndoIcon, 
  RedoIcon, 
  DownloadIcon, 
  SpinnerIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  UploadIcon
} from './components/icons';
import jsPDF from 'jspdf';
import { toPng } from 'html-to-image';
import * as XLSX from 'xlsx';

const generateEmployeeId = () => `EMP-${Math.floor(1000 + Math.random() * 9000)}`;

const getAliasKeys = (label: string): string[] => {
  const cleanLabel = label.toLowerCase().trim().replace(/[\s_-]+/g, '');
  if (cleanLabel === 'id') return ['id', 'empid', 'employeeid', 'code', 'employeecode', 'empcode', 'serial', 'number', 'no'];
  if (cleanLabel === 'phone') return ['phone', 'cell', 'mobile', 'tel', 'contact', 'phonenumber', 'contactnumber'];
  if (cleanLabel === 'email') return ['email', 'mail', 'e-mail'];
  if (cleanLabel === 'post') return ['post', 'designation', 'role', 'title', 'jobtitle', 'position'];
  if (cleanLabel === 'issued') return ['issued', 'issueddate', 'joiningdate', 'startdate', 'dateissued'];
  if (cleanLabel === 'expires') return ['expires', 'expiry', 'validupto', 'expirydate', 'validuntil'];
  return [cleanLabel];
};

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
  photoSize: 90,
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

  // Bulk Import States
  const [bulkEmployees, setBulkEmployees] = useState<IdCardData[]>([]);
  const [bulkActiveIndex, setBulkActiveIndex] = useState<number | null>(null);
  const [bulkSearchQuery, setBulkSearchQuery] = useState('');
  const [bulkFileName, setBulkFileName] = useState('');
  const [bulkProgress, setBulkProgress] = useState<{
    current: number;
    total: number;
    format: 'PNG' | 'PDF';
    active: boolean;
  } | null>(null);
  const cancelBulkRef = useRef<boolean>(false);

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

      // Sync back to bulk list if bulk mode is active
      if (bulkActiveIndex !== null) {
        setBulkEmployees(prev => {
          const updated = [...prev];
          updated[bulkActiveIndex] = newPresent;
          return updated;
        });
      }

      return {
        past: newPast,
        present: newPresent,
        future: [],
      };
    });
  }, [bulkActiveIndex]);

  // Bulk parsing helpers
  const parseUploadedFile = (jsonData: any[]) => {
    if (!jsonData || jsonData.length === 0) return [];
    
    // Combine all keys found in the JSON data to get all unique headers
    const allHeaders = Array.from(new Set(jsonData.flatMap(row => Object.keys(row))));
    
    const findHeaderKey = (possibleNames: string[]): string | undefined => {
      return allHeaders.find(key => {
        const k = key.toLowerCase().trim().replace(/[\s_-]+/g, '');
        return possibleNames.some(p => k === p);
      });
    };
    
    const hName = findHeaderKey(['name', 'fullname', 'employeename', 'employee', 'names', 'empname', 'fullnames']);
    const hDept = findHeaderKey(['department', 'dept', 'division', 'team', 'departments', 'depts']);
    const hWeb = findHeaderKey(['website', 'site', 'url', 'web', 'companywebsite']);
    const hPhoto = findHeaderKey(['photo', 'photourl', 'image', 'imageurl', 'avatar', 'picture', 'pic', 'photos']);
    
    // Identify custom details headers
    const standardFields = new Set([hName, hDept, hWeb, hPhoto].filter((h): h is string => !!h));
    
    // Get existing details
    const currentDetails = idCardData.details;
    
    // Map headers to existing detail types
    const mappedHeaders = new Map<string, string>();
    const matchedColumns = new Set<string>();
    
    currentDetails.forEach(detail => {
      const aliases = getAliasKeys(detail.label);
      const colName = allHeaders.find(h => {
        if (standardFields.has(h)) return false;
        const cleanH = h.toLowerCase().trim().replace(/[\s_-]+/g, '');
        return aliases.includes(cleanH);
      });
      if (colName) {
        mappedHeaders.set(colName, detail.label);
        matchedColumns.add(colName);
      }
    });
    
    // Unmatched columns will be extra details
    const extraHeaders = allHeaders.filter(h => !standardFields.has(h) && !matchedColumns.has(h));
    
    let nextId = Math.max(...currentDetails.map(d => d.id), 0) + 1;
    const detailsTemplate = [
      ...currentDetails.map(d => ({ ...d, value: '' })),
      ...extraHeaders.map(h => ({
        id: nextId++,
        label: h.trim(),
        value: ''
      }))
    ];
    
    const parsedEmployees = jsonData.map((row) => {
      const employeeData: IdCardData = {
        ...idCardData,
        name: hName ? String(row[hName] ?? '') : '',
        department: hDept ? String(row[hDept] ?? '') : '',
        website: hWeb ? String(row[hWeb] ?? '') : idCardData.website,
        photoUrl: hPhoto ? String(row[hPhoto] ?? '') : null,
        details: detailsTemplate.map(tmpl => {
          const aliases = getAliasKeys(tmpl.label);
          const colValue = Object.entries(row).find(([key]) => {
            const k = key.toLowerCase().trim().replace(/[\s_-]+/g, '');
            return aliases.includes(k) || tmpl.label.toLowerCase() === key.toLowerCase();
          });
          
          let val = colValue ? String(colValue[1] ?? '') : '';
          if (tmpl.label.toLowerCase() === 'id' && !val) {
            val = `EMP-${Math.floor(1000 + Math.random() * 9000)}`;
          }
          
          return {
            ...tmpl,
            value: val
          };
        })
      };
      return employeeData;
    });
    
    return parsedEmployees;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setBulkFileName(file.name);
      
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const arrayBuffer = evt.target?.result as ArrayBuffer;
          const data = new Uint8Array(arrayBuffer);
          const wb = XLSX.read(data, { type: 'array' });
          const wsname = wb.SheetNames[0];
          const ws = wb.Sheets[wsname];
          const jsonData = XLSX.utils.sheet_to_json<any>(ws);
          
          if (!jsonData || jsonData.length === 0) {
            alert('The uploaded file appears to be empty.');
            return;
          }
          
          const parsed = parseUploadedFile(jsonData);
          if (parsed && parsed.length > 0) {
            setBulkEmployees(parsed);
            setBulkActiveIndex(0);
            setState(current => ({
              past: [],
              present: parsed[0],
              future: []
            }));
          } else {
            alert('Could not find any readable records in the file.');
          }
        } catch (err) {
          console.error('Error parsing file:', err);
          alert('An error occurred while parsing the file. Please make sure it is a valid CSV or Excel file.');
        }
      };
      reader.readAsArrayBuffer(file);
    }
  };

  const handleDownloadCSVTemplate = () => {
    const baseHeaders = ['Name', 'Department', 'Website'];
    const detailHeaders = idCardData.details.map(d => d.label || 'Detail');
    const headers = [...baseHeaders, ...detailHeaders, 'Photo URL'];
    
    const row1 = [
      'Alice Smith',
      'Design',
      'smithdesign.co',
      'Lead UI Designer',
      'EMP-1234',
      '+1 555-0192',
      'alice@example.com',
      new Date().toISOString().split('T')[0],
      new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150'
    ];
    
    const row2 = [
      'Bob Jones',
      'Engineering',
      'jonesengineering.com',
      'Backend Engineer',
      'EMP-5678',
      '+1 555-0143',
      'bob@example.com',
      new Date().toISOString().split('T')[0],
      new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150'
    ];
    
    while (row1.length < headers.length) row1.push('');
    while (row2.length < headers.length) row2.push('');
    
    row1[headers.length - 1] = 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150';
    row2[headers.length - 1] = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150';

    const csvContent = [
      headers.join(','),
      row1.map(v => `"${v.replace(/"/g, '""')}"`).join(','),
      row2.map(v => `"${v.replace(/"/g, '""')}"`).join(',')
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'employee_id_card_template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleClearBulk = () => {
    setBulkEmployees([]);
    setBulkActiveIndex(null);
    setBulkSearchQuery('');
    setBulkFileName('');
  };

  const handleBulkDownload = async (format: 'PNG' | 'PDF') => {
    if (bulkEmployees.length === 0) return;
    
    cancelBulkRef.current = false;
    setBulkProgress({
      current: 0,
      total: bulkEmployees.length,
      format,
      active: true,
    });
    
    for (let i = 0; i < bulkEmployees.length; i++) {
      if (cancelBulkRef.current) break;
      
      // Update individual index
      setBulkActiveIndex(i);
      
      // Force change in present state
      setState(current => ({
        ...current,
        present: bulkEmployees[i]
      }));
      
      // Short delay for React dom and assets painting
      await new Promise(resolve => setTimeout(resolve, 300));
      
      if (cancelBulkRef.current) break;
      
      try {
        if (!previewRef.current) continue;
        
        if (document.fonts) {
          await document.fonts.ready;
        }
        
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        const pixelRatio = isMobile ? 2 : 4;
        
        const dataUrl = await toPng(previewRef.current, {
          quality: 1.0,
          pixelRatio: pixelRatio,
          cacheBust: true,
          style: {
            boxShadow: `inset 0 0 0 ${bulkEmployees[i].borderWidth}px ${bulkEmployees[i].borderColor}`,
            transform: 'none',
            margin: '0',
            fontFeatureSettings: '"kern" 1',
            textRendering: 'geometricPrecision',
            WebkitFontSmoothing: 'antialiased',
            MozOsxFontSmoothing: 'grayscale',
          }
        });
        
        const fileName = `id-card-${bulkEmployees[i].name.toLowerCase().replace(/\s+/g, '-') || `employee-${i + 1}`}`;
        
        if (format === 'PNG') {
          const link = document.createElement('a');
          link.download = `${fileName}.png`;
          link.href = dataUrl;
          link.click();
        } else {
          const isPortrait = bulkEmployees[i].orientation === 'portrait';
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
      } catch (err) {
        console.error(`Error exporting item ${i}:`, err);
      }
      
      setBulkProgress(prev => prev ? { ...prev, current: i + 1 } : null);
    }
    
    setTimeout(() => {
      setBulkProgress(null);
    }, 1200);
  };

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

  // Keyboard Shortcuts Hook
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isZ = e.key === 'z' || e.key === 'Z';
      const isY = e.key === 'y' || e.key === 'Y';
      const isMetaOrCtrl = e.metaKey || e.ctrlKey;

      if (isMetaOrCtrl) {
        if (isZ) {
          e.preventDefault();
          if (e.shiftKey) {
            handleRedo();
          } else {
            handleUndo();
          }
        } else if (isY) {
          e.preventDefault();
          handleRedo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleUndo, handleRedo]);
  
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
              title="Undo (Ctrl+Z)"
            >
              <UndoIcon className="w-5 h-5" />
            </button>
            <button
              onClick={handleRedo}
              disabled={!canRedo}
              className="p-2 rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
              aria-label="Redo"
              title="Redo (Ctrl+Y or Ctrl+Shift+Z)"
            >
              <RedoIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>
      
      <main className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        {/* Bulk Roster Manager Panel */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-150 dark:border-gray-700">
          <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-gray-200 dark:border-gray-700 pb-4 mb-6">
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2">
                <span className="p-1.5 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 rounded-lg">
                  <UploadIcon className="w-5 h-5 animate-pulse" />
                </span>
                Bulk Employee Roster Mode
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Upload CSV or Excel spreadsheets to configure data and download ID cards of all employees in one click.
              </p>
            </div>
            {bulkEmployees.length > 0 && (
              <button
                onClick={handleClearBulk}
                className="mt-2 md:mt-0 px-4 py-1.5 border border-red-500/30 text-red-500 hover:bg-red-500/10 rounded-lg text-sm font-semibold transition-all shrink-0"
              >
                Clear Loaded File
              </button>
            )}
          </div>

          {bulkEmployees.length === 0 ? (
            /* Upload Zone State */
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 flex flex-col justify-center items-center border-2 border-dashed border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 rounded-xl p-8 bg-gray-50/50 dark:bg-gray-900/20 text-center transition cursor-pointer relative group">
                <input
                  type="file"
                  accept=".csv, .xlsx, .xls"
                  onChange={handleFileUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer z-10"
                />
                <div className="p-4 bg-white dark:bg-gray-800 rounded-full shadow-md group-hover:scale-105 transition-transform mb-3">
                  <UploadIcon className="w-8 h-8 text-blue-500" />
                </div>
                <p className="font-semibold text-gray-700 dark:text-gray-300">
                  Upload Roster Spreadsheet
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 mb-4">
                  Drag and drop a CSV, XLSX, or XLS file, or click here to browse.
                </p>
                <div className="text-xs inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 font-medium bg-blue-50 dark:bg-blue-900/30 px-3 py-1.5 rounded-lg">
                  Supports CSV, XLSX, & XLS formats
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-5 border border-gray-100 dark:border-gray-700 flex flex-col justify-between">
                <div>
                  <h3 className="font-semibold text-sm mb-2 text-gray-700 dark:text-gray-300">
                    How it works
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-4">
                    Our smart mapper automatically detects headers and aligns columns to design fields (Name, Department, ID, Phone, Email, etc.). Extra columns will be added as custom fields!
                  </p>
                  <h4 className="text-xs font-bold uppercase text-gray-400 tracking-wider mb-2">
                    Expected Headers
                  </h4>
                  <div className="flex flex-wrap gap-1.5 text-[10px] text-gray-500 dark:text-gray-400 font-mono">
                    <span className="bg-white dark:bg-gray-800 px-1.5 py-0.5 rounded border border-gray-200 dark:border-gray-700">Name</span>
                    <span className="bg-white dark:bg-gray-800 px-1.5 py-0.5 rounded border border-gray-200 dark:border-gray-700">Department</span>
                    {idCardData.details.map(d => (
                      <span key={d.id} className="bg-white dark:bg-gray-800 px-1.5 py-0.5 rounded border border-gray-200 dark:border-gray-700">
                        {d.label}
                      </span>
                    ))}
                    <span className="bg-white dark:bg-gray-800 px-1.5 py-0.5 rounded border border-gray-200 dark:border-gray-700">Photo URL</span>
                  </div>
                </div>

                <button
                  onClick={handleDownloadCSVTemplate}
                  className="mt-6 w-full py-2 border border-blue-500 text-blue-500 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-700 font-semibold rounded-lg text-xs transition-all flex items-center justify-center gap-2"
                >
                  <DownloadIcon className="w-4 h-4" />
                  Download CSV Template
                </button>
              </div>
            </div>
          ) : (
            /* Active Roster Loaded State */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Search & Scrollbox Employee List */}
              <div className="lg:col-span-8 flex flex-col space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm text-gray-600 dark:text-gray-400">
                    File: <span className="text-blue-500 font-mono text-xs">{bulkFileName || 'uploaded_list.csv'}</span> ({bulkEmployees.length} rows loaded)
                  </h3>
                  
                  <div className="text-xs bg-gray-100 dark:bg-gray-700 px-2.5 py-1 rounded-md text-gray-500 dark:text-gray-400 font-medium">
                    Row {bulkActiveIndex !== null ? bulkActiveIndex + 2 : 0} of sheet
                  </div>
                </div>

                {/* Roster Search Input */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search roster by Name, Department or ID..."
                    value={bulkSearchQuery}
                    onChange={(e) => setBulkSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 rounded-lg text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                </div>

                {/* Table list */}
                <div className="border border-gray-100 dark:border-gray-800 rounded-lg overflow-hidden bg-gray-50/30 dark:bg-gray-900/15">
                  <div className="max-h-52 overflow-y-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800 text-left text-xs text-gray-700 dark:text-gray-300">
                      <thead className="bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 uppercase text-[9px] tracking-wider sticky top-0 z-10 shadow-xs">
                        <tr>
                          <th className="px-3 py-2 w-12 text-center">Row</th>
                          <th className="px-4 py-2">Full Name</th>
                          <th className="px-4 py-2">Department</th>
                          <th className="px-4 py-2">Details Mapping</th>
                          <th className="px-4 py-2 w-16 text-center">Preview</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                        {bulkEmployees
                          .map((emp, index) => ({ emp, index }))
                          .filter(({ emp }) => {
                            const query = bulkSearchQuery.toLowerCase().trim();
                            if (!query) return true;
                            const dId = emp.details.find(d => d.label.toLowerCase() === 'id')?.value || '';
                            return (
                              emp.name.toLowerCase().includes(query) ||
                              emp.department.toLowerCase().includes(query) ||
                              dId.toLowerCase().includes(query)
                            );
                          })
                          .map(({ emp, index }) => {
                            const isActive = index === bulkActiveIndex;
                            const empId = emp.details.find(d => d.label.toLowerCase() === 'id')?.value || 'N/A';
                            const role = emp.details.find(d => d.label.toLowerCase() === 'post')?.value || '';
                            
                            return (
                              <tr
                                key={index}
                                onClick={() => {
                                  setBulkActiveIndex(index);
                                  setState(current => ({
                                    ...current,
                                    present: emp
                                  }));
                                }}
                                className={`cursor-pointer transition-all ${
                                  isActive
                                    ? 'bg-blue-600/10 dark:bg-blue-600/20 text-blue-600 dark:text-blue-300 font-semibold'
                                    : 'hover:bg-gray-50 dark:hover:bg-gray-900/50'
                                }`}
                              >
                                <td className="px-3 py-2 text-center text-gray-400 font-mono">
                                  {index + 2}
                                </td>
                                <td className="px-4 py-2 font-medium">
                                  {emp.name || <span className="opacity-40 italic">No Name</span>}
                                </td>
                                <td className="px-4 py-2 text-gray-500 dark:text-gray-400">
                                  {emp.department || <span className="opacity-40 italic">No Dept</span>}
                                </td>
                                <td className="px-4 py-2 text-[10px] text-gray-400">
                                  <div className="flex flex-wrap gap-1">
                                    <span className="bg-gray-200 dark:bg-gray-800 px-1.5 py-0.5 rounded text-gray-600 dark:text-gray-300">ID: {empId}</span>
                                    {role && <span className="bg-gray-200 dark:bg-gray-800 px-1.5 py-0.5 rounded text-gray-600 dark:text-gray-300">{role}</span>}
                                  </div>
                                </td>
                                <td className="px-4 py-2 text-center">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-medium leading-none ${isActive ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-100' : 'bg-gray-150 dark:bg-gray-800 text-gray-500'}`}>
                                    {isActive ? 'Active' : 'Preview'}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Right Column: Bulk Action Buttons */}
              <div className="lg:col-span-4 bg-gray-50 dark:bg-gray-800/35 p-5 rounded-xl border border-gray-100 dark:border-gray-700 flex flex-col justify-between space-y-4">
                <div>
                  <h3 className="font-bold text-sm text-gray-800 dark:text-gray-200 mb-1">
                    Download Package
                  </h3>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mb-4 leading-relaxed">
                    Instantly generate and download tailored ID cards for all {bulkEmployees.length} employees currently in the active directory.
                  </p>

                  <div className="space-y-2.5">
                    <button
                      onClick={() => handleBulkDownload('PNG')}
                      className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-sm transition-all text-xs flex items-center justify-center gap-2"
                    >
                      <DownloadIcon className="w-4 h-4" />
                      Bulk Export All Cards to PNG
                    </button>
                    
                    <button
                      onClick={() => handleBulkDownload('PDF')}
                      className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg shadow-sm transition-all text-xs flex items-center justify-center gap-2"
                    >
                      <DownloadIcon className="w-4 h-4" />
                      Bulk Export All Cards to PDF
                    </button>
                  </div>
                </div>

                <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-500/20 rounded-lg p-3 text-[11px] text-blue-700 dark:text-blue-300 leading-normal">
                  <p className="font-semibold mb-0.5">ℹ️ Layout Notice:</p>
                  <p>Each card generates dynamically using your active layout orientation, background style settings, QR settings, and theme colors.</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Form and Preview Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-150 dark:border-gray-700">
            <h2 className="text-xl font-semibold mb-6 border-b border-gray-200 dark:border-gray-700 pb-4 flex justify-between items-center">
              <span>Employee Information</span>
              {bulkActiveIndex !== null && (
                <span className="text-xs font-semibold px-2.5 py-1 bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 rounded-full">
                  Editing Record #{bulkActiveIndex + 1}
                </span>
              )}
            </h2>
            <IdCardForm
              formData={idCardData}
              setFormData={setIdCardData}
            />
          </div>
          <div className="flex flex-col items-center">
            <div className="w-full max-w-lg">
              {/* Navigation Bar inside Preview Panel */}
              {bulkActiveIndex !== null && (
                <div className="w-full mb-4 bg-gradient-to-r from-blue-50 to-blue-50/50 dark:from-blue-950/40 dark:to-blue-950/10 border border-blue-500/20 rounded-xl p-3.5 flex items-center justify-between shadow-sm">
                  <div className="text-left">
                    <p className="text-[10px] text-blue-500 font-bold uppercase tracking-wider">
                      Viewing Loaded Employee
                    </p>
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate max-w-[200px] sm:max-w-[240px]">
                      {idCardData.name || 'Unnamed Employee'}
                    </p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      Card {bulkActiveIndex + 1} of {bulkEmployees.length}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => {
                        const newIndex = (bulkActiveIndex - 1 + bulkEmployees.length) % bulkEmployees.length;
                        setBulkActiveIndex(newIndex);
                        setState(current => ({ ...current, present: bulkEmployees[newIndex] }));
                      }}
                      className="p-1.5 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-600 dark:text-gray-300 transition"
                      title="Previous Employee"
                    >
                      <ChevronLeftIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        const newIndex = (bulkActiveIndex + 1) % bulkEmployees.length;
                        setBulkActiveIndex(newIndex);
                        setState(current => ({ ...current, present: bulkEmployees[newIndex] }));
                      }}
                      className="p-1.5 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-600 dark:text-gray-300 transition"
                      title="Next Employee"
                    >
                      <ChevronRightIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

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
                        <SpinnerIcon className="w-5 h-5 animate-spin" />
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

        {/* Progress overlay modal */}
        {bulkProgress !== null && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl max-w-md w-full shadow-2xl border border-gray-100 dark:border-gray-700 text-center animate-fade-in">
              <h3 className="text-xl font-bold mb-2 text-gray-800 dark:text-gray-100">Generating ID Cards</h3>
              <p className="text-gray-500 dark:text-gray-400 text-xs mb-6">
                Exporting roster files as {bulkProgress.format}. Please do not close this tab.
              </p>
              
              <div className="mb-6 flex justify-center items-center gap-4">
                <SpinnerIcon className="w-8 h-8 text-blue-600 animate-spin shrink-0" />
                <div className="text-left">
                  <span className="block font-bold text-gray-700 dark:text-gray-300">
                    Card {bulkProgress.current} of {bulkProgress.total}
                  </span>
                  <span className="block text-[11px] text-gray-400 font-mono truncate max-w-[180px]">
                    {bulkActiveIndex !== null && bulkEmployees[bulkActiveIndex] 
                      ? bulkEmployees[bulkActiveIndex].name || 'Unnamed Employee'
                      : 'Preparing...'}
                  </span>
                </div>
              </div>
              
              {/* Progress Bar */}
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 mb-6 overflow-hidden">
                <div 
                  className="bg-blue-600 h-full rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${(bulkProgress.current / bulkProgress.total) * 100}%` }}
                />
              </div>
              
              {/* Cancel button */}
              <button
                onClick={() => {
                  cancelBulkRef.current = true;
                }}
                className="px-6 py-2 border border-red-500/30 hover:border-red-500 text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 font-semibold transition-all text-sm"
              >
                Cancel Download
              </button>
            </div>
          </div>
        )}
      </main>
      
      <footer className="text-center py-6 text-gray-500 dark:text-gray-400 text-sm">
        <p>&copy; {new Date().getFullYear()} IDGEN. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default App;
