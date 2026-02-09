
import React, { useState, useEffect, useRef } from 'react';
import type { IdCardData, PhotoShape } from '../types';
import { SparklesIcon, RefreshIcon, SpinnerIcon } from './icons';
import ImageEditor from './ImageEditor';
import QRCode from 'qrcode';
import type { QRCodeSegment } from 'qrcode';


interface IdCardFormProps {
  formData: IdCardData;
  setFormData: React.Dispatch<React.SetStateAction<IdCardData>>;
}

const gradientThemes = {
  'blue-orange': 'from-blue-600 to-orange-500',
  'purple-pink': 'from-purple-500 to-pink-500',
  'green-teal': 'from-green-400 to-teal-500',
  'slate-gray': 'from-slate-700 to-gray-800',
  'oceanic-blue': 'from-blue-500 to-cyan-400',
  'sunset-orange': 'from-red-500 to-yellow-400',
  'emerald-green': 'from-emerald-600 to-lime-400',
  'royal-amethyst': 'from-indigo-600 to-violet-400',
  'monochrome-steel': 'from-gray-600 to-gray-400',
  'crimson-gold': 'from-red-700 to-yellow-500',
  'midnight-sky': 'from-gray-900 to-blue-800',
  'forest-mist': 'from-green-700 to-gray-500',
  'tropical-sunrise': 'from-yellow-400 via-pink-500 to-orange-500',
  'silver-lining': 'from-gray-300 to-gray-100',
  'cosmic-fusion': 'from-purple-800 via-blue-700 to-pink-600',
};

const allSuggestions = [
  'Date of Birth',
  'Blood Group',
  'Emergency Contact', 
  'Joining Date',
  'Valid Upto',
  'Nationality',
  'Address',
  'City',
  'State',
  'Phone (Alt)',
  'Employee Code',
  'Designation',
  'Gender',
  'Signature',
  'Branch',
  'Team Lead',
  'Shift',
  'Access Level'
];

const resizeImage = (file: File, maxWidth: number, maxHeight: number): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;

        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return reject(new Error('Could not get canvas context'));
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL(file.type));
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
};


const GradientPicker: React.FC<{ selected: string; onChange: (theme: string) => void }> = ({ selected, onChange }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
      Gradient Theme
    </label>
    <div className="flex flex-wrap gap-3">
       <button
          key="custom"
          type="button"
          onClick={() => onChange('custom')}
          className={`w-10 h-10 rounded-full bg-gradient-to-r from-gray-400 to-gray-600 flex items-center justify-center text-white transition-transform transform hover:scale-110 focus:outline-none ${
            selected === 'custom' ? 'ring-2 ring-offset-2 ring-blue-500 dark:ring-offset-gray-800' : ''
          }`}
          aria-label="Select custom theme"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        </button>
      {Object.entries(gradientThemes).map(([key, gradientClass]) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          className={`w-10 h-10 rounded-full bg-gradient-to-r ${gradientClass} transition-transform transform hover:scale-110 focus:outline-none ${
            selected === key ? 'ring-2 ring-offset-2 ring-blue-500 dark:ring-offset-gray-800' : ''
          }`}
          aria-label={`Select ${key} theme`}
        />
      ))}
    </div>
  </div>
);


const InputField: React.FC<{ label: string; name: keyof IdCardData | string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; type?: string; readOnly?: boolean; placeholder?: string }> = ({ label, name, value, onChange, type = 'text', readOnly = false, placeholder }) => (
  <div>
    <label htmlFor={name} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
      {label}
    </label>
    <input
      type={type}
      id={name}
      name={name}
      value={value}
      onChange={onChange}
      readOnly={readOnly}
      placeholder={placeholder}
      className={`w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition ${readOnly ? 'cursor-not-allowed bg-gray-200 dark:bg-gray-600' : ''}`}
    />
  </div>
);


const IdCardForm: React.FC<IdCardFormProps> = ({
  formData,
  setFormData,
}) => {
  const [isSuggestionsModalOpen, setIsSuggestionsModalOpen] = useState(false);
  const [currentSuggestions, setCurrentSuggestions] = useState<string[]>([]);
  const [imageToEdit, setImageToEdit] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState<Record<string, boolean>>({});
  const [qrCodeType, setQrCodeType] = useState<'text' | 'encode' | 'upload'>('text');
  const [qrContent, setQrContent] = useState('');
  const [qrError, setQrError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: e.target.type === 'number' || e.target.type === 'range' ? (value === '' ? 0 : parseFloat(value)) : value,
    }));
  };
  
  const handleRadioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
     const { name, value } = e.target;
     setFormData(prev => ({...prev, [name]: value}));
  };


  const handleDetailChange = (id: number, field: 'label' | 'value', value: string) => {
    setFormData(prev => ({
      ...prev,
      details: prev.details.map(detail =>
        detail.id === id ? { ...detail, [field]: value } : detail
      )
    }));
  };
  
  const addDetail = () => {
    setFormData(prev => ({
      ...prev,
      details: [...prev.details, { id: Date.now(), label: '', value: '' }]
    }));
  };

  const openSuggestions = () => {
    const shuffled = [...allSuggestions].sort(() => 0.5 - Math.random());
    setCurrentSuggestions(shuffled.slice(0, 6));
    setIsSuggestionsModalOpen(true);
  };

  const handleAddSuggestion = (label: string) => {
    setFormData(prev => ({
      ...prev,
      details: [...prev.details, { id: Date.now(), label, value: '' }]
    }));
    setIsSuggestionsModalOpen(false);
  };

  const removeDetail = (id: number) => {
    setFormData(prev => ({
      ...prev,
      details: prev.details.filter(detail => detail.id !== id)
    }));
  };
  
  const handleThemeChange = (theme: string) => {
    setFormData((prev) => ({...prev, theme}));
  };
  
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, field: 'photoUrl' | 'companyLogoUrl' | 'backgroundImageUrl' | 'qrCodeUrl') => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setIsUploading(prev => ({ ...prev, [field]: true }));
      try {
        if (field === 'photoUrl') {
          const resizedImage = await resizeImage(file, 1024, 1024);
          setImageToEdit(resizedImage);
        } else if (field === 'qrCodeUrl') {
           setQrContent(''); 
           const resizedImage = await resizeImage(file, 300, 300);
           setFormData((prev) => ({ ...prev, [field]: resizedImage }));
        }
        else {
           const result = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.readAsDataURL(file);
              reader.onload = () => resolve(reader.result as string);
              reader.onerror = error => reject(error);
           });
           setFormData((prev) => ({ ...prev, [field]: result }));
        }
      } catch (error) {
        console.error("Error processing image:", error);
        alert("There was an error processing your image. Please try again.");
      } finally {
        setIsUploading(prev => ({ ...prev, [field]: false }));
      }
    }
  };


  const handleRegenerateId = () => {
    const newId = `EMP-${Math.floor(1000 + Math.random() * 9000)}`;
    setFormData(prev => ({
      ...prev,
      details: prev.details.map(detail =>
        detail.label.toLowerCase() === 'id' ? { ...detail, value: newId } : detail
      )
    }));
  };
  
  const handleQrFileEncode = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setQrError(null);
    if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        const MAX_FILE_SIZE_BYTES = 2900; 

        if (file.size > MAX_FILE_SIZE_BYTES) {
            setQrError(`File is too large. Max size is 2.8 KB.`);
            return;
        }

        setIsUploading(prev => ({ ...prev, qrCodeUrl: true }));
        try {
            const reader = new FileReader();
            reader.readAsArrayBuffer(file); 

            reader.onload = async () => {
                const buffer = reader.result as ArrayBuffer;
                const bytes = new Uint8Array(buffer);
                
                let byteString = '';
                bytes.forEach((byte) => {
                    byteString += String.fromCharCode(byte);
                });

                try {
                    const segments: QRCodeSegment[] = [
                        { data: `${file.type}:`, mode: 'alphanumeric' },
                        { data: byteString, mode: 'byte' }
                    ];

                    const dataUrl = await QRCode.toDataURL(segments, {
                        errorCorrectionLevel: 'L', 
                        margin: 1,
                        width: 256,
                    });
                    setFormData(prev => ({ ...prev, qrCodeUrl: dataUrl }));
                } catch (err) {
                    console.error('Failed to generate QR code from file', err);
                    setQrError('Failed to generate QR code. The file might be too complex or large.');
                    setFormData(prev => ({ ...prev, qrCodeUrl: null }));
                }
            };
            reader.onerror = () => {
                setQrError("Failed to read the selected file.");
            };
        } catch (error) {
            console.error("Error processing file for QR encoding:", error);
            setQrError("An unexpected error occurred while processing your file.");
        } finally {
            setIsUploading(prev => ({ ...prev, qrCodeUrl: false }));
        }
    }
  };

  useEffect(() => {
    if (qrCodeType !== 'text') {
        return;
    };
    if (!qrContent) {
        setFormData(prev => ({ ...prev, qrCodeUrl: null }));
        setQrError(null);
        return;
    }

    const generateQrCode = async () => {
      try {
        const dataUrl = await QRCode.toDataURL(qrContent, {
          errorCorrectionLevel: 'H',
          margin: 1,
          width: 256,
        });
        setFormData(prev => ({ ...prev, qrCodeUrl: dataUrl }));
        setQrError(null);
      } catch (err) {
        console.error('Failed to generate QR code', err);
        if (err instanceof Error && err.message.includes('too long')) {
            setQrError('Content is too long to fit in a QR code.');
        } else {
            setQrError('Failed to generate QR code.');
        }
        setFormData(prev => ({ ...prev, qrCodeUrl: null }));
      }
    };
    
    const timeoutId = setTimeout(generateQrCode, 300);
    return () => clearTimeout(timeoutId);
  }, [qrContent, qrCodeType, setFormData]);

  return (
    <>
      {imageToEdit && (
        <ImageEditor
          src={imageToEdit}
          onCancel={() => setImageToEdit(null)}
          onSave={(editedImage) => {
            setFormData(prev => ({ ...prev, photoUrl: editedImage }));
            setImageToEdit(null);
          }}
        />
      )}
      <form className="space-y-5">
        <div className="border-b border-gray-200 dark:border-gray-700 pb-5">
           <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-gray-100 mb-3">
            Card Orientation
          </h3>
          <div className="flex items-center space-x-4 mb-6">
            {(['portrait', 'landscape'] as const).map(orientation => (
              <label key={orientation} className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="orientation"
                  value={orientation}
                  checked={formData.orientation === orientation}
                  onChange={handleRadioChange}
                  className="form-radio h-4 w-4 text-blue-600"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">{orientation}</span>
              </label>
            ))}
          </div>

          <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-gray-100 mb-3">
            Background Style
          </h3>
          <div className="flex items-center space-x-4 mb-4">
            {(['gradient', 'solid', 'image'] as const).map(type => (
              <label key={type} className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="backgroundType"
                  value={type}
                  checked={formData.backgroundType === type}
                  onChange={handleRadioChange}
                  className="form-radio h-4 w-4 text-blue-600"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">{type}</span>
              </label>
            ))}
          </div>

          {formData.backgroundType === 'gradient' && (
            <>
              <GradientPicker selected={formData.theme} onChange={handleThemeChange} />
              {formData.theme === 'custom' && (
                <div className="mt-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                  <h4 className="text-md font-medium text-gray-900 dark:text-gray-100 mb-3">Custom Gradient Colors</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="themeColor1" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Color 1
                      </label>
                      <input
                        type="color"
                        id="themeColor1"
                        name="themeColor1"
                        value={formData.themeColor1}
                        onChange={handleChange}
                        className="w-full h-10 p-1 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md cursor-pointer"
                      />
                    </div>
                    <div>
                      <label htmlFor="themeColor2" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Color 2
                      </label>
                      <input
                        type="color"
                        id="themeColor2"
                        name="themeColor2"
                        value={formData.themeColor2}
                        onChange={handleChange}
                        className="w-full h-10 p-1 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {formData.backgroundType === 'solid' && (
            <div>
              <label htmlFor="backgroundColor" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Background Color
              </label>
              <input
                type="color"
                id="backgroundColor"
                name="backgroundColor"
                value={formData.backgroundColor}
                onChange={handleChange}
                className="w-full h-10 p-1 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md cursor-pointer"
              />
            </div>
          )}

          {formData.backgroundType === 'image' && (
            <div className="space-y-4">
              <div>
                <label htmlFor="backgroundImage" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Background Image
                </label>
                <div className="relative">
                  <input
                    type="file"
                    id="backgroundImage"
                    name="backgroundImage"
                    accept="image/*"
                    disabled={isUploading['backgroundImageUrl']}
                    onChange={(e) => handleFileChange(e, 'backgroundImageUrl')}
                    className="w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 dark:file:bg-blue-900/40 file:text-blue-700 dark:file:text-blue-300 hover:file:bg-blue-100 dark:hover:file:bg-blue-900/60 disabled:opacity-50 disabled:cursor-wait"
                  />
                  {isUploading['backgroundImageUrl'] && (
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <SpinnerIcon className="w-5 h-5 text-blue-500" />
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Image Fit</label>
                <div className="flex items-center space-x-4">
                  {(['cover', 'contain', 'tile'] as const).map(fit => (
                    <label key={fit} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        name="backgroundImageFit"
                        value={fit}
                        checked={formData.backgroundImageFit === fit}
                        onChange={handleRadioChange}
                        className="form-radio h-4 w-4 text-blue-600"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">{fit}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div>
          <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-gray-100 mb-3">
            Customization
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InputField label="Company Name Font Size (pt)" name="companyNameFontSize" value={String(formData.companyNameFontSize)} onChange={handleChange} type="number" />
            <InputField label="Employee Name Font Size (pt)" name="employeeNameFontSize" value={String(formData.employeeNameFontSize)} onChange={handleChange} type="number" />
            <InputField label="Photo Size (px)" name="photoSize" value={String(formData.photoSize)} onChange={handleChange} type="number" />
            <InputField label="Details Font Size (pt)" name="detailsFontSize" value={String(formData.detailsFontSize)} onChange={handleChange} type="number" />
            <InputField label="Company Logo Size (px)" name="companyLogoSize" value={String(formData.companyLogoSize)} onChange={handleChange} type="number" />
            <InputField label="QR Code Size (px)" name="qrCodeSize" value={String(formData.qrCodeSize)} onChange={handleChange} type="number" />
            <InputField label="Terms Font Size (pt)" name="termsFontSize" value={String(formData.termsFontSize)} onChange={handleChange} type="number" />
            <InputField label="Website Font Size (pt)" name="websiteFontSize" value={String(formData.websiteFontSize)} onChange={handleChange} type="number" />
            <div>
              <label htmlFor="textColor" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Font Color
              </label>
              <input
                type="color"
                id="textColor"
                name="textColor"
                value={formData.textColor}
                onChange={handleChange}
                className="w-full h-10 p-1 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md cursor-pointer"
              />
            </div>
            <div>
              <label htmlFor="termsColor" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Terms & Conditions Color
              </label>
              <input
                type="color"
                id="termsColor"
                name="termsColor"
                value={formData.termsColor}
                onChange={handleChange}
                className="w-full h-10 p-1 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md cursor-pointer"
              />
            </div>
            {formData.orientation === 'portrait' && (
              <div className="sm:col-span-2 space-y-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-700/30">
                <h4 className="text-md font-medium text-gray-900 dark:text-gray-100 -mb-1">Photo Position (Portrait Only)</h4>
                <div>
                  <label htmlFor="photoHorizontalOffset" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Horizontal Position
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      id="photoHorizontalOffset"
                      name="photoHorizontalOffset"
                      min="0"
                      max="100"
                      value={formData.photoHorizontalOffset}
                      onChange={handleChange}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                    />
                    <div className="flex items-center shrink-0 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm">
                      <input
                        type="number"
                        id="photoHorizontalOffset-number"
                        name="photoHorizontalOffset"
                        value={formData.photoHorizontalOffset}
                        onChange={handleChange}
                        className="w-16 px-2 py-1 text-center bg-transparent border-0 focus:ring-2 focus:ring-inset focus:ring-blue-500 rounded-md"
                        min="0"
                        max="100"
                      />
                      <span className="pr-3 text-gray-500 dark:text-gray-400">%</span>
                    </div>
                  </div>
                </div>
                <div>
                  <label htmlFor="photoVerticalOffset" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Vertical Position
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      id="photoVerticalOffset"
                      name="photoVerticalOffset"
                      min="0"
                      max="100"
                      value={formData.photoVerticalOffset}
                      onChange={handleChange}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                    />
                    <div className="flex items-center shrink-0 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm">
                      <input
                        type="number"
                        id="photoVerticalOffset-number"
                        name="photoVerticalOffset"
                        value={formData.photoVerticalOffset}
                        onChange={handleChange}
                        className="w-16 px-2 py-1 text-center bg-transparent border-0 focus:ring-2 focus:ring-inset focus:ring-blue-500 rounded-md"
                        min="0"
                        max="100"
                      />
                      <span className="pr-3 text-gray-500 dark:text-gray-400">%</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-gray-200 dark:border-gray-700 pt-5">
          <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-gray-100 mb-3">
            Card Content
          </h3>
          <div className="space-y-5">
            <InputField label="Company Name" name="companyName" value={formData.companyName} onChange={handleChange} placeholder="Your Company Name" />
            <div>
              <label htmlFor="companyLogo" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Company Logo
              </label>
              <div className="relative">
                <input
                  type="file"
                  id="companyLogo"
                  name="companyLogo"
                  accept="image/*"
                  disabled={isUploading['companyLogoUrl']}
                  onChange={(e) => handleFileChange(e, 'companyLogoUrl')}
                  className="w-full text-sm text-gray-500 dark:text-gray-400
                            file:mr-4 file:py-2 file:px-4
                            file:rounded-md file:border-0
                            file:text-sm file:font-semibold
                            file:bg-blue-50 dark:file:bg-blue-900/40 file:text-blue-700 dark:file:text-blue-300
                            hover:file:bg-blue-100 dark:hover:file:bg-blue-900/60 disabled:opacity-50 disabled:cursor-wait"
                />
                {isUploading['companyLogoUrl'] && (
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <SpinnerIcon className="w-5 h-5 text-blue-500" />
                  </div>
                )}
              </div>
            </div>
            <div>
              <label htmlFor="photo" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Profile Photo
              </label>
              <div className="relative">
                <input
                  type="file"
                  id="photo"
                  name="photo"
                  accept="image/*"
                  disabled={isUploading['photoUrl']}
                  onChange={(e) => handleFileChange(e, 'photoUrl')}
                  className="w-full text-sm text-gray-500 dark:text-gray-400
                            file:mr-4 file:py-2 file:px-4
                            file:rounded-md file:border-0
                            file:text-sm file:font-semibold
                            file:bg-blue-50 dark:file:bg-blue-900/40 file:text-blue-700 dark:file:text-blue-300
                            hover:file:bg-blue-100 dark:hover:file:bg-blue-900/60 disabled:opacity-50 disabled:cursor-wait"
                />
                {isUploading['photoUrl'] && (
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <SpinnerIcon className="w-5 h-5 text-blue-500" />
                  </div>
                )}
              </div>
              <div className="mt-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Photo Shape
                </label>
                <select
                    name="photoShape"
                    value={formData.photoShape}
                    onChange={(e) => setFormData(prev => ({ ...prev, photoShape: e.target.value as PhotoShape }))}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition capitalize"
                >
                    <option value="circle">Circle</option>
                    <option value="square">Square</option>
                    <option value="rounded">Rounded Square</option>
                    <option value="rhombus">Rhombus (Diamond)</option>
                    <option value="hexagon">Hexagon</option>
                    <option value="pentagon">Pentagon</option>
                    <option value="octagon">Octagon</option>
                    <option value="star">Star</option>
                </select>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Recommended: Square image, 500x500 pixels or larger.</p>
            </div>
             <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    QR Code Source
                </label>
                <div className="flex flex-wrap gap-x-4 gap-y-2 mb-3">
                    {(['text', 'encode', 'upload'] as const).map(type => (
                        <label key={type} className="flex items-center space-x-2 cursor-pointer">
                            <input
                                type="radio"
                                name="qrCodeType"
                                value={type}
                                checked={qrCodeType === type}
                                onChange={(e) => {
                                    setQrCodeType(e.target.value as any);
                                    setQrContent('');
                                    setQrError(null);
                                    setFormData(prev => ({ ...prev, qrCodeUrl: null }));
                                }}
                                className="form-radio h-4 w-4 text-blue-600"
                            />
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">
                                {type === 'text' ? 'Text / URL' : type === 'encode' ? 'Embed File' : 'Upload Image'}
                            </span>
                        </label>
                    ))}
                </div>

                {qrCodeType === 'text' && (
                    <div>
                        <label htmlFor="qrCodeTextInput" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 sr-only">
                            Text or URL
                        </label>
                        <textarea
                            id="qrCodeTextInput"
                            placeholder="Enter text or URL to encode in the QR code"
                            value={qrContent}
                            onChange={(e) => {
                                setQrContent(e.target.value);
                                setQrError(null);
                            }}
                            rows={3}
                            className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                        />
                        {qrError && <p className="mt-1 text-sm text-red-500">{qrError}</p>}
                    </div>
                )}
                
                {qrCodeType === 'encode' && (
                    <div>
                        <label htmlFor="qrCodeEncodeFile" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 sr-only">
                            Embed File (Image or PDF)
                        </label>
                        <div className="relative">
                            <input
                                type="file"
                                id="qrCodeEncodeFile"
                                accept="image/*,application/pdf"
                                disabled={isUploading['qrCodeUrl']}
                                onChange={handleQrFileEncode}
                                className="w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 dark:file:bg-blue-900/40 file:text-blue-700 dark:file:text-blue-300 hover:file:bg-blue-100 dark:hover:file:bg-blue-900/60 disabled:opacity-50 disabled:cursor-wait"
                            />
                            {isUploading['qrCodeUrl'] && (
                                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                    <SpinnerIcon className="w-5 h-5 text-blue-500" />
                                </div>
                            )}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Embeds a small file into the QR code. Max 2.8 KB.
                        </p>
                        {qrError && <p className="mt-1 text-sm text-red-500">{qrError}</p>}
                    </div>
                )}

                {qrCodeType === 'upload' && (
                    <div>
                        <label htmlFor="qrCodeUpload" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 sr-only">
                            Upload QR Code Image
                        </label>
                        <div className="relative">
                           <input
                              type="file"
                              id="qrCodeUpload"
                              accept="image/*"
                              disabled={isUploading['qrCodeUrl']}
                              onChange={(e) => handleFileChange(e, 'qrCodeUrl')}
                              className="w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 dark:file:bg-blue-900/40 file:text-blue-700 dark:file:text-blue-300 hover:file:bg-blue-100 dark:hover:file:bg-blue-900/60 disabled:opacity-50 disabled:cursor-wait"
                            />
                            {isUploading['qrCodeUrl'] && (
                              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                <SpinnerIcon className="w-5 h-5 text-blue-500" />
                              </div>
                            )}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Recommended: Square image, 300x300 pixels or larger.</p>
                    </div>
                )}
            </div>
            <InputField label="Full Name" name="name" value={formData.name} onChange={handleChange} placeholder="e.g., Jane Doe" />
            <InputField label="Department" name="department" value={formData.department} onChange={handleChange} placeholder="e.g., Human Resources" />
            <InputField label="Website" name="website" value={formData.website} onChange={handleChange} placeholder="yourwebsite.com" />
            <div>
              <label htmlFor="termsAndConditions" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Terms & Conditions
              </label>
              <textarea
                id="termsAndConditions"
                name="termsAndConditions"
                value={formData.termsAndConditions}
                onChange={handleChange}
                rows={3}
                placeholder="Misuse of this card may result in suspension. Please use according to company rules."
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
              />
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 dark:border-gray-700 pt-5">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-gray-100">
              Custom Details
            </h3>
            <div className="flex items-center gap-2">
              <button type="button" onClick={openSuggestions} className="px-3 py-1 bg-purple-500 text-white rounded-md hover:bg-purple-600 text-sm font-semibold flex items-center gap-1">
                <SparklesIcon className="h-4 w-4" />
                Suggest
              </button>
              <button type="button" onClick={addDetail} className="px-3 py-1 bg-green-500 text-white rounded-md hover:bg-green-600 text-sm font-semibold flex items-center gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Add Detail
              </button>
            </div>
          </div>
          <div className="space-y-4">
            {formData.details.map((detail) => {
              const isIdField = detail.label.toLowerCase() === 'id';
              return (
                <div key={detail.id} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-5">
                    <label htmlFor={`detail-label-${detail.id}`} className="sr-only">Label</label>
                    <input
                        type="text"
                        id={`detail-label-${detail.id}`}
                        placeholder="Label (e.g., Phone)"
                        value={detail.label}
                        readOnly={isIdField}
                        onChange={(e) => handleDetailChange(detail.id, 'label', e.target.value)}
                        className={`w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${isIdField ? 'cursor-not-allowed bg-gray-200 dark:bg-gray-600' : ''}`}
                      />
                  </div>
                  <div className="col-span-5 sm:col-span-6">
                    <div className="relative flex items-center">
                      <input
                          type="text"
                          id={`detail-value-${detail.id}`}
                          placeholder="Value"
                          value={detail.value}
                          readOnly={isIdField}
                          onChange={(e) => handleDetailChange(detail.id, 'value', e.target.value)}
                          className={`w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${isIdField ? 'cursor-not-allowed bg-gray-200 dark:bg-gray-600 pr-10' : ''}`}
                        />
                        {isIdField && (
                          <button 
                            type="button" 
                            onClick={handleRegenerateId} 
                            className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-blue-500"
                            aria-label="Regenerate ID"
                          >
                              <RefreshIcon className="h-5 w-5" />
                          </button>
                        )}
                    </div>
                  </div>
                  <div className="col-span-2 sm:col-span-1 flex justify-end">
                    {!isIdField && (
                        <button type="button" onClick={() => removeDetail(detail.id)} className="p-2 text-red-500 hover:text-red-700 dark:hover:text-red-400 rounded-full hover:bg-red-100 dark:hover:bg-red-900/50">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </form>
      {isSuggestionsModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setIsSuggestionsModalOpen(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Select a Detail to Add</h3>
              <button onClick={() => setIsSuggestionsModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {currentSuggestions.map(suggestion => (
                <button 
                  key={suggestion} 
                  onClick={() => handleAddSuggestion(suggestion)}
                  className="w-full text-left px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md text-gray-800 dark:text-gray-200 transition"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default IdCardForm;
