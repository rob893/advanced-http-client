import { AxiosInstance, AxiosResponse } from 'axios';
import { UseRetryInterceptorOptions, Logger, HttpMethod, AxiosRequestConfigWithMetadata } from '../models';
import { isAxiosError } from '../utilities';

export function useInProgressCachingInterceptor(
  httpClient: AxiosInstance,
  requestCache: Map<string, Promise<AxiosResponse<any, any>>>,
  options?: UseRetryInterceptorOptions,
  logger?: Logger
): void {
  const getInProgressCacheKey = (method: HttpMethod | string, baseUrl: string, url: string): string =>
    `${method}:${baseUrl}/${url}`;

  httpClient.interceptors.request.use(
    (config: AxiosRequestConfigWithMetadata) => {
      const { method = '', baseURL = '', url = '' } = config;
      const key = getInProgressCacheKey(method, baseURL, url);
      const adaptor = config.adapter;

      if (!adaptor) {
        logger?.error(`${useInProgressCachingInterceptor.name}: No adaptor on config!`);
        return config;
      }

      config.adapter = () => {
        const inProgress = requestCache.get(key);

        if (inProgress) {
          logger?.debug(`${useInProgressCachingInterceptor.name}: Returning in progess promise for ${key}.`);

          return inProgress;
        }

        const promise = adaptor(config);
        requestCache.set(key, promise);

        return promise;
      };

      return config;
    },
    error => {
      if (isAxiosError(error)) {
        const { method = '', baseURL = '', url = '' } = error.config;
        const key = getInProgressCacheKey(method, baseURL, url);
        requestCache.delete(key);
      }

      return Promise.reject(error);
    }
  );

  httpClient.interceptors.response.use(
    response => {
      const {
        config: { method = '', baseURL = '', url = '' }
      }: { config: AxiosRequestConfigWithMetadata } = response;

      const key = getInProgressCacheKey(method, baseURL, url);
      requestCache.delete(key);

      return response;
    },
    error => {
      if (isAxiosError(error)) {
        const {
          config: { method = '', baseURL = '', url = '' }
        } = error;

        const key = getInProgressCacheKey(method, baseURL, url);
        requestCache.delete(key);

        return Promise.reject(error);
      }

      return Promise.reject(error);
    }
  );
}
