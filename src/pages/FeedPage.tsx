import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  MessageSquare, Heart, Send, Image, X, Filter, 
  MoreVertical, Trash2, Edit3, UtensilsCrossed 
} from 'lucide-react'
import useAppStore from '@/store'
import { 
  getPosts, createPost, likePost, commentPost, 
  deletePost, deleteComment, checkPostLiked, getPostComments, getWindows, getDishes
} from '@/services/api'

interface PostProps {
  post: any
  currentUser: any
  onRefresh: () => void
}

function PostCard({ post, currentUser, onRefresh }: PostProps) {
  const navigate = useNavigate()
  const [showComments, setShowComments] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [comments, setComments] = useState<any[]>([])
  const [liked, setLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(post.like_count || 0)
  const [showMenu, setShowMenu] = useState(false)
  const [loadingComments, setLoadingComments] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (currentUser) {
      checkPostLiked(post.id, currentUser.id).then(res => {
        setLiked(res.liked)
      }).catch(() => {})
    }
  }, [post.id, currentUser])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLike = async () => {
    if (!currentUser) return
    try {
      await likePost(post.id, currentUser.id)
      setLiked(!liked)
      setLikeCount(prev => liked ? prev - 1 : prev + 1)
    } catch {}
  }

  const loadComments = async () => {
    if (!showComments) {
      setLoadingComments(true)
      try {
        const data = await getPostComments(post.id)
        setComments(data)
      } catch {}
      setLoadingComments(false)
    }
    setShowComments(!showComments)
  }

  const handleSubmitComment = async () => {
    if (!currentUser || !commentText.trim()) return
    try {
      const newComment = await commentPost(post.id, currentUser.id, commentText.trim())
      setComments([newComment, ...comments])
      setCommentText('')
    } catch {}
  }

  const handleDeletePost = async () => {
    if (!currentUser || post.user_id !== currentUser.id) return
    if (!confirm('确定删除这条动态吗？')) return
    try {
      await deletePost(post.id, currentUser.id)
      onRefresh()
    } catch {}
  }

  const handleDeleteComment = async (commentId: number, commentUserId: number) => {
    if (!currentUser || commentUserId !== currentUser.id) return
    if (!confirm('确定删除这条评论吗？')) return
    try {
      await deleteComment(commentId, currentUser.id)
      setComments(comments.filter(c => c.id !== commentId))
    } catch {}
  }

  const photoUrls = post.photo_urls || []
  const isOwner = currentUser && post.user_id === currentUser.id

  return (
    <div className="bg-white rounded-card p-5 mb-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-white font-bold flex-shrink-0">
            {post.user_name?.[0] || 'U'}
          </div>
          <div>
            <div className="font-medium text-brown">{post.user_name}</div>
            <div className="text-xs text-brown-lighter">{post.created_at}</div>
          </div>
        </div>
        {isOwner && (
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
            >
              <MoreVertical size={18} className="text-brown-lighter" />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10 min-w-[100px]">
                <button
                  onClick={handleDeletePost}
                  className="w-full px-4 py-2 text-left text-sm text-danger hover:bg-danger/10 transition-colors flex items-center gap-2"
                >
                  <Trash2 size={14} />
                  删除
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <p className="text-brown mb-3 whitespace-pre-wrap">{post.content}</p>

      {photoUrls.length > 0 && (
        <div className={`grid gap-2 mb-3 ${
          photoUrls.length === 1 ? 'grid-cols-1' :
          photoUrls.length === 2 ? 'grid-cols-2' :
          'grid-cols-3'
        }`}>
          {photoUrls.map((url: string, idx: number) => (
            <div
              key={idx}
              className="aspect-square bg-cover bg-center rounded-lg"
              style={{ backgroundImage: `url(${url})` }}
            />
          ))}
        </div>
      )}

      {(post.dish_name || post.window_name) && (
        <div 
          className="flex items-center gap-2 text-sm text-primary bg-primary/5 px-3 py-2 rounded-btn mb-3 cursor-pointer hover:bg-primary/10 transition-colors"
          onClick={() => post.dish_id && navigate(`/dish/${post.dish_id}`)}
        >
          <UtensilsCrossed size={14} />
          {post.window_name && <span>{post.window_name}</span>}
          {post.window_name && post.dish_name && <span>·</span>}
          {post.dish_name && <span className="font-medium">{post.dish_name}</span>}
        </div>
      )}

      <div className="flex items-center gap-6 pt-3 border-t border-gray-100">
        <button
          onClick={handleLike}
          className={`flex items-center gap-2 text-sm transition-colors ${
            liked ? 'text-danger' : 'text-brown-lighter hover:text-danger'
          }`}
        >
          <Heart size={18} className={liked ? 'fill-danger' : ''} />
          <span>{likeCount}</span>
        </button>
        <button
          onClick={loadComments}
          className="flex items-center gap-2 text-sm text-brown-lighter hover:text-primary transition-colors"
        >
          <MessageSquare size={18} />
          <span>{post.comment_count || 0}</span>
        </button>
      </div>

      {showComments && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          {currentUser && (
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmitComment()}
                placeholder="写下你的评论..."
                className="flex-1 px-4 py-2 border border-gray-200 rounded-btn text-sm focus:outline-none focus:border-primary"
              />
              <button
                onClick={handleSubmitComment}
                disabled={!commentText.trim()}
                className="px-4 py-2 bg-primary text-white rounded-btn text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary-dark transition-colors"
              >
                <Send size={16} />
              </button>
            </div>
          )}
          {loadingComments ? (
            <div className="text-center py-4 text-brown-lighter text-sm">加载中...</div>
          ) : comments.length === 0 ? (
            <div className="text-center py-4 text-brown-lighter text-sm">暂无评论</div>
          ) : (
            <div className="space-y-3">
              {comments.map((comment) => (
                <div key={comment.id} className="flex gap-2">
                  <div className="w-7 h-7 rounded-full bg-brown/10 flex items-center justify-center text-xs font-bold text-brown flex-shrink-0">
                    {comment.user_name?.[0] || 'U'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-sm font-medium text-brown">{comment.user_name}</span>
                        <span className="text-xs text-brown-lighter ml-2">{comment.created_at}</span>
                      </div>
                      {currentUser && comment.user_id === currentUser.id && (
                        <button
                          onClick={() => handleDeleteComment(comment.id, comment.user_id)}
                          className="text-brown-lighter hover:text-danger transition-colors flex-shrink-0"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                    <p className="text-sm text-brown-light mt-0.5">{comment.content}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function FeedPage() {
  const { currentUser } = useAppStore()
  const [posts, setPosts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newContent, setNewContent] = useState('')
  const [newPhotos, setNewPhotos] = useState<string[]>([])
  const [selectedDish, setSelectedDish] = useState<number | null>(null)
  const [selectedWindow, setSelectedWindow] = useState<number | null>(null)
  const [filterWindow, setFilterWindow] = useState<number | null>(null)
  const [windows, setWindows] = useState<any[]>([])
  const [dishes, setDishes] = useState<any[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [photoUrlInput, setPhotoUrlInput] = useState('')

  useEffect(() => {
    loadData()
    loadWindowsAndDishes()
  }, [filterWindow])

  const loadWindowsAndDishes = async () => {
    try {
      const [wData, dData] = await Promise.all([
        getWindows(),
        getDishes(),
      ])
      setWindows(wData)
      setDishes(dData)
    } catch {}
  }

  const loadData = async () => {
    setLoading(true)
    try {
      const params: any = {}
      if (filterWindow) params.windowId = filterWindow
      const data = await getPosts(params)
      setPosts(data.list || [])
    } catch {
      setPosts([])
    } finally {
      setLoading(false)
    }
  }

  const handleAddPhoto = () => {
    if (!photoUrlInput.trim() || newPhotos.length >= 3) return
    setNewPhotos([...newPhotos, photoUrlInput.trim()])
    setPhotoUrlInput('')
  }

  const handleRemovePhoto = (index: number) => {
    setNewPhotos(newPhotos.filter((_, i) => i !== index))
  }

  const handleSubmitPost = async () => {
    if (!currentUser || !newContent.trim()) return
    setSubmitting(true)
    try {
      await createPost({
        userId: currentUser.id,
        content: newContent.trim(),
        photoUrls: newPhotos,
        dishId: selectedDish,
        windowId: selectedWindow,
      })
      setShowCreateModal(false)
      setNewContent('')
      setNewPhotos([])
      setSelectedDish(null)
      setSelectedWindow(null)
      loadData()
    } catch {
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-brown">食堂动态</h2>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-brown-lighter" />
            <select
              value={filterWindow || ''}
              onChange={(e) => setFilterWindow(e.target.value ? Number(e.target.value) : null)}
              className="px-3 py-2 border border-gray-200 rounded-btn text-sm bg-white focus:outline-none focus:border-primary"
            >
              <option value="">全部窗口</option>
              {windows.map(w => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </div>
          {currentUser && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-btn text-sm font-medium transition-colors flex items-center gap-2"
            >
              <Edit3 size={16} />
              发布动态
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-brown-lighter">加载中...</div>
      ) : posts.length === 0 ? (
        <div className="text-center py-12 text-brown-lighter">
          <MessageSquare size={48} className="mx-auto mb-3 opacity-50" />
          <p>还没有动态，快来发布第一条吧！</p>
        </div>
      ) : (
        <div className="max-w-2xl mx-auto">
          {posts.map(post => (
            <PostCard
              key={post.id}
              post={post}
              currentUser={currentUser}
              onRefresh={loadData}
            />
          ))}
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-brown">发布动态</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={20} className="text-brown-lighter" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <textarea
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                placeholder="分享你的用餐体验..."
                className="w-full h-32 px-4 py-3 border border-gray-200 rounded-btn resize-none focus:outline-none focus:border-primary"
                maxLength={500}
              />
              <div className="text-xs text-brown-lighter text-right">
                {newContent.length}/500
              </div>

              <div>
                <label className="block text-sm font-medium text-brown mb-2">图片链接（最多3张）</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={photoUrlInput}
                    onChange={(e) => setPhotoUrlInput(e.target.value)}
                    placeholder="输入图片URL"
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-btn text-sm focus:outline-none focus:border-primary"
                    onKeyDown={(e) => e.key === 'Enter' && handleAddPhoto()}
                  />
                  <button
                    onClick={handleAddPhoto}
                    disabled={!photoUrlInput.trim() || newPhotos.length >= 3}
                    className="px-3 py-2 bg-brown/10 text-brown rounded-btn text-sm disabled:opacity-50 hover:bg-brown/20 transition-colors"
                  >
                    <Image size={16} />
                  </button>
                </div>
                {newPhotos.length > 0 && (
                  <div className="flex gap-2 mt-2">
                    {newPhotos.map((url, idx) => (
                      <div key={idx} className="relative">
                        <div
                          className="w-16 h-16 bg-cover bg-center rounded-lg"
                          style={{ backgroundImage: `url(${url})` }}
                        />
                        <button
                          onClick={() => handleRemovePhoto(idx)}
                          className="absolute -top-1 -right-1 w-5 h-5 bg-danger text-white rounded-full flex items-center justify-center"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-brown mb-2">关联窗口</label>
                  <select
                    value={selectedWindow || ''}
                    onChange={(e) => setSelectedWindow(e.target.value ? Number(e.target.value) : null)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-btn text-sm bg-white focus:outline-none focus:border-primary"
                  >
                    <option value="">不关联</option>
                    {windows.map(w => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-brown mb-2">关联菜品</label>
                  <select
                    value={selectedDish || ''}
                    onChange={(e) => setSelectedDish(e.target.value ? Number(e.target.value) : null)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-btn text-sm bg-white focus:outline-none focus:border-primary"
                  >
                    <option value="">不关联</option>
                    {dishes.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-4 border-t border-gray-200">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-5 py-2 text-brown hover:bg-gray-100 rounded-btn transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSubmitPost}
                disabled={!newContent.trim() || submitting}
                className="px-5 py-2 bg-primary text-white rounded-btn hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {submitting ? '发布中...' : '发布'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
