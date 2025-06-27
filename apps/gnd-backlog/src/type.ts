export type PageDataMeta = {
  count?;
  page?;
  next?: {
    size?;
    start?;
  };
};

export type BasePageQuery = {
  size?;
  start?;
};
export type TaskPageQuery = {
  search?: string;
  status?: string;
  priority?: string;
} & BasePageQuery;
