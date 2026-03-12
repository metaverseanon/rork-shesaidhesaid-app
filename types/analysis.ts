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
}

export interface HistoryEntry {
  id: string;
  date: string;
  analysis: AnalysisResult;
  savageMode: boolean;
}
