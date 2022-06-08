import { AxiosInstance } from 'axios';
import { v4 as uuid } from 'uuid';
import { UseCorrelationIdInterceptorOptions, Logger, DefaultHeader, AxiosRequestConfigWithMetadata } from '../models';

export function useCorrelationIdInterceptor(
  httpClient: AxiosInstance,
  options?: UseCorrelationIdInterceptorOptions,
  logger?: Logger
): void {
  const { correlationIdGenerator = uuid, correlationIdHeaderName = DefaultHeader.CorrelationId } = options ?? {};

  httpClient.interceptors.request.use((config: AxiosRequestConfigWithMetadata) => {
    if (!config.metadata) {
      config.metadata = {};
    }

    if (!config.headers) {
      config.headers = {};
    }

    if (config.headers[correlationIdHeaderName]) {
      logger?.debug(`${useCorrelationIdInterceptor.name}: Correlation id already attached to request.`);

      config.metadata.correlationId = config.headers[correlationIdHeaderName]?.toString();

      return config;
    }

    config.headers[correlationIdHeaderName] = correlationIdGenerator();
    config.metadata.correlationId = config.headers[correlationIdHeaderName]?.toString();

    logger?.info(`${useCorrelationIdInterceptor.name}: Correlation id generated and attached to request.`);

    return config;
  });
}
