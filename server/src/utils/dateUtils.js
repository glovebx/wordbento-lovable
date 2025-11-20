
// 🛠️ 辅助函数：将 JS Date 转为 SQLite UTC 字符串 (YYYY-MM-DD HH:mm:ss)
export function toSqliteUtcString(date) {
  // 获取 UTC 的各个部分
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  const h = String(date.getUTCHours()).padStart(2, '0');
  const min = String(date.getUTCMinutes()).padStart(2, '0');
  const s = String(date.getUTCSeconds()).padStart(2, '0');
  
  // 拼接成 D1/SQLite 默认的存储格式 (注意中间是空格，不是 T)
  return `${y}-${m}-${d} ${h}:${min}:${s}`;
}