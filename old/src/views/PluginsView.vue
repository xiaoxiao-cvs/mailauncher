<template>
    <div class="plugins-container">
        <!-- 搜索栏 -->
        <div class="search-header">
            <div class="search-box">
                <Icon icon="mdi:magnify" class="search-icon" />
                <input 
                    type="text" 
                    placeholder="搜索插件..." 
                    class="search-input"
                    v-model="searchQuery"
                />
            </div>
            <div class="view-toggle">
                <span class="view-label">按名称排序</span>
                <Icon icon="mdi:menu-down" class="sort-icon" />
            </div>
        </div>

        <!-- 插件列表标题 -->
        <div class="plugins-list-header">
            <div class="header-icon">
                <Icon icon="mdi:grid" />
            </div>
            <h2 class="list-title">插件列表</h2>
            <p class="list-subtitle">点击插件卡片的"查看详情"按钮可了解更多信息</p>
        </div>

        <!-- 插件网格 -->
        <div class="plugins-grid">
            <div 
                v-for="plugin in filteredPlugins" 
                :key="plugin.id"
                class="plugin-card"
            >
                <!-- 插件图标 -->
                <div class="plugin-avatar">
                    <Icon :icon="plugin.icon" />
                </div>

                <!-- 插件信息 -->
                <div class="plugin-info">
                    <h3 class="plugin-name">{{ plugin.name }}</h3>
                    <div class="plugin-version">v{{ plugin.version }}</div>
                    <p class="plugin-description">{{ plugin.description }}</p>
                    
                    <!-- 标签 -->
                    <div class="plugin-tags">
                        <span 
                            v-for="tag in plugin.tags" 
                            :key="tag"
                            class="plugin-tag"
                            :class="getTagClass(tag)"
                        >
                            {{ tag }}
                        </span>
                        <span class="tag-count" v-if="plugin.extraTags">+{{ plugin.extraTags }}</span>
                    </div>
                </div>

                <!-- 操作按钮 -->
                <div class="plugin-actions">
                    <button class="btn-detail">查看详情</button>
                    <button class="btn-install" :class="{ 'installed': plugin.installed }">
                        {{ plugin.installed ? '已安装' : '安装' }}
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { Icon } from '@iconify/vue';
import { ref, computed } from 'vue';

// 搜索查询
const searchQuery = ref('');

// 模拟插件数据
const plugins = ref([
    {
        id: 1,
        name: '插件模板',
        version: '1.0.5',
        description: '提供了基础的插件开发模板，包含常用的配置，帮助方法集成的便携式插件API',
        icon: 'mdi:puzzle',
        tags: ['template', 'automation', 'moderation'],
        extraTags: 1,
        installed: false
    },
    {
        id: 2,
        name: '表情轮盘',
        version: '1.0.0',
        description: '在命运的舞台上，勇士们围坐一圈，手中紧握那把只装有一颗子弹的左轮手枪。每一次扣动扳机，都是对勇气与命运的挑战。枪声响起，欢笑与紧张交织，荣耀与沉默只在一瞬之间。谁会成为这场故事的主角？谁会是下一个被命运选中的人',
        icon: 'mdi:emoticon',
        tags: ['game', 'russian-roulette', 'moderation'],
        extraTags: 2,
        installed: true
    },
    {
        id: 3,
        name: '豆包搜索插件 (Doubao Search Plugin)',
        version: '1.0.0',
        description: '基于火山引擎豆包模型的AI搜索插件，支持智能LLM判定和高效搜索功能。',
        icon: 'mdi:magnify',
        tags: ['ai', 'search', 'doubao'],
        extraTags: 2,
        installed: false
    },
    {
        id: 4,
        name: '基基流动生图插件',
        version: '0.4',
        description: '发送图片的插件动作，支持通过硅基流动生成图片并发送，兼容base64图片返回方式。',
        icon: 'mdi:image',
        tags: ['主题创造插件', 'base64-处理插', 'create-image'],
        extraTags: 1,
        installed: false
    },
    {
        id: 5,
        name: '表情插件生成器',
        version: '0.0.4',
        description: '让你的麦麦给你写麦麦v0.1插件！请查看源码readme.md教程！！！',
        icon: 'mdi:file-document',
        tags: ['表情插件', 'base64-文档', 'readme'],
        extraTags: 0,
        installed: false
    },
    {
        id: 6,
        name: 'pixiv_setu_plugin',
        version: '1.0.0',
        description: '根据关键词获取Pixiv上相应的图片内容',
        icon: 'mdi:image-multiple',
        tags: ['pixiv', 'setu', '图片'],
        extraTags: 1,
        installed: false
    }
]);

// 过滤插件
const filteredPlugins = computed(() => {
    if (!searchQuery.value) {
        return plugins.value;
    }
    return plugins.value.filter(plugin => 
        plugin.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
        plugin.description.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
        plugin.tags.some(tag => tag.toLowerCase().includes(searchQuery.value.toLowerCase()))
    );
});

// 标签样式类
const getTagClass = (tag) => {
    // 不同类型的标签使用不同颜色
    const tagColorMap = {
        'template': 'tag-template',
        'game': 'tag-game', 
        'ai': 'tag-ai',
        'search': 'tag-search',
        'automation': 'tag-automation',
        'moderation': 'tag-moderation',
        'pixiv': 'tag-pixiv',
        'setu': 'tag-setu',
        'doubao': 'tag-doubao'
    };
    
    return tagColorMap[tag] || 'tag-default';
};
</script>

<style scoped>
.plugins-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, hsl(var(--b1)) 0%, hsl(var(--b2) / 0.3) 100%);
  color: hsl(var(--bc));
  padding: 1.5rem;
  gap: 1.5rem;
}

/* 搜索头部 */
.search-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.search-box {
  position: relative;
  flex: 1;
  max-width: 28rem;
}

.search-input {
  width: 100%;
  padding: 0.5rem 1rem 0.5rem 2.5rem;
  border: 1px solid hsl(var(--b3));
  border-radius: 0.5rem;
  background: hsl(var(--b1));
  color: hsl(var(--bc));
  font-size: 0.875rem;
  transition: all 0.2s ease;
}

.search-input:focus {
  outline: none;
  border-color: hsl(var(--p));
  box-shadow: 0 0 0 2px hsl(var(--p) / 0.2);
}

.search-icon {
  position: absolute;
  left: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  color: hsl(var(--bc) / 0.6);
  font-size: 1.125rem;
}

.view-toggle {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: hsl(var(--bc) / 0.7);
  cursor: pointer;
}

.view-label {
  font-size: 0.875rem;
}

.sort-icon {
  font-size: 1.125rem;
}

/* 列表头部 */
.plugins-list-header {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
}

.header-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  background: hsl(var(--p) / 0.2);
  color: hsl(var(--p));
  border-radius: 0.5rem;
  flex-shrink: 0;
  margin-top: 0.25rem;
}

.header-icon .iconify {
  font-size: 1.125rem;
}

.list-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: hsl(var(--bc));
  margin: 0;
}

.list-subtitle {
  color: hsl(var(--bc) / 0.6);
  font-size: 0.875rem;
  margin: 0.25rem 0 0 0;
}

/* 插件网格 */
.plugins-grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
}

/* 插件卡片 */
.plugin-card {
  background: hsl(var(--b1));
  border: 1px solid hsl(var(--b3) / 0.2);
  border-radius: 0.75rem;
  padding: 1rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  min-height: 120px;
  transition: all 0.2s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.1);
}

.plugin-card:hover {
  background: hsl(var(--b2) / 0.3);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1), 0 4px 8px rgba(0, 0, 0, 0.05);
  border-color: hsl(var(--p) / 0.3);
  transform: translateY(-2px);
}

/* 插件头像 */
.plugin-avatar {
  width: 3rem;
  height: 3rem;
  background: linear-gradient(135deg, hsl(var(--p) / 0.15), hsl(var(--s) / 0.15));
  color: hsl(var(--p));
  border-radius: 0.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border: 1px solid hsl(var(--p) / 0.1);
}

.plugin-avatar .iconify {
  font-size: 1.5rem;
}

/* 插件信息 */
.plugin-info {
  flex: 1;
  min-width: 0;
}

.plugin-name {
  font-size: 1.125rem;
  font-weight: 600;
  color: hsl(var(--bc));
  margin: 0 0 0.25rem 0;
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
}

.plugin-version {
  font-size: 0.75rem;
  color: hsl(var(--p));
  font-weight: 500;
  opacity: 0.8;
  margin: 0 0 0.5rem 0;
}

.plugin-description {
  font-size: 0.875rem;
  color: hsl(var(--bc) / 0.7);
  margin: 0 0 0.75rem 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  line-clamp: 2;
  overflow: hidden;
  line-height: 1.4;
}

/* 标签 */
.plugin-tags {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  flex-wrap: wrap;
}

.plugin-tag {
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
  border-radius: 9999px;
}

.tag-template {
  background: rgba(244, 63, 94, 0.1);
  color: rgb(244, 63, 94);
}

.tag-game {
  background: rgba(249, 115, 22, 0.1);
  color: rgb(249, 115, 22);
}

.tag-ai {
  background: rgba(168, 85, 247, 0.1);
  color: rgb(168, 85, 247);
}

.tag-search {
  background: rgba(59, 130, 246, 0.1);
  color: rgb(59, 130, 246);
}

.tag-automation {
  background: rgba(34, 197, 94, 0.1);
  color: rgb(34, 197, 94);
}

.tag-moderation {
  background: rgba(99, 102, 241, 0.1);
  color: rgb(99, 102, 241);
}

.tag-pixiv {
  background: rgba(6, 182, 212, 0.1);
  color: rgb(6, 182, 212);
}

.tag-setu {
  background: rgba(236, 72, 153, 0.1);
  color: rgb(236, 72, 153);
}

.tag-doubao {
  background: rgba(245, 158, 11, 0.1);
  color: rgb(245, 158, 11);
}

.tag-default {
  background: hsl(var(--b2));
  color: hsl(var(--bc) / 0.7);
}

.tag-count {
  font-size: 0.75rem;
  color: hsl(var(--bc) / 0.5);
}

/* 操作按钮 */
.plugin-actions {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  flex-shrink: 0;
}

.btn-detail {
  padding: 0.375rem 0.75rem;
  font-size: 0.75rem;
  border: 1px solid hsl(var(--b3));
  color: hsl(var(--bc) / 0.7);
  border-radius: 0.5rem;
  background: hsl(var(--b1));
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-detail:hover {
  background: hsl(var(--b2));
  border-color: hsl(var(--p) / 0.5);
  color: hsl(var(--p));
}

.btn-install {
  padding: 0.375rem 0.75rem;
  font-size: 0.75rem;
  background: linear-gradient(135deg, hsl(var(--p)), hsl(var(--p) / 0.9));
  color: hsl(var(--pc));
  border: none;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 4px hsl(var(--p) / 0.3);
}

.btn-install:hover {
  background: linear-gradient(135deg, hsl(var(--p) / 0.9), hsl(var(--p) / 0.8));
  box-shadow: 0 4px 8px hsl(var(--p) / 0.4);
  transform: translateY(-1px);
}

.btn-install.installed {
  background: linear-gradient(135deg, hsl(var(--su)), hsl(var(--su) / 0.9));
  color: hsl(var(--suc));
  box-shadow: 0 2px 4px hsl(var(--su) / 0.3);
}

/* 深色模式适配 */
[data-theme="dark"] .plugins-container {
  background: linear-gradient(135deg, hsl(var(--b1)) 0%, hsl(var(--b2) / 0.5) 100%);
}

[data-theme="dark"] .plugin-card {
  background: hsl(var(--b2) / 0.3);
  border-color: hsl(var(--b3) / 0.3);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2), 0 1px 2px rgba(0, 0, 0, 0.3);
}

[data-theme="dark"] .plugin-card:hover {
  background: hsl(var(--b2) / 0.5);
  border-color: hsl(var(--p) / 0.5);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.3), 0 4px 8px rgba(0, 0, 0, 0.2);
}

[data-theme="dark"] .search-input {
  background: hsl(var(--b2));
  border-color: hsl(var(--b3) / 0.5);
}

[data-theme="dark"] .plugin-avatar {
  background: linear-gradient(135deg, hsl(var(--p) / 0.25), hsl(var(--s) / 0.25));
  border-color: hsl(var(--p) / 0.2);
}

[data-theme="dark"] .tag-template {
  background: rgba(244, 63, 94, 0.2);
  color: rgb(251, 113, 133);
}

[data-theme="dark"] .tag-game {
  background: rgba(249, 115, 22, 0.2);
  color: rgb(251, 146, 60);
}

[data-theme="dark"] .tag-ai {
  background: rgba(168, 85, 247, 0.2);
  color: rgb(196, 181, 253);
}

[data-theme="dark"] .tag-search {
  background: rgba(59, 130, 246, 0.2);
  color: rgb(147, 197, 253);
}

[data-theme="dark"] .tag-automation {
  background: rgba(34, 197, 94, 0.2);
  color: rgb(134, 239, 172);
}

[data-theme="dark"] .tag-moderation {
  background: rgba(99, 102, 241, 0.2);
  color: rgb(165, 180, 252);
}

[data-theme="dark"] .tag-pixiv {
  background: rgba(6, 182, 212, 0.2);
  color: rgb(103, 232, 249);
}

[data-theme="dark"] .tag-setu {
  background: rgba(236, 72, 153, 0.2);
  color: rgb(244, 114, 182);
}

[data-theme="dark"] .tag-doubao {
  background: rgba(245, 158, 11, 0.2);
  color: rgb(251, 191, 36);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .plugins-container {
    padding: 1rem;
    gap: 1rem;
  }
  
  .plugins-grid {
    grid-template-columns: 1fr;
  }
  
  .plugin-card {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
    min-height: auto;
  }
  
  .plugin-avatar {
    width: 2.5rem;
    height: 2.5rem;
  }
  
  .plugin-actions {
    flex-direction: row;
    width: 100%;
  }
  
  .btn-detail,
  .btn-install {
    flex: 1;
  }
  
  .search-header {
    flex-direction: column;
    align-items: stretch;
    gap: 0.75rem;
  }
  
  .view-toggle {
    justify-content: flex-end;
  }
}
</style>
