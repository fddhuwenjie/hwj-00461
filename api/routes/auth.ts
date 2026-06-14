import { Router, type Request, type Response } from 'express'
import db from '../db.js'

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
  safeUser.allergens = JSON.parse(safeUser.allergens || '[]')
  res.json({ success: true, data: safeUser })
})

router.post('/register', (req: Request, res: Response): void => {
  const { username, password, name } = req.body
  if (!username || !password || !name) {
    res.status(400).json({ success: false, error: '参数不完整' })
    return
  }
  try {
    const info = db.prepare(
      'INSERT INTO users (username, password, name, allergens) VALUES (?, ?, ?, ?)'
    ).run(username, password, name, '[]')
    const user = db.prepare('SELECT id, username, name, avatar, allergens FROM users WHERE id = ?').get(info.lastInsertRowid) as any
    user.allergens = JSON.parse(user.allergens || '[]')
    res.json({ success: true, data: user })
  } catch (err: any) {
    if (err.message?.includes('UNIQUE')) {
      res.status(409).json({ success: false, error: '用户名已存在' })
      return
    }
    throw err
  }
})

router.post('/logout', (_req: Request, res: Response): void => {
  res.json({ success: true, message: '退出成功' })
})

export default router
