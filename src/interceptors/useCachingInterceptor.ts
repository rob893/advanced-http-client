import { AxiosInstance, AxiosResponse } from 'axios';
import { Logger, HttpMethod, AxiosRequestConfigWithMetadata, HttpCache, UseCachingInterceptorOptions } from '../models';

export function useCachingInterceptor(
  httpClient: AxiosInstance,
  cache: HttpCache<string, AxiosResponse<any, any>>,
  options?: UseCachingInterceptorOptions,
  logger?: Logger
): void {
  const getInProgressCacheKey = (method: HttpMethod | string, baseUrl: string, url: string): string =>
    `${method}:${baseUrl}/${url}`;

  httpClient.interceptors.request.use((config: AxiosRequestConfigWithMetadata) => {
    const { method = '', baseURL = '', url = '' } = config;
    const key = getInProgressCacheKey(method, baseURL, url);

    const cached = cache.get(key);

    if (cached) {
      logger?.debug(`${useCachingInterceptor.name}: Returning value from cache for ${key}.`);

      const {
        config: { metadata }
      }: { config: AxiosRequestConfigWithMetadata } = cached;

      if (!metadata) {
        (cached.config as AxiosRequestConfigWithMetadata).metadata = {
          responseServedFromCache: true,
          startTime: new Date()
        };
      } else {
        metadata.responseServedFromCache = true;
        metadata.startTime = new Date();
      }

      config.adapter = () => Promise.resolve(cached);
    }

    return config;
  });

  httpClient.interceptors.response.use(response => {
    const {
      config: { method = '', baseURL = '', url = '' }
    }: { config: AxiosRequestConfigWithMetadata } = response;

    const key = getInProgressCacheKey(method, baseURL, url);
    logger?.debug(`${useCachingInterceptor.name}: Caching response for ${key}.`);
    cache.set(key, response);

    return response;
  });
}
