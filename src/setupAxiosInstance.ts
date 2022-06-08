import axios, { AxiosInstance } from 'axios';
import { LRUCache } from 'typescript-lru-cache';
import { v4 as uuid } from 'uuid';
import {
  useCorrelationIdInterceptor,
  useGetNotFoundNullInterceptor,
  useInProgressCachingInterceptor,
  useCachingInterceptor,
  useRetryInterceptor,
  useLoggingInterceptor
} from './interceptors';
import { AdvancedHttpClientOptions, DefaultHeader } from './models';

export function setupAxiosInstance(options?: AdvancedHttpClientOptions): void {
  const {
    logger: passedLogger = console,
    httpClientFactory = axios,
    httpClient: passedClient,
    baseURL,
    cacheInFlightRequests = true,
    useRetry = true,
    useRetryOptions = {
      maxRetryAttempts: 5,
      delayTimeInMs: 1000
    },
    useLogging = true,
    useCorrelationId = true,
    useCorrelationIdOptions = {
      correlationIdGenerator: uuid,
      correlationIdHeaderName: DefaultHeader.CorrelationId
    },
    useGetNotFoundReturnNull = true,
    useCaching = true
  } = options ?? {};

  if (passedClient && options?.httpClientFactory) {
    throw new Error('Passing both httpClient and httpClientFactory is not supported.');
  }

  const logger = useLogging ? passedLogger : { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} };

  let httpClient: AxiosInstance;

  if (passedClient) {
    if (baseURL) {
      passedClient.defaults.baseURL = baseURL;
    }

    httpClient = passedClient;
  } else {
    httpClient = baseURL ? httpClientFactory.create({ baseURL }) : httpClientFactory.create();
  }

  if (useCorrelationId) {
    useCorrelationIdInterceptor(httpClient, useCorrelationIdOptions, logger);
  }

  if (useGetNotFoundReturnNull) {
    useGetNotFoundNullInterceptor(httpClient, logger);
  }

  if (cacheInFlightRequests) {
    useInProgressCachingInterceptor(httpClient, new Map(), undefined, logger);
  }

  if (useCaching) {
    useCachingInterceptor(httpClient, new LRUCache(), undefined, logger);
  }

  if (useRetry) {
    useRetryInterceptor(httpClient, useRetryOptions, logger);
  }

  if (useLogging) {
    useLoggingInterceptor(httpClient, logger);
  }
}
