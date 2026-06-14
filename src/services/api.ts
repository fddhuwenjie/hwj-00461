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

export const getVotePool = (date: string) =>
  request<any[]>(`/votes/pool?date=${date}`)

export const getMyVotes = (userId: number, date: string) =>
  request<any[]>(`/votes/my-votes?userId=${userId}&date=${date}`)

export const submitVotes = (userId: number, date: string, votes: any[]) =>
  request<any>('/votes/vote', {
    method: 'POST',
    body: JSON.stringify({ userId, date, votes }),
  })

export const generateMenuFromVotes = (date: string, meal?: string, dishCount?: number) =>
  request<any>('/votes/generate-menu', {
    method: 'POST',
    body: JSON.stringify({ date, meal, dishCount }),
  })

export const createVotePool = (date: string, window_id: number, dish_ids: number[]) =>
  request<any>('/votes/pool', {
    method: 'POST',
    body: JSON.stringify({ date, window_id, dish_ids }),
  })

export const getPosts = (params?: { windowId?: number; dishId?: number; userId?: number; page?: number; limit?: number }) => {
  let url = '/posts'
  const query = new URLSearchParams()
  if (params?.windowId) query.set('windowId', String(params.windowId))
  if (params?.dishId) query.set('dishId', String(params.dishId))
  if (params?.userId) query.set('userId', String(params.userId))
  if (params?.page) query.set('page', String(params.page))
  if (params?.limit) query.set('limit', String(params.limit))
  const qs = query.toString()
  if (qs) url += `?${qs}`
  return request<any>(url)
}

export const getPost = (id: number) =>
  request<any>(`/posts/${id}`)

export const getPostComments = (id: number) =>
  request<any[]>(`/posts/${id}/comments`)

export const createPost = (data: { userId: number; content: string; photoUrls?: string[]; dishId?: number; windowId?: number }) =>
  request<any>('/posts', {
    method: 'POST',
    body: JSON.stringify(data),
  })

export const updatePost = (id: number, data: { userId: number; content: string; photoUrls?: string[] }) =>
  request<any>(`/posts/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })

export const deletePost = (id: number, userId: number) =>
  request<any>(`/posts/${id}`, {
    method: 'DELETE',
    body: JSON.stringify({ userId }),
  })

export const likePost = (id: number, userId: number) =>
  request<any>(`/posts/${id}/like`, {
    method: 'POST',
    body: JSON.stringify({ userId }),
  })

export const checkPostLiked = (id: number, userId: number) =>
  request<any>(`/posts/${id}/liked?userId=${userId}`)

export const commentPost = (id: number, userId: number, content: string) =>
  request<any>(`/posts/${id}/comment`, {
    method: 'POST',
    body: JSON.stringify({ userId, content }),
  })

export const deleteComment = (commentId: number, userId: number) =>
  request<any>(`/posts/comment/${commentId}`, {
    method: 'DELETE',
    body: JSON.stringify({ userId }),
  })

export const getPersonalWeeklyReport = (userId: number, date?: string) => {
  let url = `/weekly/personal?userId=${userId}`
  if (date) url += `&date=${date}`
  return request<any>(url)
}

export const getCanteenWeeklyReport = (date?: string) => {
  let url = '/weekly/canteen'
  if (date) url += `?date=${date}`
  return request<any>(url)
}

export const getWeeklyHistory = (userId?: number, type?: string) => {
  let url = '/weekly/history'
  const query = new URLSearchParams()
  if (userId) query.set('userId', String(userId))
  if (type) query.set('type', type)
  const qs = query.toString()
  if (qs) url += `?${qs}`
  return request<any[]>(url)
}

export const getWindows = () =>
  request<any[]>('/windows')
