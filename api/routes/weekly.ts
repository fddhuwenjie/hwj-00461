import { Router, type Request, type Response } from 'express'
import db from '../db.js'

const router = Router()

function parseJson(str: string): any {
  try {
    return JSON.parse(str)
  } catch {
    return []
  }
}

function getWeekRange(dateStr?: string): { weekStart: string; weekEnd: string; prevWeekStart: string; prevWeekEnd: string } {
  let date = dateStr ? new Date(dateStr) : new Date()
  const day = date.getDay()
  const diff = day === 0 ? 6 : day - 1
  const monday = new Date(date)
  monday.setDate(date.getDate() - diff)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  const prevMonday = new Date(monday)
  prevMonday.setDate(monday.getDate() - 7)
  const prevSunday = new Date(sunday)
  prevSunday.setDate(sunday.getDate() - 7)
  
  return {
    weekStart: monday.toISOString().slice(0, 10),
    weekEnd: sunday.toISOString().slice(0, 10),
    prevWeekStart: prevMonday.toISOString().slice(0, 10),
    prevWeekEnd: prevSunday.toISOString().slice(0, 10),
  }
}

router.get('/personal', (req: Request, res: Response): void => {
  const { userId, date } = req.query
  if (!userId) {
    res.status(400).json({ success: false, error: 'userId参数必填' })
    return
  }

  const { weekStart, weekEnd, prevWeekStart, prevWeekEnd } = getWeekRange(date as string)

  const selections = db.prepare(
    `SELECT us.date, d.*
     FROM user_selections us
     JOIN dishes d ON us.dish_id = d.id
     WHERE us.user_id = ? AND us.date BETWEEN ? AND ?
     ORDER BY us.date`
  ).all(userId, weekStart, weekEnd) as any[]

  const dailyStats: Record<string, { calories: number; count: number; spent: number }> = {}
  const dates = []
  let current = new Date(weekStart)
  while (current <= new Date(weekEnd)) {
    const dateStr = current.toISOString().slice(0, 10)
    dates.push(dateStr)
    dailyStats[dateStr] = { calories: 0, count: 0, spent: 0 }
    current.setDate(current.getDate() + 1)
  }

  let totalSpent = 0
  let totalCalories = 0
  let totalProtein = 0
  let totalCarbs = 0
  let totalFat = 0
  const windowCount: Record<string, number> = {}
  const tagCount: Record<string, number> = {}

  for (const s of selections) {
    const day = s.date
    dailyStats[day].calories += s.calories
    dailyStats[day].count += 1
    dailyStats[day].spent += s.price
    totalSpent += s.price
    totalCalories += s.calories
    totalProtein += s.protein || 0
    totalCarbs += s.carbs || 0
    totalFat += s.fat || 0

    const tags = parseJson(s.tags)
    for (const tag of tags) {
      tagCount[tag] = (tagCount[tag] || 0) + 1
    }
  }

  const windowSelections = db.prepare(
    `SELECT w.name as window_name, COUNT(*) as count
     FROM user_selections us
     JOIN dishes d ON us.dish_id = d.id
     JOIN menu_dishes md ON d.id = md.dish_id
     JOIN menus m ON md.menu_id = m.id
     JOIN windows w ON m.window_id = w.id
     WHERE us.user_id = ? AND us.date BETWEEN ? AND ?
     GROUP BY w.id
     ORDER BY count DESC`
  ).all(userId, weekStart, weekEnd) as any[]

  const favoriteWindow = windowSelections[0]?.window_name || '暂无'

  const prevSelections = db.prepare(
    `SELECT d.tags
     FROM user_selections us
     JOIN dishes d ON us.dish_id = d.id
     WHERE us.user_id = ? AND us.date BETWEEN ? AND ?`
  ).all(userId, prevWeekStart, prevWeekEnd) as any[]

  const prevTagCount: Record<string, number> = {}
  for (const s of prevSelections) {
    const tags = parseJson(s.tags)
    for (const tag of tags) {
      prevTagCount[tag] = (prevTagCount[tag] || 0) + 1
    }
  }

  const allTags = new Set([...Object.keys(tagCount), ...Object.keys(prevTagCount)])
  const tagChanges: { tag: string; current: number; previous: number; change: number }[] = []
  for (const tag of allTags) {
    const current = tagCount[tag] || 0
    const previous = prevTagCount[tag] || 0
    tagChanges.push({ tag, current, previous, change: current - previous })
  }
  tagChanges.sort((a, b) => b.change - a.change)

  const dailyTrend = dates.map(d => ({
    date: d,
    calories: dailyStats[d].calories,
    count: dailyStats[d].count,
    spent: dailyStats[d].spent,
  }))

  const avgDailyCalories = dates.length > 0 ? Math.round(totalCalories / dates.length) : 0

  const report = {
    weekStart,
    weekEnd,
    totalSpent: Math.round(totalSpent * 100) / 100,
    totalCalories,
    avgDailyCalories,
    totalProtein: Math.round(totalProtein * 10) / 10,
    totalCarbs: Math.round(totalCarbs * 10) / 10,
    totalFat: Math.round(totalFat * 10) / 10,
    dishCount: selections.length,
    favoriteWindow,
    windowStats: windowSelections,
    dailyTrend,
    tagChanges,
    topTags: Object.entries(tagCount)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10),
  }

  res.json({ success: true, data: report })
})

router.get('/canteen', (req: Request, res: Response): void => {
  const { date } = req.query
  const { weekStart, weekEnd } = getWeekRange(date as string)

  const dishRatings = db.prepare(
    `SELECT d.id, d.name, w.name as window_name,
            AVG(r.rating) as avg_rating, COUNT(r.id) as review_count
     FROM dishes d
     LEFT JOIN reviews r ON d.id = r.dish_id
     LEFT JOIN menu_dishes md ON d.id = md.dish_id
     LEFT JOIN menus m ON md.menu_id = m.id
     LEFT JOIN windows w ON m.window_id = w.id
     WHERE r.created_at BETWEEN ? AND ?
     GROUP BY d.id
     HAVING review_count >= 1
     ORDER BY avg_rating DESC, review_count DESC`
  ).all(`${weekStart} 00:00:00`, `${weekEnd} 23:59:59`) as any[]

  const bestDishes = dishRatings.slice(0, 5).map(d => ({
    ...d,
    avg_rating: Math.round(d.avg_rating * 10) / 10,
  }))
  const worstDishes = [...dishRatings]
    .sort((a, b) => a.avg_rating - b.avg_rating)
    .slice(0, 5)
    .map(d => ({
      ...d,
      avg_rating: Math.round(d.avg_rating * 10) / 10,
    }))

  const windowTraffic = db.prepare(
    `SELECT w.id, w.name,
            COUNT(DISTINCT us.user_id) as diner_count,
            COUNT(*) as selection_count
     FROM windows w
     JOIN menus m ON w.id = m.window_id
     JOIN menu_dishes md ON m.id = md.menu_id
     LEFT JOIN user_selections us ON md.dish_id = us.dish_id AND us.date = m.date
     WHERE m.date BETWEEN ? AND ?
     GROUP BY w.id
     ORDER BY diner_count DESC`
  ).all(weekStart, weekEnd) as any[]

  const dailyTraffic = db.prepare(
    `SELECT m.date,
            COUNT(DISTINCT us.user_id) as diner_count,
            COUNT(*) as selection_count
     FROM menus m
     LEFT JOIN user_selections us ON m.date = us.date
     WHERE m.date BETWEEN ? AND ?
     GROUP BY m.date
     ORDER BY m.date`
  ).all(weekStart, weekEnd) as any[]

  const ingredientCount: Record<string, number> = {}
  const ingredientCost: Record<string, number> = {}
  const popularDishes = db.prepare(
    `SELECT d.id, d.name, d.ingredients, d.price,
            COUNT(us.id) as selection_count
     FROM dishes d
     LEFT JOIN user_selections us ON d.id = us.dish_id
     WHERE us.date BETWEEN ? AND ?
     GROUP BY d.id
     ORDER BY selection_count DESC
     LIMIT 20`
  ).all(weekStart, weekEnd) as any[]

  for (const d of popularDishes) {
    const ingredients = d.ingredients.split(/[\/、,，]/).map((s: string) => s.trim())
    for (const ing of ingredients) {
      if (ing) {
        ingredientCount[ing] = (ingredientCount[ing] || 0) + d.selection_count
        ingredientCost[ing] = (ingredientCost[ing] || 0) + d.selection_count * (d.price * 0.4)
      }
    }
  }

  const ingredientHeatmap = Object.entries(ingredientCount)
    .map(([name, count]) => ({
      name,
      count,
      cost: Math.round((ingredientCost[name] || 0) * 100) / 100,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15)

  const report = {
    weekStart,
    weekEnd,
    bestDishes,
    worstDishes,
    windowTraffic,
    dailyTraffic,
    ingredientHeatmap,
    totalDiners: windowTraffic.reduce((sum: number, w: any) => sum + w.diner_count, 0),
    totalSelections: windowTraffic.reduce((sum: number, w: any) => sum + w.selection_count, 0),
    totalRevenue: Math.round(
      popularDishes.reduce((sum: number, d: any) => sum + d.selection_count * d.price, 0) * 100
    ) / 100,
  }

  res.json({ success: true, data: report })
})

router.get('/history', (req: Request, res: Response): void => {
  const { userId, type = 'personal' } = req.query
  
  const sql = type === 'personal' && userId
    ? 'SELECT week_start, week_end, created_at FROM weekly_reports WHERE user_id = ? AND report_type = ? ORDER BY week_start DESC LIMIT 12'
    : 'SELECT week_start, week_end, created_at FROM weekly_reports WHERE user_id IS NULL AND report_type = ? ORDER BY week_start DESC LIMIT 12'
  
  const params = type === 'personal' && userId ? [userId, type] : [type]
  const reports = db.prepare(sql).all(...params) as any[]

  if (reports.length === 0) {
    const dates: string[] = []
    const now = new Date('2026-06-19')
    for (let i = 0; i < 12; i++) {
      const d = new Date(now)
      d.setDate(now.getDate() - i * 7)
      dates.push(d.toISOString().slice(0, 10))
    }
    const history = dates.map(d => {
      const { weekStart, weekEnd } = getWeekRange(d)
      return { week_start: weekStart, week_end: weekEnd }
    }).filter((r, i, arr) => 
      arr.findIndex(x => x.week_start === r.week_start) === i
    ).slice(0, 12)
    res.json({ success: true, data: history })
    return
  }

  res.json({ success: true, data: reports })
})

export default router
