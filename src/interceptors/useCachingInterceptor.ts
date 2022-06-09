import { AxiosInstance, AxiosResponse } from 'axios';
import { Logger, HttpMethod, AxiosRequestConfigWithMetadata, HttpCache, UseCachingInterceptorOptions } from '../models';

export function useCachingInterceptor(
  httpClient: AxiosInstance,
  cache: HttpCache<string, AxiosResponse<any, any>>,
  options?: UseCachingInterceptorOptions,
  logger?: Logger
): void {
  const {
    cacheStatusCodeRanges = [[200, 299]],
    generateCacheKey,
    shouldCache,
    supportedMethodsForCaching = [HttpMethod.Get]
  } = options ?? {};

  if (shouldCache && (options?.cacheStatusCodeRanges || options?.supportedMethodsForCaching)) {
    throw new Error('Passing shouldCache with cacheStatusCodeRanges or supportedMethodsForCaching is not supported.');
  }

  const getInProgressCacheKey = generateCacheKey
    ? generateCacheKey
    : (config: AxiosRequestConfigWithMetadata): string => {
        const { method = '', baseURL = '', url = '' } = config;
        return `${method}:${baseURL}/${url}`;
      };

  httpClient.interceptors.request.use((config: AxiosRequestConfigWithMetadata) => {
    const key = getInProgressCacheKey(config);

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
    const { config }: { config: AxiosRequestConfigWithMetadata } = response;

    const shouldCacheResult = shouldCache
      ? shouldCache
      : (res: AxiosResponse<any, any>): boolean => {
          const {
            config: { method, metadata: { responseServedFromCache } = {} },
            status
          }: { config: AxiosRequestConfigWithMetadata; status: number } = res;

          if (
            responseServedFromCache || // don't re-cache previously cached responses.
            !method ||
            !(supportedMethodsForCaching as string[]).includes(method.toUpperCase())
          ) {
            return false;
          }

          for (const [min, max] of cacheStatusCodeRanges) {
            if (status >= min && status <= max) {
              return true;
            }
          }

          return false;
        };

    if (shouldCacheResult(response)) {
      const key = getInProgressCacheKey(config);
      logger?.debug(`${useCachingInterceptor.name}: Caching response for ${key}.`);
      cache.set(key, response);
    } else {
      logger?.debug(`${useCachingInterceptor.name}: Response did not pass caching rules and will not be cached.`);
    }

    return response;
  });
}
