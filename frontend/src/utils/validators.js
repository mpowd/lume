
export const validateAssistantForm = (formData) => {
  if (!formData.assistant_name) {
    return 'Please enter a assistant name'
  }
}

export const validateCollectionForm = (formData) => {
  if (!formData.collection_name) {
    return 'Please enter a collection name'
  }
  return null
}

export const validateDatasetForm = (qaPairs) => {
  const validPairs = qaPairs.filter(pair => 
    pair.question.trim() && pair.ground_truth.trim()
  )
  
  if (validPairs.length === 0) {
    return 'Please add at least one question-answer pair'
  }
  return null
}

export const validateUrl = (url) => {
  if (!url) return false
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}