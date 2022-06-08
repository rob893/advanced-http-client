import { AxiosInstance } from 'axios';
import { UseRetryInterceptorOptions, Logger, HttpMethod } from '../models';
import { isAxiosError, wait } from '../utilities';

export function useRetryInterceptor(
  httpClient: AxiosInstance,
  options?: UseRetryInterceptorOptions,
  logger?: Logger
): void {
  httpClient.interceptors.response.use(
    response => response,
    async error => {
      const {
        maxRetryAttempts = 5,
        delayTimeInMs = 1000,
        retryOnStatusCodeRanges,
        shouldRetry: passedShouldRetry,
        supportedMethodsForRetry
      } = options ?? {};

      if (passedShouldRetry && (retryOnStatusCodeRanges || supportedMethodsForRetry)) {
        throw new Error(
          'Passing shouldRetry with either retryOnStatusCodes or supportedMethodsForRetry is not supported.'
        );
      }

      if (isAxiosError(error)) {
        const { response, config } = error;

        const { method, url, baseURL, metadata = {} } = config;

        const operation = `${method?.toLocaleUpperCase()} ${baseURL}/${url}`;

        if (!metadata.retryNumber) {
          metadata.retryNumber = 0;
        }

        if (metadata.retryNumber && metadata.retryNumber >= maxRetryAttempts) {
          logger?.info(
            `${useRetryInterceptor.name}: Max retries of ${maxRetryAttempts} reached. No longer attempting retries for ${operation}.`
          );
          return Promise.reject(error);
        }

        const shouldRetry = passedShouldRetry
          ? passedShouldRetry
          : (): boolean => {
              if (!response) {
                logger?.info(
                  `${useRetryInterceptor.name}: Network error: ${error.message}. Request for ${operation} should be retried.`
                );
                return true;
              }

              const httpMethodsToRetry: string[] = supportedMethodsForRetry ?? [
                HttpMethod.Get,
                HttpMethod.Put,
                HttpMethod.Options,
                HttpMethod.Delete,
                HttpMethod.Head
              ];

              if (!method || !httpMethodsToRetry.includes(method.toUpperCase())) {
                logger?.info(
                  `${
                    useRetryInterceptor.name
                  }: Request method ${method?.toLocaleUpperCase()} is not eligible for retry. Request for ${operation} should not be retried.`
                );
                return false;
              }

              const retryStatusCodeRanges: [number, number][] = retryOnStatusCodeRanges ?? [
                // https://en.wikipedia.org/wiki/List_of_HTTP_status_codes
                // 1xx - Retry (Informational, request still processing)
                // 2xx - Do not retry (Success)
                // 3xx - Do not retry (Redirect)
                // 4xx - Do not retry (Client errors)
                // 429 - Retry ("Too Many Requests")
                // 5xx - Retry (Server errors)
                [100, 199],
                [429, 429],
                [500, 599]
              ];

              const { status } = response;

              for (const [min, max] of retryStatusCodeRanges) {
                if (status >= min && status <= max) {
                  logger?.info(
                    `${useRetryInterceptor.name}: Response status ${status} meets retry eligibility. Request for ${operation} should be retried.`
                  );
                  return true;
                }
              }

              logger?.info(`${useRetryInterceptor.name}: Request for ${operation} should not be retried.`);
              return false;
            };

        if (!shouldRetry(error)) {
          return Promise.reject(error);
        }

        metadata.retryNumber++;

        const timeToDelay = metadata.retryNumber <= 1 ? 0 : delayTimeInMs * 2 ** (metadata.retryNumber - 1);

        logger?.info(
          `${useRetryInterceptor.name}: Retry number ${metadata.retryNumber} of ${maxRetryAttempts} after ${timeToDelay}ms for ${operation}.`
        );

        await wait(timeToDelay);

        return httpClient(config);
      }

      logger?.warn(`${useRetryInterceptor.name}: Unable to identify error. The request will not be retried.`, error);

      return Promise.reject(error);
    }
  );
}
