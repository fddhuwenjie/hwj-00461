import { Router, type Request, type Response } from 'express'
import db from '../db.js'

const router = Router()

router.get('/today', (req: Request, res: Response): void => {
  const userId = Number(req.query.userId)
  const date = (req.query.date as string) || new Date().toISOString().slice(0, 10)

  if (!userId) {
    res.status(400).json({ success: false, error: 'userId参数必填' })
    return
  }

  const selections = db.prepare(
    `SELECT us.id as selection_id, us.dish_id, d.*
     FROM user_selections us
     JOIN dishes d ON us.dish_id = d.id
     WHERE us.user_id = ? AND us.date = ?
     ORDER BY us.id DESC`
  ).all(userId, date) as any[]

  const totals = selections.reduce(
    (acc, d) => {
      acc.calories += d.calories
      acc.protein += d.protein
      acc.carbs += d.carbs
      acc.fat += d.fat
      acc.price += d.price
      return acc
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0, price: 0 }
  )

  const DAILY_GOALS = {
    calories: 2000,
    protein: 60,
    carbs: 300,
    fat: 65,
  }

  const isOverCalories = totals.calories > DAILY_GOALS.calories

  res.json({
    success: true,
    data: {
      date,
      selections,
      totals: {
        calories: Math.round(totals.calories),
        protein: Math.round(totals.protein * 10) / 10,
        carbs: Math.round(totals.carbs * 10) / 10,
        fat: Math.round(totals.fat * 10) / 10,
        price: Math.round(totals.price * 100) / 100,
      },
      goals: DAILY_GOALS,
      is_over_calories: isOverCalories,
      dish_count: selections.length,
    },
  })
})

router.post('/select', (req: Request, res: Response): void => {
  const { userId, dishId, date } = req.body
  if (!userId || !dishId || !date) {
    res.status(400).json({ success: false, error: 'userId, dishId, date参数必填' })
    return
  }

  const dish = db.prepare('SELECT * FROM dishes WHERE id = ?').get(dishId)
  if (!dish) {
    res.status(404).json({ success: false, error: '菜品不存在' })
    return
  }

  try {
    const info = db.prepare(
      'INSERT INTO user_selections (user_id, dish_id, date) VALUES (?, ?, ?)'
    ).run(userId, dishId, date)
    res.json({ success: true, data: { id: info.lastInsertRowid } })
  } catch (err: any) {
    if (err.message?.includes('UNIQUE')) {
      res.status(409).json({ success: false, error: '今日已选择过该菜品' })
      return
    }
    throw err
  }
})

router.delete('/select/:id', (req: Request, res: Response): void => {
  const result = db.prepare('DELETE FROM user_selections WHERE id = ?').run(req.params.id)
  if (result.changes === 0) {
    res.status(404).json({ success: false, error: '选择记录不存在' })
    return
  }
  res.json({ success: true, message: '取消选择成功' })
})

export default router
