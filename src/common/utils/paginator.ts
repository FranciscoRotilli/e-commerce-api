/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-function-type */
export interface PaginateOptions {
  page?: number;
  limit?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pages: number;
  limit: number;
}

export async function paginate<T>(
  model: { count: Function; findMany: Function },
  options: PaginateOptions = {},
  queryArgs: { where?: any; select?: any; include?: any; orderBy?: any } = {},
): Promise<PaginatedResult<T>> {
  const page = options.page ?? 1;
  const limit = options.limit ?? 10;
  const skip = (page - 1) * limit;
  const [total, data] = await Promise.all([
    model.count({ where: queryArgs.where }),
    model.findMany({
      ...queryArgs,
      take: limit,
      skip: skip,
    }),
  ]);
  return { data, total, page, limit, pages: Math.ceil(total / limit) };
}
