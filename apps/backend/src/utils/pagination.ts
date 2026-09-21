export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginationResult {
  skip: number;
  take: number;
  page: number;
  limit: number;
}

export const getPaginationParams = (
  page?: number,
  limit?: number,
  maxLimit = 100
): PaginationResult => {
  const safePage = Math.max(1, page && !isNaN(page) ? Number(page) : 1);
  const rawLimit = limit && !isNaN(limit) ? Number(limit) : 20;
  const safeLimit = Math.min(Math.max(1, rawLimit), maxLimit);

  return {
    skip: (safePage - 1) * safeLimit,
    take: safeLimit,
    page: safePage,
    limit: safeLimit,
  };
};

export const buildPaginationMeta = (
  total: number,
  page: number,
  limit: number
) => {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit) || 1,
  };
};
