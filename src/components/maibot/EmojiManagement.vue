<template>
  <div class="emoji-management">
    <!-- 搜索和过滤区域 -->
    <div class="search-section">
      <div class="search-controls">
        <div class="form-control">
          <input 
            type="text" 
            placeholder="搜索表情包描述..." 
            class="input input-bordered input-sm"
            v-model="searchQuery"
            @input="debouncedSearch"
          />
        </div>
        
        <div class="filters">
          <select class="select select-bordered select-sm" v-model="filters.emotion">
            <option value="">所有情感</option>
            <option value="happy">开心</option>
            <option value="sad">难过</option>
            <option value="angry">愤怒</option>
            <option value="surprise">惊讶</option>
            <option value="fear">恐惧</option>
            <option value="disgust">厌恶</option>
          </select>

          <select class="select select-bordered select-sm" v-model="filters.format">
            <option value="">所有格式</option>
            <option value="png">PNG</option>
            <option value="jpg">JPG</option>
            <option value="gif">GIF</option>
            <option value="webp">WebP</option>
          </select>

          <select class="select select-bordered select-sm" v-model="filters.status">
            <option value="">所有状态</option>
            <option value="registered">已注册</option>
            <option value="unregistered">未注册</option>
            <option value="banned">已禁用</option>
          </select>

          <button class="btn btn-sm btn-primary" @click="loadEmojis">
            <Icon icon="mdi:refresh" width="16" height="16" />
          </button>
        </div>
      </div>

      <div class="actions">
        <button class="btn btn-sm btn-success" @click="showCreateDialog = true">
          <Icon icon="mdi:plus" width="16" height="16" class="mr-1" />
          添加表情包
        </button>
        <button class="btn btn-sm btn-warning" @click="exportEmojis">
          <Icon icon="mdi:export" width="16" height="16" class="mr-1" />
          导出数据
        </button>
      </div>
    </div>

    <!-- 表情包列表 -->
    <div class="emoji-list">
      <div v-if="loading" class="loading-container">
        <div class="loading loading-spinner loading-md"></div>
        <p>加载表情包中...</p>
      </div>

      <div v-else-if="emojis.length === 0" class="empty-state">
        <Icon icon="mdi:emoticon-sad" width="48" height="48" class="text-base-content/30" />
        <p class="text-base-content/70">没有找到表情包</p>
        <button class="btn btn-sm btn-primary mt-4" @click="showCreateDialog = true">
          添加第一个表情包
        </button>
      </div>

      <div v-else class="emojis-grid">
        <div 
          v-for="emoji in emojis" 
          :key="emoji.id" 
          class="emoji-card"
          @click="selectEmoji(emoji)"
        >
          <div class="emoji-preview">
            <img 
              v-if="emoji.full_path && isValidImagePath(emoji.full_path)" 
              :src="emoji.full_path" 
              :alt="emoji.description"
              @error="handleImageError"
              class="emoji-image"
            />
            <div v-else class="emoji-placeholder">
              <Icon icon="mdi:image-broken" width="32" height="32" />
            </div>
          </div>

          <div class="emoji-info">
            <div class="emoji-description">{{ emoji.description || '无描述' }}</div>
            <div class="emoji-meta">
              <span class="emoji-format">{{ emoji.format?.toUpperCase() }}</span>
              <span class="emoji-emotion" v-if="emoji.emotion">{{ emoji.emotion }}</span>
            </div>
            <div class="emoji-stats">
              <span class="stat-item">
                <Icon icon="mdi:eye" width="12" height="12" />
                {{ emoji.query_count || 0 }}
              </span>
              <span class="stat-item">
                <Icon icon="mdi:heart" width="12" height="12" />
                {{ emoji.usage_count || 0 }}
              </span>
            </div>
          </div>

          <div class="emoji-status">
            <div class="status-badges">
              <span v-if="emoji.is_registered" class="badge badge-success badge-xs">已注册</span>
              <span v-if="emoji.is_banned" class="badge badge-error badge-xs">已禁用</span>
            </div>
            <div class="emoji-actions">
              <button class="btn btn-xs btn-ghost" @click.stop="editEmoji(emoji)">
                <Icon icon="mdi:pencil" width="12" height="12" />
              </button>
              <button class="btn btn-xs btn-ghost" @click.stop="deleteEmoji(emoji)">
                <Icon icon="mdi:delete" width="12" height="12" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 分页 -->
      <div v-if="totalCount > pageSize" class="pagination">
        <div class="join">
          <button 
            class="join-item btn btn-sm" 
            :disabled="currentPage === 1"
            @click="goToPage(currentPage - 1)"
          >
            <Icon icon="mdi:chevron-left" width="16" height="16" />
          </button>
          
          <span class="join-item btn btn-sm btn-disabled">
            {{ currentPage }} / {{ totalPages }}
          </span>
          
          <button 
            class="join-item btn btn-sm"
            :disabled="currentPage === totalPages"
            @click="goToPage(currentPage + 1)"
          >
            <Icon icon="mdi:chevron-right" width="16" height="16" />
          </button>
        </div>
        
        <div class="pagination-info">
          共 {{ totalCount }} 个表情包，每页 {{ pageSize }} 个
        </div>
      </div>
    </div>

    <!-- 创建表情包对话框 -->
    <dialog :class="{ 'modal-open': showCreateDialog }" class="modal">
      <div class="modal-box">
        <h3 class="font-bold text-lg mb-4">添加表情包</h3>
        <!-- 创建表单内容 -->
        <div class="form-control mb-4">
          <label class="label">
            <span class="label-text">文件路径 *</span>
          </label>
          <input 
            type="text" 
            placeholder="表情包文件完整路径"
            class="input input-bordered"
            v-model="newEmoji.full_path"
          />
        </div>

        <div class="form-control mb-4">
          <label class="label">
            <span class="label-text">文件格式 *</span>
          </label>
          <select class="select select-bordered" v-model="newEmoji.format">
            <option value="">选择格式</option>
            <option value="png">PNG</option>
            <option value="jpg">JPG</option>
            <option value="gif">GIF</option>
            <option value="webp">WebP</option>
          </select>
        </div>

        <div class="form-control mb-4">
          <label class="label">
            <span class="label-text">哈希值 *</span>
          </label>
          <input 
            type="text" 
            placeholder="表情包唯一哈希值"
            class="input input-bordered"
            v-model="newEmoji.emoji_hash"
          />
        </div>

        <div class="form-control mb-4">
          <label class="label">
            <span class="label-text">描述</span>
          </label>
          <textarea 
            class="textarea textarea-bordered"
            placeholder="表情包描述"
            v-model="newEmoji.description"
          ></textarea>
        </div>

        <div class="form-control mb-4">
          <label class="label">
            <span class="label-text">情感标签</span>
          </label>
          <select class="select select-bordered" v-model="newEmoji.emotion">
            <option value="">选择情感</option>
            <option value="happy">开心</option>
            <option value="sad">难过</option>
            <option value="angry">愤怒</option>
            <option value="surprise">惊讶</option>
            <option value="fear">恐惧</option>
            <option value="disgust">厌恶</option>
          </select>
        </div>

        <div class="modal-action">
          <button class="btn btn-ghost" @click="showCreateDialog = false">取消</button>
          <button class="btn btn-primary" @click="createEmoji" :disabled="!isCreateFormValid">
            <Icon icon="mdi:plus" width="16" height="16" class="mr-1" />
            添加
          </button>
        </div>
      </div>
    </dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { Icon } from '@iconify/vue';
import { maibotResourceApi } from '@/services/maibotResourceApi.js';
import toastService from '@/services/toastService.js';

// 简单的防抖函数实现
const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// Props
const props = defineProps({
  instanceId: {
    type: String,
    required: true
  },
  instanceName: {
    type: String,
    required: true
  }
});

// Emits
const emit = defineEmits(['stats-updated']);

// 响应式数据
const loading = ref(false);
const emojis = ref([]);
const totalCount = ref(0);
const currentPage = ref(1);
const pageSize = ref(24);
const searchQuery = ref('');
const showCreateDialog = ref(false);

// 过滤器
const filters = ref({
  emotion: '',
  format: '',
  status: '' // registered, unregistered, banned
});

// 新表情包数据
const newEmoji = ref({
  full_path: '',
  format: '',
  emoji_hash: '',
  description: '',
  emotion: ''
});

// 计算属性
const totalPages = computed(() => {
  return Math.ceil(totalCount.value / pageSize.value);
});

const isCreateFormValid = computed(() => {
  return newEmoji.value.full_path && 
         newEmoji.value.format && 
         newEmoji.value.emoji_hash;
});

// 方法
const loadEmojis = async () => {
  try {
    loading.value = true;
    
    const searchFilters = {};
    
    // 添加搜索条件
    if (searchQuery.value) {
      searchFilters.description_like = searchQuery.value;
    }
    
    if (filters.value.emotion) {
      searchFilters.emotion = filters.value.emotion;
    }
    
    if (filters.value.format) {
      searchFilters.format = filters.value.format;
    }
    
    if (filters.value.status === 'registered') {
      searchFilters.is_registered = 1;
    } else if (filters.value.status === 'unregistered') {
      searchFilters.is_registered = 0;
    } else if (filters.value.status === 'banned') {
      searchFilters.is_banned = 1;
    }

    const response = await maibotResourceApi.emoji.getBatch(props.instanceId, {
      batchSize: pageSize.value,
      offset: (currentPage.value - 1) * pageSize.value,
      filters: searchFilters
    });

    if (response.status === 'success') {
      emojis.value = response.data || [];
      totalCount.value = response.total_count || 0;
      
      // 更新统计信息
      emit('stats-updated', { total: totalCount.value });
    } else {
      throw new Error(response.message || '获取表情包失败');
    }
  } catch (error) {
    console.error('加载表情包失败:', error);
    toastService.show('加载表情包失败', { type: 'error' });
  } finally {
    loading.value = false;
  }
};

const debouncedSearch = debounce(() => {
  currentPage.value = 1;
  loadEmojis();
}, 500);

const goToPage = (page) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page;
    loadEmojis();
  }
};

const selectEmoji = (emoji) => {
  console.log('选中表情包:', emoji);
  // 这里可以实现表情包详情查看
};

const editEmoji = (emoji) => {
  console.log('编辑表情包:', emoji);
  // 实现编辑功能
};

const deleteEmoji = async (emoji) => {
  if (!confirm(`确定要删除表情包 "${emoji.description}" 吗？`)) {
    return;
  }

  try {
    const response = await maibotResourceApi.emoji.delete(props.instanceId, emoji.id);
    if (response.status === 'success') {
      toastService.show('表情包删除成功', { type: 'success' });
      loadEmojis();
    } else {
      throw new Error(response.message || '删除失败');
    }
  } catch (error) {
    console.error('删除表情包失败:', error);
    toastService.show('删除表情包失败', { type: 'error' });
  }
};

const createEmoji = async () => {
  try {
    const response = await maibotResourceApi.emoji.create(props.instanceId, newEmoji.value);
    if (response.status === 'success') {
      toastService.show('表情包添加成功', { type: 'success' });
      showCreateDialog.value = false;
      resetCreateForm();
      loadEmojis();
    } else {
      throw new Error(response.message || '添加失败');
    }
  } catch (error) {
    console.error('添加表情包失败:', error);
    toastService.show('添加表情包失败', { type: 'error' });
  }
};

const resetCreateForm = () => {
  newEmoji.value = {
    full_path: '',
    format: '',
    emoji_hash: '',
    description: '',
    emotion: ''
  };
};

const exportEmojis = () => {
  // 实现导出功能
  console.log('导出表情包数据');
  toastService.show('导出功能开发中...', { type: 'info' });
};

const isValidImagePath = (path) => {
  return path && (path.startsWith('http') || path.startsWith('/') || path.includes('.'));
};

const handleImageError = (event) => {
  event.target.style.display = 'none';
};

// 监听过滤器变化
watch(filters, () => {
  currentPage.value = 1;
  loadEmojis();
}, { deep: true });

// 生命周期
onMounted(() => {
  loadEmojis();
});
</script>

<style scoped>
.emoji-management {
  padding: 1rem;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.search-section {
  margin-bottom: 1rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid hsl(var(--b3));
}

.search-controls {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.filters {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.actions {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
}

.emoji-list {
  flex: 1;
  overflow: auto;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  gap: 1rem;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  text-align: center;
}

.emojis-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1rem;
  padding: 1rem 0;
}

.emoji-card {
  border: 1px solid hsl(var(--b3));
  border-radius: 0.5rem;
  padding: 1rem;
  cursor: pointer;
  transition: all 0.2s;
  background-color: hsl(var(--b1));
}

.emoji-card:hover {
  border-color: hsl(var(--p));
  transform: translateY(-2px);
  box-shadow: 0 4px 12px hsl(var(--b3));
}

.emoji-preview {
  width: 64px;
  height: 64px;
  margin: 0 auto 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: hsl(var(--b2));
  border-radius: 0.5rem;
}

.emoji-image {
  max-width: 100%;
  max-height: 100%;
  border-radius: 0.25rem;
}

.emoji-placeholder {
  color: hsl(var(--bc) / 0.3);
}

.emoji-info {
  margin-bottom: 1rem;
}

.emoji-description {
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: hsl(var(--bc));
}

.emoji-meta {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.emoji-format {
  font-size: 0.75rem;
  padding: 0.125rem 0.375rem;
  background-color: hsl(var(--b3));
  border-radius: 0.25rem;
  color: hsl(var(--bc) / 0.7);
}

.emoji-emotion {
  font-size: 0.75rem;
  padding: 0.125rem 0.375rem;
  background-color: hsl(var(--p) / 0.1);
  color: hsl(var(--p));
  border-radius: 0.25rem;
}

.emoji-stats {
  display: flex;
  gap: 0.75rem;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.75rem;
  color: hsl(var(--bc) / 0.6);
}

.emoji-status {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.status-badges {
  display: flex;
  gap: 0.25rem;
}

.emoji-actions {
  display: flex;
  gap: 0.25rem;
}

.pagination {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 0;
  margin-top: 1rem;
  border-top: 1px solid hsl(var(--b3));
}

.pagination-info {
  font-size: 0.875rem;
  color: hsl(var(--bc) / 0.6);
}
</style>
