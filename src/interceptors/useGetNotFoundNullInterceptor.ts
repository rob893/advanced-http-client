import { AxiosInstance } from 'axios';
import { Logger, HttpMethod, HttpStatusCode } from '../models';
import { isAxiosError } from '../utilities';

export function useGetNotFoundNullInterceptor(httpClient: AxiosInstance, logger?: Logger): void {
  httpClient.interceptors.response.use(
    response => response,
    error => {
      if (
        isAxiosError(error) &&
        error.config.method?.toUpperCase() === HttpMethod.Get &&
        error.response?.status === HttpStatusCode.NotFound
      ) {
        const { response } = error;
        response.data = null;

        logger?.info(
          `${useGetNotFoundNullInterceptor.name}: Error response eligible for null interception. Response body set to null and resolving promise.`
        );

        return Promise.resolve(response);
      }

      logger?.info(
        `${useGetNotFoundNullInterceptor.name}: Error response not eligible for null interception. Rejecting promise.`
      );

      return Promise.reject(error);
    }
  );
}
