import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  User, Star, Heart, AlertTriangle, CreditCard, Cloud,
  Settings, ChevronRight, Trash2, Edit3, Save
} from 'lucide-react'
import useAppStore from '@/store'
import {
  getUserReviews, getFavorites, removeFavorite,
  setAllergens, getConsumption, getTagCloud, updateUser
} from '@/services/api'

type TabType = 'reviews' | 'favorites' | 'allergens' | 'consumption' | 'tags'

const tabs: { key: TabType; label: string; icon: any }[] = [
  { key: 'reviews', label: '评价历史', icon: Star },
  { key: 'favorites', label: '我的收藏', icon: Heart },
  { key: 'allergens', label: '过敏原设置', icon: AlertTriangle },
  { key: 'consumption', label: '消费统计', icon: CreditCard },
  { key: 'tags', label: '口味标签云', icon: Cloud },
]

const ALL_ALLERGENS = ['花生', '海鲜', '乳制品']

function renderStars(value: number) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          size={14}
          className={s <= value ? 'text-amber fill-amber' : 'text-gray-300'}
        />
      ))}
    </div>
  )
}

export default function Profile() {
  const { currentUser, setCurrentUser } = useAppStore()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<TabType>('reviews')
  const [reviews, setReviews] = useState<any[]>([])
  const [favorites, setFavorites] = useState<any[]>([])
  const [consumption, setConsumption] = useState<any>(null)
  const [tagCloud, setTagCloud] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<'week' | 'month'>('week')
  const [selectedAllergens, setSelectedAllergens] = useState<string[]>([])
  const [editingName, setEditingName] = useState(false)
  const [newName, setNewName] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (currentUser) {
      setSelectedAllergens(currentUser.allergens || [])
      setNewName(currentUser.name || '')
    }
  }, [currentUser])

  useEffect(() => {
    if (currentUser) {
      loadTabData()
    }
  }, [currentUser, activeTab, period])

  const loadTabData = async () => {
    if (!currentUser) return
    setLoading(true)
    try {
      switch (activeTab) {
        case 'reviews':
          const revData = await getUserReviews(currentUser.id)
          setReviews(revData)
          break
        case 'favorites':
          const favData = await getFavorites(currentUser.id)
          setFavorites(favData)
          break
        case 'consumption':
          const consData = await getConsumption(currentUser.id, period)
          setConsumption(consData)
          break
        case 'tags':
          const tagData = await getTagCloud(currentUser.id)
          setTagCloud(tagData)
          break
      }
    } catch {
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveFavorite = async (dishId: number, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!currentUser) return
    try {
      await removeFavorite(currentUser.id, dishId)
      setFavorites(favorites.filter(f => f.id !== dishId && f.dish_id !== dishId))
    } catch {}
  }

  const handleToggleAllergen = (allergen: string) => {
    const newAllergens = selectedAllergens.includes(allergen)
      ? selectedAllergens.filter(a => a !== allergen)
      : [...selectedAllergens, allergen]
    setSelectedAllergens(newAllergens)
  }

  const handleSaveAllergens = async () => {
    if (!currentUser) return
    setSaving(true)
    try {
      const updated = await setAllergens(currentUser.id, selectedAllergens)
      setCurrentUser({ ...currentUser, allergens: updated.allergens || selectedAllergens })
    } catch {
    } finally {
      setSaving(false)
    }
  }

  const handleSaveName = async () => {
    if (!currentUser || !newName.trim()) return
    setSaving(true)
    try {
      const updated = await updateUser(currentUser.id, { name: newName.trim() })
      setCurrentUser({ ...currentUser, name: updated.name })
      setEditingName(false)
    } catch {
    } finally {
      setSaving(false)
    }
  }

  if (!currentUser) {
    return (
      <div className="text-center py-12 text-brown-lighter">
        请先登录以查看个人中心
      </div>
    )
  }

  const renderContent = () => {
    if (loading) {
      return <div className="text-center py-12 text-brown-lighter">加载中...</div>
    }

    switch (activeTab) {
      case 'reviews':
        if (reviews.length === 0) {
          return <div className="text-center py-12 text-brown-lighter">暂无评价记录</div>
        }
        return (
          <div className="space-y-4">
            {reviews.map((review) => (
              <div
                key={review.id}
                onClick={() => navigate(`/dish/${review.dish_id}`)}
                className="bg-white rounded-card p-4 card-hover cursor-pointer"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium text-brown">{review.dish_name}</div>
                  {renderStars(review.rating)}
                </div>
                {review.comment && (
                  <p className="text-sm text-brown-light mb-2">{review.comment}</p>
                )}
                <div className="text-xs text-brown-lighter">
                  {review.created_at}
                </div>
              </div>
            ))}
          </div>
        )

      case 'favorites':
        if (favorites.length === 0) {
          return <div className="text-center py-12 text-brown-lighter">暂无收藏菜品</div>
        }
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {favorites.map((dish) => (
              <div
                key={dish.id}
                onClick={() => navigate(`/dish/${dish.id}`)}
                className="bg-white rounded-card p-4 card-hover cursor-pointer relative"
              >
                <button
                  onClick={(e) => handleRemoveFavorite(dish.dish_id || dish.id, e)}
                  className="absolute top-3 right-3 p-1 text-danger hover:bg-danger/10 rounded-full transition-colors"
                >
                  <Trash2 size={16} />
                </button>
                <div className="font-medium text-brown mb-1 pr-6">{dish.name}</div>
                <div className="text-sm text-brown-lighter mb-2">
                  ¥{dish.price} · {dish.calories} kcal
                </div>
                <div className="flex items-center gap-1">
                  <Heart size={14} className="text-danger fill-danger" />
                  <span className="text-xs text-brown-lighter">已收藏</span>
                </div>
              </div>
            ))}
          </div>
        )

      case 'allergens':
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-card p-6">
              <h3 className="font-semibold text-brown mb-4">选择你的过敏原</h3>
              <p className="text-sm text-brown-lighter mb-4">
                设置后，含有这些过敏原的菜品会标红警告
              </p>
              <div className="flex flex-wrap gap-3">
                {ALL_ALLERGENS.map((allergen) => (
                  <button
                    key={allergen}
                    onClick={() => handleToggleAllergen(allergen)}
                    className={`px-4 py-2 rounded-btn border-2 transition-all ${
                      selectedAllergens.includes(allergen)
                        ? 'border-danger bg-danger/10 text-danger font-medium'
                        : 'border-gray-200 bg-white text-brown hover:border-brown-lighter'
                    }`}
                  >
                    {allergen}
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={handleSaveAllergens}
              disabled={saving}
              className="w-full bg-primary hover:bg-primary-dark text-white font-medium py-3 rounded-btn transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Save size={18} />
              {saving ? '保存中...' : '保存设置'}
            </button>
          </div>
        )

      case 'consumption':
        return (
          <div className="space-y-6">
            <div className="flex gap-2">
              {[
                { key: 'week', label: '本周' },
                { key: 'month', label: '本月' },
              ].map((p) => (
                <button
                  key={p.key}
                  onClick={() => setPeriod(p.key as 'week' | 'month')}
                  className={`px-4 py-2 rounded-btn text-sm font-medium transition-colors ${
                    period === p.key
                      ? 'bg-primary text-white'
                      : 'bg-white text-brown hover:bg-primary/10'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-card p-5 text-center">
                <div className="text-3xl font-bold text-primary mb-1">
                  {consumption?.dish_count || 0}
                </div>
                <div className="text-sm text-brown-lighter">菜品数量</div>
              </div>
              <div className="bg-white rounded-card p-5 text-center">
                <div className="text-3xl font-bold text-amber mb-1">
                  {consumption?.total_calories || 0}
                </div>
                <div className="text-sm text-brown-lighter">总热量 (kcal)</div>
              </div>
              <div className="bg-white rounded-card p-5 text-center">
                <div className="text-3xl font-bold text-brown mb-1">
                  ¥{consumption?.total_spent?.toFixed?.(2) || consumption?.total_spent || '0.00'}
                </div>
                <div className="text-sm text-brown-lighter">消费总额</div>
              </div>
              <div className="bg-white rounded-card p-5 text-center">
                <div className="text-2xl font-bold text-success mb-1">
                  {consumption?.total_protein?.toFixed?.(1) || consumption?.total_protein || 0}g
                </div>
                <div className="text-sm text-brown-lighter">蛋白质</div>
              </div>
              <div className="bg-white rounded-card p-5 text-center">
                <div className="text-2xl font-bold text-blue-500 mb-1">
                  {consumption?.total_carbs?.toFixed?.(1) || consumption?.total_carbs || 0}g
                </div>
                <div className="text-sm text-brown-lighter">碳水化合物</div>
              </div>
              <div className="bg-white rounded-card p-5 text-center">
                <div className="text-2xl font-bold text-purple-500 mb-1">
                  {consumption?.total_fat?.toFixed?.(1) || consumption?.total_fat || 0}g
                </div>
                <div className="text-sm text-brown-lighter">脂肪</div>
              </div>
            </div>
          </div>
        )

      case 'tags':
        if (tagCloud.length === 0) {
          return <div className="text-center py-12 text-brown-lighter">暂无标签数据，多评价一些菜品吧</div>
        }
        const maxCount = Math.max(...tagCloud.map(t => t.count), 1)
        const colors = ['bg-primary', 'bg-amber', 'bg-success', 'bg-blue-500', 'bg-purple-500', 'bg-cyan-500', 'bg-pink-500']
        return (
          <div className="bg-white rounded-card p-8">
            <h3 className="font-semibold text-brown mb-6 text-center">口味偏好标签云</h3>
            <div className="flex flex-wrap items-center justify-center gap-3 min-h-48">
              {tagCloud.map((tag, index) => {
                const size = 12 + (tag.count / maxCount) * 20
                const colorIdx = index % colors.length
                return (
                  <span
                    key={tag.tag}
                    className={`tag-cloud-item ${colors[colorIdx]} text-white font-medium`}
                    style={{ fontSize: `${size}px` }}
                  >
                    {tag.tag}
                  </span>
                )
              })}
            </div>
            <p className="text-center text-sm text-brown-lighter mt-6">
              基于你的历史评价生成，字体越大表示你越喜欢这个口味
            </p>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-card p-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-2xl font-bold text-white">
            {currentUser.name?.[0] || 'U'}
          </div>
          <div className="flex-1">
            {editingName ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="text-xl font-bold text-brown border-b-2 border-primary focus:outline-none bg-transparent px-1"
                  autoFocus
                />
                <button onClick={handleSaveName} disabled={saving} className="text-primary">
                  <Save size={18} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-brown">{currentUser.name}</h2>
                <button onClick={() => setEditingName(true)} className="text-brown-lighter hover:text-primary">
                  <Edit3 size={16} />
                </button>
              </div>
            )}
            <p className="text-brown-lighter text-sm">@{currentUser.username}</p>
          </div>
        </div>
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
