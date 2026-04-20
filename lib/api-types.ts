export type ApiEnvelope<TData = unknown> = {
  success: boolean;
  statusCode: number;
  message: string;
  data: TData;
};

