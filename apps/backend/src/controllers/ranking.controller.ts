import { Request, Response, NextFunction } from 'express';
import { rankingService } from '../services/ranking.service';
import { sendSuccess } from '../utils/response';
import { RankingQueryInput, BatchRankBodyInput } from '../schemas/ranking.schema';

export class RankingController {
  /**
   * GET /api/v1/jobs/:id/rankings
   * Get ranked candidates for a specific job with filtering and sorting.
   */
  async getRankings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const query = req.query as unknown as RankingQueryInput;
      const result = await rankingService.getJobRankings(id!, query, req.user!);
      sendSuccess(res, result, 200, result.pagination);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/jobs/:id/rank
   * Trigger batch AI candidate ranking for a job.
   */
  async batchRank(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const body = (req.body || {}) as BatchRankBodyInput;
      const result = await rankingService.triggerBatchRanking(id!, body, req.user!);
      sendSuccess(res, result, 200, result.pagination);
    } catch (err) {
      next(err);
    }
  }
}

export const rankingController = new RankingController();
