import { Router, type Request, type Response } from 'express'
import db from '../db.js'

function parseDish(dish: any): any {
  if (!dish) return dish
  return {
    ...dish,
    tags: typeof dish.tags === 'string' ? JSON.parse(dish.tags || '[]') : dish.tags || [],
    ingredients: dish.ingredients || '',
  }
}

const router = Router()

function cosineSimilarity(vecA: Record<number, number>, vecB: Record<number, number>): number {
  let dotProduct = 0
  let normA = 0
  let normB = 0
  for (const dishId in vecA) {
    const id = Number(dishId)
    normA += vecA[id] * vecA[id]
    if (vecB[id] !== undefined) {
      dotProduct += vecA[id] * vecB[id]
    }
  }
  for (const dishId in vecB) {
    const id = Number(dishId)
    normB += vecB[id] * vecB[id]
  }
  if (normA === 0 || normB === 0) return 0
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
}

router.get('/collaborative', (req: Request, res: Response): void => {
  const userId = Number(req.query.userId)
  if (!userId) {
    res.status(400).json({ success: false, error: 'userId参数必填' })
    return
  }

  const allReviews = db.prepare(
    'SELECT user_id, dish_id, rating FROM reviews'
  ).all() as any[]

  const userVectors: Record<number, Record<number, number>> = {}
  for (const r of allReviews) {
    if (!userVectors[r.user_id]) userVectors[r.user_id] = {}
    userVectors[r.user_id][r.dish_id] = r.rating
  }

  const targetVector = userVectors[userId] || {}
  if (Object.keys(targetVector).length === 0) {
    res.json({ success: true, data: [] })
    return
  }

  const similarities: { userId: number; similarity: number }[] = []
  for (const uid in userVectors) {
    const id = Number(uid)
    if (id === userId) continue
    const sim = cosineSimilarity(targetVector, userVectors[id])
    if (sim > 0) {
      similarities.push({ userId: id, similarity: sim })
    }
  }
  similarities.sort((a, b) => b.similarity - a.similarity)
  const topSimilar = similarities.slice(0, 5)

  const scoredDishes: Record<number, { score: number; count: number }> = {}
  for (const sim of topSimilar) {
    const simUserVector = userVectors[sim.userId]
    for (const dishId in simUserVector) {
      const id = Number(dishId)
      if (targetVector[id] !== undefined) continue
      if (simUserVector[id] >= 4) {
        if (!scoredDishes[id]) scoredDishes[id] = { score: 0, count: 0 }
        scoredDishes[id].score += simUserVector[id] * sim.similarity
        scoredDishes[id].count += 1
      }
    }
  }

  const dishIds = Object.entries(scoredDishes)
    .sort((a, b) => b[1].score - a[1].score)
    .slice(0, 10)
    .map(([id]) => Number(id))

  if (dishIds.length === 0) {
    res.json({ success: true, data: [] })
    return
  }

  const placeholders = dishIds.map(() => '?').join(',')
  const dishes = db.prepare(
    `SELECT d.*, AVG(r.rating) as avg_score, COUNT(r.id) as review_count
     FROM dishes d
     LEFT JOIN reviews r ON d.id = r.dish_id
     WHERE d.id IN (${placeholders})
     GROUP BY d.id`
  ).all(...dishIds) as any[]

  const dishMap: Record<number, any> = {}
  for (const d of dishes) {
    dishMap[d.id] = { ...parseDish(d), avg_score: d.avg_score ? Math.round(d.avg_score * 10) / 10 : 0 }
  }

  const result = dishIds.map(id => dishMap[id]).filter(Boolean)
  res.json({ success: true, data: result })
})

router.get('/tags', (req: Request, res: Response): void => {
  const userId = Number(req.query.userId)
  if (!userId) {
    res.status(400).json({ success: false, error: 'userId参数必填' })
    return
  }

  const userReviews = db.prepare(
    `SELECT d.tags, r.rating FROM reviews r
     JOIN dishes d ON r.dish_id = d.id
     WHERE r.user_id = ?`
  ).all(userId) as any[]

  const tagScores: Record<string, { total: number; count: number }> = {}
  for (const r of userReviews) {
    const tags = JSON.parse(r.tags || '[]') as string[]
    for (const tag of tags) {
      if (!tagScores[tag]) tagScores[tag] = { total: 0, count: 0 }
      tagScores[tag].total += r.rating
      tagScores[tag].count += 1
    }
  }

  const topTags = Object.entries(tagScores)
    .map(([tag, s]) => ({ tag, avg: s.total / s.count }))
    .filter(t => t.avg >= 3.5)
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 5)

  if (topTags.length === 0) {
    res.json({ success: true, data: [] })
    return
  }

  const reviewedDishIds = db.prepare(
    'SELECT dish_id FROM reviews WHERE user_id = ?'
  ).all(userId).map((r: any) => r.dish_id)

  const allDishes = db.prepare('SELECT * FROM dishes').all() as any[]
  const scoredDishes = allDishes
    .filter(d => !reviewedDishIds.includes(d.id))
    .map(d => {
      const tags = JSON.parse(d.tags || '[]') as string[]
      let score = 0
      for (const tt of topTags) {
        if (tags.includes(tt.tag)) {
          score += tt.avg
        }
      }
      return { dish: d, score }
    })
    .filter(d => d.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)

  const result = scoredDishes.map(sd => {
    const avgResult = db.prepare(
      'SELECT AVG(rating) as avg_score, COUNT(*) as review_count FROM reviews WHERE dish_id = ?'
    ).get(sd.dish.id) as any
    return {
      ...parseDish(sd.dish),
      avg_score: avgResult.avg_score ? Math.round(avgResult.avg_score * 10) / 10 : 0,
      review_count: avgResult.review_count || 0,
    }
  })

  res.json({ success: true, data: result })
})

router.get('/today', (req: Request, res: Response): void => {
  const userId = Number(req.query.userId)
  const date = (req.query.date as string) || new Date().toISOString().slice(0, 10)
  const meal = (req.query.meal as string) || '午餐'

  if (!userId) {
    res.status(400).json({ success: false, error: 'userId参数必填' })
    return
  }

  const userReviews = db.prepare(
    `SELECT d.tags, r.rating FROM reviews r
     JOIN dishes d ON r.dish_id = d.id
     WHERE r.user_id = ?`
  ).all(userId) as any[]

  const tagScores: Record<string, { total: number; count: number }> = {}
  for (const r of userReviews) {
    const tags = JSON.parse(r.tags || '[]') as string[]
    for (const tag of tags) {
      if (!tagScores[tag]) tagScores[tag] = { total: 0, count: 0 }
      tagScores[tag].total += r.rating
      tagScores[tag].count += 1
    }
  }

  const topTags = Object.entries(tagScores)
    .map(([tag, s]) => ({ tag, avg: s.total / s.count }))
    .filter(t => t.avg >= 3.5)
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 5)

  const menus = db.prepare(
    `SELECT md.dish_id, d.*
     FROM menus m
     JOIN menu_dishes md ON m.id = md.menu_id
     JOIN dishes d ON md.dish_id = d.id
     WHERE m.date = ? AND m.meal = ?
     ORDER BY m.window_id`
  ).all(date, meal) as any[]

  if (menus.length === 0) {
    res.json({ success: true, data: [] })
    return
  }

  const reviewedDishIds = db.prepare(
    'SELECT dish_id FROM reviews WHERE user_id = ?'
  ).all(userId).map((r: any) => r.dish_id)

  const scoredDishes = menus.map(d => {
    const tags = JSON.parse(d.tags || '[]') as string[]
    let score = 0
    for (const tt of topTags) {
      if (tags.includes(tt.tag)) {
        score += tt.avg
      }
    }
    const isNew = !reviewedDishIds.includes(d.id)
    if (isNew) score += 0.5
    return { dish: d, score }
  })

  scoredDishes.sort((a, b) => b.score - a.score)

  const result = scoredDishes.slice(0, 6).map(sd => {
    const avgResult = db.prepare(
      'SELECT AVG(rating) as avg_score, COUNT(*) as review_count FROM reviews WHERE dish_id = ?'
    ).get(sd.dish.id) as any
    return {
      ...parseDish(sd.dish),
      avg_score: avgResult.avg_score ? Math.round(avgResult.avg_score * 10) / 10 : 0,
      review_count: avgResult.review_count || 0,
      match_score: Math.round(sd.score * 10) / 10,
    }
  })

  res.json({ success: true, data: result })
})

export default router
