import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Heart, AlertTriangle, Star } from 'lucide-react'
import useAppStore from '@/store'
import { getMenus, getFavorites, selectDish } from '@/services/api'

const TAG_COLORS: Record<string, string> = {
  '辣': 'bg-danger text-white',
  '素': 'bg-success text-white',
  '低脂': 'bg-blue-500 text-white',
  '花生': 'bg-primary text-white',
  '海鲜': 'bg-cyan-500 text-white',
  '乳制品': 'bg-purple-500 text-white',
}

const ALLERGEN_TAGS = ['花生', '海鲜', '乳制品']

const MEALS = [
  { key: '早餐', label: '早餐' },
  { key: '午餐', label: '午餐' },
  { key: '晚餐', label: '晚餐' },
]

function getWeekDates(): { date: string; label: string; day: string }[] {
  const days = ['周一', '周二', '周三', '周四', '周五']
  const dates = ['2026-06-15', '2026-06-16', '2026-06-17', '2026-06-18', '2026-06-19']
  return dates.map((d, i) => ({
    date: d,
    label: d.slice(5).replace('-', '/'),
    day: days[i],
  }))
}

function renderStars(value: number) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          size={12}
          className={s <= Math.round(value) ? 'text-amber fill-amber' : 'text-gray-300'}
        />
      ))}
    </div>
  )
}

export default function Home() {
  const { currentUser } = useAppStore()
  const navigate = useNavigate()
  const weekDates = getWeekDates()
  const today = new Date().toISOString().slice(0, 10)

  const [selectedDate, setSelectedDate] = useState(
    weekDates.find((d) => d.date === today)?.date || weekDates[0].date
  )
  const [selectedMeal, setSelectedMeal] = useState('午餐')
  const [menus, setMenus] = useState<any[]>([])
  const [favorites, setFavorites] = useState<number[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadMenus()
  }, [selectedDate, selectedMeal])

  useEffect(() => {
    if (currentUser) loadFavorites()
  }, [currentUser])

  const loadMenus = async () => {
    setLoading(true)
    try {
      const data = await getMenus(selectedDate, selectedMeal)
      setMenus(data)
    } catch {
      setMenus([])
    } finally {
      setLoading(false)
    }
  }

  const loadFavorites = async () => {
    if (!currentUser) return
    try {
      const data = await getFavorites(currentUser.id)
      setFavorites(data.map((f: any) => f.dish_id || f.id))
    } catch {
      setFavorites([])
    }
  }

  const handleSelectDish = async (dish: any, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!currentUser) return
    try {
      await selectDish({ userId: currentUser.id, dishId: dish.id, date: selectedDate })
    } catch {}
  }

  const hasAllergen = (dish: any) => {
    if (!currentUser?.allergens?.length) return false
    const dishTags = dish.tags || []
    return dishTags.some((t: string) => ALLERGEN_TAGS.includes(t) && currentUser.allergens!.includes(t))
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-brown">今日菜单</h2>
      </div>

      <div className="flex gap-2 flex-wrap">
        {weekDates.map((d) => (
          <button
            key={d.date}
            onClick={() => setSelectedDate(d.date)}
            className={`px-4 py-2 rounded-btn text-sm font-medium transition-colors ${
              selectedDate === d.date
                ? 'bg-primary text-white'
                : 'bg-white text-brown hover:bg-primary/10'
            }`}
          >
            <div>{d.day}</div>
            <div className="text-xs opacity-80">{d.label}</div>
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        {MEALS.map((m) => (
          <button
            key={m.key}
            onClick={() => setSelectedMeal(m.key)}
            className={`px-6 py-2 rounded-btn text-sm font-medium transition-colors ${
              selectedMeal === m.key
                ? 'bg-brown text-white'
                : 'bg-white text-brown hover:bg-brown/10'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-brown-lighter">加载中...</div>
      ) : menus.length === 0 ? (
        <div className="text-center py-12 text-brown-lighter">暂无菜单数据</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {menus.map((menu) => (
            <div key={menu.menu_id}>
              <h3 className="text-lg font-semibold text-brown mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary" />
                {menu.window_name}
              </h3>
              <div className="space-y-3">
                {(menu.dishes || []).map((dish: any) => (
                  <div
                    key={dish.id}
                    onClick={() => navigate(`/dish/${dish.id}`)}
                    className="bg-white rounded-card p-4 card-hover cursor-pointer relative"
                  >
                    {hasAllergen(dish) && (
                      <div className="absolute top-2 right-2 pulse-warning">
                        <AlertTriangle size={16} className="text-danger" />
                      </div>
                    )}
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold text-brown">{dish.name}</h4>
                      {favorites.includes(dish.id) && (
                        <Heart size={16} className="text-danger fill-danger flex-shrink-0 ml-2" />
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-brown-lighter mb-2">
                      <span>¥{dish.price}</span>
                      <span>{dish.calories} kcal</span>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      {renderStars(dish.avg_score || 0)}
                      <span className="text-xs text-brown-lighter">
                        {dish.avg_score || 0} 分
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap mb-3">
                      {(dish.tags || []).map((tag: string) => (
                        <span
                          key={tag}
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${TAG_COLORS[tag] || 'bg-gray-200 text-gray-700'}`}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    <button
                      onClick={(e) => handleSelectDish(dish, e)}
                      className="w-full bg-primary/10 text-primary hover:bg-primary hover:text-white py-1.5 rounded-btn text-sm font-medium transition-colors flex items-center justify-center gap-1"
                    >
                      <Plus size={14} />
                      选择
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

