import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Salad, Trash2, AlertTriangle, Flame, Beef, Cookie, Droplets } from 'lucide-react'
import useAppStore from '@/store'
import { getNutritionToday, deselectDish, getMenus, selectDish } from '@/services/api'

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

function NutrientBar({ label, current, goal, color, icon: Icon }: {
  label: string
  current: number
  goal: number
  color: string
  icon: any
}) {
  const percent = Math.min((current / goal) * 100, 100)
  const isOver = current > goal

  return (
    <div className="bg-white rounded-card p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-full ${color} flex items-center justify-center`}>
            <Icon size={16} className="text-white" />
          </div>
          <span className="font-medium text-brown">{label}</span>
        </div>
        <span className={`text-sm font-semibold ${isOver ? 'text-danger' : 'text-brown'}`}>
          {Math.round(current)} / {goal}
        </span>
      </div>
      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ${isOver ? 'bg-danger' : color.replace('bg-', 'bg-')}`}
          style={{ width: `${percent}%`, backgroundColor: isOver ? undefined : '' }}
        />
      </div>
      <div className="text-xs text-brown-lighter mt-1">
        {isOver ? '已超标' : `占每日推荐的 ${Math.round(percent)}%`}
      </div>
    </div>
  )
}

export default function Nutrition() {
  const { currentUser } = useAppStore()
  const navigate = useNavigate()
  const weekDates = getWeekDates()
  const [selectedDate, setSelectedDate] = useState(weekDates[0].date)
  const [selectedMeal, setSelectedMeal] = useState('午餐')
  const [nutrition, setNutrition] = useState<any>(null)
  const [menus, setMenus] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const MEALS = [
    { key: '早餐', label: '早餐' },
    { key: '午餐', label: '午餐' },
    { key: '晚餐', label: '晚餐' },
  ]

  useEffect(() => {
    if (currentUser) {
      loadData()
    }
  }, [currentUser, selectedDate, selectedMeal])

  const loadData = async () => {
    if (!currentUser) return
    setLoading(true)
    try {
      const [nut, menuData] = await Promise.all([
        getNutritionToday(currentUser.id, selectedDate).catch(() => null),
        getMenus(selectedDate, selectedMeal).catch(() => []),
      ])
      setNutrition(nut)
      setMenus(menuData)
    } finally {
      setLoading(false)
    }
  }

  const handleDeselect = async (selectionId: number) => {
    if (!currentUser) return
    try {
      await deselectDish(selectionId)
      loadData()
    } catch {}
  }

  const handleSelectDish = async (dish: any) => {
    if (!currentUser) return
    try {
      await selectDish({ userId: currentUser.id, dishId: dish.id, date: selectedDate })
      loadData()
    } catch {}
  }

  const isSelected = (dishId: number) => {
    return nutrition?.selections?.some((s: any) => s.dish_id === dishId)
  }

  if (!currentUser) {
    return (
      <div className="text-center py-12 text-brown-lighter">
        请先登录以使用营养追踪功能
      </div>
    )
  }

  if (loading) {
    return <div className="text-center py-12 text-brown-lighter">加载中...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-brown">营养追踪</h2>
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

      {nutrition?.is_over_calories && (
        <div className="bg-danger/10 border border-danger/30 text-danger px-4 py-3 rounded-btn flex items-center gap-3 pulse-warning">
          <AlertTriangle size={20} />
          <div>
            <div className="font-semibold">热量超标提醒</div>
            <div className="text-sm opacity-80">
              今日摄入已超过推荐值，请注意控制饮食！
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <NutrientBar
          label="热量"
          current={nutrition?.totals?.calories || 0}
          goal={nutrition?.goals?.calories || 2000}
          color="bg-amber"
          icon={Flame}
        />
        <NutrientBar
          label="蛋白质"
          current={nutrition?.totals?.protein || 0}
          goal={nutrition?.goals?.protein || 60}
          color="bg-primary"
          icon={Beef}
        />
        <NutrientBar
          label="碳水化合物"
          current={nutrition?.totals?.carbs || 0}
          goal={nutrition?.goals?.carbs || 300}
          color="bg-success"
          icon={Cookie}
        />
        <NutrientBar
          label="脂肪"
          current={nutrition?.totals?.fat || 0}
          goal={nutrition?.goals?.fat || 65}
          color="bg-blue-500"
          icon={Droplets}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-card p-6">
          <h3 className="text-lg font-semibold text-brown mb-4 flex items-center gap-2">
            <Salad size={20} className="text-primary" />
            今日已选菜品
          </h3>
          {!nutrition?.selections?.length ? (
            <div className="text-center py-8 text-brown-lighter">
              还没有选择菜品，从右侧菜单添加吧
            </div>
          ) : (
            <div className="space-y-3">
              {nutrition.selections.map((s: any) => (
                <div
                  key={s.selection_id}
                  className="flex items-center justify-between p-3 bg-cream rounded-btn"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-brown truncate">{s.name}</div>
                    <div className="text-sm text-brown-lighter">
                      ¥{s.price} · {s.calories} kcal
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeselect(s.selection_id)}
                    className="p-1.5 text-brown-lighter hover:text-danger transition-colors ml-2"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              <div className="pt-3 border-t border-brown-lighter/10 flex justify-between text-sm">
                <span className="text-brown-lighter">总计</span>
                <span className="font-semibold text-brown">
                  ¥{nutrition.totals?.price?.toFixed?.(2) || nutrition.totals?.price || 0} · {nutrition.totals?.calories || 0} kcal
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-card p-6">
          <h3 className="text-lg font-semibold text-brown mb-4">菜单（点击添加）</h3>
          {menus.length === 0 ? (
            <div className="text-center py-8 text-brown-lighter">暂无菜单数据</div>
          ) : (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {menus.map((menu: any) => (
                <div key={menu.menu_id}>
                  <div className="text-sm font-medium text-brown-lighter mb-2 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-primary" />
                    {menu.window_name}
                  </div>
                  <div className="space-y-2">
                    {(menu.dishes || []).map((dish: any) => (
                      <div
                        key={dish.id}
                        className={`p-3 rounded-btn border transition-all cursor-pointer ${
                          isSelected(dish.id)
                            ? 'border-primary bg-primary/5'
                            : 'border-transparent bg-cream hover:bg-primary/5'
                        }`}
                        onClick={() => !isSelected(dish.id) && handleSelectDish(dish)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="font-medium text-brown text-sm">{dish.name}</div>
                          <div className="text-xs text-brown-lighter">
                            {dish.calories} kcal
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-wrap mt-1">
                          {(dish.tags || []).slice(0, 3).map((tag: string) => (
                            <span
                              key={tag}
                              className={`px-1.5 py-0.5 rounded-full text-xs ${TAG_COLORS[tag] || 'bg-gray-200 text-gray-600'}`}
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                        {isSelected(dish.id) && (
                          <div className="text-xs text-primary mt-1">✓ 已添加</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
