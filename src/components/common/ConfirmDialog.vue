<template>
    <div>
        <!-- 可以通过编程方式控制这个对话框，或者将其转换为可重用组件 -->
        <input type="checkbox" id="confirm-modal" class="modal-toggle" v-model="isOpen" />
        <div class="modal" :class="{ 'modal-open': isOpen }">
            <div class="modal-box">
                <h3 class="font-bold text-lg">{{ title }}</h3>
                <p class="py-4">{{ message }}</p>
                <div class="modal-action">
                    <button class="btn btn-outline" @click="handleCancel">取消</button>
                    <button class="btn btn-primary" @click="handleConfirm">确认</button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, defineProps, defineEmits } from 'vue';

const props = defineProps({
    title: {
        type: String,
        default: '提示'
    },
    message: {
        type: String,
        required: true
    }
});

const emit = defineEmits(['confirm', 'cancel']);
const isOpen = ref(false);

const handleConfirm = () => {
    isOpen.value = false;
    emit('confirm');
};

const handleCancel = () => {
    isOpen.value = false;
    emit('cancel');
};

// 暴露方法供父组件调用
const open = () => {
    isOpen.value = true;
};

defineExpose({
    open
});
</script>
