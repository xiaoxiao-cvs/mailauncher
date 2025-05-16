<template>
    <i :class="iconClass"></i>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
    name: {
        type: String,
        required: true
    },
    size: {
        type: String,
        default: 'normal'
    }
});

const iconClass = computed(() => {
    return ['simple-icon', `icon-${props.name}`, `size-${props.size}`];
});
</script>

<style>
.simple-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1em;
    height: 1em;
    position: relative;
}

/* 尺寸变体 */
.simple-icon.size-small {
    font-size: 14px;
}

.simple-icon.size-normal {
    font-size: 18px;
}

.simple-icon.size-large {
    font-size: 24px;
}

/* 编辑图标(笔) */
.simple-icon.icon-edit {
    position: relative;
    display: inline-block;
    width: 1em;
    height: 1em;
}

.simple-icon.icon-edit::before {
    content: "";
    position: absolute;
    top: 0.1em;
    left: 0.1em;
    width: 0.6em;
    height: 0.6em;
    border: 0.1em solid currentColor;
    transform: rotate(45deg);
    border-radius: 0.05em;
}

.simple-icon.icon-edit::after {
    content: "";
    position: absolute;
    top: 0.65em;
    left: 0.1em;
    width: 0.3em;
    height: 0.3em;
    background-color: currentColor;
    transform: rotate(45deg);
}

/* 保存图标(纯色) */
.simple-icon.icon-save {
    position: relative;
    display: inline-block;
    width: 1em;
    height: 1em;
}

.simple-icon.icon-save::before {
    content: "";
    position: absolute;
    top: 0.15em;
    left: 0.15em;
    width: 0.7em;
    height: 0.7em;
    border: 0.1em solid currentColor;
    border-radius: 0.1em;
}

.simple-icon.icon-save::after {
    content: "";
    position: absolute;
    top: 0.3em;
    left: 0.3em;
    width: 0.4em;
    height: 0.25em;
    background-color: currentColor;
    border-radius: 0.05em;
}

/* 关闭图标(X) */
.simple-icon.icon-close {
    position: relative;
    display: inline-block;
    width: 1em;
    height: 1em;
}

.simple-icon.icon-close::before,
.simple-icon.icon-close::after {
    content: "";
    position: absolute;
    top: 50%;
    left: 50%;
    width: 0.8em;
    height: 0.1em;
    background-color: currentColor;
    border-radius: 0.05em;
}

.simple-icon.icon-close::before {
    transform: translate(-50%, -50%) rotate(45deg);
}

.simple-icon.icon-close::after {
    transform: translate(-50%, -50%) rotate(-45deg);
}

/* 其他常用图标 */
.simple-icon.icon-check::before {
    content: "\2713";
}

.simple-icon.icon-refresh::before {
    content: "\21BB";
}

.simple-icon.icon-search::before {
    content: "\1F50D";
}
</style>
