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

router.get('/', (req: Request, res: Response): void => {
  const { date, meal } = req.query
  if (!date || !meal) {
    res.status(400).json({ success: false, error: 'date和meal参数必填' })
    return
  }
  const menus = db.prepare(
    `SELECT m.id as menu_id, m.date, m.meal, m.window_id, w.name as window_name
     FROM menus m
     JOIN windows w ON m.window_id = w.id
     WHERE m.date = ? AND m.meal = ?
     ORDER BY m.window_id`
  ).all(date, meal) as any[]

  const result = menus.map(menu => {
    const dishes = db.prepare(
      `SELECT d.*, 
              COALESCE(AVG(r.rating), 0) as avg_score,
              COUNT(r.id) as review_count
       FROM dishes d
       JOIN menu_dishes md ON d.id = md.dish_id
       LEFT JOIN reviews r ON d.id = r.dish_id
       WHERE md.menu_id = ?
       GROUP BY d.id`
    ).all(menu.menu_id) as any[]
    return {
      menu_id: menu.menu_id,
      date: menu.date,
      meal: menu.meal,
      window_id: menu.window_id,
      window_name: menu.window_name,
      dishes: dishes.map(d => ({
        ...parseDish(d),
        avg_score: d.avg_score ? Math.round(d.avg_score * 10) / 10 : 0,
        review_count: d.review_count || 0,
      })),
    }
  })
  res.json({ success: true, data: result })
})

router.post('/', (req: Request, res: Response): void => {
  const { date, meal, window_id, dish_ids } = req.body
  if (!date || !meal || !window_id || !dish_ids?.length) {
    res.status(400).json({ success: false, error: '参数不完整' })
    return
  }
  const info = db.prepare('INSERT INTO menus (date, meal, window_id) VALUES (?, ?, ?)').run(date, meal, window_id)
  const menuId = info.lastInsertRowid as number
  const insertMD = db.prepare('INSERT INTO menu_dishes (menu_id, dish_id) VALUES (?, ?)')
  for (const dishId of dish_ids) {
    insertMD.run(menuId, dishId)
  }
  res.json({ success: true, data: { menu_id: menuId } })
})

router.get('/dates', (_req: Request, res: Response): void => {
  const dates = db.prepare(
    'SELECT DISTINCT date FROM menus ORDER BY date'
  ).all()
  res.json({ success: true, data: dates })
})

export default router
