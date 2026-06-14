/**
 * This is a API server
 */

import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express'
import cors from 'cors'
import path from 'path'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import authRoutes from './routes/auth.js'
import dishRoutes from './routes/dishes.js'
import menuRoutes from './routes/menus.js'
import reviewRoutes from './routes/reviews.js'
import userRoutes from './routes/users.js'
import recommendRoutes from './routes/recommend.js'
import nutritionRoutes from './routes/nutrition.js'
import statsRoutes from './routes/stats.js'
import favoriteRoutes from './routes/favorites.js'
import voteRoutes from './routes/votes.js'
import postRoutes from './routes/posts.js'
import weeklyRoutes from './routes/weekly.js'
import windowRoutes from './routes/windows.js'

// for esm mode
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// load env
dotenv.config()

const app: express.Application = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

/**
 * API Routes
 */
app.use('/api/auth', authRoutes)
app.use('/api/dishes', dishRoutes)
app.use('/api/menus', menuRoutes)
app.use('/api/reviews', reviewRoutes)
app.use('/api/users', userRoutes)
app.use('/api/recommend', recommendRoutes)
app.use('/api/nutrition', nutritionRoutes)
app.use('/api/stats', statsRoutes)
app.use('/api/favorites', favoriteRoutes)
app.use('/api/votes', voteRoutes)
app.use('/api/posts', postRoutes)
app.use('/api/weekly', weeklyRoutes)
app.use('/api/windows', windowRoutes)

/**
 * health
 */
app.use(
  '/api/health',
  (req: Request, res: Response, next: NextFunction): void => {
    res.status(200).json({
      success: true,
      message: 'ok',
    })
  },
)

/**
 * error handler middleware
 */
app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  res.status(500).json({
    success: false,
    error: 'Server internal error',
  })
})

/**
 * 404 handler
 */
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'API not found',
  })
})

export default app
