export type AnalysisMode = 'normal' | 'savage' | 'lawyer' | 'therapist' | 'comedy' | 'genz';

export const PREMIUM_MODES: AnalysisMode[] = ['lawyer', 'therapist', 'comedy', 'genz'];
export const FREE_MODES: AnalysisMode[] = ['normal', 'savage'];

export interface AnalysisResult {
  winner: string;
  winnerReason: string;
  yourCredibility: number;
  partnerCredibility: number;
  faultPerson: string;
  toxicityLevel: number;
  toxicityLabel: string;
  argumentPattern: string;
  redFlags: string[];
  exhibits: {
    title: string;
    description: string;
  }[];
  whoStartedIt: string;
  whoStartedReason: string;
  savageRoast?: string;
  modeSpecificInsight?: string;
}

export interface HistoryEntry {
  id: string;
  date: string;
  analysis: AnalysisResult;
  savageMode: boolean;
  analysisMode?: AnalysisMode;
}
