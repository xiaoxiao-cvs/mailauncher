import { ref } from 'vue'
import toastService from '@/services/toastService'
import { maibotConfigApi } from '@/services/maibotConfigApi'

export function useConfigLoader() {
  const createConfigLoader = (configType, apiMethod, configRef, originalRef, errorRef, loadingRef, changesRef) => {
    return async (instanceId) => {
      if (!instanceId) return
      
      // 防止重复请求
      if (loadingRef.value) {
        console.log(`${configType}配置正在加载中，跳过重复请求`)
        return
      }
      
      // 如果已经有配置数据，不重复加载
      if (configRef.value) {
        console.log(`${configType}配置已存在，跳过重复加载`)
        return
      }
      
      loadingRef.value = true
      errorRef.value = ''
      
      try {
        console.log(`开始加载${configType}配置:`, instanceId)
        const response = await apiMethod(instanceId)
        configRef.value = response.data
        originalRef.value = JSON.parse(JSON.stringify(response.data))
        changesRef.value = false
        console.log(`${configType}配置加载成功`)
      } catch (err) {
        console.error(`加载${configType}配置失败:`, err)
        errorRef.value = err.message || `加载${configType}配置失败`
        toastService.error(`加载${configType}配置失败: ` + errorRef.value)
      } finally {
        loadingRef.value = false
      }
    }
  }

  const createConfigSaver = (configType, apiMethod, configRef, originalRef, changesRef) => {
    return async (instanceId) => {
      if (!changesRef.value || !configRef.value) return false
      
      try {
        await apiMethod(instanceId, configRef.value)
        originalRef.value = JSON.parse(JSON.stringify(configRef.value))
        changesRef.value = false
        return true
      } catch (err) {
        console.error(`保存${configType}配置失败:`, err)
        throw err
      }
    }
  }

  const createConfigResetter = (configRef, originalRef, changesRef) => {
    return () => {
      if (changesRef.value && originalRef.value) {
        configRef.value = JSON.parse(JSON.stringify(originalRef.value))
        changesRef.value = false
        return true
      }
      return false
    }
  }

  return {
    createConfigLoader,
    createConfigSaver,
    createConfigResetter
  }
}
