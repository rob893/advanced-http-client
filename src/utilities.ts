import { AxiosError } from 'axios';
import { AxiosRequestConfigWithMetadata } from './models';

export function isAxiosError(error: unknown): error is AxiosError & { config: AxiosRequestConfigWithMetadata } {
  return (error as AxiosError).isAxiosError === true;
}

export function wait(ms: number): Promise<void> {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}
