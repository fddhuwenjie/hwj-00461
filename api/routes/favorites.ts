import { Router, type Request, type Response } from 'express'
import db from '../db.js'

const router = Router()

router.get('/:userId', (req: Request, res: Response): void => {
  const favorites = db.prepare(
    `SELECT d.*, f.id as favorite_id FROM favorites f
     JOIN dishes d ON f.dish_id = d.id
     WHERE f.user_id = ?
     ORDER BY f.id DESC`
  ).all(req.params.userId)
  res.json({ success: true, data: favorites })
})

router.post('/', (req: Request, res: Response): void => {
  const { userId, dish_id, dishId } = req.body
  const uid = userId
  const did = dish_id || dishId
  if (!uid || !did) {
    res.status(400).json({ success: false, error: 'userId和dishId参数必填' })
    return
  }
  try {
    db.prepare('INSERT INTO favorites (user_id, dish_id) VALUES (?, ?)').run(uid, did)
    res.json({ success: true, message: '收藏成功' })
  } catch (err: any) {
    if (err.message?.includes('UNIQUE')) {
      res.status(409).json({ success: false, error: '已收藏过该菜品' })
      return
    }
    throw err
  }
})

router.delete('/:userId/:dishId', (req: Request, res: Response): void => {
  const result = db.prepare(
    'DELETE FROM favorites WHERE user_id = ? AND dish_id = ?'
  ).run(req.params.userId, req.params.dishId)
  if (result.changes === 0) {
    res.status(404).json({ success: false, error: '收藏记录不存在' })
    return
  }
  res.json({ success: true, message: '取消收藏成功' })
})

export default router
