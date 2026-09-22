export type DocumentType = 'pdf' | 'docx';

export interface DocumentExtractionResult {
  success: boolean;
  document_type: DocumentType;
  text: string;
  page_count: number | null;
}

export interface CandidateProfile {
  skills: string[];
  education: string[];
  experience: string[];
  job_titles: string[];
  sections: Record<string, string | null>;
  raw_text: string;
  processed_text: string;
}

export interface CandidateProfileResult {
  candidate_profile: CandidateProfile;
}

export interface JobAnalysisInput {
  job_title: string;
  description: string;
  required_skills?: string[];
  education?: string[];
  minimum_experience_years?: number;
}

export interface JobProfile {
  job_title: string;
  skills: string[];
  education: string[];
  experience_requirements: Record<string, unknown>;
  processed_text: string;
}

export interface JobProfileResult {
  job_profile: JobProfile;
}

export interface JobScreeningInput {
  title: string;
  description?: string;
  required_skills?: string[];
  minimum_experience_years?: number;
  education_requirements?: string[];
}

export interface CandidateScreeningInput {
  id: string;
  resume_text?: string;
  skills?: string[];
  experience?: string[];
  education?: string[];
}

export interface SingleScreeningInput {
  job: JobScreeningInput;
  candidate: CandidateScreeningInput;
}

export type RecommendationLabel =
  | 'strong_match'
  | 'good_match'
  | 'moderate_match'
  | 'low_match';

export interface ScreeningExplanation {
  overall_score: number;
  components: Record<string, number>;
  matching_skills: string[];
  missing_skills: string[];
  experience: Record<string, unknown>;
  education: Record<string, unknown>;
  summary_text: string;
}

export interface SingleScreeningResult {
  candidate_id: string;
  match_score: number;
  recommendation: RecommendationLabel;
  components: Record<string, number>;
  matching_skills: string[];
  missing_skills: string[];
  explanation: ScreeningExplanation;
}

export interface BatchRankInput {
  job_id: string;
  job: JobScreeningInput;
  candidates: CandidateScreeningInput[];
}

export interface RankedCandidateItem {
  candidate_id: string;
  rank: number;
  score: number;
  recommendation: RecommendationLabel;
  explanation?: Record<string, unknown> | null;
}

export interface BatchRankResult {
  job_id: string;
  candidates: RankedCandidateItem[];
}

export interface MLHealthResult {
  status: string;
  service: string;
  version: string;
}
