export interface ApiResponse<T = any> {
  success: boolean;
  data: T | null;
  meta: { page: number; total: number } | null;
  error: { code: string; message: string } | null;
}

export function successResponse<T>(data: T, meta: { page: number; total: number } | null = null): ApiResponse<T> {
  return {
    success: true,
    data,
    meta,
    error: null,
  };
}

export function errorResponse(code: string, message: string): ApiResponse<null> {
  return {
    success: false,
    data: null,
    meta: null,
    error: { code, message },
  };
}
