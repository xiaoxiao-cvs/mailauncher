import { ref, computed } from 'vue'

export function useConfigSearch() {
  const searchQuery = ref('')
  const searchResults = ref([])
  const filteredSections = ref([])

  const clearSearch = () => {
    searchQuery.value = ''
    searchResults.value = []
    filteredSections.value = []
  }

  const highlightText = (text, query) => {
    if (!text || !query) return text
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
    return text.replace(regex, '<mark class="search-highlight">$1</mark>')
  }

  const getMatchTypeName = (matchType) => {
    const typeNames = {
      'key': '字段名',
      'label': '标签', 
      'description': '描述',
      'value': '值',
      'section': '组名'
    }
    return typeNames[matchType] || '匹配'
  }

  const searchInValue = (value, query) => {
    if (typeof value === 'string') {
      return value.toLowerCase().includes(query)
    } else if (typeof value === 'number') {
      return value.toString().includes(query)
    } else if (Array.isArray(value)) {
      return value.some(item => 
        typeof item === 'string' && item.toLowerCase().includes(query)
      )
    } else if (typeof value === 'boolean') {
      return query === 'true' || query === 'false' || query === '真' || query === '假'
    }
    return false
  }

  const searchInSections = (query, configSections, getFieldLabel, getFieldDescription) => {
    const results = []
    const filtered = []
    const lowerQuery = query.toLowerCase()
    
    configSections.forEach(section => {
      const matchedFields = []
      
      // 检查节标题是否匹配
      const sectionTitleMatch = section.title.toLowerCase().includes(lowerQuery)
      
      // 搜索节中的字段
      if (section.data) {
        for (const [key, value] of Object.entries(section.data)) {
          const fieldLabel = getFieldLabel(key).toLowerCase()
          const fieldDescription = getFieldDescription(key, section.key).toLowerCase()
          
          // 模糊匹配：字段名、标签、描述、值
          const keyMatch = key.toLowerCase().includes(lowerQuery)
          const labelMatch = fieldLabel.includes(lowerQuery)
          const descMatch = fieldDescription.includes(lowerQuery)
          const valueMatch = searchInValue(value, lowerQuery)
          
          if (keyMatch || labelMatch || descMatch || valueMatch) {
            matchedFields.push({
              key,
              value,
              label: getFieldLabel(key),
              description: getFieldDescription(key, section.key),
              matchType: keyMatch ? 'key' : labelMatch ? 'label' : descMatch ? 'description' : 'value'
            })
            
            results.push({
              section: section.title,
              field: getFieldLabel(key),
              key: key,
              value: value,
              path: `${section.key}.${key}`,
              matchType: keyMatch ? 'key' : labelMatch ? 'label' : descMatch ? 'description' : 'value'
            })
          }
        }
      }
      
      // 如果节标题匹配或有字段匹配，则添加到过滤结果中
      if (sectionTitleMatch || matchedFields.length > 0) {
        filtered.push({
          ...section,
          matchedFields: sectionTitleMatch ? Object.entries(section.data || {}).map(([key, value]) => ({
            key,
            value,
            label: getFieldLabel(key),
            description: getFieldDescription(key, section.key),
            matchType: 'section'
          })) : matchedFields,
          titleMatched: sectionTitleMatch
        })
      }
    })
    
    return { results, filtered }
  }

  const handleSearch = (configSections, getFieldLabel, getFieldDescription) => {
    if (!searchQuery.value.trim()) {
      filteredSections.value = []
      searchResults.value = []
      return
    }
    
    const { results, filtered } = searchInSections(
      searchQuery.value, 
      configSections, 
      getFieldLabel, 
      getFieldDescription
    )
    
    searchResults.value = results
    filteredSections.value = filtered
  }

  const hasSearchResults = computed(() => {
    return searchQuery.value.trim() && filteredSections.value.length > 0
  })

  const displaySections = computed(() => {
    return (configSections) => {
      return searchQuery.value.trim() ? filteredSections.value : configSections
    }
  })

  return {
    searchQuery,
    searchResults,
    filteredSections,
    hasSearchResults,
    displaySections,
    clearSearch,
    highlightText,
    getMatchTypeName,
    handleSearch
  }
}
