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
}
