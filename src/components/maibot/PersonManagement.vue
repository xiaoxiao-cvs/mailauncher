<template>
  <div class="person-management">
    <!-- 搜索和过滤区域 -->
    <div class="search-section">
      <div class="search-controls">
        <div class="form-control">
          <input 
            type="text" 
            placeholder="搜索用户名称..." 
            class="input input-bordered input-sm"
            v-model="searchQuery"
            @input="debouncedSearch"
          />
        </div>
        
        <div class="filters">
          <select class="select select-bordered select-sm" v-model="filters.platform">
            <option value="">所有平台</option>
            <option value="qq">QQ</option>
            <option value="wechat">微信</option>
            <option value="telegram">Telegram</option>
            <option value="discord">Discord</option>
          </select>

          <div class="form-control">
            <label class="label cursor-pointer gap-2">
              <input 
                type="checkbox" 
                class="checkbox checkbox-sm" 
                v-model="filters.hasPersonName"
              />
              <span class="label-text text-sm">有昵称</span>
            </label>
          </div>

          <button class="btn btn-sm btn-primary" @click="loadPersons">
            <Icon icon="mdi:refresh" width="16" height="16" />
          </button>
        </div>
      </div>

      <div class="actions">
        <button class="btn btn-sm btn-success" @click="showCreateDialog = true">
          <Icon icon="mdi:plus" width="16" height="16" class="mr-1" />
          添加用户
        </button>
        <button class="btn btn-sm btn-info" @click="showStatsDialog = true">
          <Icon icon="mdi:chart-line" width="16" height="16" class="mr-1" />
          统计信息
        </button>
        <button class="btn btn-sm btn-warning" @click="exportPersons">
          <Icon icon="mdi:export" width="16" height="16" class="mr-1" />
          导出数据
        </button>
      </div>
    </div>

    <!-- 用户列表 -->
    <div class="person-list">
      <div v-if="loading" class="loading-container">
        <div class="loading loading-spinner loading-md"></div>
        <p>加载用户信息中...</p>
      </div>

      <div v-else-if="persons.length === 0" class="empty-state">
        <Icon icon="mdi:account-question" width="48" height="48" class="text-base-content/30" />
        <p class="text-base-content/70">没有找到用户信息</p>
        <button class="btn btn-sm btn-primary mt-4" @click="showCreateDialog = true">
          添加第一个用户
        </button>
      </div>

      <div v-else class="persons-grid">
        <div 
          v-for="person in persons" 
          :key="person.id" 
          class="person-card"
          @click="selectPerson(person)"
        >
          <div class="person-header">
            <div class="person-avatar">
              <Icon icon="mdi:account" width="32" height="32" />
            </div>
            <div class="person-basic">
              <div class="person-name">
                {{ person.person_name || person.nickname || '未命名用户' }}
              </div>
              <div class="person-platform">
                <Icon :icon="getPlatformIcon(person.platform)" width="14" height="14" />
                <span>{{ person.platform?.toUpperCase() }}</span>
                <span class="text-xs">{{ person.user_id }}</span>
              </div>
            </div>
          </div>

          <div class="person-details">
            <div v-if="person.impression" class="person-impression">
              <Icon icon="mdi:message-text" width="14" height="14" />
              <span>{{ truncateText(person.impression, 50) }}</span>
            </div>
            
            <div v-if="person.short_impression" class="person-short-impression">
              <Icon icon="mdi:clock-outline" width="14" height="14" />
              <span>{{ truncateText(person.short_impression, 40) }}</span>
            </div>
            
            <div v-if="person.points" class="person-points">
              <Icon icon="mdi:star" width="14" height="14" />
              <span>积分: {{ person.points }}</span>
            </div>
          </div>

          <div class="person-meta">
            <div class="person-time">
              <span class="text-xs">
                最后认识: {{ formatDate(person.last_know) }}
              </span>
            </div>
            <div class="person-actions">
              <button class="btn btn-xs btn-ghost" @click.stop="editPerson(person)">
                <Icon icon="mdi:pencil" width="12" height="12" />
              </button>
              <button class="btn btn-xs btn-ghost" @click.stop="updateInteraction(person)">
                <Icon icon="mdi:chat" width="12" height="12" />
              </button>
              <button class="btn btn-xs btn-ghost" @click.stop="deletePerson(person)">
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
          共 {{ totalCount }} 个用户，每页 {{ pageSize }} 个
        </div>
      </div>
    </div>

    <!-- 创建用户对话框 -->
    <dialog :class="{ 'modal-open': showCreateDialog }" class="modal">
      <div class="modal-box">
        <h3 class="font-bold text-lg mb-4">添加用户信息</h3>
        
        <div class="form-control mb-4">
          <label class="label">
            <span class="label-text">用户唯一ID *</span>
          </label>
          <input 
            type="text" 
            placeholder="用户唯一标识符"
            class="input input-bordered"
            v-model="newPerson.person_id"
          />
        </div>

        <div class="form-control mb-4">
          <label class="label">
            <span class="label-text">平台 *</span>
          </label>
          <select class="select select-bordered" v-model="newPerson.platform">
            <option value="">选择平台</option>
            <option value="qq">QQ</option>
            <option value="wechat">微信</option>
            <option value="telegram">Telegram</option>
            <option value="discord">Discord</option>
          </select>
        </div>

        <div class="form-control mb-4">
          <label class="label">
            <span class="label-text">平台用户ID *</span>
          </label>
          <input 
            type="text" 
            placeholder="平台上的用户ID"
            class="input input-bordered"
            v-model="newPerson.user_id"
          />
        </div>

        <div class="form-control mb-4">
          <label class="label">
            <span class="label-text">Bot给用户的昵称</span>
          </label>
          <input 
            type="text" 
            placeholder="Bot为用户起的名字"
            class="input input-bordered"
            v-model="newPerson.person_name"
          />
        </div>

        <div class="form-control mb-4">
          <label class="label">
            <span class="label-text">起名原因</span>
          </label>
          <textarea 
            class="textarea textarea-bordered"
            placeholder="为什么给用户起这个名字"
            v-model="newPerson.name_reason"
          ></textarea>
        </div>

        <div class="form-control mb-4">
          <label class="label">
            <span class="label-text">用户昵称</span>
          </label>
          <input 
            type="text" 
            placeholder="用户在平台上的昵称"
            class="input input-bordered"
            v-model="newPerson.nickname"
          />
        </div>

        <div class="form-control mb-4">
          <label class="label">
            <span class="label-text">印象</span>
          </label>
          <textarea 
            class="textarea textarea-bordered"
            placeholder="对用户的整体印象"
            v-model="newPerson.impression"
          ></textarea>
        </div>

        <div class="form-control mb-4">
          <label class="label">
            <span class="label-text">短期印象</span>
          </label>
          <textarea 
            class="textarea textarea-bordered"
            placeholder="最近的印象或状态"
            v-model="newPerson.short_impression"
          ></textarea>
        </div>

        <div class="form-control mb-4">
          <label class="label">
            <span class="label-text">积分</span>
          </label>
          <input 
            type="text" 
            placeholder="用户积分"
            class="input input-bordered"
            v-model="newPerson.points"
          />
        </div>

        <div class="modal-action">
          <button class="btn btn-ghost" @click="showCreateDialog = false">取消</button>
          <button class="btn btn-primary" @click="createPerson" :disabled="!isCreateFormValid">
            <Icon icon="mdi:plus" width="16" height="16" class="mr-1" />
            添加
          </button>
        </div>
      </div>
    </dialog>

    <!-- 交互更新对话框 -->
    <dialog :class="{ 'modal-open': showInteractionDialog }" class="modal">
      <div class="modal-box">
        <h3 class="font-bold text-lg mb-4">更新用户交互信息</h3>
        
        <div v-if="selectedPerson" class="mb-4">
          <div class="text-sm text-base-content/70">
            用户: {{ selectedPerson.person_name || selectedPerson.nickname || '未命名用户' }}
          </div>
        </div>

        <div class="form-control mb-4">
          <label class="label">
            <span class="label-text">更新印象</span>
          </label>
          <textarea 
            class="textarea textarea-bordered"
            placeholder="更新对用户的印象"
            v-model="interactionUpdate.impression_update"
          ></textarea>
        </div>

        <div class="form-control mb-4">
          <label class="label">
            <span class="label-text">更新短期印象</span>
          </label>
          <textarea 
            class="textarea textarea-bordered"
            placeholder="更新短期印象"
            v-model="interactionUpdate.short_impression_update"
          ></textarea>
        </div>

        <div class="form-control mb-4">
          <label class="label">
            <span class="label-text">更新积分</span>
          </label>
          <input 
            type="text" 
            placeholder="新的积分值"
            class="input input-bordered"
            v-model="interactionUpdate.points_update"
          />
        </div>

        <div class="modal-action">
          <button class="btn btn-ghost" @click="showInteractionDialog = false">取消</button>
          <button class="btn btn-primary" @click="submitInteractionUpdate">
            <Icon icon="mdi:check" width="16" height="16" class="mr-1" />
            更新
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
const persons = ref([]);
const totalCount = ref(0);
const currentPage = ref(1);
const pageSize = ref(20);
const searchQuery = ref('');
const showCreateDialog = ref(false);
const showInteractionDialog = ref(false);
const showStatsDialog = ref(false);
const selectedPerson = ref(null);

// 过滤器
const filters = ref({
  platform: '',
  hasPersonName: false
});

// 新用户数据
const newPerson = ref({
  person_id: '',
  platform: '',
  user_id: '',
  person_name: '',
  name_reason: '',
  nickname: '',
  impression: '',
  short_impression: '',
  points: ''
});

// 交互更新数据
const interactionUpdate = ref({
  impression_update: '',
  short_impression_update: '',
  points_update: ''
});

// 计算属性
const totalPages = computed(() => {
  return Math.ceil(totalCount.value / pageSize.value);
});

const isCreateFormValid = computed(() => {
  return newPerson.value.person_id && 
         newPerson.value.platform && 
         newPerson.value.user_id;
});

// 方法
const loadPersons = async () => {
  try {
    loading.value = true;
    
    const searchFilters = {};
      // 添加搜索条件
    if (searchQuery.value) {
      // 优先搜索用户名，如果用户希望搜索昵称，可以在UI中提供选项
      searchFilters.person_name_like = searchQuery.value;
    }
    
    if (filters.value.platform) {
      searchFilters.platform = filters.value.platform;
    }
    
    if (filters.value.hasPersonName) {
      searchFilters.has_person_name = true;
    }

    // 先获取总数（用于分页）
    const countResponse = await maibotResourceApi.person.getCount(props.instanceId, searchFilters);
    if (countResponse.status === 'success' && countResponse.data) {
      totalCount.value = countResponse.data.total_count || 0;
    } else {
      totalCount.value = 0;
    }

    // 再获取当前页的数据
    const response = await maibotResourceApi.person.getBatch(props.instanceId, {
      batchSize: pageSize.value,
      offset: (currentPage.value - 1) * pageSize.value,
      filters: searchFilters
    });

    if (response.status === 'success') {
      persons.value = response.data || [];
      
      // 更新统计信息
      emit('stats-updated', { total: totalCount.value });
    } else {
      throw new Error(response.message || '获取用户信息失败');
    }
  } catch (error) {
    console.error('加载用户信息失败:', error);
    toastService.show('加载用户信息失败', { type: 'error' });
  } finally {
    loading.value = false;
  }
};

const debouncedSearch = debounce(() => {
  currentPage.value = 1;
  loadPersons();
}, 500);

const goToPage = (page) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page;
    loadPersons();
  }
};

const selectPerson = (person) => {
  console.log('选中用户:', person);
  // 这里可以实现用户详情查看
};

const editPerson = (person) => {
  console.log('编辑用户:', person);
  // 实现编辑功能
};

const deletePerson = async (person) => {
  if (!confirm(`确定要删除用户 "${person.person_name || person.nickname}" 的信息吗？`)) {
    return;
  }

  try {
    const response = await maibotResourceApi.person.delete(props.instanceId, person.person_id);
    if (response.status === 'success') {
      toastService.show('用户信息删除成功', { type: 'success' });
      loadPersons();
    } else {
      throw new Error(response.message || '删除失败');
    }
  } catch (error) {
    console.error('删除用户信息失败:', error);
    toastService.show('删除用户信息失败', { type: 'error' });
  }
};

const updateInteraction = (person) => {
  selectedPerson.value = person;
  interactionUpdate.value = {
    impression_update: '',
    short_impression_update: '',
    points_update: ''
  };
  showInteractionDialog.value = true;
};

const submitInteractionUpdate = async () => {
  if (!selectedPerson.value) return;

  try {
    const response = await maibotResourceApi.person.updateInteraction(
      props.instanceId, 
      selectedPerson.value.person_id,
      interactionUpdate.value
    );
    
    if (response.status === 'success') {
      toastService.show('用户交互信息更新成功', { type: 'success' });
      showInteractionDialog.value = false;
      loadPersons();
    } else {
      throw new Error(response.message || '更新失败');
    }
  } catch (error) {
    console.error('更新用户交互信息失败:', error);
    toastService.show('更新用户交互信息失败', { type: 'error' });
  }
};

const createPerson = async () => {
  try {
    const personData = { ...newPerson.value };
    
    // 设置当前时间
    const currentTime = Date.now() / 1000;
    personData.know_times = currentTime;
    personData.know_since = currentTime;
    personData.last_know = currentTime;

    const response = await maibotResourceApi.person.create(props.instanceId, personData);
    if (response.status === 'success') {
      toastService.show('用户信息添加成功', { type: 'success' });
      showCreateDialog.value = false;
      resetCreateForm();
      loadPersons();
    } else {
      throw new Error(response.message || '添加失败');
    }
  } catch (error) {
    console.error('添加用户信息失败:', error);
    toastService.show('添加用户信息失败', { type: 'error' });
  }
};

const resetCreateForm = () => {
  newPerson.value = {
    person_id: '',
    platform: '',
    user_id: '',
    person_name: '',
    name_reason: '',
    nickname: '',
    impression: '',
    short_impression: '',
    points: ''
  };
};

const exportPersons = () => {
  console.log('导出用户数据');
  toastService.show('导出功能开发中...', { type: 'info' });
};

const getPlatformIcon = (platform) => {
  const icons = {
    qq: 'mdi:qqchat',
    wechat: 'mdi:wechat',
    telegram: 'mdi:telegram',
    discord: 'mdi:discord'
  };
  return icons[platform] || 'mdi:chat';
};

const truncateText = (text, maxLength) => {
  if (!text) return '';
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
};

const formatDate = (timestamp) => {
  if (!timestamp) return '未知';
  return new Date(timestamp * 1000).toLocaleString('zh-CN');
};

// 监听过滤器变化
watch(filters, () => {
  currentPage.value = 1;
  loadPersons();
}, { deep: true });

// 生命周期
onMounted(() => {
  loadPersons();
});
</script>

<style scoped>
.person-management {
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
  align-items: center;
}

.filters {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  align-items: center;
}

.actions {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
}

.person-list {
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

.persons-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1rem;
  padding: 1rem 0;
}

.person-card {
  border: 1px solid hsl(var(--b3));
  border-radius: 0.5rem;
  padding: 1rem;
  cursor: pointer;
  transition: all 0.2s;
  background-color: hsl(var(--b1));
}

.person-card:hover {
  border-color: hsl(var(--s));
  transform: translateY(-2px);
  box-shadow: 0 4px 12px hsl(var(--b3));
}

.person-header {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.person-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background-color: hsl(var(--b2));
  display: flex;
  align-items: center;
  justify-content: center;
  color: hsl(var(--bc) / 0.6);
}

.person-basic {
  flex: 1;
}

.person-name {
  font-weight: 600;
  margin-bottom: 0.25rem;
  color: hsl(var(--bc));
}

.person-platform {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.75rem;
  color: hsl(var(--bc) / 0.6);
}

.person-details {
  margin-bottom: 1rem;
}

.person-impression,
.person-short-impression,
.person-points {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: hsl(var(--bc) / 0.7);
  margin-bottom: 0.5rem;
}

.person-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px solid hsl(var(--b3));
  padding-top: 0.75rem;
}

.person-time {
  color: hsl(var(--bc) / 0.5);
}

.person-actions {
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
