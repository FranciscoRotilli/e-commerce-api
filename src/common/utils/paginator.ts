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

type ModelDelegate = {
  count: (args?: { where: any }) => Promise<number>;
  findMany: (args: any) => Promise<any[]>;
};

export async function paginate<T, Where, Select>(
  model: ModelDelegate,
  options: PaginateOptions = {},
  queryArgs: {
    where?: Where;
    select?: Select;
    include?: any;
    orderBy?: any;
  } = {},
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
  return {
    data: data as T[],
    total,
    page,
    limit,
    pages: Math.ceil(total / limit),
  };
}
