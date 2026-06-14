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

router.get('/', (_req: Request, res: Response): void => {
  const dishes = db.prepare('SELECT * FROM dishes ORDER BY id').all() as any[]
  res.json({ success: true, data: dishes.map(parseDish) })
})

router.get('/:id', (req: Request, res: Response): void => {
  const dish = db.prepare('SELECT * FROM dishes WHERE id = ?').get(req.params.id) as any
  if (!dish) {
    res.status(404).json({ success: false, error: '菜品不存在' })
    return
  }
  const reviews = db.prepare(
    `SELECT r.*, u.name as user_name FROM reviews r
     JOIN users u ON r.user_id = u.id
     WHERE r.dish_id = ?
     ORDER BY r.created_at DESC`
  ).all(req.params.id)
  const avgResult = db.prepare(
    'SELECT AVG(rating) as avg_score, COUNT(*) as review_count FROM reviews WHERE dish_id = ?'
  ).get(req.params.id) as any

  res.json({
    success: true,
    data: {
      ...parseDish(dish),
      avg_score: avgResult.avg_score ? Math.round(avgResult.avg_score * 10) / 10 : 0,
      review_count: avgResult.review_count,
      reviews,
    },
  })
})

export default router
