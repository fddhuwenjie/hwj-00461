import { Router, type Request, type Response } from 'express'
import db from '../db.js'

const router = Router()

router.get('/', (_req: Request, res: Response): void => {
  const windows = db.prepare('SELECT * FROM windows ORDER BY id').all()
  res.json({ success: true, data: windows })
})

export default router
