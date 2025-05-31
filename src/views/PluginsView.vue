<template>
    <div class="animated-page tab-content">
        <div class="animated-header">
            <h3>插件广场</h3>
            <p class="animated-text">功能正在开发中...</p>
        </div>

        <!-- 添加一些占位内容来展示动画效果 -->
        <div class="animated-grid coming-soon-content">
            <div class="animated-card feature-card">
                <div class="card-icon">
                    <i class="fas fa-puzzle-piece"></i>
                </div>
                <h4>插件系统</h4>
                <p>即将支持第三方插件扩展</p>
            </div>

            <div class="animated-card feature-card">
                <div class="card-icon">
                    <i class="fas fa-download"></i>
                </div>
                <h4>插件商店</h4>
                <p>一键安装各种实用插件</p>
            </div>

            <div class="animated-card feature-card">
                <div class="card-icon">
                    <i class="fas fa-cogs"></i>
                </div>
                <h4>自定义配置</h4>
                <p>灵活的插件配置管理</p>
            </div>
        </div>
    </div>
</template>

<script setup>
// 无需额外逻辑
</script>

<style scoped>
.tab-content {
    padding: 20px;
    margin: 20px;
    background-color: hsl(var(--b1));
    border-radius: 8px;
    box-shadow: var(--el-box-shadow-light);
}

/* 特色卡片样式 */
.coming-soon-content {
    margin-top: 40px;
}

.feature-card {
    text-align: center;
    padding: 30px 20px;
    background: linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(139, 92, 246, 0.1));
    border: 1px solid rgba(99, 102, 241, 0.2);
    position: relative;
    overflow: hidden;
}

.feature-card::before {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: linear-gradient(45deg, transparent, rgba(99, 102, 241, 0.1), transparent);
    transform: rotate(45deg);
    transition: all 0.6s ease;
    opacity: 0;
}

.feature-card:hover::before {
    animation: shimmer 1.5s ease-in-out infinite;
    opacity: 1;
}

@keyframes shimmer {
    0% {
        transform: translateX(-100%) translateY(-100%) rotate(45deg);
    }

    100% {
        transform: translateX(100%) translateY(100%) rotate(45deg);
    }
}

.card-icon {
    width: 60px;
    height: 60px;
    margin: 0 auto 20px;
    background: linear-gradient(135deg, #6366f1, #8b5cf6);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 24px;
    transition: all 0.3s ease;
    position: relative;
    z-index: 2;
}

.feature-card:hover .card-icon {
    transform: scale(1.1) rotateY(360deg);
    box-shadow: 0 10px 30px rgba(99, 102, 241, 0.4);
}

.feature-card h4 {
    margin: 0 0 10px 0;
    font-size: 1.2rem;
    font-weight: 600;
    color: var(--el-text-color-primary);
    position: relative;
    z-index: 2;
    transition: all 0.3s ease;
}

.feature-card:hover h4 {
    color: #6366f1;
    transform: translateY(-2px);
}

.feature-card p {
    margin: 0;
    color: var(--el-text-color-secondary);
    line-height: 1.6;
    position: relative;
    z-index: 2;
    transition: all 0.3s ease;
}

.feature-card:hover p {
    color: var(--el-text-color-primary);
}

/* 响应式动画优化 */
@media (prefers-reduced-motion: reduce) {

    .feature-card,
    .card-icon,
    .feature-card h4,
    .feature-card p {
        transition: none;
    }

    .feature-card::before {
        display: none;
    }

    .feature-card:hover .card-icon {
        transform: scale(1.05);
    }
}

/* 移动端优化 */
@media (max-width: 768px) {
    .feature-card {
        padding: 20px 15px;
    }

    .card-icon {
        width: 50px;
        height: 50px;
        font-size: 20px;
        margin-bottom: 15px;
    }

    .feature-card h4 {
        font-size: 1.1rem;
    }
}

/* 标题和文本样式增强 */
h3 {
    margin-top: 0;
    margin-bottom: 20px;
    font-size: 1.5rem;
    font-weight: 500;
    color: var(--el-text-color-primary);
}

.animated-text {
    color: var(--el-text-color-secondary);
    margin-bottom: 0;
}
</style>
