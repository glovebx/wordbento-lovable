CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL,
    salt TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_sign DATETIME DEFAULT CURRENT_TIMESTAMP,
    uuid TEXT UNIQUE
);

-- 插入初始的 'public' 用户
-- 使用 INSERT OR IGNORE 可以避免在多次应用 schema 时重复插入
INSERT OR IGNORE INTO users (id, username, email, password, role, salt, uuid)
VALUES (0, 'public', 'wordbento.public@metaerp.ai', 'placeholder_password', 'public', 'placeholder_salt', '00000000-0000-0000-0000-000000000000');

-- words 表：存储单词的基本信息 (保持不变)
CREATE TABLE IF NOT EXISTS words (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,       -- 外键，关联到 users 表的 id
    word_text TEXT UNIQUE NOT NULL, -- 单词文本本身，例如 "hurl"
    phonetic TEXT,                   -- 音标，可能为 null
    meaning TEXT,
    
    -- -- 新增字段：表示单词是否已被用户记牢 (0=未记牢, 1=已记牢)
    -- is_mastered INTEGER NOT NULL DEFAULT 0,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
-- word_content 表：存储与语言相关的单段文本内容 或 JSON 数组内容
-- 这个表现在包含了定义、词源、历史、例句等所有按语言区分的内容
CREATE TABLE IF NOT EXISTS word_content (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    word_id INTEGER NOT NULL,       -- 外键，关联到 words 表的 id
    -- 内容类型，例如 'definition', 'etymology', 'affixes', 'history', 'forms', 'memory_aid', 'trending_story', 'summary', 'examples'
    content_type TEXT NOT NULL,
    language_code TEXT NOT NULL,    -- 语言代码，例如 'en', 'zh', 'ja', 'ko'
    -- content 可以是单段文本 (例如定义、词源) 或 JSON 字符串 (例如例句列表 ["example1", "example2"])
    content TEXT NOT NULL,
    icon TEXT NOT NULL,

    FOREIGN KEY (word_id) REFERENCES words(id) ON DELETE CASCADE,
    UNIQUE (word_id, content_type, language_code) -- 确保每个单词、每种内容类型、每种语言只有一条记录
);

-- -- 为了方便查询，可以考虑添加索引 (保持不变)
-- CREATE INDEX IF NOT EXISTS idx_word_content_word_lang_type ON word_content (word_id, content_type, language_code);

-- bookmarks 表：存储收藏的单词的基本信息 (保持不变)
CREATE TABLE IF NOT EXISTS bookmarks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,       -- 外键，关联到 users 表的 id
    word_id INTEGER NOT NULL,       -- 外键，关联到 words 表的 id
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (word_id) REFERENCES words(id) ON DELETE CASCADE,

    -- 添加一个唯一约束，确保同一个用户不会重复收藏同一个单词
    UNIQUE (user_id, word_id)
);


-- archives 表：存储已掌握的单词的基本信息
CREATE TABLE IF NOT EXISTS archives (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,       -- 外键，关联到 users 表的 id
    word_id INTEGER NOT NULL,       -- 外键，关联到 words 表的 id
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (word_id) REFERENCES words(id) ON DELETE CASCADE,

    UNIQUE (user_id, word_id)
);

-- -- history 表：存储已查看的单词的基本信息，会不断新增
-- CREATE TABLE IF NOT EXISTS history (
--     id INTEGER PRIMARY KEY AUTOINCREMENT,
--     user_id INTEGER NOT NULL,       -- 外键，关联到 users 表的 id
--     word_id INTEGER NOT NULL,       -- 外键，关联到 words 表的 id
--     created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
--     -- updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

--     FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
--     FOREIGN KEY (word_id) REFERENCES words(id) ON DELETE CASCADE,
-- );

-- images 表：存储单词关联的图片
CREATE TABLE IF NOT EXISTS images (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    word_id INTEGER NOT NULL,       -- 外键，关联到 words 表的 id
    image_key TEXT NOT NULL,        -- R2 中的图片的key

    FOREIGN KEY (word_id) REFERENCES words(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS resources (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    source_type TEXT CHECK(source_type IN ('url', 'article', 'pdf', 'image')) NOT NULL,
    content TEXT NOT NULL,
    -- exam_type TEXT CHECK(exam_type IN ('TOEFL', 'GRE', 'TOEIC', 'SAT')) NOT NULL,
    exam_type TEXT NOT NULL,
    content_md5 TEXT NOT NULL,
    status TEXT CHECK(status IN ('pending', 'processing', 'completed', 'failed')) NOT NULL DEFAULT 'pending',
    result TEXT, -- Stored as TEXT, you'll need to handle JSON parsing in your application
    error TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    uuid TEXT UNIQUE,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 为了方便查询，可以考虑添加索引 (保持不变)
CREATE INDEX IF NOT EXISTS idx_resource_exam_type_content ON resources (exam_type, content_md5);
