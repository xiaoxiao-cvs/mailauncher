/**
 * MaiBot 配置管理 API 服务
 * 提供 Bot 配置、LPMM 配置和环境变量的管理操作
 */

import apiService from './apiService.js';

const API_BASE = '/api/v1/resources';

/**
 * Bot 配置管理 API
 */
export const botConfigApi = {
  /**
   * 获取Bot配置
   * @param {string} instanceId - 实例ID
   * @returns {Promise} 配置数据
   */
  async getBotConfig(instanceId) {
    return await apiService.get(`${API_BASE}/${instanceId}/config/get`);
  },

  /**
   * 更新Bot配置
   * @param {string} instanceId - 实例ID
   * @param {Object} configData - 配置数据
   * @returns {Promise} 更新结果
   */
  async updateBotConfig(instanceId, configData) {
    return await apiService.post(`${API_BASE}/${instanceId}/config/update`, {
      instance_id: instanceId,
      config_data: configData
    });
  }
};

/**
 * LPMM 配置管理 API
 */
export const lpmmConfigApi = {
  /**
   * 获取LPMM配置
   * @param {string} instanceId - 实例ID
   * @returns {Promise} 配置数据
   */
  async getLpmmConfig(instanceId) {
    return await apiService.get(`${API_BASE}/${instanceId}/lpmm/get`);
  },

  /**
   * 更新LPMM配置
   * @param {string} instanceId - 实例ID
   * @param {Object} configData - 配置数据
   * @returns {Promise} 更新结果
   */
  async updateLpmmConfig(instanceId, configData) {
    return await apiService.post(`${API_BASE}/${instanceId}/lpmm/update`, {
      instance_id: instanceId,
      config_data: configData
    });
  }
};

/**
 * 环境变量管理 API
 */
export const envConfigApi = {
  /**
   * 获取环境变量配置
   * @param {string} instanceId - 实例ID
   * @returns {Promise} 环境变量数据
   */
  async getEnvConfig(instanceId) {
    return await apiService.get(`${API_BASE}/${instanceId}/env/get`);
  },

  /**
   * 更新环境变量配置
   * @param {string} instanceId - 实例ID
   * @param {Object} envData - 环境变量数据
   * @returns {Promise} 更新结果
   */
  async updateEnvConfig(instanceId, envData) {
    return await apiService.post(`${API_BASE}/${instanceId}/env/update`, {
      instance_id: instanceId,
      env_data: envData
    });
  }
};

/**
 * 适配器配置管理 API
 */
export const adapterConfigApi = {
  /**
   * 获取适配器配置
   * @param {string} instanceId - 实例ID
   * @returns {Promise} 配置数据
   */
  async getAdapterConfig(instanceId) {
    return await apiService.get(`${API_BASE}/${instanceId}/adapter/napcat/get`);
  },

  /**
   * 更新适配器配置
   * @param {string} instanceId - 实例ID
   * @param {Object} configData - 配置数据
   * @returns {Promise} 更新结果
   */
  async updateAdapterConfig(instanceId, configData) {
    return await apiService.post(`${API_BASE}/${instanceId}/adapter/napcat/update`, {
      instance_id: instanceId,
      config_data: configData
    });
  }
};

/**
 * 统一的 MaiBot 配置管理 API
 */
export const maibotConfigApi = {
  // Bot 配置相关方法
  getBotConfig: botConfigApi.getBotConfig,
  updateBotConfig: botConfigApi.updateBotConfig,
  
  // LPMM 配置相关方法
  getLpmmConfig: lpmmConfigApi.getLpmmConfig,
  updateLpmmConfig: lpmmConfigApi.updateLpmmConfig,
  
  // 环境变量相关方法
  getEnvConfig: envConfigApi.getEnvConfig,
  updateEnvConfig: envConfigApi.updateEnvConfig,

  // 适配器配置相关方法
  getAdapterConfig: adapterConfigApi.getAdapterConfig,
  updateAdapterConfig: adapterConfigApi.updateAdapterConfig,

  // 分组访问
  bot: botConfigApi,
  lpmm: lpmmConfigApi,
  env: envConfigApi,
  adapter: adapterConfigApi
};

export default maibotConfigApi;
