<template>
    <div class="tab-content">
        <h3>插件广场</h3>
        <p>功能正在开发中...</p>
    </div>
</template>

<script setup>
// 无需额外逻辑
</script>

<style scoped>
.tab-content {
    padding: 20px;
    margin: 20px;
    background-color: var(--el-bg-color);
    border-radius: 8px;
    box-shadow: var(--el-box-shadow-light);
    animation: fadeIn 0.5s ease;
}

@keyframes fadeIn {
    from {
        opacity: 0;
        transform: translateY(20px);
    }

    to {
        opacity: 1;
        transform: translateY(0);
    }
}

h3 {
    margin-top: 0;
    margin-bottom: 20px;
    font-size: 1.5rem;
    font-weight: 500;
    color: var(--el-text-color-primary);
}

p {
    color: var(--el-text-color-secondary);
}
</style>
