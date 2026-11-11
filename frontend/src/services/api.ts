import { TelemetryHeaders } from '../types/health';

const DEFAULT_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

export interface ApiResponse<T> {
  data: T | null;
  status: number;
  ok: boolean;
  telemetry: TelemetryHeaders;
  error?: string;
}

export async function request<T>(
  endpoint: string,
  options: RequestInit = {},
  timeoutMs: number = 5000
): Promise<ApiResponse<T>> {
  const url = `${DEFAULT_BASE_URL}${endpoint}`;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);

  const headers = new Headers(options.headers || {});
  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json');
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });
    clearTimeout(id);

    const telemetry: TelemetryHeaders = {
      correlationId: response.headers.get('X-Correlation-ID') || undefined,
      responseTimeMs: response.headers.get('X-Response-Time-MS') || undefined,
    };

    let data: T | null = null;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    }

    return {
      data,
      status: response.status,
      ok: response.ok,
      telemetry,
      error: response.ok ? undefined : `HTTP ${response.status}`,
    };
  } catch (err: unknown) {
    clearTimeout(id);
    const isAbort = err instanceof DOMException && err.name === 'AbortError';
    const message = isAbort
      ? `Request timed out after ${timeoutMs}ms`
      : err instanceof Error
      ? err.message
      : 'Network connection failed';

    return {
      data: null,
      status: 0,
      ok: false,
      telemetry: {},
      error: message,
    };
  }
}

