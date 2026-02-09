
export type PhotoShape = 'circle' | 'square' | 'rounded' | 'rhombus' | 'hexagon' | 'pentagon' | 'octagon' | 'star';

export interface IdCardData {
  name: string;
  department: string;
  website: string;
  photoUrl: string | null;
  photoShape: PhotoShape;
  orientation: 'portrait' | 'landscape';
  companyName: string;
  companyLogoUrl: string | null;
  theme: string;
  themeColor1: string;
  themeColor2: string;
  employeeNameFontSize: number;
  companyNameFontSize: number;
  textColor: string;
  photoSize: number;
  detailsFontSize: number;
  companyLogoSize: number;
  photoVerticalOffset: number;
  photoHorizontalOffset: number;
  details: Array<{
    id: number;
    label: string;
    value: string;
  }>;
  qrCodeUrl: string | null;
  qrCodeSize: number;
  backgroundType: 'gradient' | 'solid' | 'image';
  backgroundColor: string;
  backgroundImageUrl: string | null;
  backgroundImageFit: 'cover' | 'contain' | 'tile';
  termsAndConditions: string;
  termsFontSize: number;
  termsColor: string;
  websiteFontSize: number;
  borderWidth: number;
  borderColor: string;
  borderRadius: number;
}
