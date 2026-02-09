
import React from 'react';
import type { IdCardData, PhotoShape } from '../types';
import { UserPlaceholderIcon } from './icons';

interface IdCardPreviewProps {
  data: IdCardData;
}

const themeBackgrounds: Record<string, string> = {
  'blue-orange': 'bg-gradient-to-br from-blue-600 to-orange-500',
  'purple-pink': 'bg-gradient-to-br from-purple-500 to-pink-500',
  'green-teal': 'bg-gradient-to-br from-green-400 to-teal-500',
  'slate-gray': 'bg-gradient-to-br from-slate-700 to-gray-800',
  'oceanic-blue': 'bg-gradient-to-br from-blue-500 to-cyan-400',
  'sunset-orange': 'bg-gradient-to-br from-red-500 to-yellow-400',
  'emerald-green': 'bg-gradient-to-br from-emerald-600 to-lime-400',
  'royal-amethyst': 'bg-gradient-to-br from-indigo-600 to-violet-400',
  'monochrome-steel': 'bg-gradient-to-br from-gray-600 to-gray-400',
  'crimson-gold': 'bg-gradient-to-br from-red-700 to-yellow-500',
  'midnight-sky': 'bg-gradient-to-br from-gray-900 to-blue-800',
  'forest-mist': 'bg-gradient-to-br from-green-700 to-gray-500',
  'tropical-sunrise': 'bg-gradient-to-br from-yellow-400 via-pink-500 to-orange-500',
  'silver-lining': 'bg-gradient-to-br from-gray-300 to-gray-100',
  'cosmic-fusion': 'bg-gradient-to-br from-purple-800 via-blue-700 to-pink-600',
};

const getBackgroundStyle = (data: IdCardData): React.CSSProperties => {
  switch (data.backgroundType) {
    case 'solid':
      return { backgroundColor: data.backgroundColor };
    case 'image':
      if (!data.backgroundImageUrl) return {};
      return {
        backgroundImage: `url(${data.backgroundImageUrl})`,
        backgroundSize: data.backgroundImageFit === 'tile' ? 'auto' : data.backgroundImageFit,
        backgroundRepeat: data.backgroundImageFit === 'tile' ? 'repeat' : 'no-repeat',
        backgroundPosition: 'center',
      };
    case 'gradient':
      if (data.theme === 'custom') {
        return { background: `linear-gradient(to bottom right, ${data.themeColor1}, ${data.themeColor2})` };
      }
      return {};
    default:
      return {};
  }
};

const getBackgroundClass = (data: IdCardData): string => {
    if (data.backgroundType === 'gradient' && data.theme !== 'custom') {
      return themeBackgrounds[data.theme] || 'bg-gradient-to-br from-slate-700 to-gray-800';
    }
    return 'bg-white'; // Fallback background
}

const PhotoShapeSVG: React.FC<{ 
    shape: PhotoShape; 
    src: string | null; 
    size: number;
}> = ({ shape, src, size }) => {
    // Define paths for 100x100 coordinate space
    const paths: Record<PhotoShape, string> = {
        circle: "M 50, 50 m -48, 0 a 48,48 0 1,0 96,0 a 48,48 0 1,0 -96,0",
        square: "M 2,2 H 98 V 98 H 2 Z",
        rounded: "M 20,2 H 80 Q 98,2 98,20 V 80 Q 98,98 80,98 H 20 Q 2,98 2,80 V 20 Q 2,2 20,2 Z",
        rhombus: "M 50,2 L 98,50 L 50,98 L 2,50 Z",
        hexagon: "M 50,2 L 95,25 L 95,75 L 50,98 L 5,75 L 5,25 Z",
        pentagon: "M 50,2 L 98,38 L 80,98 H 20 L 2,38 Z",
        octagon: "M 30,2 H 70 L 98,30 V 70 L 70,98 H 30 L 2,70 V 30 Z",
        star: "M 50,2 L 63,35 H 98 L 70,55 L 80,90 L 50,70 L 20,90 L 30,55 L 2,35 H 37 Z"
    };

    const path = paths[shape] || paths.circle;
    const clipId = `clip-${shape}-${Math.random().toString(36).substr(2, 9)}`;

    return (
        <div style={{ width: size, height: size, filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.3))' }}>
            <svg width={size} height={size} viewBox="0 0 100 100" className="overflow-visible">
                <defs>
                    <clipPath id={clipId}>
                        <path d={path} />
                    </clipPath>
                </defs>
                {src ? (
                   <image 
                        href={src} 
                        width="100" 
                        height="100" 
                        clipPath={`url(#${clipId})`} 
                        preserveAspectRatio="xMidYMid slice" 
                        crossOrigin="anonymous"
                    /> 
                ) : (
                    <g clipPath={`url(#${clipId})`}>
                        <rect width="100" height="100" fill="rgba(255,255,255,0.2)" />
                        <foreignObject width="100" height="100">
                             <div className="w-full h-full flex items-center justify-center">
                                 <UserPlaceholderIcon className="w-4/5 h-4/5 text-white/50" />
                             </div>
                        </foreignObject>
                    </g>
                )}
            </svg>
        </div>
    );
};

const IdCardPreview = React.forwardRef<HTMLDivElement, IdCardPreviewProps>(({ data }, ref) => {
  const isPortrait = data.orientation === 'portrait';
  const textStyle = { color: data.textColor };
  const companyNameStyle = { ...textStyle, fontSize: `${data.companyNameFontSize}pt`, lineHeight: '1.2' };
  const employeeNameStyle = { ...textStyle, fontSize: `${data.employeeNameFontSize}pt`, lineHeight: '1.2' };
  
  const detailsStyle = { ...textStyle, fontSize: `${data.detailsFontSize}pt`};
  const logoStyle: React.CSSProperties = { 
    width: `${data.companyLogoSize}px`, 
    height: `${data.companyLogoSize}px`,
  };
  
  const cardStyle: React.CSSProperties = {
    ...getBackgroundStyle(data),
    borderRadius: `${data.borderRadius}px`,
    // Use inset box-shadow for border to prevent layout issues and combine with outer shadow
    boxShadow: `inset 0 0 0 ${data.borderWidth}px ${data.borderColor}, 0 25px 50px -12px rgb(0 0 0 / 0.25)`,
  }

  // Aspect Ratio for ID-1 card: 
  // Portrait: 53.98mm x 85.60mm (~0.63)
  // Landscape: 85.60mm x 53.98mm (~1.58)
  const containerAspectClass = isPortrait ? 'aspect-[360/573.3]' : 'aspect-[573.3/360]';
  const maxWidthClass = isPortrait ? 'max-w-[360px]' : 'max-w-[573px]';

  const LogoComponent = () => (
    data.companyLogoUrl ? (
        <img src={data.companyLogoUrl} alt="Company Logo" style={logoStyle} className="object-contain" crossOrigin="anonymous" />
    ) : (
         <div style={logoStyle} className="bg-white/20 rounded-full flex-shrink-0 flex items-center justify-center text-center p-1">
            <span style={{ fontSize: `${Math.max(8, data.companyLogoSize / 5)}px`, color: data.textColor, opacity: 0.9 }} className="font-semibold leading-tight">
                Logo
            </span>
        </div>
    )
  );

  return (
    <div className={`w-full ${isPortrait ? 'max-w-md' : 'max-w-2xl'}`}>
      <div
        ref={ref}
        className={`w-full ${maxWidthClass} ${containerAspectClass} ${getBackgroundClass(data)} transform transition-all duration-300 relative overflow-hidden mx-auto`}
        style={cardStyle}
      >
        {isPortrait ? (
            // PORTRAIT LAYOUT
            <div className="p-5 grid grid-rows-[auto_1fr_auto] h-full w-full">
                {/* Header: Logo Absolute Left, Name Center */}
                <header className="relative w-full flex items-center justify-center shrink-0 mb-2">
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 z-10">
                        <LogoComponent />
                    </div>
                    {/* Padding on the name ensures it doesn't overlap with the logo if the text is long */}
                    <div className="w-full text-center" style={{ paddingLeft: data.companyLogoSize + 8, paddingRight: data.companyLogoSize + 8 }}>
                        <h2 style={companyNameStyle} className="font-bold break-words leading-tight">
                            {data.companyName || 'Your Company Name'}
                        </h2>
                    </div>
                </header>

                {/* Main Content */}
                <main className="relative w-full h-full overflow-hidden">
                    <div 
                      style={{
                        position: 'absolute',
                        top: `${data.photoVerticalOffset}%`,
                        left: `${data.photoHorizontalOffset}%`,
                        transform: 'translate(-50%, -50%)',
                        width: '90%', // To avoid content touching card edges
                      }}
                      className="flex flex-col items-center text-center"
                    >
                        <PhotoShapeSVG 
                            shape={data.photoShape} 
                            src={data.photoUrl} 
                            size={data.photoSize} 
                        />

                        <h1 style={employeeNameStyle} className="font-bold mt-3">{data.name || 'Employee Name'}</h1>
                        
                        <p style={textStyle} className="text-md mt-1 font-semibold">{data.department || 'Department'}</p>

                        <div style={detailsStyle} className="w-full max-w-xs mt-4 space-y-1 px-4">
                            {data.details.map(detail => (
                            detail.label && (
                                <p key={detail.id}>
                                <span className="font-semibold">{detail.label}:</span> {detail.value || <span className="opacity-70 italic">...</span>}
                                </p>
                            )
                            ))}
                        </div>
                    </div>
                </main>

                {/* Footer */}
                <footer className="shrink-0 flex items-end justify-between text-xs mt-2">
                    <div className={`text-left ${data.qrCodeUrl ? 'max-w-[calc(100%-96px)]' : 'max-w-full'}`}>
                        <div className="mb-2 leading-tight opacity-80">
                            <p style={{...textStyle, fontWeight: 'bold'}}>Terms & Conditions</p>
                            <p style={{ color: data.termsColor || data.textColor, fontSize: `${data.termsFontSize}pt` }}>
                               {data.termsAndConditions || 'Misuse of this card may result in suspension. Please use according to company rules.'}
                            </p>
                        </div>
                        <p style={{ ...textStyle, fontSize: `${data.websiteFontSize}pt` }}>{data.website || 'yourwebsite.com'}</p>
                    </div>
                    {data.qrCodeUrl && (
                        <div className="p-1 bg-white rounded-md shadow-sm flex-shrink-0">
                            <img src={data.qrCodeUrl} alt="QR Code" style={{ width: `${data.qrCodeSize}px`, height: `${data.qrCodeSize}px`, imageRendering: 'pixelated' }} className="object-contain" crossOrigin="anonymous" />
                        </div>
                    )}
                </footer>
            </div>
        ) : (
            // LANDSCAPE LAYOUT
             <div className="flex h-full w-full">
                {/* Left Column: Photo & Basic Info */}
                <div className="w-[38%] flex flex-col items-center justify-center p-4 border-r border-white/10 bg-black/5 relative">
                     <PhotoShapeSVG 
                        shape={data.photoShape} 
                        src={data.photoUrl} 
                        size={data.photoSize} 
                    />
                    <h1 style={employeeNameStyle} className="font-bold mt-3 text-center leading-tight">{data.name || 'Employee Name'}</h1>
                    <p style={textStyle} className="text-md mt-1 font-semibold text-center opacity-90">{data.department || 'Department'}</p>
                </div>

                {/* Right Column: Details & Footer */}
                <div className="w-[62%] flex flex-col p-5 justify-between relative">
                     {/* Header: Logo Absolute Left, Name Center */}
                    <header className="relative w-full flex items-center justify-center shrink-0 mb-2 min-h-[40px]">
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 z-10">
                            <LogoComponent />
                        </div>
                        <div className="w-full text-center" style={{ paddingLeft: data.companyLogoSize + 8, paddingRight: data.companyLogoSize + 8 }}>
                            <h2 style={companyNameStyle} className="font-bold break-words leading-tight">
                                {data.companyName || 'Your Company Name'}
                            </h2>
                        </div>
                    </header>

                    {/* Details */}
                    <div className="flex-grow flex flex-col justify-center">
                         <div style={detailsStyle} className="space-y-1">
                            {data.details.map(detail => (
                            detail.label && (
                                <div key={detail.id} className="flex justify-between border-b border-white/10 pb-1 mb-1 last:border-0">
                                    <span className="font-semibold opacity-90">{detail.label}:</span> 
                                    <span className="text-right font-medium">{detail.value || <span className="opacity-70 italic">...</span>}</span>
                                </div>
                            )
                            ))}
                        </div>
                    </div>

                    {/* Footer */}
                    <footer className="shrink-0 flex items-end justify-between gap-4 mt-2">
                         <div className="flex-grow">
                             <div className="mb-1 leading-tight opacity-80">
                                <p style={{ color: data.termsColor || data.textColor, fontSize: `${data.termsFontSize}pt`, lineHeight: '1.2' }}>
                                   {data.termsAndConditions || 'Misuse of this card may result in suspension.'}
                                </p>
                            </div>
                             <p style={{ ...textStyle, fontSize: `${data.websiteFontSize}pt` }}>{data.website || 'yourwebsite.com'}</p>
                         </div>
                         {data.qrCodeUrl && (
                            <div className="p-1 bg-white rounded-md shadow-sm flex-shrink-0">
                                <img src={data.qrCodeUrl} alt="QR Code" style={{ width: `${data.qrCodeSize}px`, height: `${data.qrCodeSize}px`, imageRendering: 'pixelated' }} className="object-contain" crossOrigin="anonymous" />
                            </div>
                        )}
                    </footer>
                </div>
            </div>
        )}
      </div>
    </div>
  );
});

export default IdCardPreview;
