import { Router, type Request, type Response } from 'express'
import db from '../db.js'

const router = Router()

router.get('/top-dishes', (_req: Request, res: Response): void => {
  const dishes = db.prepare(
    `SELECT d.*, AVG(r.rating) as avg_score, COUNT(r.id) as review_count
     FROM dishes d
     JOIN reviews r ON d.id = r.dish_id
     GROUP BY d.id
     HAVING review_count >= 2
     ORDER BY avg_score DESC, review_count DESC
     LIMIT 10`
  ).all() as any[]

  const result = dishes.map(d => ({
    ...d,
    avg_score: Math.round(d.avg_score * 10) / 10,
  }))

  res.json({ success: true, data: result })
})

router.get('/worst-dishes', (_req: Request, res: Response): void => {
  const dishes = db.prepare(
    `SELECT d.*, AVG(r.rating) as avg_score, COUNT(r.id) as review_count
     FROM dishes d
     JOIN reviews r ON d.id = r.dish_id
     GROUP BY d.id
     HAVING review_count >= 1
     ORDER BY avg_score ASC, review_count DESC
     LIMIT 10`
  ).all() as any[]

  const result = dishes.map(d => ({
    ...d,
    avg_score: Math.round(d.avg_score * 10) / 10,
  }))

  res.json({ success: true, data: result })
})

router.get('/popular-dishes', (_req: Request, res: Response): void => {
  const dishes = db.prepare(
    `SELECT d.*, COUNT(r.id) as review_count, AVG(r.rating) as avg_score
     FROM dishes d
     LEFT JOIN reviews r ON d.id = r.dish_id
     GROUP BY d.id
     ORDER BY review_count DESC, avg_score DESC
     LIMIT 10`
  ).all() as any[]

  const result = dishes.map(d => ({
    ...d,
    avg_score: d.avg_score ? Math.round(d.avg_score * 10) / 10 : 0,
  }))

  res.json({ success: true, data: result })
})

router.get('/window-ratings', (_req: Request, res: Response): void => {
  const windows = db.prepare(
    `SELECT w.id, w.name,
            AVG(r.rating) as avg_score,
            COUNT(DISTINCT r.id) as review_count,
            COUNT(DISTINCT d.id) as dish_count
     FROM windows w
     JOIN menus m ON w.id = m.window_id
     JOIN menu_dishes md ON m.id = md.menu_id
     JOIN dishes d ON md.dish_id = d.id
     LEFT JOIN reviews r ON d.id = r.dish_id
     GROUP BY w.id
     ORDER BY avg_score DESC`
  ).all() as any[]

  const result = windows.map(w => ({
    ...w,
    avg_score: w.avg_score ? Math.round(w.avg_score * 10) / 10 : 0,
  }))

  res.json({ success: true, data: result })
})

router.get('/daily-count', (_req: Request, res: Response): void => {
  const data = db.prepare(
    `SELECT date, COUNT(DISTINCT user_id) as diner_count, COUNT(*) as selection_count
     FROM user_selections
     GROUP BY date
     ORDER BY date DESC
     LIMIT 14`
  ).all()

  res.json({ success: true, data })
})

router.get('/ingredient-frequency', (_req: Request, res: Response): void => {
  const dishes = db.prepare('SELECT ingredients FROM dishes').all() as { ingredients: string }[]

  const ingredientCount: Record<string, number> = {}
  for (const d of dishes) {
    const parts = d.ingredients.split(/[\/、,，]/).map(s => s.trim())
    for (const p of parts) {
      if (p) {
        ingredientCount[p] = (ingredientCount[p] || 0) + 1
      }
    }
  }

  const result = Object.entries(ingredientCount)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20)

  res.json({ success: true, data: result })
})

router.get('/waste-ratio', (_req: Request, res: Response): void => {
  const total = db.prepare('SELECT COUNT(*) as total FROM dishes').get() as { total: number }
  const lowRated = db.prepare(
    `SELECT COUNT(*) as count
     FROM (
       SELECT d.id, AVG(r.rating) as avg_rating
       FROM dishes d
       JOIN reviews r ON d.id = r.dish_id
       GROUP BY d.id
       HAVING avg_rating < 3
     )`
  ).get() as { count: number }

  const totalReviewed = db.prepare(
    'SELECT COUNT(DISTINCT dish_id) as count FROM reviews'
  ).get() as { count: number }

  res.json({
    success: true,
    data: {
      total_dishes: total.total,
      reviewed_dishes: totalReviewed.count,
      low_rated_count: lowRated.count,
      waste_ratio: totalReviewed.count > 0
        ? Math.round((lowRated.count / totalReviewed.count) * 1000) / 10
        : 0,
    },
  })
})

export default router
