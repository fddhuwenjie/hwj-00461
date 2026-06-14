import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BarChart3, Trophy, ThumbsDown, Users, ShoppingBasket,
  TrendingDown, Star, Store, ChefHat
} from 'lucide-react'
import {
  getTopDishes, getWorstDishes, getPopularDishes,
  getWindowRatings, getDailyCount, getIngredientFrequency,
  getWasteRatio
} from '@/services/api'

type TabType = 'top' | 'worst' | 'popular' | 'windows' | 'daily' | 'ingredients' | 'waste'

const tabs: { key: TabType; label: string; icon: any }[] = [
  { key: 'top', label: '综合评分TOP10', icon: Trophy },
  { key: 'worst', label: '最多差评', icon: ThumbsDown },
  { key: 'popular', label: '最受欢迎', icon: Users },
  { key: 'windows', label: '窗口评分', icon: Store },
  { key: 'daily', label: '每日就餐', icon: BarChart3 },
  { key: 'ingredients', label: '食材频率', icon: ChefHat },
  { key: 'waste', label: '浪费指标', icon: TrendingDown },
]

function renderStars(value: number) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          size={14}
          className={s <= Math.round(value) ? 'text-amber fill-amber' : 'text-gray-300'}
        />
      ))}
    </div>
  )
}

export default function Stats() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<TabType>('top')
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [activeTab])

  const loadData = async () => {
    setLoading(true)
    try {
      let result: any
      switch (activeTab) {
        case 'top':
          result = await getTopDishes()
          break
        case 'worst':
          result = await getWorstDishes()
          break
        case 'popular':
          result = await getPopularDishes()
          break
        case 'windows':
          result = await getWindowRatings()
          break
        case 'daily':
          result = await getDailyCount()
          break
        case 'ingredients':
          result = await getIngredientFrequency()
          break
        case 'waste':
          result = await getWasteRatio()
          break
      }
      setData(result)
    } catch {
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  const renderContent = () => {
    if (loading) {
      return <div className="text-center py-12 text-brown-lighter">加载中...</div>
    }

    if (!data || (Array.isArray(data) && data.length === 0)) {
      return <div className="text-center py-12 text-brown-lighter">暂无数据</div>
    }

    switch (activeTab) {
      case 'top':
      case 'worst':
      case 'popular':
        return (
          <div className="space-y-3">
            {(data as any[]).map((dish: any, index: number) => (
              <div
                key={dish.id}
                onClick={() => navigate(`/dish/${dish.id}`)}
                className="flex items-center gap-4 p-4 bg-white rounded-card card-hover cursor-pointer"
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  index < 3 ? 'bg-amber text-white' : 'bg-cream text-brown-lighter'
                }`}>
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-brown">{dish.name}</div>
                  <div className="text-sm text-brown-lighter">
                    ¥{dish.price} · {dish.calories} kcal
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="flex items-center gap-2">
                    {renderStars(dish.avg_score || 0)}
                    <span className="text-sm font-semibold text-brown">{dish.avg_score || 0}</span>
                  </div>
                  <div className="text-xs text-brown-lighter">
                    {dish.review_count || 0} 条评价
                  </div>
                </div>
              </div>
            ))}
          </div>
        )

      case 'windows':
        return (
          <div className="space-y-4">
            {(data as any[]).map((w: any, index: number) => (
              <div key={w.id} className="p-5 bg-white rounded-card">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      index === 0 ? 'bg-amber text-white' : 'bg-primary/20 text-primary'
                    }`}>
                      <Store size={20} />
                    </div>
                    <div>
                      <div className="font-semibold text-brown text-lg">{w.name}</div>
                      <div className="text-sm text-brown-lighter">
                        {w.dish_count || 0} 道菜 · {w.review_count || 0} 条评价
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-primary">{w.avg_score || 0}</div>
                    <div className="text-xs text-brown-lighter">平均分</div>
                  </div>
                </div>
                <div className="w-full h-3 bg-cream rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-primary-dark transition-all"
                    style={{ width: `${(w.avg_score / 5) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )

      case 'daily':
        const maxCount = Math.max(...(data as any[]).map((d: any) => d.diner_count), 1)
        return (
          <div className="bg-white rounded-card p-6">
            <h3 className="font-semibold text-brown mb-6">每日就餐人数统计</h3>
            <div className="flex items-end gap-4 h-64">
              {(data as any[]).map((d: any) => (
                <div key={d.date} className="flex-1 flex flex-col items-center">
                  <div className="text-xs font-semibold text-brown mb-2">{d.diner_count}人</div>
                  <div
                    className="w-full bg-gradient-to-t from-primary to-primary-light rounded-t-lg transition-all"
                    style={{ height: `${(d.diner_count / maxCount) * 100}%`, minHeight: '4px' }}
                  />
                  <div className="text-xs text-brown-lighter mt-2">{d.date.slice(5)}</div>
                </div>
              ))}
            </div>
          </div>
        )

      case 'ingredients':
        const maxFreq = Math.max(...(data as any[]).map((d: any) => d.count), 1)
        return (
          <div className="space-y-3">
            {(data as any[]).map((item: any, index: number) => (
              <div key={item.name} className="flex items-center gap-4 p-3 bg-white rounded-card">
                <div className="w-8 text-center text-sm font-bold text-brown-lighter">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-brown">{item.name}</span>
                    <span className="text-sm text-brown-lighter">{item.count} 次</span>
                  </div>
                  <div className="w-full h-2 bg-cream rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${(item.count / maxFreq) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )

      case 'waste':
        return (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-card p-6 text-center">
              <div className="text-4xl font-bold text-brown mb-2">{data.total_dishes || 0}</div>
              <div className="text-brown-lighter">菜品总数</div>
            </div>
            <div className="bg-white rounded-card p-6 text-center">
              <div className="text-4xl font-bold text-brown mb-2">{data.reviewed_dishes || 0}</div>
              <div className="text-brown-lighter">已评价菜品</div>
            </div>
            <div className="bg-white rounded-card p-6 text-center">
              <div className="text-4xl font-bold text-danger mb-2">{data.low_rated_count || 0}</div>
              <div className="text-brown-lighter">低分菜品（低于3分）</div>
            </div>
            <div className="md:col-span-3 bg-white rounded-card p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-brown">浪费指标</h3>
                <span className={`text-2xl font-bold ${
                  (data.waste_ratio || 0) > 20 ? 'text-danger' : 'text-success'
                }`}>
                  {data.waste_ratio || 0}%
                </span>
              </div>
              <div className="w-full h-4 bg-cream rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    (data.waste_ratio || 0) > 20 ? 'bg-danger' : 'bg-success'
                  }`}
                  style={{ width: `${Math.min(data.waste_ratio || 0, 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-brown-lighter mt-2">
                <span>0%</span>
                <span>20%（警戒线）</span>
                <span>100%</span>
              </div>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-brown">统计后台</h2>
      </div>

      <div className="flex gap-2 flex-wrap">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-btn text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-primary text-white'
                : 'bg-white text-brown hover:bg-primary/10'
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {renderContent()}
    </div>
  )
}
