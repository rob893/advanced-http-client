import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { LRUCache } from 'typescript-lru-cache';
import { v4 as uuid } from 'uuid';
import {
  useCachingInterceptor,
  useCorrelationIdInterceptor,
  useGetNotFoundNullInterceptor,
  useInProgressCachingInterceptor,
  useLoggingInterceptor,
  useRetryInterceptor
} from './interceptors';
import { HttpMethod, JSONPatchDocument, Logger, DefaultHeader, AdvancedHttpClientOptions } from './models';

export class AdvancedHttpClient {
  protected readonly logger: Logger;

  protected readonly httpClient: AxiosInstance;

  private readonly inProgressRequestMap: Map<string, Promise<AxiosResponse<any, any>>> = new Map();

  private readonly cacheInFlightRequests: boolean;

  public constructor(options?: AdvancedHttpClientOptions) {
    const {
      logger = console,
      httpClientFactory = axios,
      httpClient,
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
      useCachingOptions: { cacheItemTimeToLive = 300000 } = {},
      useCaching = true
    } = options ?? {};

    if (httpClient && options?.httpClientFactory) {
      throw new Error('Passing both httpClient and httpClientFactory is not supported.');
    }

    this.logger = useLogging ? logger : { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} };

    if (httpClient) {
      if (baseURL) {
        httpClient.defaults.baseURL = baseURL;
      }

      this.httpClient = httpClient;
    } else {
      this.httpClient = baseURL ? httpClientFactory.create({ baseURL }) : httpClientFactory.create();
    }

    this.cacheInFlightRequests = cacheInFlightRequests;

    if (useLogging) {
      useLoggingInterceptor(this.httpClient, this.logger);
    }

    if (useCaching) {
      useCachingInterceptor(
        this.httpClient,
        new LRUCache({ entryExpirationTimeInMS: cacheItemTimeToLive }),
        undefined,
        this.logger
      );
    }

    if (cacheInFlightRequests) {
      useInProgressCachingInterceptor(this.httpClient, this.inProgressRequestMap, undefined, this.logger);
    }

    if (useGetNotFoundReturnNull) {
      useGetNotFoundNullInterceptor(this.httpClient, this.logger);
    }

    if (useCorrelationId) {
      useCorrelationIdInterceptor(this.httpClient, useCorrelationIdOptions, this.logger);
    }

    if (useRetry) {
      useRetryInterceptor(this.httpClient, useRetryOptions, this.logger);
    }
  }

  public async get<T = unknown>(
    url: string,
    config?: AxiosRequestConfig,
    allowSimultaneousDuplicates: boolean = false
  ): Promise<AxiosResponse<T>> {
    //if (!this.cacheInFlightRequests) {
    return this.httpClient.get<T>(url, config);
    // }

    // const key = this.getInProgressCacheKey(HttpMethod.Get, url);
    // let inProgress = this.inProgressRequestMap.get(key);

    // if (!inProgress || allowSimultaneousDuplicates) {
    //   inProgress = this.httpClient.get<T>(url, config);
    //   this.inProgressRequestMap.set(key, inProgress);
    // } else {
    //   this.logger.debug(`${AdvancedHttpClient.name}.${this.get.name}: Returning in progess promise for ${key}.`);
    // }

    // try {
    //   return await inProgress;
    // } finally {
    //   this.inProgressRequestMap.delete(key);
    // }
  }

  public async delete<T = unknown>(
    url: string,
    config?: AxiosRequestConfig,
    allowSimultaneousDuplicates: boolean = false
  ): Promise<AxiosResponse<T>> {
    if (!this.cacheInFlightRequests) {
      return this.httpClient.delete<T>(url, config);
    }

    const key = this.getInProgressCacheKey(HttpMethod.Delete, url);
    let inProgress = this.inProgressRequestMap.get(key);

    if (!inProgress || allowSimultaneousDuplicates) {
      inProgress = this.httpClient.delete<T>(url, config);
      this.inProgressRequestMap.set(key, inProgress);
    } else {
      this.logger.debug(`${AdvancedHttpClient.name}.${this.get.name}: Returning in progess promise for ${key}.`);
    }

    try {
      return await inProgress;
    } finally {
      this.inProgressRequestMap.delete(key);
    }
  }

  public async post<T = unknown>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig,
    allowSimultaneousDuplicates: boolean = false
  ): Promise<AxiosResponse<T>> {
    if (!this.cacheInFlightRequests) {
      return this.httpClient.post<T>(url, data, config);
    }

    const key = this.getInProgressCacheKey(HttpMethod.Post, url);
    let inProgress = this.inProgressRequestMap.get(key);

    if (!inProgress || allowSimultaneousDuplicates) {
      inProgress = this.httpClient.post<T>(url, data, config);
      this.inProgressRequestMap.set(key, inProgress);
    } else {
      this.logger.debug(`${AdvancedHttpClient.name}.${this.get.name}: Returning in progess promise for ${key}.`);
    }

    try {
      return await inProgress;
    } finally {
      this.inProgressRequestMap.delete(key);
    }
  }

  public async put<T = unknown>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig,
    allowSimultaneousDuplicates: boolean = false
  ): Promise<AxiosResponse<T>> {
    if (!this.cacheInFlightRequests) {
      return this.httpClient.put<T>(url, data, config);
    }

    const key = this.getInProgressCacheKey(HttpMethod.Put, url);
    let inProgress = this.inProgressRequestMap.get(key);

    if (!inProgress || allowSimultaneousDuplicates) {
      inProgress = this.httpClient.put<T>(url, data, config);
      this.inProgressRequestMap.set(key, inProgress);
    } else {
      this.logger.debug(`${AdvancedHttpClient.name}.${this.get.name}: Returning in progess promise for ${key}.`);
    }

    try {
      return await inProgress;
    } finally {
      this.inProgressRequestMap.delete(key);
    }
  }

  public async patch<T = unknown>(
    url: string,
    data?: JSONPatchDocument[] | unknown,
    config?: AxiosRequestConfig,
    allowSimultaneousDuplicates: boolean = false
  ): Promise<AxiosResponse<T>> {
    if (!this.cacheInFlightRequests) {
      return this.httpClient.patch<T>(url, data, config);
    }

    const key = this.getInProgressCacheKey(HttpMethod.Patch, url);
    let inProgress = this.inProgressRequestMap.get(key);

    if (!inProgress || allowSimultaneousDuplicates) {
      inProgress = this.httpClient.patch<T>(url, data, config);
      this.inProgressRequestMap.set(key, inProgress);
    } else {
      this.logger.debug(`${AdvancedHttpClient.name}.${this.get.name}: Returning in progess promise for ${key}.`);
    }

    try {
      return await inProgress;
    } finally {
      this.inProgressRequestMap.delete(key);
    }
  }

  private getInProgressCacheKey(method: HttpMethod, url: string): string {
    return `${method}:${url}`;
  }
}
