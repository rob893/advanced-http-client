import { AxiosInstance } from 'axios';
import { Logger, AxiosRequestConfigWithMetadata, HttpStatusCode } from '../models';
import { isAxiosError } from '../utilities';

export function useLoggingInterceptor(httpClient: AxiosInstance, logger: Logger): void {
  httpClient.interceptors.request.use(
    (config: AxiosRequestConfigWithMetadata) => {
      if (!config.metadata) {
        config.metadata = {};
      }

      config.metadata.startTime = new Date();

      logger.info(
        `${useLoggingInterceptor.name}: Sending ${config.method?.toLocaleUpperCase()} request to ${config.baseURL}/${
          config.url
        }.`
      );

      return config;
    },
    error => {
      logger.error(
        `${useLoggingInterceptor.name}: Encountered error during request pipeline: ${error.message}.`,
        error
      );

      return Promise.reject(error);
    }
  );

  httpClient.interceptors.response.use(
    response => {
      const {
        config: { method, url, baseURL, metadata = {} }
      }: { config: AxiosRequestConfigWithMetadata } = response;

      metadata.endTime = new Date();
      metadata.duration = (metadata.endTime.getTime() ?? 0) - (metadata.startTime?.getTime() ?? 0);

      const { responseServedFromCache, promiseServedFromCache } = metadata;

      logger.info(
        `${useLoggingInterceptor.name}:${responseServedFromCache ? ' (Response served from cache)' : ''}${
          promiseServedFromCache ? ' (Promise served from cache)' : ''
        } Recieved response ${response.status} ${
          response.statusText
        } from ${method?.toLocaleUpperCase()} ${baseURL}/${url} in ${metadata.duration}ms.`
      );

      return response;
    },
    error => {
      if (isAxiosError(error) && error.response) {
        const {
          response: { status, statusText },
          config: { method, url, baseURL, metadata = {} }
        } = error;

        metadata.endTime = new Date();
        metadata.duration = (metadata.endTime.getTime() ?? 0) - (metadata.startTime?.getTime() ?? 0);

        const message = `${
          useLoggingInterceptor.name
        }: Recieved response ${status} ${statusText} from ${method?.toLocaleUpperCase()} ${baseURL}/${url} in ${
          metadata.duration
        }ms.`;

        if (status < HttpStatusCode.InternalServerError) {
          logger.warn(message);
        } else {
          logger.error(message);
        }

        return Promise.reject(error);
      }

      logger.error(
        `${useLoggingInterceptor.name}: An unexpected error occurred during response pipeline: ${error.message}.`,
        error
      );

      return Promise.reject(error);
    }
  );
}
