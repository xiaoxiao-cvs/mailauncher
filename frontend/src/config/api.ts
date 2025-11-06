/**
 * API 配置
 */

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:11111';
export const API_PREFIX = '/api/v1';
export const API_URL = `${API_BASE_URL}${API_PREFIX}`;
