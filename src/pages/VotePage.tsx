import { useState, useEffect } from 'react'
import { Vote, Check, Clock, ChefHat, TrendingUp } from 'lucide-react'
import useAppStore from '@/store'
import { getVotePool, getMyVotes, submitVotes, generateMenuFromVotes } from '@/services/api'

const TAG_COLORS: Record<string, string> = {
  '辣': 'bg-danger text-white',
  '素': 'bg-success text-white',
  '低脂': 'bg-blue-500 text-white',
  '花生': 'bg-primary text-white',
  '海鲜': 'bg-cyan-500 text-white',
  '乳制品': 'bg-purple-500 text-white',
}

export default function VotePage() {
  const { currentUser } = useAppStore()
  const tomorrow = '2026-06-15'
  const [poolData, setPoolData] = useState<any[]>([])
  const [selectedDishes, setSelectedDishes] = useState<Map<number, Set<number>>>(new Map())
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [voteDeadline] = useState('今天 20:00')
  const [voted, setVoted] = useState(false)

  useEffect(() => {
    loadData()
  }, [currentUser])

  const loadData = async () => {
    if (!currentUser) return
    setLoading(true)
    try {
      const pool = await getVotePool(tomorrow)
      setPoolData(pool)
      
      const myVotes = await getMyVotes(currentUser.id, tomorrow)
      const initial = new Map<number, Set<number>>()
      for (const v of myVotes) {
        const set = initial.get(v.window_id) || new Set()
        set.add(v.dish_id)
        initial.set(v.window_id, set)
      }
      setSelectedDishes(initial)
      setVoted(myVotes.length > 0)
    } catch {
    } finally {
      setLoading(false)
    }
  }

  const handleDishClick = (windowId: number, dishId: number) => {
    const current = selectedDishes.get(windowId) || new Set()
    const newSet = new Set(current)
    
    if (newSet.has(dishId)) {
      newSet.delete(dishId)
    } else {
      if (newSet.size >= 2) return
      newSet.add(dishId)
    }
    
    const newMap = new Map(selectedDishes)
    newMap.set(windowId, newSet)
    setSelectedDishes(newMap)
  }

  const handleSubmitVotes = async () => {
    if (!currentUser) return
    const allVotes: any[] = []
    for (const [windowId, dishSet] of selectedDishes) {
      for (const dishId of dishSet) {
        const windowData = poolData.find(w => w.window_id === windowId)
        const dish = windowData?.dishes?.find((d: any) => d.dish_id === dishId)
        if (dish) {
          allVotes.push({
            window_id: windowId,
            dish_id: dishId,
            vote_pool_id: dish.pool_id,
          })
        }
      }
    }
    
    if (allVotes.length === 0) return
    setSubmitting(true)
    try {
      await submitVotes(currentUser.id, tomorrow, allVotes)
      setVoted(true)
    } catch {
    } finally {
      setSubmitting(false)
    }
  }

  const handleGenerateMenu = async () => {
    try {
      await generateMenuFromVotes(tomorrow, '午餐', 4)
      alert('菜单生成成功！')
    } catch (err: any) {
      alert(err.message || '菜单生成失败')
    }
  }

  const getTotalVotes = () => {
    let total = 0
    for (const w of poolData) {
      for (const d of w.dishes || []) {
        total += d.vote_count || 0
      }
    }
    return total
  }

  const getSelectedCount = (windowId: number) => {
    return selectedDishes.get(windowId)?.size || 0
  }

  const canSubmit = Array.from(selectedDishes.values()).some(s => s.size > 0)

  if (!currentUser) {
    return (
      <div className="text-center py-12 text-brown-lighter">
        请先登录参与投票
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-brown flex items-center gap-2">
          <Vote className="text-primary" />
          明日菜品投票
        </h2>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 px-4 py-2 rounded-btn">
            <Clock size={16} />
            <span>投票截止：{voteDeadline}</span>
          </div>
          <button
            onClick={handleGenerateMenu}
            className="bg-brown hover:bg-brown-dark text-white px-4 py-2 rounded-btn text-sm font-medium transition-colors flex items-center gap-2"
          >
            <ChefHat size={16} />
            生成菜单
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-card p-5 text-center">
          <div className="text-3xl font-bold text-primary mb-1">{tomorrow}</div>
          <div className="text-sm text-brown-lighter">投票日期</div>
        </div>
        <div className="bg-white rounded-card p-5 text-center">
          <div className="text-3xl font-bold text-amber mb-1">{getTotalVotes()}</div>
          <div className="text-sm text-brown-lighter">累计票数</div>
        </div>
        <div className="bg-white rounded-card p-5 text-center">
          <div className="text-3xl font-bold mb-1" style={{ color: voted ? '#10b981' : '#d97706' }}>
            {voted ? '已投票' : '待投票'}
          </div>
          <div className="text-sm text-brown-lighter">投票状态</div>
        </div>
      </div>

      <div className="bg-primary/5 border border-primary/20 rounded-card p-4">
        <p className="text-sm text-brown">
          <strong>投票规则：</strong>每个窗口最多选择2道菜，投票截止后系统将根据票数自动生成次日菜单。
          每道菜下方显示当前票数，排名靠前的菜品将出现在明天的菜单中。
        </p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-brown-lighter">加载中...</div>
      ) : poolData.length === 0 ? (
        <div className="text-center py-12 text-brown-lighter">暂无投票菜品</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {poolData.map((window) => (
            <div key={window.window_id}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-brown flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-primary" />
                  {window.window_name}
                </h3>
                <span className={`text-sm font-medium px-2 py-0.5 rounded-full ${
                  getSelectedCount(window.window_id) === 2 
                    ? 'bg-success/10 text-success' 
                    : 'bg-amber/10 text-amber'
                }`}>
                  已选 {getSelectedCount(window.window_id)}/2
                </span>
              </div>
              <div className="space-y-3">
                {(window.dishes || []).map((dish: any) => {
                  const isSelected = selectedDishes.get(window.window_id)?.has(dish.dish_id)
                  const maxVotes = Math.max(...(window.dishes || []).map((d: any) => d.vote_count || 0), 1)
                  const percentage = maxVotes > 0 ? (dish.vote_count / maxVotes) * 100 : 0
                  
                  return (
                    <div
                      key={dish.dish_id}
                      onClick={() => handleDishClick(window.window_id, dish.dish_id)}
                      className={`bg-white rounded-card p-4 cursor-pointer transition-all relative overflow-hidden ${
                        isSelected 
                          ? 'ring-2 ring-primary shadow-md' 
                          : 'hover:shadow-md'
                      }`}
                    >
                      <div 
                        className="absolute bottom-0 left-0 h-1 bg-primary/30 transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                      {isSelected && (
                        <div className="absolute top-2 right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                          <Check size={14} className="text-white" />
                        </div>
                      )}
                      <div className="flex items-start justify-between mb-2 pr-8">
                        <h4 className="font-semibold text-brown">{dish.dish_name}</h4>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-brown-lighter mb-2">
                        <span>¥{dish.price}</span>
                        <span>{dish.calories} kcal</span>
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
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1 text-sm">
                          <TrendingUp size={14} className="text-primary" />
                          <span className="text-brown-lighter">当前</span>
                          <span className="font-bold text-primary">{dish.vote_count || 0}票</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {poolData.length > 0 && (
        <div className="sticky bottom-0 bg-cream border-t border-brown/10 py-4 -mx-6 px-6">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="text-sm text-brown-lighter">
              {Array.from(selectedDishes.entries()).map(([wid, set]) => {
                const w = poolData.find(p => p.window_id === wid)
                return set.size > 0 ? (
                  <span key={wid} className="mr-4">
                    {w?.window_name}: {set.size}道
                  </span>
                ) : null
              })}
            </div>
            <button
              onClick={handleSubmitVotes}
              disabled={!canSubmit || submitting}
              className="bg-primary hover:bg-primary-dark text-white font-medium py-3 px-8 rounded-btn transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Vote size={18} />
              {submitting ? '提交中...' : '提交投票'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
