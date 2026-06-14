import { Router, type Request, type Response } from 'express'
import db from '../db.js'

function parseUser(user: any): any {
  if (!user) return user
  return {
    ...user,
    allergens: typeof user.allergens === 'string' ? JSON.parse(user.allergens || '[]') : user.allergens || [],
  }
}

const router = Router()

router.post('/login', (req: Request, res: Response): void => {
  const { username, password } = req.body
  if (!username || !password) {
    res.status(400).json({ success: false, error: '用户名和密码不能为空' })
    return
  }
  const user = db.prepare('SELECT * FROM users WHERE username = ? AND password = ?').get(username, password) as any
  if (!user) {
    res.status(401).json({ success: false, error: '用户名或密码错误' })
    return
  }
  const { password: _, ...safeUser } = user
  res.json({ success: true, data: parseUser(safeUser) })
})

router.get('/:id', (req: Request, res: Response): void => {
  const user = db.prepare('SELECT id, username, name, avatar, allergens FROM users WHERE id = ?').get(req.params.id) as any
  if (!user) {
    res.status(404).json({ success: false, error: '用户不存在' })
    return
  }
  res.json({ success: true, data: parseUser(user) })
})

router.put('/:id', (req: Request, res: Response): void => {
  const { name, allergens } = req.body
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id) as any
  if (!user) {
    res.status(404).json({ success: false, error: '用户不存在' })
    return
  }
  const newName = name ?? user.name
  const newAllergens = allergens !== undefined ? (typeof allergens === 'string' ? allergens : JSON.stringify(allergens)) : user.allergens
  db.prepare('UPDATE users SET name = ?, allergens = ? WHERE id = ?').run(newName, newAllergens, req.params.id)
  const updated = db.prepare('SELECT id, username, name, avatar, allergens FROM users WHERE id = ?').get(req.params.id)
  res.json({ success: true, data: parseUser(updated) })
})

router.get('/:id/reviews', (req: Request, res: Response): void => {
  const reviews = db.prepare(
    `SELECT r.*, d.name as dish_name, d.price as dish_price FROM reviews r
     JOIN dishes d ON r.dish_id = d.id
     WHERE r.user_id = ?
     ORDER BY r.created_at DESC`
  ).all(req.params.id)
  res.json({ success: true, data: reviews })
})

router.post('/:id/favorites', (req: Request, res: Response): void => {
  const { dish_id } = req.body
  if (!dish_id) {
    res.status(400).json({ success: false, error: 'dish_id不能为空' })
    return
  }
  try {
    db.prepare('INSERT INTO favorites (user_id, dish_id) VALUES (?, ?)').run(Number(req.params.id), dish_id)
    res.json({ success: true, message: '收藏成功' })
  } catch (err: any) {
    if (err.message?.includes('UNIQUE')) {
      res.status(409).json({ success: false, error: '已收藏过该菜品' })
      return
    }
    throw err
  }
})

router.delete('/:id/favorites/:dishId', (req: Request, res: Response): void => {
  const result = db.prepare('DELETE FROM favorites WHERE user_id = ? AND dish_id = ?').run(Number(req.params.id), Number(req.params.dishId))
  if (result.changes === 0) {
    res.status(404).json({ success: false, error: '收藏记录不存在' })
    return
  }
  res.json({ success: true, message: '取消收藏成功' })
})

router.get('/:id/favorites', (req: Request, res: Response): void => {
  const favorites = db.prepare(
    `SELECT d.*, f.id as favorite_id FROM favorites f
     JOIN dishes d ON f.dish_id = d.id
     WHERE f.user_id = ?`
  ).all(req.params.id)
  res.json({ success: true, data: favorites })
})

router.put('/:id/allergens', (req: Request, res: Response): void => {
  const { allergens } = req.body
  if (!allergens) {
    res.status(400).json({ success: false, error: '过敏原不能为空' })
    return
  }
  const allergensStr = typeof allergens === 'string' ? allergens : JSON.stringify(allergens)
  db.prepare('UPDATE users SET allergens = ? WHERE id = ?').run(allergensStr, req.params.id)
  const updated = db.prepare('SELECT id, username, name, allergens FROM users WHERE id = ?').get(req.params.id)
  res.json({ success: true, data: updated })
})

router.get('/:id/consumption', (req: Request, res: Response): void => {
  const period = req.query.period as string || 'week'
  const userId = Number(req.params.id)
  let dateFilter: string
  if (period === 'month') {
    dateFilter = "date >= date('now', '-30 days')"
  } else {
    dateFilter = "date >= date('now', '-7 days')"
  }
  const stats = db.prepare(
    `SELECT
       COUNT(DISTINCT us.dish_id) as dish_count,
       SUM(d.calories) as total_calories,
       SUM(d.protein) as total_protein,
       SUM(d.carbs) as total_carbs,
       SUM(d.fat) as total_fat,
       SUM(d.price) as total_spent
     FROM user_selections us
     JOIN dishes d ON us.dish_id = d.id
     WHERE us.user_id = ? AND ${dateFilter}`
  ).get(userId) as any
  res.json({ success: true, data: stats })
})

router.get('/:id/tag-cloud', (req: Request, res: Response): void => {
  const userId = Number(req.params.id)
  const reviews = db.prepare(
    `SELECT d.tags, r.rating FROM reviews r
     JOIN dishes d ON r.dish_id = d.id
     WHERE r.user_id = ?`
  ).all(userId) as any[]

  const tagCount: Record<string, number> = {}
  for (const r of reviews) {
    const tags = JSON.parse(r.tags || '[]') as string[]
    const weight = r.rating / 5
    for (const t of tags) {
      tagCount[t] = (tagCount[t] || 0) + weight
    }
  }
  const result = Object.entries(tagCount)
    .map(([tag, count]) => ({ tag, count: Math.round(count * 100) / 100 }))
    .sort((a, b) => b.count - a.count)

  res.json({ success: true, data: result })
})

export default router
