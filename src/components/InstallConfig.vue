<template>
    <!-- ...existing template code... -->
</template>

<script>
import { ref } from "vue";
import axios from "axios";
import { handleApiError } from "@/utils/vue-utils"; // 导入通用错误处理函数

export default {
    setup() {
        const selectedVersion = ref("");
        const instanceName = ref("");

        const deploy = async () => {
            try {
                const response = await axios.post("/api/deploy", {
                    version: selectedVersion.value,
                    instance_name: instanceName.value,
                });
                console.log("部署成功:", response.data);
                ElMessage.success("部署任务已启动");
            } catch (error) {
                handleApiError(error); // 使用通用错误处理函数
            }
        };

        return {
            selectedVersion,
            instanceName,
            deploy,
        };
    },
};
</script>

<style scoped>
/* ...existing style code... */
</style>