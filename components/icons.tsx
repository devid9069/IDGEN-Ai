
import React from 'react';

export const CompanyLogo: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
  >
    <path
      fillRule="evenodd"
      d="M4.5 3.75a3 3 0 00-3 3v10.5a3 3 0 003 3h15a3 3 0 003-3V6.75a3 3 0 00-3-3h-15zm4.125 3a.75.75 0 000 1.5h6.75a.75.75 0 000-1.5h-6.75zm0 3.75a.75.75 0 000 1.5h6.75a.75.75 0 000-1.5h-6.75zm0 3.75a.75.75 0 000 1.5h6.75a.75.75 0 000-1.5h-6.75z"
      clipRule="evenodd"
    />
  </svg>
);

export const UserPlaceholderIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
  >
    <path
      fillRule="evenodd"
      d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z"
      clipRule="evenodd"
    />
  </svg>
);

export const HeaderIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg 
    {...props}
    width="40" 
    height="40" 
    viewBox="0 0 100 100" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
    className="rounded-xl shadow-sm"
  >
    {/* Blue background matches the image exactly */}
    <rect width="100" height="100" rx="24" fill="#0066FF" />
    
    {/* ID Card Outline */}
    <rect x="25" y="21" width="50" height="32" rx="4" stroke="white" strokeWidth="4" />
    
    {/* Profile Icon inside card */}
    <circle cx="40" cy="31" r="5" fill="white" />
    <path d="M32 44C32 40.6863 35.5817 38 40 38C44.4183 38 48 40.6863 48 44" fill="white" />
    
    {/* Text Lines inside card */}
    <line x1="52" y1="31" x2="68" y2="31" stroke="white" strokeWidth="4" strokeLinecap="round" />
    <line x1="52" y1="38" x2="68" y2="38" stroke="white" strokeWidth="4" strokeLinecap="round" />
    <line x1="52" y1="45" x2="62" y2="45" stroke="white" strokeWidth="4" strokeLinecap="round" />
    
    {/* IDGEN Text styling matching the image font */}
    <text 
      x="50%" 
      y="78" 
      dominantBaseline="middle" 
      textAnchor="middle" 
      fill="white" 
      style={{ fontSize: '24px', fontWeight: '900', fontFamily: 'Arial Black, sans-serif' }}
    >
      IDGEN
    </text>
  </svg>
);

export const DownloadIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
    </svg>
);

export const SparklesIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.898 20.573L16.5 21.75l-.398-1.177a3.375 3.375 0 00-2.455-2.455L12.75 18l1.177-.398a3.375 3.375 0 002.455-2.455L17.25 14.25l.398 1.177a3.375 3.375 0 002.455 2.455L21 18l-1.177.398a3.375 3.375 0 00-2.455 2.455z" />
    </svg>
);


export const SpinnerIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <style>{`
      .spinner-path {
        animation: spinner-spin 1.5s ease-in-out infinite;
        transform-origin: center;
      }
      @keyframes spinner-spin {
        0% { transform: rotate(0deg); stroke-dasharray: 0, 150; }
        50% { transform: rotate(540deg); stroke-dasharray: 100, 150; }
        100% { transform: rotate(1080deg); stroke-dasharray: 0, 150; }
      }
    `}</style>
    <path
      className="spinner-path"
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 3a9 9 0 1 0 9 9"
      strokeDasharray="0 150"
    />
  </svg>
);

export const RefreshIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001a.75.75 0 0 1 .75.75v.001a.75.75 0 0 1-.75.75h-4.992a2.25 2.25 0 0 1-2.25-2.25V6.162a.75.75 0 0 1 .75-.75h.001a.75.75 0 0 1 .75.75v3.186c0 .414.336.75.75.75h.001a.75.75 0 0 0 .75-.75v-.001a2.25 2.25 0 0 0-2.25-2.25h-3.186a2.25 2.25 0 0 0-2.25 2.25v6.252a2.25 2.25 0 0 0 2.25 2.25h3.186a2.25 2.25 0 0 0 2.25-2.25v-3.186a2.25 2.25 0 0 0-2.25-2.25h-.001a.75.75 0 0 0-.75.75v.001c0 .414.336.75.75.75h.001a.75.75 0 0 1 .75.75v.001a2.25 2.25 0 0 1-2.25 2.25h-6.252a2.25 2.25 0 0 1-2.25-2.25v-6.252a2.25 2.25 0 0 1 2.25-2.25h6.252a2.25 2.25 0 0 1 2.25 2.25v3.186" />
    </svg>
);

export const UndoIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" />
  </svg>
);

export const RedoIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="m15 15 6-6m0 0-6-6m6 6H9a6 6 0 0 0 0 12h3" />
  </svg>
);

export const UploadIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
    </svg>
);

export const ChevronLeftIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
  </svg>
);

export const ChevronRightIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
  </svg>
);
