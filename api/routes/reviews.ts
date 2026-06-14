import { Router, type Request, type Response } from 'express'
import db from '../db.js'

const router = Router()

router.get('/', (req: Request, res: Response): void => {
  const { dish_id, dishId, user_id, userId, sort } = req.query
  const dish = dish_id || dishId
  const user = user_id || userId
  let sql = `SELECT r.*, u.name as user_name, d.name as dish_name FROM reviews r
             JOIN users u ON r.user_id = u.id
             JOIN dishes d ON r.dish_id = d.id`
  const params: any[] = []
  const conditions: string[] = []
  if (dish) {
    conditions.push('r.dish_id = ?')
    params.push(dish)
  }
  if (user) {
    conditions.push('r.user_id = ?')
    params.push(user)
  }
  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ')
  }
  if (sort === 'highest') {
    sql += ' ORDER BY r.rating DESC, r.created_at DESC'
  } else if (sort === 'lowest') {
    sql += ' ORDER BY r.rating ASC, r.created_at DESC'
  } else {
    sql += ' ORDER BY r.created_at DESC'
  }
  const reviews = db.prepare(sql).all(...params)
  res.json({ success: true, data: reviews })
})

router.get('/user/:userId', (req: Request, res: Response): void => {
  const reviews = db.prepare(
    `SELECT r.*, d.name as dish_name, d.price as dish_price, d.tags as dish_tags
     FROM reviews r
     JOIN dishes d ON r.dish_id = d.id
     WHERE r.user_id = ?
     ORDER BY r.created_at DESC`
  ).all(req.params.userId)
  res.json({ success: true, data: reviews })
})

router.post('/', (req: Request, res: Response): void => {
  const { user_id, dish_id, rating, comment, photo_url } = req.body
  if (!user_id || !dish_id || !rating) {
    res.status(400).json({ success: false, error: 'user_id, dish_id, rating必填' })
    return
  }
  if (rating < 1 || rating > 5) {
    res.status(400).json({ success: false, error: '评分必须在1-5之间' })
    return
  }
  try {
    const info = db.prepare(
      `INSERT INTO reviews (user_id, dish_id, rating, comment, photo_url)
       VALUES (?, ?, ?, ?, ?)`
    ).run(user_id, dish_id, rating, comment || '', photo_url || '')
    res.json({ success: true, data: { id: info.lastInsertRowid } })
  } catch (err: any) {
    if (err.message?.includes('UNIQUE')) {
      res.status(409).json({ success: false, error: '每个用户只能对同一菜品评价一次' })
      return
    }
    throw err
  }
})

router.put('/:id', (req: Request, res: Response): void => {
  const { rating, comment, photo_url } = req.body
  const existing = db.prepare('SELECT * FROM reviews WHERE id = ?').get(req.params.id) as any
  if (!existing) {
    res.status(404).json({ success: false, error: '评价不存在' })
    return
  }
  if (rating !== undefined && (rating < 1 || rating > 5)) {
    res.status(400).json({ success: false, error: '评分必须在1-5之间' })
    return
  }
  db.prepare(
    `UPDATE reviews SET
       rating = COALESCE(?, rating),
       comment = COALESCE(?, comment),
       photo_url = COALESCE(?, photo_url),
       updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`
  ).run(
    rating ?? null,
    comment ?? null,
    photo_url ?? null,
    req.params.id,
  )
  const updated = db.prepare('SELECT * FROM reviews WHERE id = ?').get(req.params.id)
  res.json({ success: true, data: updated })
})

export default router
