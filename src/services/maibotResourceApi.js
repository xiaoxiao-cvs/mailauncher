/**
 * MaiBot 资源管理 API 服务
 * 提供表情包和用户信息的 CRUD 操作
 */

import apiService from './apiService.js';
const API_BASE = '/api/v1/resource';
/**
 * 表情包管理 API
 */
export const emojiApi = {
  // 创建表情包
  async create(instanceId, emojiData) {
    return await apiService.post(`${API_BASE}/${instanceId}/emoji`, emojiData);
  },
  // 根据ID获取表情包
  async getById(instanceId, emojiId) {
    return await apiService.get(`${API_BASE}/${instanceId}/emoji/${emojiId}`);
  },
  // 根据哈希获取表情包
  async getByHash(instanceId, emojiHash) {
    return await apiService.post(`${API_BASE}/${instanceId}/emoji/hash`, {
      emoji_hash: emojiHash
    });
  },
  // 搜索表情包
  async search(instanceId, filters = {}) {
    return await apiService.post(`${API_BASE}/${instanceId}/emoji/search`, filters);
  },
  // 更新表情包
  async update(instanceId, emojiId, updateData) {
    return await apiService.put(`${API_BASE}/${instanceId}/emoji/${emojiId}`, updateData);
  },
  // 删除表情包
  async delete(instanceId, emojiId) {
    return await apiService.delete(`${API_BASE}/${instanceId}/emoji/${emojiId}`);
  },
  // 增加表情包使用次数
  async incrementUsage(instanceId, emojiId) {
    return await apiService.post(`${API_BASE}/${instanceId}/emoji/${emojiId}/usage`);
  },
  // 增加表情包查询次数
  async incrementQuery(instanceId, emojiId) {
    return await apiService.post(`${API_BASE}/${instanceId}/emoji/${emojiId}/query`);
  },
  // 获取表情包总数
  async getCount(instanceId, filters = {}) {
    return await apiService.post(`${API_BASE}/${instanceId}/emoji/count`, filters);
  },  // 批量获取表情包
  async getBatch(instanceId, options = {}) {
    const { batchSize = 50, offset = 0, filters = {} } = options;
    // 根据后端API文档，筛选条件应该平铺到请求体中，而不是嵌套在filters对象中
    return await apiService.post(`${API_BASE}/${instanceId}/emoji/batch`, {
      batch_size: batchSize,
      offset,
      ...filters  // 将筛选条件平铺到请求体中
    });
  }
};

/**
 * 用户信息管理 API
 */
export const personApi = {
  // 创建用户信息
  async create(instanceId, personData) {
    return await apiService.post(`${API_BASE}/${instanceId}/person`, personData);
  },

  // 根据记录ID获取用户信息
  async getByRecordId(instanceId, recordId) {
    return await apiService.get(`${API_BASE}/${instanceId}/person/record/${recordId}`);
  },

  // 根据用户ID获取用户信息
  async getByPersonId(instanceId, personId) {
    return await apiService.get(`${API_BASE}/${instanceId}/person/${personId}`);
  },

  // 根据平台获取用户信息
  async getByPlatform(instanceId, platform, userId) {
    return await apiService.post(`${API_BASE}/${instanceId}/person/platform`, {
      platform,
      user_id: userId
    });
  },

  // 搜索用户信息
  async search(instanceId, filters = {}) {
    return await apiService.post(`${API_BASE}/${instanceId}/person/search`, filters);
  },

  // 更新用户信息
  async update(instanceId, personId, updateData) {
    return await apiService.put(`${API_BASE}/${instanceId}/person/${personId}`, updateData);
  },

  // 删除用户信息
  async delete(instanceId, personId) {
    return await apiService.delete(`${API_BASE}/${instanceId}/person/${personId}`);
  },

  // 更新用户交互信息
  async updateInteraction(instanceId, personId, interactionData) {
    return await apiService.post(`${API_BASE}/${instanceId}/person/${personId}/interaction`, interactionData);
  },

  // 获取用户信息总数
  async getCount(instanceId, filters = {}) {
    return await apiService.post(`${API_BASE}/${instanceId}/person/count`, filters);
  },
  // 批量获取用户信息
  async getBatch(instanceId, options = {}) {
    const { batchSize = 50, offset = 0, filters = {} } = options;
    // 根据后端API文档，筛选条件应该平铺到请求体中，而不是嵌套在filters对象中
    return await apiService.post(`${API_BASE}/${instanceId}/person/batch`, {
      batch_size: batchSize,
      offset,
      ...filters  // 将筛选条件平铺到请求体中
    });
  }
};

/**
 * 资源管理 API
 */
export const resourceApi = {
  // 获取实例资源信息
  async getInstanceInfo(instanceId) {
    return await apiService.get(`${API_BASE}/${instanceId}/info`);
  },

  // 获取所有实例资源信息
  async getAllInstancesInfo() {
    return await apiService.get(`${API_BASE}/all`);
  }
};

/**
 * 统一的 MaiBot 资源管理 API
 */
export const maibotResourceApi = {
  emoji: emojiApi,
  person: personApi,
  resource: resourceApi
};

export default maibotResourceApi;
