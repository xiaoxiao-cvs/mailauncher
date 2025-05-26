<template>
    <div class="instance-card" @click="emit('view', instance)">
        <div class="instance-info">
            <div class="instance-name">{{ instance.name }}</div>
            <div class="instance-status" :class="`status-${instance.status}`">
                {{ instance.status === 'running' ? '运行中' : '已停止' }}
            </div>
        </div>

        <div class="instance-actions-new">
            <div class="action-group">
                <button class="btn btn-sm btn-square rounded-md action-btn"
                    :class="instance.status === 'running' ? 'btn-error' : 'btn-success'"
                    @click.stop="emit('toggle', instance)">
                    <Icon :icon="instance.status === 'running' ? 'mdi:stop' : 'mdi:play'" />
                </button>
                <button class="btn btn-sm btn-square btn-ghost rounded-md action-btn"
                    @click.stop="emit('open-path', instance)">
                    <Icon icon="mdi:folder-outline" />
                </button>
                <button class="btn btn-sm btn-square btn-ghost rounded-md action-btn"
                    @click.stop="emit('configure', instance)">
                    <Icon icon="mdi:cog-outline" />
                </button>
            </div>
        </div>
    </div>
</template>

<script setup>
const props = defineProps({
    instance: {
        type: Object,
        required: true
    }
});

const emit = defineEmits(['view', 'toggle', 'open-path', 'configure']);

</script>

<style scoped>
.instance-card {
    @apply flex justify-between items-center p-4 bg-white rounded-lg shadow-md mb-4 cursor-pointer;
}

.instance-info {
    @apply flex-1 mr-4;
}

.instance-name {
    @apply text-lg font-semibold;
}

.instance-status {
    @apply text-sm;
}

.status-running {
    @apply text-green-500;
}

.status-stopped {
    @apply text-red-500;
}

.instance-actions-new {
    @apply flex;
}

.action-group {
    @apply flex;
}

.action-btn {
    @apply h-8 w-8 flex items-center justify-center rounded-md;
}

.btn-success {
    @apply bg-green-500 text-white;
}

.btn-error {
    @apply bg-red-500 text-white;
}

.btn-ghost {
    @apply bg-transparent text-gray-500;
}
</style>