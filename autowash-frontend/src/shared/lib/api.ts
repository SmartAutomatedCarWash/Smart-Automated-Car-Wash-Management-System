import axios, {
  AxiosError,
  AxiosInstance,
  AxiosResponse,
  AxiosRequestConfig,
  InternalAxiosRequestConfig
} from "axios";
import { getApiErrorCode } from "@/shared/lib/api-errors";
import { clearAuthSession, getAccessToken, getRefreshToken, setAccessToken } from "@/features/auth/store/auth.store";
import { ApiErrorResponse, ApiSuccessResponse } from "@/shared/types/api.types";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api/v1";

type RetriableRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
};

type RefreshResponse = ApiSuccessResponse<{
  accessToken: string;
  expiresIn: number;
}>;

let refreshPromise: Promise<string | null> | null = null;

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json"
  },
  withCredentials: true
});

apiClient.interceptors.request.use((config) => attachAccessToken(config));
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiErrorResponse>) => {
    const request = error.config as RetriableRequestConfig | undefined;

    if (!request) {
      return Promise.reject(normalizeAxiosError(error));
    }

    const is401 = error.response?.status === 401;

    // Treat any 401 as a potentially expired token (backend sends plain 401 without body)
    const shouldTryRefresh = is401 && !request._retry;

    if (!shouldTryRefresh) {
      if (is401) {
        clearAuthSession();
      }
      return Promise.reject(normalizeAxiosError(error));
    }

    request._retry = true;

    const newAccessToken = await refreshAccessToken();
    if (!newAccessToken) {
      clearAuthSession();
      return Promise.reject(normalizeAxiosError(error));
    }

    request.headers.set("Authorization", `Bearer ${newAccessToken}`);
    return apiClient(request);
  }
);

function attachAccessToken(config: InternalAxiosRequestConfig) {
  const token = getAccessToken();
  if (token) {
    config.headers.set("Authorization", `Bearer ${token}`);
  }

  return config;
}

async function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = performTokenRefresh().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
}

async function performTokenRefresh(): Promise<string | null> {
  const refreshToken = getRefreshToken();

  if (!refreshToken) {
    return null;
  }

  try {
    const response = await axios.post<RefreshResponse>(
      `${API_URL}/auth/refresh`,
      { refreshToken },
      {
        headers: {
          "Content-Type": "application/json"
        },
        withCredentials: true
      }
    );

    const nextToken = response.data.data.accessToken;
    setAccessToken(nextToken, response.data.data.expiresIn);
    return nextToken;
  } catch {
    return null;
  }
}

function normalizeAxiosError(error: AxiosError<ApiErrorResponse>) {
  const payload = error.response?.data;

  if (payload && typeof payload === "object" && "success" in payload) {
    return payload;
  }

  const status = error.response?.status ?? 500;
  const defaultMessages: Record<number, string> = {
    401: "Session expired. Please sign in again.",
    403: "You don't have permission to perform this action.",
    404: "Resource not found.",
    422: "Invalid request data.",
    500: "Server error. Please try again.",
  };

  return {
    success: false,
    statusCode: status,
    message: defaultMessages[status] ?? (error.message || "Request failed"),
    errorCode: "INTERNAL_SERVER_ERROR",
  } satisfies ApiErrorResponse;
}

export async function apiRequest<TResponse, TData = unknown>(
  config: AxiosRequestConfig<TData>
) {
  const response = await apiClient.request<
    ApiSuccessResponse<TResponse>,
    AxiosResponse<ApiSuccessResponse<TResponse>>,
    TData
  >(config);

  if (!response.data.success) {
    throw response.data;
  }

  return response.data.data;
}
