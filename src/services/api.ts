const BASE = '/api'

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  const data = await res.json().catch(() => ({ success: false, error: '请求失败' }))
  if (!res.ok || !data.success) {
    throw new Error(data.error || '请求失败')
  }
  return data.data as T
}

export const loginUser = (username: string, password: string) =>
  request<any>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  })

export const registerUser = (username: string, password: string, name: string) =>
  request<any>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, password, name }),
  })

export const getUser = (id: number) =>
  request<any>(`/users/${id}`)

export const updateUser = (id: number, data: any) =>
  request<any>(`/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })

export const getMenus = (date: string, meal: string) =>
  request<any[]>(`/menus?date=${date}&meal=${meal}`)

export const getMenuDates = () =>
  request<{ date: string }[]>('/menus/dates')

export const getDish = (id: number) =>
  request<any>(`/dishes/${id}`)

export const getDishes = () =>
  request<any[]>('/dishes')

export const getReviews = (dishId?: number, sort: string = 'latest') => {
  let url = '/reviews'
  const params = new URLSearchParams()
  if (dishId) params.set('dishId', String(dishId))
  if (sort) params.set('sort', sort)
  const query = params.toString()
  if (query) url += `?${query}`
  return request<any[]>(url)
}

export const createReview = (data: any) =>
  request<any>('/reviews', {
    method: 'POST',
    body: JSON.stringify(data),
  })

export const updateReview = (id: number, data: any) =>
  request<any>(`/reviews/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })

export const getUserReviews = (userId: number) =>
  request<any[]>(`/reviews/user/${userId}`)

export const getCollaborativeRecommend = (userId: number) =>
  request<any[]>(`/recommend/collaborative?userId=${userId}`)

export const getTagBasedRecommend = (userId: number) =>
  request<any[]>(`/recommend/tags?userId=${userId}`)

export const getTodayRecommend = (userId: number, date?: string, meal?: string) => {
  let url = `/recommend/today?userId=${userId}`
  if (date) url += `&date=${date}`
  if (meal) url += `&meal=${meal}`
  return request<any[]>(url)
}

export const getNutritionToday = (userId: number, date?: string) => {
  let url = `/nutrition/today?userId=${userId}`
  if (date) url += `&date=${date}`
  return request<any>(url)
}

export const selectDish = (data: any) =>
  request<any>('/nutrition/select', {
    method: 'POST',
    body: JSON.stringify(data),
  })

export const deselectDish = (id: number) =>
  request<any>(`/nutrition/select/${id}`, {
    method: 'DELETE',
  })

export const getTopDishes = () =>
  request<any[]>('/stats/top-dishes')

export const getWorstDishes = () =>
  request<any[]>('/stats/worst-dishes')

export const getPopularDishes = () =>
  request<any[]>('/stats/popular-dishes')

export const getWindowRatings = () =>
  request<any[]>('/stats/window-ratings')

export const getDailyCount = () =>
  request<any[]>('/stats/daily-count')

export const getIngredientFrequency = () =>
  request<any[]>('/stats/ingredient-frequency')

export const getWasteRatio = () =>
  request<any>('/stats/waste-ratio')

export const addFavorite = (userId: number, dishId: number) =>
  request<any>('/favorites', {
    method: 'POST',
    body: JSON.stringify({ userId, dishId }),
  })

export const removeFavorite = (userId: number, dishId: number) =>
  request<any>(`/favorites/${userId}/${dishId}`, {
    method: 'DELETE',
  })

export const getFavorites = (userId: number) =>
  request<any[]>(`/favorites/${userId}`)

export const setAllergens = (userId: number, allergens: string[]) =>
  request<any>(`/users/${userId}/allergens`, {
    method: 'PUT',
    body: JSON.stringify({ allergens }),
  })

export const getConsumption = (userId: number, period: string) =>
  request<any>(`/users/${userId}/consumption?period=${period}`)

export const getTagCloud = (userId: number) =>
  request<any[]>(`/users/${userId}/tag-cloud`)
