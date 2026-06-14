import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogIn } from 'lucide-react'
import useAppStore from '@/store'
import { loginUser } from '@/services/api'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { setCurrentUser } = useAppStore()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const user = await loginUser(username, password)
      setCurrentUser(user)
      navigate('/')
    } catch (err: any) {
      setError(err.message || '登录失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-card shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-primary to-primary-dark p-8 text-center">
            <h1 className="text-3xl font-bold text-white">🍽️ 食堂点评</h1>
            <p className="text-white/80 mt-2">发现美味，分享评价</p>
          </div>
          <form onSubmit={handleSubmit} className="p-8 space-y-5">
            {error && (
              <div className="bg-danger/10 text-danger px-4 py-2 rounded-btn text-sm">
                {error}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-brown mb-1.5">用户名</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-2.5 border border-brown-lighter/30 rounded-btn focus:outline-none focus:ring-2 focus:ring-primary/50 bg-cream/50"
                placeholder="请输入用户名"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-brown mb-1.5">密码</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 border border-brown-lighter/30 rounded-btn focus:outline-none focus:ring-2 focus:ring-primary/50 bg-cream/50"
                placeholder="请输入密码"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary-dark text-white font-medium py-2.5 rounded-btn transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <LogIn size={18} />
              {loading ? '登录中...' : '登录'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
