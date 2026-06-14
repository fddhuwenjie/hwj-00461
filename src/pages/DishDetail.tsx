import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Star, Heart, MessageSquare, Camera, ArrowLeft, AlertTriangle, Plus, Send } from 'lucide-react'
import useAppStore from '@/store'
import { getDish, createReview, updateReview, addFavorite, removeFavorite, getReviews } from '@/services/api'

const TAG_COLORS: Record<string, string> = {
  '辣': 'bg-danger text-white',
  '素': 'bg-success text-white',
  '低脂': 'bg-blue-500 text-white',
  '花生': 'bg-primary text-white',
  '海鲜': 'bg-cyan-500 text-white',
  '乳制品': 'bg-purple-500 text-white',
}

const ALLERGEN_TAGS = ['花生', '海鲜', '乳制品']

export default function DishDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { currentUser } = useAppStore()
  const [dish, setDish] = useState<any>(null)
  const [reviews, setReviews] = useState<any[]>([])
  const [sort, setSort] = useState('latest')
  const [loading, setLoading] = useState(true)
  const [isFavorited, setIsFavorited] = useState(false)

  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [photoUrl, setPhotoUrl] = useState('')
  const [userReview, setUserReview] = useState<any>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    loadDish()
    loadReviews()
  }, [id, sort])

  useEffect(() => {
    if (currentUser && reviews.length > 0) {
      const myReview = reviews.find(r => r.user_id === currentUser.id)
      setUserReview(myReview || null)
      if (myReview) {
        setRating(myReview.rating)
        setComment(myReview.comment || '')
        setPhotoUrl(myReview.photo_url || '')
      }
    }
  }, [reviews, currentUser])

  const loadDish = async () => {
    if (!id) return
    try {
      const data = await getDish(Number(id))
      setDish(data)
      if (currentUser && data.favorite_id) {
        setIsFavorited(true)
      }
    } catch {
    } finally {
      setLoading(false)
    }
  }

  const loadReviews = async () => {
    if (!id) return
    try {
      const data = await getReviews(Number(id), sort)
      setReviews(data)
    } catch {
      setReviews([])
    }
  }

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentUser || !dish) return
    if (rating === 0) return
    setSubmitting(true)
    try {
      if (userReview) {
        await updateReview(userReview.id, { rating, comment, photo_url: photoUrl })
      } else {
        await createReview({
          user_id: currentUser.id,
          dish_id: dish.id,
          rating,
          comment,
          photo_url: photoUrl,
        })
      }
      loadDish()
      loadReviews()
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!currentUser || !dish) return
    if (isFavorited) {
      removeFavorite(currentUser.id, dish.id).then(() => setIsFavorited(false))
    } else {
      addFavorite(currentUser.id, dish.id).then(() => setIsFavorited(true))
    }
  }

  const hasAllergen = () => {
    if (!currentUser?.allergens?.length || !dish) return false
    return dish.tags?.some((t: string) => ALLERGEN_TAGS.includes(t) && currentUser.allergens!.includes(t))
  }

  const renderStars = (value: number, interactive = false, onChange?: (v: number) => void) => {
    return (
      <div className="star-rating flex gap-0.5">
        {[1, 2, 3, 4, 5].map((s) => (
          <Star
            key={s}
            size={interactive ? 24 : 16}
            className={`star ${s <= value ? 'active fill-amber' : 'inactive'} ${interactive ? 'cursor-pointer' : ''}`}
            onClick={() => interactive && onChange?.(s)}
          />
        ))}
      </div>
    )
  }

  if (loading) {
    return <div className="text-center py-12 text-brown-lighter">加载中...</div>
  }

  if (!dish) {
    return <div className="text-center py-12 text-brown-lighter">菜品不存在</div>
  }

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-brown-lighter hover:text-brown transition-colors"
      >
        <ArrowLeft size={18} />
        <span>返回</span>
      </button>

      <div className="bg-white rounded-card p-6 relative">
        {hasAllergen() && (
          <div className="absolute top-4 right-4 flex items-center gap-2 bg-danger/10 text-danger px-3 py-1.5 rounded-btn text-sm pulse-warning">
            <AlertTriangle size={16} />
            <span>含过敏原</span>
          </div>
        )}

        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-brown flex items-center gap-3">
              {dish.name}
              <button onClick={handleToggleFavorite} className="ml-2">
                <Heart
                size={24}
                className={isFavorited ? 'text-danger fill-danger' : 'text-brown-lighter'}
              />
            </button>
            </h1>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-primary">¥{dish.price}</div>
          </div>
        </div>

        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center gap-2">
            {renderStars(Math.round(dish.avg_score || 0))}
            <span className="text-brown-lighter text-sm">
              {dish.avg_score || 0} 分
            </span>
          </div>
          <span className="text-brown-lighter text-sm">
            <MessageSquare size={14} className="inline mr-1" />
            {dish.review_count || 0} 条评价
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 p-4 bg-cream rounded-btn">
          <div>
          <div className="text-sm text-brown-lighter mb-1">热量</div>
          <div className="text-lg font-semibold text-brown">{dish.calories} kcal</div>
        </div>
          <div>
            <div className="text-sm text-brown-lighter mb-1">蛋白质</div>
            <div className="text-lg font-semibold text-brown">{dish.protein} g</div>
          </div>
          <div>
            <div className="text-sm text-brown-lighter mb-1">碳水</div>
            <div className="text-lg font-semibold text-brown">{dish.carbs} g</div>
          </div>
          <div>
            <div className="text-sm text-brown-lighter mb-1">脂肪</div>
            <div className="text-lg font-semibold text-brown">{dish.fat} g</div>
          </div>
        </div>

        <div className="mb-4">
          <div className="text-sm text-brown-lighter mb-2">主要食材</div>
          <div className="text-brown">{dish.ingredients}</div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {(dish.tags || []).map((tag: string) => (
            <span
              key={tag}
              className={`px-3 py-1 rounded-full text-xs font-medium ${TAG_COLORS[tag] || 'bg-gray-200 text-gray-700'}`}
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      {currentUser && (
        <div className="bg-white rounded-card p-6">
          <h3 className="text-lg font-semibold text-brown mb-4">
            {userReview ? '修改我的评价' : '发表评价'}
          </h3>
          <form onSubmit={handleSubmitReview} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-brown mb-2">评分</label>
              {renderStars(rating, true, setRating)}
            </div>
            <div>
              <label className="block text-sm font-medium text-brown mb-2">文字评价</label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="w-full px-4 py-2.5 border border-brown-lighter/30 rounded-btn focus:outline-none focus:ring-2 focus:ring-primary/50 bg-cream/50 resize-none"
                rows={3}
                placeholder="分享你的用餐体验..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-brown mb-2">
                <Camera size={16} className="inline mr-1" />
                照片URL
              </label>
              <input
                type="text"
                value={photoUrl}
                onChange={(e) => setPhotoUrl(e.target.value)}
                className="w-full px-4 py-2.5 border border-brown-lighter/30 rounded-btn focus:outline-none focus:ring-2 focus:ring-primary/50 bg-cream/50"
                placeholder="输入照片链接（可选）"
              />
            </div>
            <button
              type="submit"
              disabled={submitting || rating === 0}
              className="w-full bg-primary hover:bg-primary-dark text-white font-medium py-2.5 rounded-btn transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Send size={16} />
              {submitting ? '提交中...' : userReview ? '更新评价' : '提交评价'}
            </button>
          </form>
        </div>
      )}

      <div className="bg-white rounded-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-brown">全部评价</h3>
          <div className="flex gap-2">
            {[
              { key: 'latest', label: '最新' },
              { key: 'highest', label: '高分' },
              { key: 'lowest', label: '低分' },
            ].map((s) => (
              <button
                key={s.key}
                onClick={() => setSort(s.key)}
                className={`px-3 py-1 text-sm rounded-btn transition-colors ${
                  sort === s.key
                    ? 'bg-primary text-white'
                    : 'bg-cream text-brown hover:bg-primary/10'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {reviews.length === 0 ? (
          <div className="text-center py-8 text-brown-lighter">暂无评价</div>
        ) : (
          <div className="space-y-4">
            {reviews.map((review) => (
              <div key={review.id} className="border-b border-brown-lighter/10 pb-4 last:border-0 last:pb-0">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary">
                      {review.user_name?.[0] || 'U'}
                    </div>
                    <div>
                      <div className="font-medium text-brown">{review.user_name}</div>
                      <div className="text-xs text-brown-lighter">{review.created_at}</div>
                    </div>
                  </div>
                  {renderStars(review.rating)}
                </div>
                {review.comment && (
                  <p className="text-brown-light text-sm mt-2">{review.comment}</p>
                )}
                {review.photo_url && (
                  <img
                  src={review.photo_url}
                  alt="评价图片"
                  className="mt-2 rounded-btn max-w-xs max-h-48 object-cover"
                />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
