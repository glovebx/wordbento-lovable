import langs from 'langs';

export function parseLanguageCode(languageName) {
  const code = langs.where('name', languageName)?.iso6391;
  return code || 'und'; // 'und'表示未识别语言
}