import { env } from '../../config/env';
import { logger } from '../../config/logger';
import { MLServiceError } from '../../utils/errors';
import {
  DocumentExtractionResult,
  CandidateProfileResult,
  JobAnalysisInput,
  JobProfileResult,
  SingleScreeningInput,
  SingleScreeningResult,
  BatchRankInput,
  BatchRankResult,
  MLHealthResult,
} from '../../types/ml.types';

export class MLClient {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(baseUrl = env.ML_SERVICE_URL, timeoutMs = env.ML_REQUEST_TIMEOUT_MS) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.timeoutMs = timeoutMs;
  }

  /**
   * Health check to verify connection to the Python FastAPI ML service.
   */
  async healthCheck(): Promise<MLHealthResult> {
    return this.sendJsonRequest<MLHealthResult>('/health', 'GET');
  }

  /**
   * Extracts and normalizes text from a PDF or DOCX resume.
   * Calls: POST /api/v1/resume/extract
   */
  async extractResume(
    fileBuffer: Buffer,
    fileName: string,
    mimeType = 'application/pdf'
  ): Promise<DocumentExtractionResult> {
    const formData = new FormData();
    const blob = new Blob([fileBuffer], { type: mimeType });
    formData.append('file', blob, fileName);

    return this.sendMultipartRequest<DocumentExtractionResult>(
      '/api/v1/resume/extract',
      formData,
      { fileName, mimeType }
    );
  }

  /**
   * Full pipeline: extracts text, parses sections, canonicalizes skills,
   * and extracts career milestones to produce a structured CandidateProfile.
   * Calls: POST /api/v1/resume/analyze
   */
  async analyzeResume(
    fileBuffer: Buffer,
    fileName: string,
    mimeType = 'application/pdf'
  ): Promise<CandidateProfileResult> {
    const formData = new FormData();
    const blob = new Blob([fileBuffer], { type: mimeType });
    formData.append('file', blob, fileName);

    return this.sendMultipartRequest<CandidateProfileResult>(
      '/api/v1/resume/analyze',
      formData,
      { fileName, mimeType }
    );
  }

  /**
   * Normalizes job requirements, canonicalizes required skills, and produces
   * a structured JobProfile ready for similarity and scoring.
   * Calls: POST /api/v1/job/analyze
   */
  async analyzeJob(payload: JobAnalysisInput): Promise<JobProfileResult> {
    return this.sendJsonRequest<JobProfileResult>(
      '/api/v1/job/analyze',
      'POST',
      payload
    );
  }

  /**
   * Evaluates a single candidate against a job posting, calculating multi-criteria
   * scores (skill, experience, education, semantic similarity) and transparent explanations.
   * Calls: POST /api/v1/screening/evaluate
   */
  async evaluateCandidate(payload: SingleScreeningInput): Promise<SingleScreeningResult> {
    return this.sendJsonRequest<SingleScreeningResult>(
      '/api/v1/screening/evaluate',
      'POST',
      payload
    );
  }

  /**
   * Scores and deterministically ranks a batch of candidates for a job posting.
   * Calls: POST /api/v1/screening/rank
   */
  async rankCandidates(payload: BatchRankInput): Promise<BatchRankResult> {
    return this.sendJsonRequest<BatchRankResult>(
      '/api/v1/screening/rank',
      'POST',
      payload
    );
  }

  // ── Private HTTP transport helpers ───────────────────────────────────────────

  private async sendJsonRequest<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    body?: unknown
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const startTime = Date.now();

    logger.debug({ method, url, body }, 'Sending request to ML service');

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(this.timeoutMs),
      });

      const durationMs = Date.now() - startTime;

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        logger.error(
          { url, status: response.status, durationMs, errorText },
          'ML service responded with error status'
        );
        let errorDetails: unknown = errorText;
        try {
          errorDetails = JSON.parse(errorText);
        } catch {
          // Keep raw text if not JSON
        }
        throw new MLServiceError(
          `ML service error (${response.status}): ${response.statusText}`,
          errorDetails
        );
      }

      const data = (await response.json()) as T;
      logger.debug({ url, durationMs }, 'ML service request successful');
      return data;
    } catch (err: unknown) {
      if (err instanceof MLServiceError) {
        throw err;
      }

      const durationMs = Date.now() - startTime;
      const error = err as Error;

      if (error.name === 'TimeoutError' || error.name === 'AbortError') {
        logger.error(
          { url, durationMs, timeoutMs: this.timeoutMs },
          'ML service request timed out'
        );
        throw new MLServiceError(`ML service request timed out after ${this.timeoutMs}ms`);
      }

      logger.error({ url, durationMs, err: error.message }, 'Failed to communicate with ML service');
      throw new MLServiceError(
        `Failed to communicate with ML service: ${error.message}`,
        { endpoint, message: error.message }
      );
    }
  }

  private async sendMultipartRequest<T>(
    endpoint: string,
    formData: FormData,
    meta?: Record<string, unknown>
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const startTime = Date.now();

    logger.debug({ url, meta }, 'Sending multipart request to ML service');

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
        },
        body: formData,
        signal: AbortSignal.timeout(this.timeoutMs),
      });

      const durationMs = Date.now() - startTime;

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        logger.error(
          { url, status: response.status, durationMs, errorText },
          'ML service multipart request error'
        );
        let errorDetails: unknown = errorText;
        try {
          errorDetails = JSON.parse(errorText);
        } catch {
          // Keep raw text
        }
        throw new MLServiceError(
          `ML service error (${response.status}): ${response.statusText}`,
          errorDetails
        );
      }

      const data = (await response.json()) as T;
      logger.debug({ url, durationMs }, 'ML service multipart request successful');
      return data;
    } catch (err: unknown) {
      if (err instanceof MLServiceError) {
        throw err;
      }

      const durationMs = Date.now() - startTime;
      const error = err as Error;

      if (error.name === 'TimeoutError' || error.name === 'AbortError') {
        logger.error(
          { url, durationMs, timeoutMs: this.timeoutMs },
          'ML service multipart request timed out'
        );
        throw new MLServiceError(`ML service request timed out after ${this.timeoutMs}ms`);
      }

      logger.error({ url, durationMs, err: error.message }, 'Failed to communicate with ML service');
      throw new MLServiceError(
        `Failed to communicate with ML service: ${error.message}`,
        { endpoint, message: error.message }
      );
    }
  }
}

export const mlClient = new MLClient();
export { MLClient as MLService, mlClient as mlService };
