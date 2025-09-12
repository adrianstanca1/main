// Configuration and environment management

export interface AppConfig {
  apiKey: string;
  environment: 'development' | 'production' | 'test';
  debug: boolean;
  maxFileSize: number; // in bytes
  allowedFileTypes: string[];
  apiTimeout: number; // in milliseconds
}

const getEnvironment = (): 'development' | 'production' | 'test' => {
  if (typeof process !== 'undefined' && process.env.NODE_ENV) {
    return process.env.NODE_ENV as 'development' | 'production' | 'test';
  }
  return 'production'; // default to production for safety
};

const getApiKey = (): string => {
  if (typeof process !== 'undefined') {
    return process.env.GEMINI_API_KEY || process.env.API_KEY || '';
  }
  return '';
};

export const config: AppConfig = {
  apiKey: getApiKey(),
  environment: getEnvironment(),
  debug: getEnvironment() === 'development',
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedFileTypes: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'jpg', 'jpeg', 'png', 'gif'],
  apiTimeout: 30000, // 30 seconds
};

export const isProduction = (): boolean => config.environment === 'production';
export const isDevelopment = (): boolean => config.environment === 'development';

// Security helpers
export const sanitizeUrl = (url: string): string => {
  try {
    const parsed = new URL(url);
    // Only allow http and https protocols
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error('Invalid protocol');
    }
    return parsed.toString();
  } catch {
    return '';
  }
};

export const validateFileType = (filename: string): boolean => {
  const extension = filename.split('.').pop()?.toLowerCase();
  return extension ? config.allowedFileTypes.includes(extension) : false;
};

export const validateFileSize = (size: number): boolean => {
  return size <= config.maxFileSize;
};