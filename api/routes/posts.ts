import { Router, type Request, type Response } from 'express'
import db from '../db.js'

const router = Router()

function parsePost(post: any): any {
  if (!post) return post
  return {
    ...post,
    photo_urls: typeof post.photo_urls === 'string' ? JSON.parse(post.photo_urls || '[]') : post.photo_urls || [],
    tags: typeof post.tags === 'string' ? JSON.parse(post.tags || '[]') : post.tags || [],
  }
}

router.get('/', (req: Request, res: Response): void => {
  const { windowId, dishId, userId, page = 1, limit = 20 } = req.query
  const offset = (Number(page) - 1) * Number(limit)

  let sql = `
    SELECT p.*, 
           u.name as user_name, u.avatar as user_avatar,
           d.name as dish_name, w.name as window_name,
           COUNT(DISTINCT pl.id) as like_count,
           COUNT(DISTINCT pc.id) as comment_count
    FROM posts p
    JOIN users u ON p.user_id = u.id
    LEFT JOIN dishes d ON p.dish_id = d.id
    LEFT JOIN windows w ON p.window_id = w.id
    LEFT JOIN post_likes pl ON p.id = pl.post_id
    LEFT JOIN post_comments pc ON p.id = pc.post_id
    WHERE 1=1
  `
  const params: any[] = []
  if (windowId) {
    sql += ' AND p.window_id = ?'
    params.push(windowId)
  }
  if (dishId) {
    sql += ' AND p.dish_id = ?'
    params.push(dishId)
  }
  if (userId) {
    sql += ' AND p.user_id = ?'
    params.push(userId)
  }
  sql += ' GROUP BY p.id ORDER BY p.created_at DESC LIMIT ? OFFSET ?'
  params.push(Number(limit), offset)

  const posts = db.prepare(sql).all(...params) as any[]
  const result = posts.map(p => parsePost(p))

  let countSql = 'SELECT COUNT(*) as total FROM posts WHERE 1=1'
  const countParams: any[] = []
  if (windowId) { countParams.push(windowId); countSql += ' AND window_id = ?' }
  if (dishId) { countParams.push(dishId); countSql += ' AND dish_id = ?' }
  if (userId) { countParams.push(userId); countSql += ' AND user_id = ?' }
  const total = db.prepare(countSql).get(...countParams) as { total: number }

  res.json({ success: true, data: { list: result, total: total.total, page: Number(page), limit: Number(limit) } })
})

router.get('/:id', (req: Request, res: Response): void => {
  const { id } = req.params
  const post = db.prepare(
    `SELECT p.*, 
            u.name as user_name, u.avatar as user_avatar,
            d.name as dish_name, w.name as window_name,
            COUNT(DISTINCT pl.id) as like_count,
            COUNT(DISTINCT pc.id) as comment_count
     FROM posts p
     JOIN users u ON p.user_id = u.id
     LEFT JOIN dishes d ON p.dish_id = d.id
     LEFT JOIN windows w ON p.window_id = w.id
     LEFT JOIN post_likes pl ON p.id = pl.post_id
     LEFT JOIN post_comments pc ON p.id = pc.post_id
     WHERE p.id = ?
     GROUP BY p.id`
  ).get(id) as any

  if (!post) {
    res.status(404).json({ success: false, error: '动态不存在' })
    return
  }

  const result = parsePost(post)
  res.json({ success: true, data: result })
})

router.get('/:id/comments', (req: Request, res: Response): void => {
  const { id } = req.params
  const comments = db.prepare(
    `SELECT pc.*, u.name as user_name, u.avatar as user_avatar
     FROM post_comments pc
     JOIN users u ON pc.user_id = u.id
     WHERE pc.post_id = ?
     ORDER BY pc.created_at DESC`
  ).all(id) as any[]

  res.json({ success: true, data: comments })
})

router.post('/', (req: Request, res: Response): void => {
  const { userId, content, photoUrls = [], dishId = null, windowId = null } = req.body
  if (!userId || !content?.trim()) {
    res.status(400).json({ success: false, error: '用户ID和内容必填' })
    return
  }
  if (photoUrls.length > 3) {
    res.status(400).json({ success: false, error: '最多只能上传3张照片' })
    return
  }

  const info = db.prepare(
    'INSERT INTO posts (user_id, content, photo_urls, dish_id, window_id) VALUES (?, ?, ?, ?, ?)'
  ).run(userId, content.trim(), JSON.stringify(photoUrls), dishId, windowId)

  const postId = info.lastInsertRowid as number
  const post = db.prepare(
    `SELECT p.*, u.name as user_name, u.avatar as user_avatar,
            d.name as dish_name, w.name as window_name
     FROM posts p
     JOIN users u ON p.user_id = u.id
     LEFT JOIN dishes d ON p.dish_id = d.id
     LEFT JOIN windows w ON p.window_id = w.id
     WHERE p.id = ?`
  ).get(postId) as any

  res.json({ success: true, data: parsePost(post) })
})

router.put('/:id', (req: Request, res: Response): void => {
  const { id } = req.params
  const { userId, content, photoUrls } = req.body
  if (!userId || !content?.trim()) {
    res.status(400).json({ success: false, error: '参数不完整' })
    return
  }

  const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(id) as any
  if (!post) {
    res.status(404).json({ success: false, error: '动态不存在' })
    return
  }
  if (post.user_id !== userId) {
    res.status(403).json({ success: false, error: '无权限修改' })
    return
  }

  const photoUrlsStr = photoUrls ? JSON.stringify(photoUrls.slice(0, 3)) : post.photo_urls
  db.prepare(
    'UPDATE posts SET content = ?, photo_urls = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
  ).run(content.trim(), photoUrlsStr, id)

  res.json({ success: true, message: '更新成功' })
})

router.delete('/:id', (req: Request, res: Response): void => {
  const { id } = req.params
  const { userId } = req.body
  if (!userId) {
    res.status(400).json({ success: false, error: 'userId必填' })
    return
  }

  const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(id) as any
  if (!post) {
    res.status(404).json({ success: false, error: '动态不存在' })
    return
  }
  if (post.user_id !== userId) {
    res.status(403).json({ success: false, error: '无权限删除' })
    return
  }

  db.prepare('DELETE FROM posts WHERE id = ?').run(id)
  res.json({ success: true, message: '删除成功' })
})

router.post('/:id/like', (req: Request, res: Response): void => {
  const { id } = req.params
  const { userId } = req.body
  if (!userId) {
    res.status(400).json({ success: false, error: 'userId必填' })
    return
  }

  try {
    db.prepare('INSERT INTO post_likes (user_id, post_id) VALUES (?, ?)').run(userId, id)
    res.json({ success: true, message: '点赞成功' })
  } catch (err: any) {
    if (err.message?.includes('UNIQUE')) {
      db.prepare('DELETE FROM post_likes WHERE user_id = ? AND post_id = ?').run(userId, id)
      res.json({ success: true, message: '取消点赞' })
    } else {
      res.status(500).json({ success: false, error: '操作失败' })
    }
  }
})

router.get('/:id/liked', (req: Request, res: Response): void => {
  const { id } = req.params
  const { userId } = req.query
  if (!userId) {
    res.status(400).json({ success: false, error: 'userId必填' })
    return
  }
  const liked = db.prepare(
    'SELECT 1 FROM post_likes WHERE user_id = ? AND post_id = ?'
  ).get(userId, id)
  res.json({ success: true, data: { liked: !!liked } })
})

router.post('/:id/comment', (req: Request, res: Response): void => {
  const { id } = req.params
  const { userId, content } = req.body
  if (!userId || !content?.trim()) {
    res.status(400).json({ success: false, error: '参数不完整' })
    return
  }

  const info = db.prepare(
    'INSERT INTO post_comments (user_id, post_id, content) VALUES (?, ?, ?)'
  ).run(userId, id, content.trim())

  const comment = db.prepare(
    `SELECT pc.*, u.name as user_name, u.avatar as user_avatar
     FROM post_comments pc
     JOIN users u ON pc.user_id = u.id
     WHERE pc.id = ?`
  ).get(info.lastInsertRowid) as any

  res.json({ success: true, data: comment })
})

router.delete('/comment/:commentId', (req: Request, res: Response): void => {
  const { commentId } = req.params
  const { userId } = req.body
  if (!userId) {
    res.status(400).json({ success: false, error: 'userId必填' })
    return
  }

  const comment = db.prepare('SELECT * FROM post_comments WHERE id = ?').get(commentId) as any
  if (!comment) {
    res.status(404).json({ success: false, error: '评论不存在' })
    return
  }
  if (comment.user_id !== userId) {
    res.status(403).json({ success: false, error: '无权限删除' })
    return
  }

  db.prepare('DELETE FROM post_comments WHERE id = ?').run(commentId)
  res.json({ success: true, message: '删除成功' })
})

export default router
