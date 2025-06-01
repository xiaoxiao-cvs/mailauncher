/**
 * API 数据适配器 - 用于处理后端 API 返回的数据与前端数据模型之间的差异
 */

/**
 * 状态映射 - 将后端中文状态转换为前端英文状态
 * @param {string} chineseStatus - 后端返回的中文状态
 * @returns {string} - 前端期望的英文状态
 */
const mapChineseStatusToEnglish = (chineseStatus) => {
  const statusMap = {
    运行中: "running",
    已停止: "stopped",
    启动中: "starting",
    停止中: "stopping",
    维护中: "maintenance",
    未运行: "stopped",
  };

  // 如果是中文状态，进行转换；如果已经是英文或未知状态，保持原样
  return statusMap[chineseStatus] || chineseStatus;
};

/**
 * 适配实例数据 - 处理后端数据格式不一致的问题
 * @param {Object} instance - 后端返回的实例数据
 * @returns {Object} - 适配后的实例数据
 */
export const adaptInstanceData = (instance) => {
  if (!instance) return null;

  // 创建一个格式化日期的辅助函数，确保日期格式一致
  const formatDateIfExists = (dateStr) => {
    if (!dateStr) return null;
    // 如果是时间戳格式，转换为标准日期字符串
    if (/^\d+$/.test(dateStr)) {
      return new Date(parseInt(dateStr)).toISOString();
    }
    return dateStr;
  };

  // 适配后的实例对象
  return {
    id: instance.id || instance.instance_id,
    name: instance.name,
    status: mapChineseStatusToEnglish(instance.status), // 应用状态映射
    // 使用 created_at 作为 installedAt 的回退
    installedAt: formatDateIfExists(
      instance.installedAt || instance.created_at
    ),
    path: instance.path,
    // 确保服务是一个数组
    services: Array.isArray(instance.services) ? instance.services : [],
    version: instance.version,
    port: instance.port,
    // 保持一致性，如果都没有则使用 null
    createdAt: formatDateIfExists(
      instance.createdAt || instance.created_at || instance.installedAt
    ),
  };
};

/**
 * 适配实例列表数据
 * @param {Object} response - 后端返回的实例列表响应
 * @returns {Array} - 适配后的实例列表
 */
export const adaptInstancesList = (response) => {
  // 确保 response 是有效的
  if (!response) return [];

  let instances = [];

  // 处理不同形式的响应结构
  if (response.data && Array.isArray(response.data.instances)) {
    instances = response.data.instances;
  } else if (response.data && Array.isArray(response.data)) {
    instances = response.data;
  } else if (Array.isArray(response.instances)) {
    instances = response.instances;
  } else if (Array.isArray(response)) {
    instances = response;
  } else {
    return [];
  }

  // 对每个实例应用适配器
  return instances.map((instance) => adaptInstanceData(instance));
};

/**
 * 将秒数格式化为可读的运行时间格式（x天x小时x分钟）
 * @param {number} seconds - 运行时间秒数
 * @returns {string} - 格式化后的运行时间
 */
export const formatUptime = (seconds) => {
  if (!seconds || isNaN(seconds) || seconds < 0) return "-";

  const days = Math.floor(seconds / (24 * 60 * 60));
  const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));
  const minutes = Math.floor((seconds % (60 * 60)) / 60);

  let result = "";
  if (days > 0) result += `${days}天`;
  if (hours > 0 || days > 0) result += `${hours}小时`;
  result += `${minutes}分钟`;

  return result;
};

/**
 * 适配实例列表数据，并计算可读的运行时间
 * @param {Object} response - 后端返回的实例列表响应
 * @returns {Array} - 适配后的实例列表，包含可读运行时间
 */
export const adaptInstancesListWithUptime = (response) => {
  const instances = adaptInstancesList(response);

  return instances.map((instance) => {
    // 如果实例正在运行且有 uptime 字段（以秒为单位）
    if (
      instance.status === "running" &&
      instance.uptime &&
      !isNaN(instance.uptime)
    ) {
      return {
        ...instance,
        uptime: formatUptime(instance.uptime),
      };
    }
    return instance;
  });
};
