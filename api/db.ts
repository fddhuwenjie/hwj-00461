import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

const dbDir = path.resolve(process.cwd(), 'data')
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true })
}

const dbPath = path.resolve(dbDir, 'canteen.db')
const db = new Database(dbPath)

db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    avatar TEXT DEFAULT '',
    allergens TEXT DEFAULT '[]'
  );
  CREATE TABLE IF NOT EXISTS windows (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS dishes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    price REAL NOT NULL,
    calories INTEGER NOT NULL,
    protein REAL DEFAULT 0,
    carbs REAL DEFAULT 0,
    fat REAL DEFAULT 0,
    ingredients TEXT NOT NULL,
    tags TEXT DEFAULT '[]'
  );
  CREATE TABLE IF NOT EXISTS menus (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    meal TEXT NOT NULL CHECK(meal IN ('早餐','午餐','晚餐')),
    window_id INTEGER NOT NULL REFERENCES windows(id)
  );
  CREATE TABLE IF NOT EXISTS menu_dishes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    menu_id INTEGER NOT NULL REFERENCES menus(id) ON DELETE CASCADE,
    dish_id INTEGER NOT NULL REFERENCES dishes(id)
  );
  CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    dish_id INTEGER NOT NULL REFERENCES dishes(id),
    rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
    comment TEXT DEFAULT '',
    photo_url TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, dish_id)
  );
  CREATE TABLE IF NOT EXISTS favorites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    dish_id INTEGER NOT NULL REFERENCES dishes(id),
    UNIQUE(user_id, dish_id)
  );
  CREATE TABLE IF NOT EXISTS user_selections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    dish_id INTEGER NOT NULL REFERENCES dishes(id),
    date TEXT NOT NULL,
    UNIQUE(user_id, dish_id, date)
  );
  CREATE TABLE IF NOT EXISTS vote_pools (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    window_id INTEGER NOT NULL REFERENCES windows(id),
    dish_id INTEGER NOT NULL REFERENCES dishes(id),
    UNIQUE(date, window_id, dish_id)
  );
  CREATE TABLE IF NOT EXISTS votes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    vote_pool_id INTEGER NOT NULL REFERENCES vote_pools(id),
    date TEXT NOT NULL,
    window_id INTEGER NOT NULL,
    dish_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, date, window_id, dish_id)
  );
  CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    content TEXT NOT NULL,
    photo_urls TEXT DEFAULT '[]',
    dish_id INTEGER REFERENCES dishes(id),
    window_id INTEGER REFERENCES windows(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS post_likes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, post_id)
  );
  CREATE TABLE IF NOT EXISTS post_comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS weekly_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id),
    week_start TEXT NOT NULL,
    week_end TEXT NOT NULL,
    report_type TEXT NOT NULL CHECK(report_type IN ('personal', 'canteen')),
    report_data TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, week_start, report_type)
  );

  CREATE INDEX IF NOT EXISTS idx_reviews_dish ON reviews(dish_id);
  CREATE INDEX IF NOT EXISTS idx_reviews_user ON reviews(user_id);
  CREATE INDEX IF NOT EXISTS idx_menus_date_meal ON menus(date, meal);
  CREATE INDEX IF NOT EXISTS idx_selections_user_date ON user_selections(user_id, date);
  CREATE INDEX IF NOT EXISTS idx_votes_date_window ON votes(date, window_id);
  CREATE INDEX IF NOT EXISTS idx_votes_user_date ON votes(user_id, date);
  CREATE INDEX IF NOT EXISTS idx_vote_pools_date ON vote_pools(date);
  CREATE INDEX IF NOT EXISTS idx_posts_created ON posts(created_at);
  CREATE INDEX IF NOT EXISTS idx_posts_user ON posts(user_id);
  CREATE INDEX IF NOT EXISTS idx_posts_window ON posts(window_id);
  CREATE INDEX IF NOT EXISTS idx_posts_dish ON posts(dish_id);
  CREATE INDEX IF NOT EXISTS idx_post_comments_post ON post_comments(post_id);
  CREATE INDEX IF NOT EXISTS idx_post_likes_post ON post_likes(post_id);
  CREATE INDEX IF NOT EXISTS idx_weekly_reports_user ON weekly_reports(user_id, week_start);
`)

const count = db.prepare('SELECT COUNT(*) as c FROM users').get() as { c: number }
if (count.c === 0) {
  const insertWindow = db.prepare('INSERT INTO windows (name) VALUES (?)')
  insertWindow.run('川味小炒')
  insertWindow.run('家常炖菜')
  insertWindow.run('轻食沙拉')

  const insertUser = db.prepare('INSERT INTO users (username, password, name, avatar, allergens) VALUES (?, ?, ?, ?, ?)')
  insertUser.run('zhangwei', '123456', '张伟', '', '[]')
  insertUser.run('lina', '123456', '李娜', '', '["花生"]')
  insertUser.run('wangqiang', '123456', '王强', '', '[]')
  insertUser.run('liuyang', '123456', '刘洋', '', '[]')
  insertUser.run('chenjing', '123456', '陈静', '', '["海鲜"]')
  insertUser.run('zhaoming', '123456', '赵明', '', '[]')
  insertUser.run('sunli', '123456', '孙丽', '', '["乳制品"]')
  insertUser.run('zhoulei', '123456', '周磊', '', '[]')
  insertUser.run('wufang', '123456', '吴芳', '', '[]')
  insertUser.run('zhengtao', '123456', '郑涛', '', '[]')

  const insertDish = db.prepare(
    'INSERT INTO dishes (name, price, calories, protein, carbs, fat, ingredients, tags) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  )

  // 窗口1 川味小炒 (dishes 1-20)
  insertDish.run('麻婆豆腐', 12, 280, 18, 12, 18, '豆腐/猪肉末/花椒', '["辣"]')
  insertDish.run('宫保鸡丁', 15, 350, 28, 15, 20, '鸡胸肉/花生/干辣椒', '["辣","花生"]')
  insertDish.run('水煮鱼片', 18, 380, 32, 10, 22, '草鱼/豆芽/辣椒', '["辣","海鲜"]')
  insertDish.run('回锅肉', 16, 420, 22, 12, 30, '五花肉/青椒/蒜苗', '["辣"]')
  insertDish.run('鱼香肉丝', 14, 320, 20, 18, 18, '猪肉/木耳/笋丝', '["辣"]')
  insertDish.run('辣子鸡', 16, 360, 26, 10, 24, '鸡肉/干辣椒/花椒', '["辣"]')
  insertDish.run('干煸四季豆', 12, 240, 8, 16, 14, '四季豆/肉末/干辣椒', '["辣"]')
  insertDish.run('重庆小面', 10, 380, 12, 52, 14, '面条/辣椒/花生', '["辣","花生"]')
  insertDish.run('毛血旺', 20, 450, 30, 12, 32, '鸭血/毛肚/黄豆芽', '["辣","海鲜"]')
  insertDish.run('蒜泥白肉', 15, 300, 24, 4, 22, '五花肉/蒜泥/辣椒油', '["辣"]')
  insertDish.run('泡椒凤爪', 12, 180, 16, 6, 10, '鸡爪/泡椒', '["辣"]')
  insertDish.run('口水鸡', 16, 320, 28, 8, 20, '鸡肉/花生/辣椒油', '["辣","花生"]')
  insertDish.run('酸菜鱼', 18, 360, 30, 14, 20, '草鱼/酸菜', '["海鲜"]')
  insertDish.run('红烧肥肠', 18, 400, 18, 12, 32, '猪大肠/辣椒', '["辣"]')
  insertDish.run('夫妻肺片', 16, 280, 24, 6, 18, '牛肉/牛杂/花生', '["辣","花生"]')
  insertDish.run('东坡肘子', 22, 480, 26, 8, 38, '猪肘子', '[]')
  insertDish.run('甜水面', 10, 350, 8, 58, 12, '面条/红糖/花生', '["花生"]')
  insertDish.run('担担面', 12, 380, 14, 48, 16, '面条/肉末/花生', '["辣","花生"]')
  insertDish.run('蚂蚁上树', 13, 300, 16, 22, 16, '粉丝/肉末', '["辣"]')
  insertDish.run('钵钵鸡', 15, 260, 22, 8, 16, '鸡肉/花生/芝麻', '["辣","花生"]')

  // 窗口2 家常炖菜 (dishes 21-40)
  insertDish.run('红烧肉', 16, 450, 18, 12, 38, '五花肉/冰糖/酱油', '[]')
  insertDish.run('番茄炖牛腩', 20, 380, 28, 16, 22, '牛腩/番茄/土豆', '[]')
  insertDish.run('排骨炖豆角', 18, 360, 24, 14, 22, '排骨/豆角/土豆', '[]')
  insertDish.run('小鸡炖蘑菇', 18, 340, 26, 12, 20, '鸡肉/榛蘑/粉条', '[]')
  insertDish.run('酸菜白肉', 15, 320, 20, 8, 24, '五花肉/酸菜', '[]')
  insertDish.run('鲶鱼炖豆腐', 17, 350, 28, 14, 18, '鲶鱼/豆腐', '["海鲜"]')
  insertDish.run('猪肉炖粉条', 14, 380, 16, 28, 22, '五花肉/粉条/白菜', '[]')
  insertDish.run('羊肉炖萝卜', 20, 340, 26, 12, 20, '羊肉/白萝卜', '[]')
  insertDish.run('铁锅炖大鹅', 22, 420, 30, 10, 28, '鹅肉/土豆/宽粉', '[]')
  insertDish.run('地三鲜', 12, 260, 8, 20, 16, '茄子/土豆/青椒', '["素"]')
  insertDish.run('白菜炖豆腐', 10, 180, 10, 14, 8, '白菜/豆腐', '["素","低脂"]')
  insertDish.run('土豆炖牛肉', 18, 360, 26, 18, 20, '牛肉/土豆/胡萝卜', '[]')
  insertDish.run('海带排骨汤', 15, 220, 18, 8, 12, '排骨/海带', '["低脂"]')
  insertDish.run('玉米排骨汤', 14, 240, 16, 16, 10, '排骨/玉米', '["低脂"]')
  insertDish.run('萝卜炖牛筋', 18, 300, 24, 12, 16, '牛筋/白萝卜', '[]')
  insertDish.run('乱炖', 14, 340, 14, 22, 20, '猪肉/土豆/茄子/豆角', '[]')
  insertDish.run('清炖羊肉', 22, 320, 28, 6, 20, '羊肉/枸杞/大枣', '[]')
  insertDish.run('红烧狮子头', 16, 380, 22, 10, 28, '猪肉/荸荠/鸡蛋', '[]')
  insertDish.run('老鸭汤', 20, 280, 24, 8, 16, '老鸭/酸萝卜', '[]')
  insertDish.run('砂锅鱼头', 18, 300, 26, 10, 18, '鱼头/豆腐', '["海鲜"]')

  // 窗口3 轻食沙拉 (dishes 41-60)
  insertDish.run('凯撒沙拉', 18, 220, 14, 12, 12, '生菜/面包丁/帕玛森芝士', '["乳制品"]')
  insertDish.run('鸡胸肉沙拉', 20, 260, 28, 10, 12, '鸡胸肉/混合生菜', '["低脂"]')
  insertDish.run('牛油果三文鱼', 25, 320, 22, 8, 24, '牛油果/三文鱼', '["海鲜"]')
  insertDish.run('藜麦蔬菜碗', 18, 280, 12, 36, 8, '藜麦/西兰花/胡萝卜', '["素","低脂"]')
  insertDish.run('希腊酸奶碗', 16, 200, 16, 22, 6, '希腊酸奶/蓝莓/蜂蜜', '["乳制品"]')
  insertDish.run('烤鸡胸肉', 18, 240, 32, 4, 8, '鸡胸肉/黑胡椒', '["低脂"]')
  insertDish.run('金枪鱼三明治', 20, 300, 24, 28, 12, '金枪鱼/全麦面包', '["海鲜"]')
  insertDish.run('虾仁牛油果碗', 24, 280, 26, 10, 16, '虾仁/牛油果', '["海鲜"]')
  insertDish.run('减脂鸡胸便当', 22, 300, 30, 24, 10, '鸡胸肉/糙米/西兰花', '["低脂"]')
  insertDish.run('蔬菜卷饼', 16, 240, 8, 28, 10, '全麦饼/生菜/黄瓜', '["素"]')
  insertDish.run('水果燕麦碗', 14, 260, 8, 42, 6, '燕麦/香蕉/蓝莓', '["素"]')
  insertDish.run('烟熏三文鱼贝果', 22, 310, 20, 26, 14, '烟熏三文鱼/贝果', '["海鲜"]')
  insertDish.run('豆腐蔬菜汤', 12, 160, 10, 14, 6, '豆腐/蘑菇/青菜', '["素","低脂"]')
  insertDish.run('鸡肉卷', 18, 320, 22, 28, 12, '鸡胸肉/卷饼皮/蔬菜', '[]')
  insertDish.run('地中海沙拉', 20, 240, 10, 18, 14, '生菜/橄榄/羊奶酪', '["乳制品"]')
  insertDish.run('糙米鸡胸碗', 20, 340, 28, 36, 10, '糙米/鸡胸肉/玉米', '["低脂"]')
  insertDish.run('蘑菇汤', 14, 180, 6, 16, 8, '蘑菇/奶油/洋葱', '["乳制品"]')
  insertDish.run('蔬菜意面', 18, 320, 10, 46, 10, '意面/番茄/西葫芦', '["素"]')
  insertDish.run('鸡蛋牛油果吐司', 16, 290, 14, 22, 16, '鸡蛋/牛油果/全麦吐司', '[]')
  insertDish.run('凉拌黄瓜', 8, 80, 2, 8, 4, '黄瓜/蒜/醋', '["素","低脂"]')

  // Menus: 5 days × 3 windows × 午餐
  const dates = ['2026-06-15', '2026-06-16', '2026-06-17', '2026-06-18', '2026-06-19']
  const insertMenu = db.prepare('INSERT INTO menus (date, meal, window_id) VALUES (?, ?, ?)')
  const insertMenuDish = db.prepare('INSERT INTO menu_dishes (menu_id, dish_id) VALUES (?, ?)')

  const windowDishes: Record<number, number[][]> = {
    1: [
      [1, 2, 3, 4],
      [5, 6, 7, 8],
      [9, 10, 11, 12],
      [13, 14, 15, 16],
      [17, 18, 19, 20],
    ],
    2: [
      [21, 22, 23, 24],
      [25, 26, 27, 28],
      [29, 30, 31, 32],
      [33, 34, 35, 36],
      [37, 38, 39, 40],
    ],
    3: [
      [41, 42, 43, 44],
      [45, 46, 47, 48],
      [49, 50, 51, 52],
      [53, 54, 55, 56],
      [57, 58, 59, 60],
    ],
  }

  for (let di = 0; di < dates.length; di++) {
    for (let w = 1; w <= 3; w++) {
      const info = insertMenu.run(dates[di], '午餐', w)
      const menuId = info.lastInsertRowid as number
      for (const dishId of windowDishes[w][di]) {
        insertMenuDish.run(menuId, dishId)
      }
    }
  }

  // 50 Reviews
  const insertReview = db.prepare(
    'INSERT INTO reviews (user_id, dish_id, rating, comment, photo_url, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  )
  const reviewsData: [number, number, number, string, string, string, string][] = [
    [1, 1, 5, '非常正宗的麻婆豆腐，麻辣鲜香！', '/photos/mapo.jpg', '2026-06-15 12:30:00', '2026-06-15 12:30:00'],
    [2, 41, 4, '沙拉很新鲜，酱汁也很地道', '', '2026-06-15 12:15:00', '2026-06-15 12:15:00'],
    [3, 2, 3, '味道还行，花生不够脆', '', '2026-06-15 12:20:00', '2026-06-15 12:20:00'],
    [4, 21, 5, '红烧肉做得太好了，肥而不腻！', '/photos/hongshaorou.jpg', '2026-06-15 12:10:00', '2026-06-15 12:10:00'],
    [5, 42, 4, '鸡胸肉很嫩，低脂健康', '', '2026-06-15 12:25:00', '2026-06-15 12:25:00'],
    [6, 5, 4, '鱼香肉丝味道不错，酸甜适中', '', '2026-06-16 12:05:00', '2026-06-16 12:05:00'],
    [7, 45, 5, '希腊酸奶碗很好吃，水果也新鲜', '', '2026-06-16 12:10:00', '2026-06-16 12:10:00'],
    [8, 25, 3, '酸菜白肉一般般，酸菜不够酸', '', '2026-06-16 12:15:00', '2026-06-16 12:15:00'],
    [9, 6, 5, '辣子鸡辣得过瘾，很下饭！', '', '2026-06-16 12:20:00', '2026-06-16 12:20:00'],
    [10, 46, 4, '烤鸡胸肉很健康，就是有点干', '', '2026-06-16 12:25:00', '2026-06-16 12:25:00'],
    [1, 9, 4, '毛血旺料很足，鸭血很嫩', '/photos/maoxuewang.jpg', '2026-06-17 12:05:00', '2026-06-17 12:05:00'],
    [2, 29, 3, '地三鲜油有点多，不太健康', '', '2026-06-17 12:10:00', '2026-06-17 12:10:00'],
    [3, 10, 4, '蒜泥白肉蒜味浓郁，很香', '', '2026-06-17 12:15:00', '2026-06-17 12:15:00'],
    [4, 49, 5, '藜麦蔬菜碗很健康，营养均衡', '', '2026-06-17 12:20:00', '2026-06-17 12:20:00'],
    [5, 13, 4, '酸菜鱼鱼肉鲜嫩，汤也好喝', '', '2026-06-17 12:25:00', '2026-06-17 12:25:00'],
    [6, 33, 3, '海带排骨汤味道淡了点', '', '2026-06-18 12:05:00', '2026-06-18 12:05:00'],
    [7, 53, 4, '金枪鱼三明治很方便，味道也行', '', '2026-06-18 12:10:00', '2026-06-18 12:10:00'],
    [8, 14, 2, '红烧肥肠太油腻了，不太好吃', '', '2026-06-18 12:15:00', '2026-06-18 12:15:00'],
    [9, 17, 3, '甜水面味道还行，但有点甜', '', '2026-06-18 12:20:00', '2026-06-18 12:20:00'],
    [10, 37, 4, '清炖羊肉汤很鲜美，冬天喝舒服', '/photos/yangrou.jpg', '2026-06-18 12:25:00', '2026-06-18 12:25:00'],
    [1, 57, 4, '水果燕麦碗很清爽，适合当早餐', '', '2026-06-19 12:05:00', '2026-06-19 12:05:00'],
    [2, 38, 3, '红烧狮子头肉质一般，不太弹', '', '2026-06-19 12:10:00', '2026-06-19 12:10:00'],
    [3, 18, 4, '担担面很正宗，辣味十足', '', '2026-06-19 12:15:00', '2026-06-19 12:15:00'],
    [4, 22, 5, '番茄炖牛腩太好吃了，牛腩很烂', '/photos/niunan.jpg', '2026-06-19 12:20:00', '2026-06-19 12:20:00'],
    [5, 43, 5, '牛油果三文鱼很新鲜，搭配绝了', '', '2026-06-19 12:25:00', '2026-06-19 12:25:00'],
    [6, 23, 4, '排骨炖豆角很入味，排骨也多', '', '2026-06-15 12:35:00', '2026-06-15 12:35:00'],
    [7, 54, 3, '虾仁牛油果碗虾仁有点少', '', '2026-06-15 12:40:00', '2026-06-15 12:40:00'],
    [8, 7, 4, '干煸四季豆很香，脆脆的', '', '2026-06-15 12:45:00', '2026-06-15 12:45:00'],
    [9, 44, 4, '藜麦蔬菜碗很健康，口感丰富', '', '2026-06-15 12:50:00', '2026-06-15 12:50:00'],
    [10, 24, 5, '小鸡炖蘑菇很有东北味，好吃！', '', '2026-06-15 12:55:00', '2026-06-15 12:55:00'],
    [1, 21, 4, '红烧肉味道不错，就是有点咸', '', '2026-06-16 12:30:00', '2026-06-16 12:30:00'],
    [2, 6, 3, '辣子鸡太辣了，不太能接受', '', '2026-06-16 12:35:00', '2026-06-16 12:35:00'],
    [3, 26, 4, '鲶鱼炖豆腐鱼肉很嫩', '', '2026-06-16 12:40:00', '2026-06-16 12:40:00'],
    [4, 50, 3, '水果燕麦碗燕麦有点硬', '', '2026-06-16 12:45:00', '2026-06-16 12:45:00'],
    [5, 11, 4, '白菜炖豆腐清淡健康，不错', '', '2026-06-16 12:50:00', '2026-06-16 12:50:00'],
    [6, 30, 5, '白菜炖豆腐很家常，吃得很舒服', '', '2026-06-17 12:30:00', '2026-06-17 12:30:00'],
    [7, 55, 4, '减脂鸡胸便当很实用，蛋白质足', '', '2026-06-17 12:35:00', '2026-06-17 12:35:00'],
    [8, 15, 2, '夫妻肺片太辣了，而且花生有点哈喇味', '', '2026-06-17 12:40:00', '2026-06-17 12:40:00'],
    [9, 35, 3, '萝卜炖牛筋牛筋有点硬，嚼不动', '', '2026-06-17 12:45:00', '2026-06-17 12:45:00'],
    [10, 58, 4, '烟熏三文鱼贝果很赞', '', '2026-06-17 12:50:00', '2026-06-17 12:50:00'],
    [1, 41, 3, '凯撒沙拉分量有点少', '', '2026-06-18 12:30:00', '2026-06-18 12:30:00'],
    [2, 20, 4, '钵钵鸡很入味，又辣又香', '', '2026-06-18 12:35:00', '2026-06-18 12:35:00'],
    [3, 32, 5, '土豆炖牛肉非常入味，牛肉很烂', '/photos/tudouniurou.jpg', '2026-06-18 12:40:00', '2026-06-18 12:40:00'],
    [4, 48, 1, '烟熏三文鱼贝果三明治不新鲜，面包很硬', '', '2026-06-18 12:45:00', '2026-06-18 12:45:00'],
    [5, 8, 2, '重庆小面太辣太油了，不太适合我', '', '2026-06-18 12:50:00', '2026-06-18 12:50:00'],
    [6, 40, 4, '砂锅鱼头汤很鲜，豆腐也好吃', '', '2026-06-19 12:30:00', '2026-06-19 12:30:00'],
    [7, 59, 5, '豆腐蔬菜汤很清淡很舒服，减脂必选', '', '2026-06-19 12:35:00', '2026-06-19 12:35:00'],
    [8, 19, 3, '蚂蚁上树粉丝有点糊了', '', '2026-06-19 12:40:00', '2026-06-19 12:40:00'],
    [9, 36, 1, '乱炖太咸了，味道混乱', '', '2026-06-19 12:45:00', '2026-06-19 12:45:00'],
    [10, 60, 5, '凉拌黄瓜清脆爽口，夏天必点！', '', '2026-06-19 12:50:00', '2026-06-19 12:50:00'],
  ]
  for (const r of reviewsData) {
    insertReview.run(r[0], r[1], r[2], r[3], r[4], r[5], r[6])
  }

  // Favorites
  const insertFav = db.prepare('INSERT INTO favorites (user_id, dish_id) VALUES (?, ?)')
  const favs: [number, number][] = [
    [1, 1], [1, 9], [1, 21],
    [2, 41], [2, 45], [2, 13],
    [3, 2], [3, 32], [3, 22],
    [4, 22], [4, 24], [4, 49],
    [5, 42], [5, 43], [5, 11],
    [6, 5], [6, 23], [6, 40],
    [7, 45], [7, 55], [7, 59],
    [8, 7], [8, 20], [8, 26],
    [9, 6], [9, 17], [9, 44],
    [10, 24], [10, 37], [10, 60],
  ]
  for (const f of favs) {
    insertFav.run(f[0], f[1])
  }

  // User selections (sample)
  const insertSelection = db.prepare('INSERT INTO user_selections (user_id, dish_id, date) VALUES (?, ?, ?)')
  const selections: [number, number, string][] = [
    [1, 1, '2026-06-15'], [1, 21, '2026-06-15'], [1, 41, '2026-06-15'],
    [2, 2, '2026-06-15'], [2, 41, '2026-06-15'],
    [3, 3, '2026-06-15'], [3, 22, '2026-06-15'],
    [4, 4, '2026-06-15'], [4, 23, '2026-06-15'], [4, 42, '2026-06-15'],
    [5, 5, '2026-06-16'], [5, 25, '2026-06-16'], [5, 45, '2026-06-16'],
    [6, 6, '2026-06-16'], [6, 26, '2026-06-16'],
    [7, 7, '2026-06-16'], [7, 46, '2026-06-16'],
    [8, 8, '2026-06-17'], [8, 27, '2026-06-17'],
    [9, 9, '2026-06-17'], [9, 29, '2026-06-17'], [9, 49, '2026-06-17'],
    [10, 10, '2026-06-17'], [10, 30, '2026-06-17'], [10, 50, '2026-06-17'],
  ]
  for (const s of selections) {
    insertSelection.run(s[0], s[1], s[2])
  }

  const insertVotePool = db.prepare('INSERT INTO vote_pools (date, window_id, dish_id) VALUES (?, ?, ?)')
  const tomorrowDate = new Date()
  tomorrowDate.setDate(tomorrowDate.getDate() + 1)
  const tomorrow = tomorrowDate.toISOString().split('T')[0]
  const poolDishes: Record<number, number[][]> = {
    1: [[1, 2, 3, 4, 5, 6, 7, 8, 9], [10, 11, 12, 13, 14, 15, 16, 17, 18, 19]],
    2: [[21, 22, 23, 24, 25, 26, 27, 28, 29], [30, 31, 32, 33, 34, 35, 36, 37, 38, 39]],
    3: [[41, 42, 43, 44, 45, 46, 47, 48, 49], [50, 51, 52, 53, 54, 55, 56, 57, 58, 59]],
  }
  for (let w = 1; w <= 3; w++) {
    const allDishes = [...poolDishes[w][0], ...poolDishes[w][1]].slice(0, 9)
    for (const dishId of allDishes) {
      insertVotePool.run(tomorrow, w, dishId)
    }
  }

  const insertVote = db.prepare('INSERT INTO votes (user_id, vote_pool_id, date, window_id, dish_id) VALUES (?, ?, ?, ?, ?)')
  const votePoolData = db.prepare('SELECT id, date, window_id, dish_id FROM vote_pools').all() as any[]
  const vpMap = new Map(votePoolData.map(v => [`${v.date}-${v.window_id}-${v.dish_id}`, v.id]))
  const sampleVotes: [number, string, number, number][] = [
    [1, '2026-06-15', 1, 1], [1, '2026-06-15', 1, 2],
    [1, '2026-06-15', 2, 21], [1, '2026-06-15', 2, 22],
    [1, '2026-06-15', 3, 41], [1, '2026-06-15', 3, 42],
    [2, '2026-06-15', 1, 1], [2, '2026-06-15', 1, 3],
    [2, '2026-06-15', 2, 21], [2, '2026-06-15', 2, 23],
    [2, '2026-06-15', 3, 41], [2, '2026-06-15', 3, 43],
    [3, '2026-06-15', 1, 2], [3, '2026-06-15', 1, 4],
    [3, '2026-06-15', 2, 22], [3, '2026-06-15', 2, 24],
    [3, '2026-06-15', 3, 42], [3, '2026-06-15', 3, 44],
    [4, '2026-06-15', 1, 1], [4, '2026-06-15', 1, 5],
    [4, '2026-06-15', 2, 21], [4, '2026-06-15', 2, 25],
    [4, '2026-06-15', 3, 45], [4, '2026-06-15', 3, 46],
    [5, '2026-06-15', 1, 3], [5, '2026-06-15', 1, 6],
    [5, '2026-06-15', 2, 23], [5, '2026-06-15', 2, 26],
    [5, '2026-06-15', 3, 42], [5, '2026-06-15', 3, 47],
    [6, '2026-06-15', 1, 1], [6, '2026-06-15', 1, 7],
    [6, '2026-06-15', 2, 22], [6, '2026-06-15', 2, 27],
    [6, '2026-06-15', 3, 48], [6, '2026-06-15', 3, 49],
    [7, '2026-06-15', 1, 2], [7, '2026-06-15', 1, 8],
    [7, '2026-06-15', 2, 24], [7, '2026-06-15', 2, 28],
    [7, '2026-06-15', 3, 45], [7, '2026-06-15', 3, 43],
    [8, '2026-06-15', 1, 4], [8, '2026-06-15', 1, 9],
    [8, '2026-06-15', 2, 21], [8, '2026-06-15', 2, 29],
    [8, '2026-06-15', 3, 41], [8, '2026-06-15', 3, 44],
    [9, '2026-06-15', 1, 5], [9, '2026-06-15', 1, 2],
    [9, '2026-06-15', 2, 22], [9, '2026-06-15', 2, 23],
    [9, '2026-06-15', 3, 46], [9, '2026-06-15', 3, 42],
    [10, '2026-06-15', 1, 1], [10, '2026-06-15', 1, 3],
    [10, '2026-06-15', 2, 24], [10, '2026-06-15', 2, 21],
    [10, '2026-06-15', 3, 41], [10, '2026-06-15', 3, 45],
  ]
  for (const [userId, date, windowId, dishId] of sampleVotes) {
    const vpId = vpMap.get(`${date}-${windowId}-${dishId}`)
    if (vpId) {
      insertVote.run(userId, vpId, date, windowId, dishId)
    }
  }

  const insertPost = db.prepare('INSERT INTO posts (user_id, content, photo_urls, dish_id, window_id, created_at) VALUES (?, ?, ?, ?, ?, ?)')
  const samplePosts: [number, string, string, number | null, number | null, string][] = [
    [1, '今天的麻婆豆腐太好吃了！麻辣鲜香，配米饭绝了👍', '["/photos/mapo.jpg"]', 1, 1, '2026-06-15 12:35:00'],
    [2, '轻食沙拉很新鲜，酱汁调得很棒，健康又美味🥗', '[]', 41, 3, '2026-6-15 12:20:00'],
    [4, '红烧肉肥而不腻，入口即化，强烈推荐！', '["/photos/hongshaorou.jpg"]', 21, 2, '2026-06-15 12:15:00'],
    [5, '烤鸡胸肉很嫩，减脂期必备，每天都来打卡💪', '[]', 46, 3, '2026-06-15 12:30:00'],
    [1, '毛血旺料超足，鸭血很嫩，麻辣过瘾🌶️', '["/photos/maoxuewang.jpg"]', 9, 1, '2026-06-17 12:10:00'],
    [10, '凉拌黄瓜清脆爽口，夏天必点！', '[]', 60, 3, '2026-06-19 12:55:00'],
    [4, '番茄炖牛腩太好吃了，牛腩炖得很烂，汤都喝光了🍅', '["/photos/niunan.jpg"]', 22, 2, '2026-06-19 12:25:00'],
    [6, '土豆炖牛肉非常入味，牛肉很烂，性价比高', '["/photos/tudouniurou.jpg"]', 32, 2, '2026-06-18 12:45:00'],
    [7, '清炖羊肉汤很鲜美，冬天喝很暖和，推荐！', '["/photos/yangrou.jpg"]', 37, 2, '2026-06-18 12:30:00'],
    [3, '宫保鸡丁味道还行，就是花生不够脆，希望改进', '[]', 2, 1, '2026-06-15 12:25:00'],
    [8, '辣子鸡辣得过瘾，很下饭！就是油有点多', '[]', 6, 1, '2026-06-16 12:25:00'],
    [2, '希腊酸奶碗很好吃，水果也新鲜，早餐首选', '[]', 45, 3, '2026-06-16 12:15:00'],
  ]
  for (const p of samplePosts) {
    insertPost.run(p[0], p[1], p[2], p[3], p[4], p[5])
  }

  const insertLike = db.prepare('INSERT INTO post_likes (user_id, post_id) VALUES (?, ?)')
  const sampleLikes: [number, number][] = [
    [2, 1], [3, 1], [4, 1], [5, 1],
    [1, 2], [3, 2], [6, 2],
    [1, 3], [2, 3], [5, 3], [6, 3], [7, 3],
    [1, 4], [2, 4], [3, 4],
    [2, 5], [3, 5], [4, 5], [6, 5], [7, 5],
    [1, 6], [2, 6], [3, 6], [4, 6],
    [1, 7], [2, 7], [3, 7], [5, 7], [8, 7],
    [1, 8], [2, 8], [4, 8], [5, 8],
    [1, 9], [3, 9], [4, 9], [5, 9], [6, 9],
    [1, 10], [4, 10], [5, 10],
    [2, 11], [4, 11], [6, 11], [7, 11],
    [1, 12], [3, 12], [4, 12],
  ]
  for (const l of sampleLikes) {
    insertLike.run(l[0], l[1])
  }

  const insertComment = db.prepare('INSERT INTO post_comments (user_id, post_id, content, created_at) VALUES (?, ?, ?, ?)')
  const sampleComments: [number, number, string, string][] = [
    [2, 1, '看起来好好吃！明天我也去尝尝', '2026-06-15 12:40:00'],
    [3, 1, '同意！麻婆豆腐是我的最爱', '2026-06-15 12:42:00'],
    [1, 2, '减脂餐也能这么好吃，厉害', '2026-06-15 12:25:00'],
    [5, 3, '红烧肉确实绝了，每次必点', '2026-06-15 12:20:00'],
    [6, 5, '毛血旺是川味小炒的招牌！', '2026-06-17 12:15:00'],
    [7, 5, '看起来就很有食欲，流口水了🤤', '2026-06-17 12:20:00'],
    [3, 7, '番茄炖牛腩很下饭，我也经常点', '2026-06-19 12:30:00'],
    [8, 8, '土豆炖牛肉性价比超高，量大管饱', '2026-06-18 12:50:00'],
    [2, 9, '冬天喝羊肉汤确实舒服', '2026-06-18 12:35:00'],
    [1, 10, '下次让阿姨多放点花生😂', '2026-06-15 12:30:00'],
  ]
  for (const c of sampleComments) {
    insertComment.run(c[0], c[1], c[2], c[3])
  }
}

export default db
