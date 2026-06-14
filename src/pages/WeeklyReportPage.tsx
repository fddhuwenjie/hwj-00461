import { useState, useEffect } from 'react'
import {
  Calendar, TrendingUp, TrendingDown, Users, Utensils,
  DollarSign, Flame, BarChart3, ChevronLeft, ChevronRight,
  Award, AlertTriangle, MapPin
} from 'lucide-react'
import useAppStore from '@/store'
import {
  getPersonalWeeklyReport, getCanteenWeeklyReport,
  getWeeklyHistory
} from '@/services/api'

type ReportType = 'personal' | 'canteen'

export default function WeeklyReportPage() {
  const { currentUser } = useAppStore()
  const [reportType, setReportType] = useState<ReportType>('personal')
  const [personalReport, setPersonalReport] = useState<any>(null)
  const [canteenReport, setCanteenReport] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState('2026-06-15')
  const [history, setHistory] = useState<any[]>([])
  const [historyIndex, setHistoryIndex] = useState(0)

  useEffect(() => {
    loadReport()
  }, [reportType, selectedDate, currentUser])

  useEffect(() => {
    loadHistory()
  }, [reportType, currentUser])

  const loadHistory = async () => {
    try {
      const data = await getWeeklyHistory(
        reportType === 'personal' ? currentUser?.id : undefined,
        reportType
      )
      setHistory(data || [])
      if (data && data.length > 0) {
        setSelectedDate(data[0].week_start)
      }
    } catch {}
  }

  const loadReport = async () => {
    if (reportType === 'personal' && !currentUser) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      if (reportType === 'personal' && currentUser) {
        const data = await getPersonalWeeklyReport(currentUser.id, selectedDate)
        setPersonalReport(data)
      } else if (reportType === 'canteen') {
        const data = await getCanteenWeeklyReport(selectedDate)
        setCanteenReport(data)
      }
    } catch {
    } finally {
      setLoading(false)
    }
  }

  const handlePrevWeek = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1
      setHistoryIndex(newIndex)
      setSelectedDate(history[newIndex].week_start)
    }
  }

  const handleNextWeek = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1
      setHistoryIndex(newIndex)
      setSelectedDate(history[newIndex].week_start)
    }
  }

  const getDateLabel = () => {
    if (reportType === 'personal' && personalReport) {
      return `${personalReport.weekStart?.slice(5)} ~ ${personalReport.weekEnd?.slice(5)}`
    }
    if (reportType === 'canteen' && canteenReport) {
      return `${canteenReport.weekStart?.slice(5)} ~ ${canteenReport.weekEnd?.slice(5)}`
    }
    return ''
  }

  const renderPersonalReport = () => {
    if (!personalReport) return null

    const maxCalories = Math.max(...(personalReport.dailyTrend || []).map((d: any) => d.calories), 1)
    const maxSpent = Math.max(...(personalReport.dailyTrend || []).map((d: any) => d.spent), 1)

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-card p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <DollarSign size={20} className="text-primary" />
              </div>
              <span className="text-brown-lighter text-sm">本周消费</span>
            </div>
            <div className="text-2xl font-bold text-brown">¥{personalReport.totalSpent?.toFixed?.(2) || personalReport.totalSpent || '0.00'}</div>
          </div>
          <div className="bg-white rounded-card p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-amber/10 flex items-center justify-center">
                <Flame size={20} className="text-amber" />
              </div>
              <span className="text-brown-lighter text-sm">日均热量</span>
            </div>
            <div className="text-2xl font-bold text-brown">{personalReport.avgDailyCalories || 0} kcal</div>
          </div>
          <div className="bg-white rounded-card p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
                <Utensils size={20} className="text-success" />
              </div>
              <span className="text-brown-lighter text-sm">最常去窗口</span>
            </div>
            <div className="text-xl font-bold text-brown">{personalReport.favoriteWindow || '暂无'}</div>
          </div>
          <div className="bg-white rounded-card p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                <BarChart3 size={20} className="text-blue-500" />
              </div>
              <span className="text-brown-lighter text-sm">菜品数量</span>
            </div>
            <div className="text-2xl font-bold text-brown">{personalReport.dishCount || 0} 道</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-card p-5">
            <h3 className="font-semibold text-brown mb-4 flex items-center gap-2">
              <TrendingUp size={18} className="text-primary" />
              日均热量摄入趋势
            </h3>
            <div className="h-64 flex items-end gap-2">
              {(personalReport.dailyTrend || []).map((day: any, idx: number) => {
                const height = maxCalories > 0 ? (day.calories / maxCalories) * 100 : 0
                const dayName = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'][idx] || ''
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                    <div className="w-full flex flex-col items-center gap-1">
                      <span className="text-xs text-brown-lighter">{day.calories}</span>
                      <div
                        className="w-full bg-gradient-to-t from-primary to-primary/60 rounded-t transition-all"
                        style={{ height: `${Math.max(height, 2)}%` }}
                      />
                    </div>
                    <span className="text-xs text-brown-lighter">{dayName}</span>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="bg-white rounded-card p-5">
            <h3 className="font-semibold text-brown mb-4 flex items-center gap-2">
              <BarChart3 size={18} className="text-amber" />
              营养摄入统计
            </h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-brown-lighter">蛋白质</span>
                  <span className="font-medium text-brown">{personalReport.totalProtein?.toFixed?.(1) || personalReport.totalProtein || 0}g</span>
                </div>
                <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-success rounded-full" style={{ width: `${Math.min((personalReport.totalProtein / 500) * 100, 100)}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-brown-lighter">碳水化合物</span>
                  <span className="font-medium text-brown">{personalReport.totalCarbs?.toFixed?.(1) || personalReport.totalCarbs || 0}g</span>
                </div>
                <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min((personalReport.totalCarbs / 2000) * 100, 100)}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-brown-lighter">脂肪</span>
                  <span className="font-medium text-brown">{personalReport.totalFat?.toFixed?.(1) || personalReport.totalFat || 0}g</span>
                </div>
                <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-purple-500 rounded-full" style={{ width: `${Math.min((personalReport.totalFat / 500) * 100, 100)}%` }} />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-card p-5">
            <h3 className="font-semibold text-brown mb-4 flex items-center gap-2">
              <MapPin size={18} className="text-primary" />
              窗口偏好统计
            </h3>
            {(personalReport.windowStats?.length || 0) === 0 ? (
              <div className="text-center py-8 text-brown-lighter">暂无数据</div>
            ) : (
              <div className="space-y-3">
                {(personalReport.windowStats || []).map((w: any, idx: number) => (
                  <div key={idx} className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-brown/10 flex items-center justify-center text-xs font-bold text-brown">
                      {idx + 1}
                    </span>
                    <span className="flex-1 text-brown">{w.window_name}</span>
                    <span className="text-brown-lighter text-sm">{w.count} 次</span>
                    <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{ width: `${(w.count / Math.max(...(personalReport.windowStats || []).map((x: any) => x.count), 1)) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-card p-5">
            <h3 className="font-semibold text-brown mb-4 flex items-center gap-2">
              <BarChart3 size={18} className="text-amber" />
              口味变化对比上周
            </h3>
            {(personalReport.tagChanges?.length || 0) === 0 ? (
              <div className="text-center py-8 text-brown-lighter">暂无数据</div>
            ) : (
              <div className="space-y-2">
                {(personalReport.tagChanges || []).slice(0, 8).map((tc: any, idx: number) => (
                  <div key={idx} className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0">
                    <span className="w-6 h-6 rounded-full bg-brown/10 flex items-center justify-center text-xs font-bold text-brown">
                      {idx + 1}
                    </span>
                    <span className="flex-1 text-brown">{tc.tag}</span>
                    <div className="flex items-center gap-1">
                      <span className="text-sm text-brown-lighter">
                        {tc.previous} → {tc.current}
                      </span>
                      {tc.change > 0 ? (
                        <TrendingUp size={14} className="text-success" />
                      ) : tc.change < 0 ? (
                        <TrendingDown size={14} className="text-danger" />
                      ) : null}
                      <span className={`text-sm font-medium ${
                        tc.change > 0 ? 'text-success' : tc.change < 0 ? 'text-danger' : 'text-brown-lighter'
                      }`}>
                        {tc.change > 0 ? '+' : ''}{tc.change}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-card p-5">
          <h3 className="font-semibold text-brown mb-4 flex items-center gap-2">
            <BarChart3 size={18} className="text-primary" />
            消费趋势
          </h3>
          <div className="h-48 flex items-end gap-2">
            {(personalReport.dailyTrend || []).map((day: any, idx: number) => {
              const height = maxSpent > 0 ? (day.spent / maxSpent) * 100 : 0
              const dayName = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'][idx] || ''
              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full flex flex-col items-center gap-1">
                    <span className="text-xs text-brown-lighter">¥{day.spent.toFixed(0)}</span>
                    <div
                      className="w-full bg-gradient-to-t from-amber to-amber/60 rounded-t transition-all"
                      style={{ height: `${Math.max(height, 2)}%` }}
                    />
                  </div>
                  <span className="text-xs text-brown-lighter">{dayName}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  const renderCanteenReport = () => {
    if (!canteenReport) return null

    const maxIngredient = Math.max(...(canteenReport.ingredientHeatmap || []).map((i: any) => i.count), 1)
    const maxDiners = Math.max(...(canteenReport.dailyTraffic || []).map((d: any) => d.diner_count), 1)

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-card p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Users size={20} className="text-primary" />
              </div>
              <span className="text-brown-lighter text-sm">总用餐人次</span>
            </div>
            <div className="text-2xl font-bold text-brown">{canteenReport.totalDiners || 0}</div>
          </div>
          <div className="bg-white rounded-card p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-amber/10 flex items-center justify-center">
                <Utensils size={20} className="text-amber" />
              </div>
              <span className="text-brown-lighter text-sm">菜品选择次数</span>
            </div>
            <div className="text-2xl font-bold text-brown">{canteenReport.totalSelections || 0}</div>
          </div>
          <div className="bg-white rounded-card p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
                <DollarSign size={20} className="text-success" />
              </div>
              <span className="text-brown-lighter text-sm">总营收</span>
            </div>
            <div className="text-2xl font-bold text-brown">¥{canteenReport.totalRevenue?.toFixed?.(2) || canteenReport.totalRevenue || '0.00'}</div>
          </div>
          <div className="bg-white rounded-card p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                <BarChart3 size={20} className="text-blue-500" />
              </div>
              <span className="text-brown-lighter text-sm">窗口数量</span>
            </div>
            <div className="text-2xl font-bold text-brown">{canteenReport.windowTraffic?.length || 0} 个</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-card p-5">
            <h3 className="font-semibold text-brown mb-4 flex items-center gap-2">
              <Award size={18} className="text-amber" />
              本周最佳菜品 TOP5
            </h3>
            {(canteenReport.bestDishes?.length || 0) === 0 ? (
              <div className="text-center py-8 text-brown-lighter">暂无数据</div>
            ) : (
              <div className="space-y-3">
                {(canteenReport.bestDishes || []).map((d: any, idx: number) => (
                  <div key={d.id} className="flex items-center gap-3 p-3 bg-amber/5 rounded-lg">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white ${
                      idx === 0 ? 'bg-amber' : idx === 1 ? 'bg-gray-400' : idx === 2 ? 'bg-amber-700' : 'bg-gray-300'
                    }`}>
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-brown truncate">{d.name}</div>
                      <div className="text-xs text-brown-lighter">{d.window_name}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-amber">{d.avg_rating}</div>
                      <div className="text-xs text-brown-lighter">{d.review_count} 条评价</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-card p-5">
            <h3 className="font-semibold text-brown mb-4 flex items-center gap-2">
              <AlertTriangle size={18} className="text-danger" />
              本周待改进菜品
            </h3>
            {(canteenReport.worstDishes?.length || 0) === 0 ? (
              <div className="text-center py-8 text-brown-lighter">暂无数据</div>
            ) : (
              <div className="space-y-3">
                {(canteenReport.worstDishes || []).map((d: any, idx: number) => (
                  <div key={d.id} className="flex items-center gap-3 p-3 bg-danger/5 rounded-lg">
                    <div className="w-8 h-8 rounded-full bg-danger/20 flex items-center justify-center text-sm font-bold text-danger">
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-brown truncate">{d.name}</div>
                      <div className="text-xs text-brown-lighter">{d.window_name}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-danger">{d.avg_rating}</div>
                      <div className="text-xs text-brown-lighter">{d.review_count} 条评价</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-card p-5">
            <h3 className="font-semibold text-brown mb-4 flex items-center gap-2">
              <Users size={18} className="text-primary" />
              各窗口客流变化
            </h3>
            {(canteenReport.windowTraffic?.length || 0) === 0 ? (
              <div className="text-center py-8 text-brown-lighter">暂无数据</div>
            ) : (
              <div className="space-y-3">
                {(canteenReport.windowTraffic || []).map((w: any, idx: number) => (
                  <div key={w.id} className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                      {idx + 1}
                    </span>
                    <span className="flex-1 text-brown">{w.name}</span>
                    <span className="text-brown-lighter text-sm">{w.diner_count} 人次</span>
                    <div className="w-32 h-3 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{ width: `${(w.diner_count / Math.max(...(canteenReport.windowTraffic || []).map((x: any) => x.diner_count), 1)) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-card p-5">
            <h3 className="font-semibold text-brown mb-4 flex items-center gap-2">
              <TrendingUp size={18} className="text-success" />
              每日客流趋势
            </h3>
            <div className="h-48 flex items-end gap-2">
              {(canteenReport.dailyTraffic || []).map((day: any, idx: number) => {
                const height = maxDiners > 0 ? (day.diner_count / maxDiners) * 100 : 0
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                    <div className="w-full flex flex-col items-center gap-1">
                      <span className="text-xs text-brown-lighter">{day.diner_count}</span>
                      <div
                        className="w-full bg-gradient-to-t from-success to-success/60 rounded-t transition-all"
                        style={{ height: `${Math.max(height, 2)}%` }}
                      />
                    </div>
                    <span className="text-xs text-brown-lighter">{day.date?.slice(5)}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-card p-5">
          <h3 className="font-semibold text-brown mb-4 flex items-center gap-2">
            <BarChart3 size={18} className="text-primary" />
            食材成本热力图
          </h3>
          {(canteenReport.ingredientHeatmap?.length || 0) === 0 ? (
            <div className="text-center py-8 text-brown-lighter">暂无数据</div>
          ) : (
            <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
              {(canteenReport.ingredientHeatmap || []).map((ing: any, idx: number) => {
                const intensity = maxIngredient > 0 ? (ing.count / maxIngredient) : 0
                const bgColor = intensity > 0.8 ? 'bg-primary text-white' :
                  intensity > 0.6 ? 'bg-primary/80 text-white' :
                  intensity > 0.4 ? 'bg-primary/60 text-white' :
                  intensity > 0.2 ? 'bg-primary/40 text-brown' :
                  'bg-primary/20 text-brown'
                return (
                  <div key={idx} className={`${bgColor} rounded-card p-4 text-center transition-all hover:scale-105`}>
                    <div className="font-semibold mb-1">{ing.name}</div>
                    <div className="text-xs opacity-80">
                      {ing.count}次 · ¥{ing.cost}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    )
  }

  if (reportType === 'personal' && !currentUser) {
    return (
      <div className="text-center py-12 text-brown-lighter">
        请先登录查看个人周报
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h2 className="text-2xl font-bold text-brown flex items-center gap-2">
          <Calendar className="text-primary" />
          周报
        </h2>
        <div className="flex items-center gap-3">
          <div className="flex bg-white rounded-btn p-1">
            <button
              onClick={() => { setReportType('personal'); setHistoryIndex(0); }}
              className={`px-4 py-2 rounded-btn text-sm font-medium transition-colors ${
                reportType === 'personal'
                  ? 'bg-primary text-white'
                  : 'text-brown hover:bg-brown/10'
              }`}
            >
              个人周报
            </button>
            <button
              onClick={() => { setReportType('canteen'); setHistoryIndex(0); }}
              className={`px-4 py-2 rounded-btn text-sm font-medium transition-colors ${
                reportType === 'canteen'
                  ? 'bg-primary text-white'
                  : 'text-brown hover:bg-brown/10'
              }`}
            >
              全食堂周报
            </button>
          </div>
          <div className="flex items-center gap-2 bg-white rounded-btn px-3 py-2">
            <button
              onClick={handlePrevWeek}
              disabled={historyIndex >= history.length - 1}
              className="p-1 hover:bg-brown/10 rounded-full transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={18} className="text-brown" />
            </button>
            <span className="text-sm font-medium text-brown min-w-[100px] text-center">
              {getDateLabel()}
            </span>
            <button
              onClick={handleNextWeek}
              disabled={historyIndex <= 0}
              className="p-1 hover:bg-brown/10 rounded-full transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight size={18} className="text-brown" />
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-brown-lighter">加载中...</div>
      ) : (
        <>
          {reportType === 'personal' ? renderPersonalReport() : renderCanteenReport()}
        </>
      )}
    </div>
  )
}
