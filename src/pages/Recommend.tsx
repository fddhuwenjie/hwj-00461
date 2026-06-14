import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Star, Users, Tag, UtensilsCrossed, Heart } from 'lucide-react'
import useAppStore from '@/store'
import { getCollaborativeRecommend, getTagBasedRecommend, getTodayRecommend } from '@/services/api'

const TAG_COLORS: Record<string, string> = {
  '辣': 'bg-danger text-white',
  '素': 'bg-success text-white',
  '低脂': 'bg-blue-500 text-white',
  '花生': 'bg-primary text-white',
  '海鲜': 'bg-cyan-500 text-white',
  '乳制品': 'bg-purple-500 text-white',
}

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

function DishCard({ dish, showMatch = false }: { dish: any; showMatch?: boolean }) {
  const navigate = useNavigate()
  const { currentUser } = useAppStore()

  return (
    <div
      onClick={() => navigate(`/dish/${dish.id}`)}
      className="bg-white rounded-card p-4 card-hover cursor-pointer"
    >
      <div className="flex items-start justify-between mb-2">
        <h4 className="font-semibold text-brown">{dish.name}</h4>
        {showMatch && dish.match_score !== undefined && (
          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
            匹配度 {dish.match_score}
          </span>
        )}
      </div>
      <div className="flex items-center gap-3 text-sm text-brown-lighter mb-2">
        <span>¥{dish.price}</span>
        <span>{dish.calories} kcal</span>
      </div>
      <div className="flex items-center gap-2 mb-2">
        {renderStars(dish.avg_score || 0)}
        <span className="text-xs text-brown-lighter">
          {dish.avg_score || 0} ({dish.review_count || 0})
        </span>
      </div>
      <div className="flex items-center gap-1 flex-wrap">
        {(dish.tags || []).map((tag: string) => (
          <span
            key={tag}
            className={`px-2 py-0.5 rounded-full text-xs font-medium ${TAG_COLORS[tag] || 'bg-gray-200 text-gray-700'}`}
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
  )
}

export default function Recommend() {
  const { currentUser } = useAppStore()
  const [todayRec, setTodayRec] = useState<any[]>([])
  const [collabRec, setCollabRec] = useState<any[]>([])
  const [tagRec, setTagRec] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedMeal, setSelectedMeal] = useState('午餐')

  useEffect(() => {
    const dates = ['2026-06-15', '2026-06-16', '2026-06-17', '2026-06-18', '2026-06-19']
    const days = ['周一', '周二', '周三', '周四', '周五']
    const dateLabels = dates.map((d, i) => ({ date: d, label: days[i] }))
    setSelectedDate(dates[0])
  }, [])

  useEffect(() => {
    if (currentUser && selectedDate) {
      loadRecommendations()
    }
  }, [currentUser, selectedDate, selectedMeal])

  const loadRecommendations = async () => {
    if (!currentUser || !selectedDate) return
    setLoading(true)
    try {
      const [today, collab, tags] = await Promise.all([
        getTodayRecommend(currentUser.id, selectedDate, selectedMeal).catch(() => []),
        getCollaborativeRecommend(currentUser.id).catch(() => []),
        getTagBasedRecommend(currentUser.id).catch(() => []),
      ])
      setTodayRec(today)
      setCollabRec(collab)
      setTagRec(tags)
    } finally {
      setLoading(false)
    }
  }

  const weekDates = [
    { date: '2026-06-15', day: '周一' },
    { date: '2026-06-16', day: '周二' },
    { date: '2026-06-17', day: '周三' },
    { date: '2026-06-18', day: '周四' },
    { date: '2026-06-19', day: '周五' },
  ]

  const MEALS = [
    { key: '早餐', label: '早餐' },
    { key: '午餐', label: '午餐' },
    { key: '晚餐', label: '晚餐' },
  ]

  if (!currentUser) {
    return (
      <div className="text-center py-12 text-brown-lighter">
        请先登录以查看个性化推荐
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-brown">智能推荐</h2>
      </div>

      <div className="bg-white rounded-card p-4">
        <div className="flex items-center gap-4 mb-4">
          <div className="flex gap-2 flex-wrap">
            {weekDates.map((d) => (
              <button
                key={d.date}
                onClick={() => setSelectedDate(d.date)}
                className={`px-4 py-2 rounded-btn text-sm font-medium transition-colors ${
                  selectedDate === d.date
                    ? 'bg-primary text-white'
                    : 'bg-cream text-brown hover:bg-primary/10'
                }`}
              >
                {d.day}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            {MEALS.map((m) => (
              <button
                key={m.key}
                onClick={() => setSelectedMeal(m.key)}
                className={`px-4 py-2 rounded-btn text-sm font-medium transition-colors ${
                  selectedMeal === m.key
                    ? 'bg-brown text-white'
                    : 'bg-cream text-brown hover:bg-brown/10'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-brown-lighter">加载中...</div>
      ) : (
        <div className="space-y-8">
          <section>
            <h3 className="text-lg font-semibold text-brown mb-4 flex items-center gap-2">
              <UtensilsCrossed size={20} className="text-primary" />
              今日推荐
              <span className="text-sm font-normal text-brown-lighter">（基于今日菜单+你的口味偏好）</span>
            </h3>
            {todayRec.length === 0 ? (
              <div className="bg-white rounded-card p-6 text-center text-brown-lighter">
                暂无今日推荐数据
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {todayRec.map((dish) => (
                  <DishCard key={dish.id} dish={dish} showMatch />
                ))}
              </div>
            )}
          </section>

          <section>
            <h3 className="text-lg font-semibold text-brown mb-4 flex items-center gap-2">
              <Users size={20} className="text-primary" />
              相似用户推荐
              <span className="text-sm font-normal text-brown-lighter">（余弦相似度算法）</span>
            </h3>
            {collabRec.length === 0 ? (
              <div className="bg-white rounded-card p-6 text-center text-brown-lighter">
                暂无相似用户推荐，多评价一些菜品试试吧
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {collabRec.map((dish) => (
                  <DishCard key={dish.id} dish={dish} />
                ))}
              </div>
            )}
          </section>

          <section>
            <h3 className="text-lg font-semibold text-brown mb-4 flex items-center gap-2">
              <Tag size={20} className="text-primary" />
              标签偏好推荐
              <span className="text-sm font-normal text-brown-lighter">（基于你喜欢的口味标签）</span>
            </h3>
            {tagRec.length === 0 ? (
              <div className="bg-white rounded-card p-6 text-center text-brown-lighter">
                暂无标签推荐，多评价一些菜品试试吧
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {tagRec.map((dish) => (
                  <DishCard key={dish.id} dish={dish} />
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  )
}
