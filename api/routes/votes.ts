import { Router, type Request, type Response } from 'express'
import db from '../db.js'

const router = Router()

function parseDish(dish: any): any {
  if (!dish) return dish
  return {
    ...dish,
    tags: typeof dish.tags === 'string' ? JSON.parse(dish.tags || '[]') : dish.tags || [],
  }
}

router.get('/pool', (req: Request, res: Response): void => {
  const { date } = req.query
  if (!date) {
    res.status(400).json({ success: false, error: 'date参数必填' })
    return
  }
  const pools = db.prepare(
    `SELECT vp.id as pool_id, vp.date, vp.window_id, vp.dish_id, w.name as window_name,
            d.name as dish_name, d.price, d.calories, d.tags
     FROM vote_pools vp
     JOIN windows w ON vp.window_id = w.id
     JOIN dishes d ON vp.dish_id = d.id
     WHERE vp.date = ?
     ORDER BY vp.window_id, vp.id`
  ).all(date) as any[]

  const windowMap = new Map<number, any>()
  for (const p of pools) {
    const voteCount = db.prepare(
      'SELECT COUNT(*) as count FROM votes WHERE vote_pool_id = ?'
    ).get(p.pool_id) as { count: number }
    
    if (!windowMap.has(p.window_id)) {
      windowMap.set(p.window_id, {
        window_id: p.window_id,
        window_name: p.window_name,
        date: p.date,
        dishes: [],
      })
    }
    const windowData = windowMap.get(p.window_id)
    windowData.dishes.push({
      pool_id: p.pool_id,
      dish_id: p.dish_id,
      dish_name: p.dish_name,
      price: p.price,
      calories: p.calories,
      tags: parseDish(p).tags,
      vote_count: voteCount.count,
    })
  }

  res.json({ success: true, data: Array.from(windowMap.values()) })
})

router.get('/my-votes', (req: Request, res: Response): void => {
  const { userId, date } = req.query
  if (!userId || !date) {
    res.status(400).json({ success: false, error: 'userId和date参数必填' })
    return
  }
  const votes = db.prepare(
    `SELECT v.id, v.vote_pool_id, v.window_id, v.dish_id, v.created_at
     FROM votes v
     WHERE v.user_id = ? AND v.date = ?`
  ).all(userId, date) as any[]

  res.json({ success: true, data: votes })
})

router.post('/vote', (req: Request, res: Response): void => {
  const { userId, date, votes } = req.body
  if (!userId || !date || !votes?.length) {
    res.status(400).json({ success: false, error: '参数不完整' })
    return
  }

  const windowVotes = new Map<number, number[]>()
  for (const v of votes) {
    const list = windowVotes.get(v.window_id) || []
    list.push(v)
    windowVotes.set(v.window_id, list)
  }

  for (const [windowId, windowVoteList] of windowVotes) {
    if (windowVoteList.length > 2) {
      res.status(400).json({ success: false, error: `窗口${windowId}最多只能投2票` })
      return
    }
  }

  const insertVote = db.prepare(
    'INSERT OR IGNORE INTO votes (user_id, vote_pool_id, date, window_id, dish_id) VALUES (?, ?, ?, ?, ?)'
  )
  const deleteVote = db.prepare(
    'DELETE FROM votes WHERE user_id = ? AND date = ? AND window_id = ?'
  )

  const tx = db.transaction(() => {
    for (const [windowId] of windowVotes) {
      deleteVote.run(userId, date, windowId)
    }
    for (const v of votes) {
      insertVote.run(userId, v.vote_pool_id, date, v.window_id, v.dish_id)
    }
  })

  try {
    tx()
    res.json({ success: true, message: '投票成功' })
  } catch (err) {
    res.status(500).json({ success: false, error: '投票失败' })
  }
})

router.post('/generate-menu', (req: Request, res: Response): void => {
  const { date, meal = '午餐', dishCount = 4 } = req.body
  if (!date) {
    res.status(400).json({ success: false, error: 'date参数必填' })
    return
  }

  const windows = db.prepare('SELECT id, name FROM windows ORDER BY id').all() as any[]
  const results: any[] = []

  const tx = db.transaction(() => {
    for (const win of windows) {
      const topDishes = db.prepare(
        `SELECT vp.dish_id, COUNT(v.id) as vote_count
         FROM vote_pools vp
         LEFT JOIN votes v ON vp.id = v.vote_pool_id
         WHERE vp.date = ? AND vp.window_id = ?
         GROUP BY vp.id
         ORDER BY vote_count DESC, vp.id
         LIMIT ?`
      ).all(date, win.id, dishCount) as any[]

      if (topDishes.length > 0) {
        const dishIds = topDishes.map(d => d.dish_id)
        const menuInfo = db.prepare(
          'INSERT INTO menus (date, meal, window_id) VALUES (?, ?, ?)'
        ).run(date, meal, win.id)
        const menuId = menuInfo.lastInsertRowid as number
        
        const insertMD = db.prepare('INSERT INTO menu_dishes (menu_id, dish_id) VALUES (?, ?)')
        for (const dishId of dishIds) {
          insertMD.run(menuId, dishId)
        }

        results.push({
          window_id: win.id,
          window_name: win.name,
          menu_id: menuId,
          dishes: topDishes,
        })
      }
    }
  })

  try {
    tx()
    res.json({ success: true, data: results, message: '菜单生成成功' })
  } catch (err: any) {
    if (err.message?.includes('UNIQUE')) {
      res.status(409).json({ success: false, error: '该日期菜单已存在' })
    } else {
      res.status(500).json({ success: false, error: '菜单生成失败' })
    }
  }
})

router.post('/pool', (req: Request, res: Response): void => {
  const { date, window_id, dish_ids } = req.body
  if (!date || !window_id || !dish_ids?.length) {
    res.status(400).json({ success: false, error: '参数不完整' })
    return
  }
  if (dish_ids.length < 8 || dish_ids.length > 10) {
    res.status(400).json({ success: false, error: '每个窗口候选菜品数量必须在8-10道之间' })
    return
  }

  const insertVP = db.prepare(
    'INSERT OR IGNORE INTO vote_pools (date, window_id, dish_id) VALUES (?, ?, ?)'
  )
  const tx = db.transaction(() => {
    for (const dishId of dish_ids) {
      insertVP.run(date, window_id, dishId)
    }
  })

  try {
    tx()
    res.json({ success: true, message: '投票池创建成功' })
  } catch (err) {
    res.status(500).json({ success: false, error: '投票池创建失败' })
  }
})

router.delete('/pool', (req: Request, res: Response): void => {
  const { date, window_id } = req.query
  if (!date || !window_id) {
    res.status(400).json({ success: false, error: 'date和window_id参数必填' })
    return
  }
  db.prepare('DELETE FROM vote_pools WHERE date = ? AND window_id = ?').run(date, window_id)
  res.json({ success: true, message: '投票池已清空' })
})

export default router
