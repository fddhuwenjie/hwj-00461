import { useState, useEffect } from 'react'
import { ClipboardList, Plus, Trash2, ChefHat } from 'lucide-react'
import { getMenus, getDishes, getMenuDates } from '@/services/api'

const TAG_COLORS: Record<string, string> = {
  '辣': 'bg-danger text-white',
  '素': 'bg-success text-white',
  '低脂': 'bg-blue-500 text-white',
  '花生': 'bg-primary text-white',
  '海鲜': 'bg-cyan-500 text-white',
  '乳制品': 'bg-purple-500 text-white',
}

function getWeekDates(): { date: string; label: string; day: string }[] {
  const days = ['周一', '周二', '周三', '周四', '周五']
  const dates = ['2026-06-15', '2026-06-16', '2026-06-17', '2026-06-18', '2026-06-19']
  return dates.map((d, i) => ({
    date: d,
    label: d.slice(5).replace('-', '/'),
    day: days[i],
  }))
}

export default function MenuManage() {
  const weekDates = getWeekDates()
  const [selectedDate, setSelectedDate] = useState(weekDates[0].date)
  const [selectedMeal, setSelectedMeal] = useState('午餐')
  const [menus, setMenus] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const MEALS = [
    { key: '早餐', label: '早餐' },
    { key: '午餐', label: '午餐' },
    { key: '晚餐', label: '晚餐' },
  ]

  useEffect(() => {
    loadMenus()
  }, [selectedDate, selectedMeal])

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-brown">菜单管理</h2>
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
            <div key={menu.menu_id} className="bg-white rounded-card p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <ChefHat size={20} className="text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-brown text-lg">{menu.window_name}</h3>
                  <p className="text-xs text-brown-lighter">
                    {(menu.dishes || []).length} 道菜
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                {(menu.dishes || []).map((dish: any) => (
                  <div
                    key={dish.id}
                    className="p-3 bg-cream rounded-btn"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-brown text-sm">{dish.name}</span>
                      <span className="text-xs text-primary font-semibold">¥{dish.price}</span>
                    </div>
                    <div className="text-xs text-brown-lighter mb-2">
                      {dish.calories} kcal · 蛋白质{dish.protein}g
                    </div>
                    <div className="flex items-center gap-1 flex-wrap">
                      {(dish.tags || []).slice(0, 3).map((tag: string) => (
                        <span
                          key={tag}
                          className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${TAG_COLORS[tag] || 'bg-gray-200 text-gray-600'}`}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-cream/50 rounded-card p-4 border border-dashed border-brown-lighter/30">
        <div className="flex items-center gap-2 text-brown-lighter text-sm">
          <ClipboardList size={16} />
          <span>本周菜单已预置（6月15日-6月19日），共3个窗口，每餐4道菜</span>
        </div>
      </div>
    </div>
  )
}
