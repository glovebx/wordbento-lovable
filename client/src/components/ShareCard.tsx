import React from 'react';
import { WordDataType } from '@/types/wordTypes';

interface ShareCardProps {
  wordData: WordDataType;
}

// 静态装饰光晕 - 完全兼容 html-to-image
const StaticGlow: React.FC = () => (
  <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
    {/* 顶部主光晕 */}
    <div
      style={{
        position: 'absolute',
        top: -120,
        left: '50%',
        transform: 'translateX(-50%)',
        width: 600,
        height: 400,
        borderRadius: '50%',
        background: 'radial-gradient(ellipse, rgba(59, 130, 246, 0.25) 0%, transparent 70%)',
      }}
    />
    {/* 右上辅助光晕 */}
    <div
      style={{
        position: 'absolute',
        top: 200,
        right: -100,
        width: 300,
        height: 300,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(139, 92, 246, 0.15) 0%, transparent 70%)',
      }}
    />
    {/* 左下辅助光晕 */}
    <div
      style={{
        position: 'absolute',
        bottom: 300,
        left: -80,
        width: 250,
        height: 250,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(16, 185, 129, 0.1) 0%, transparent 70%)',
      }}
    />
    {/* 底部光晕 */}
    <div
      style={{
        position: 'absolute',
        bottom: -100,
        left: '50%',
        transform: 'translateX(-50%)',
        width: 500,
        height: 300,
        borderRadius: '50%',
        background: 'radial-gradient(ellipse, rgba(59, 130, 246, 0.1) 0%, transparent 70%)',
      }}
    />
    {/* 静态装饰圆点 */}
    {[
      { top: '8%', left: '15%', size: 4, opacity: 0.2 },
      { top: '12%', left: '85%', size: 3, opacity: 0.15 },
      { top: '25%', left: '8%', size: 5, opacity: 0.1 },
      { top: '45%', left: '92%', size: 4, opacity: 0.15 },
      { top: '65%', left: '5%', size: 3, opacity: 0.1 },
      { top: '78%', left: '88%', size: 5, opacity: 0.12 },
      { top: '88%', left: '20%', size: 3, opacity: 0.08 },
      { top: '92%', left: '75%', size: 4, opacity: 0.1 },
    ].map((dot, i) => (
      <div
        key={i}
        style={{
          position: 'absolute',
          top: dot.top,
          left: dot.left,
          width: dot.size,
          height: dot.size,
          borderRadius: '50%',
          backgroundColor: `rgba(255, 255, 255, ${dot.opacity})`,
        }}
      />
    ))}
    {/* 网格纹理 */}
    <div
      style={{
        position: 'absolute',
        inset: 0,
        opacity: 0.025,
        backgroundImage: `
          linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
        `,
        backgroundSize: '40px 40px',
      }}
    />
  </div>
);

// 渐变文字
const GradientText: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <span
    style={{
      background: 'linear-gradient(135deg, #60a5fa 0%, #a78bfa 50%, #f472b6 100%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text',
      color: 'transparent',
      ...style,
    }}
  >
    {children}
  </span>
);

// 卡片容器 - 使用半透明实色替代 backdrop-filter
const ContentCard: React.FC<{
  children: React.ReactNode;
  accentColor: string;
  gradientFrom: string;
  gradientTo: string;
  shadowColor: string;
  style?: React.CSSProperties;
}> = ({ children, accentColor, shadowColor, style }) => (
  <div
    style={{
      position: 'relative',
      background: 'rgba(30, 41, 59, 0.75)',
      borderRadius: 20,
      border: '1px solid rgba(255, 255, 255, 0.06)',
      padding: 28,
      overflow: 'hidden',
      boxShadow: `0 4px 24px ${shadowColor}`,
      ...style,
    }}
  >
    {/* 卡片顶部渐变线 */}
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 24,
        right: 24,
        height: 2,
        borderRadius: 1,
        background: `linear-gradient(to right, transparent, ${accentColor}, transparent)`,
        opacity: 0.6,
      }}
    />
    {/* 卡片内部光晕 */}
    <div
      style={{
        position: 'absolute',
        top: -60,
        right: -60,
        width: 150,
        height: 150,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${accentColor}18 0%, transparent 70%)`,
      }}
    />
    <div style={{ position: 'relative', zIndex: 1 }}>{children}</div>
  </div>
);

// 标签徽章
const Badge: React.FC<{ children: React.ReactNode; color: string }> = ({ children, color }) => (
  <div
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      padding: '5px 12px',
      borderRadius: 100,
      background: `${color}12`,
      border: `1px solid ${color}25`,
      color,
      fontSize: 18,
      fontWeight: 600,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    }}
  >
    <div style={{ width: 5, height: 5, borderRadius: '50%', background: color }} />
    {children}
  </div>
);

const ShareCard: React.FC<ShareCardProps> = ({ wordData }) => {
  const { word_text, phonetic, meaning, content } = wordData;

  const definition = content?.definition?.en as string | undefined;
  const definitionZh = content?.definition?.zh as string | undefined;
  const etymology = content?.etymology?.en as string | undefined;
  const etymologyZh = content?.etymology?.zh as string | undefined;
  const affixes = content?.affixes?.en as string | undefined;
  const affixesZh = content?.affixes?.zh as string | undefined;
  const examples = content?.examples?.en as string[] | undefined;
  const examplesZh = content?.examples?.zh as string[] | undefined;

  const wordFontSize = word_text.length > 12 ? 72 : word_text.length > 8 ? 86 : 72;

  return (
    <div
      style={{
        width: 1080,
        height: 1920,
        position: 'relative',
        background: '#0f172a',
        color: '#f8fafc',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '72px 52px',
        boxSizing: 'border-box',
        fontFamily: '"SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        overflow: 'hidden',
      }}
    >
      <StaticGlow />

      {/* 主内容 */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          width: '100%',
          maxWidth: 900,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        {/* 顶部装饰 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 40 }}>
          <div style={{ width: 36, height: 1, background: 'linear-gradient(to right, transparent, #3b82f6)' }} />
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#3b82f6' }} />
          <div style={{ width: 36, height: 1, background: 'linear-gradient(to left, transparent, #3b82f6)' }} />
        </div>

        {/* 单词标题 */}
        <div style={{ position: 'relative', marginBottom: 16, textAlign: 'center' }}>
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 500,
              height: 180,
              background: 'radial-gradient(ellipse, rgba(59, 130, 246, 0.18) 0%, transparent 70%)',
              zIndex: -1,
            }}
          />
          <h1
            style={{
              fontSize: wordFontSize,
              fontWeight: 800,
              margin: 0,
              letterSpacing: 3,
              lineHeight: 1.2,
            }}
          >
            <GradientText>{word_text}</GradientText>
          </h1>
        </div>

        {/* 音标 */}
        {phonetic && (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 20px',
              borderRadius: 100,
              background: 'rgba(148, 163, 184, 0.08)',
              border: '1px solid rgba(148, 163, 184, 0.15)',
              marginBottom: 28,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
            </svg>
            <span style={{ fontSize: 28, color: '#94a3b8', fontStyle: 'italic', fontFamily: 'Georgia, serif', letterSpacing: 1 }}>
              {phonetic}
            </span>
          </div>
        )}

        {/* 释义 */}
        {meaning && (
          <p
            style={{
              fontSize: 24,
              color: '#e2e8f0',
              margin: 0,
              marginBottom: 40,
              textAlign: 'center',
              maxWidth: 780,
              lineHeight: 1.6,
              fontWeight: 400,
            }}
          >
            {meaning}
          </p>
        )}

        {/* 定义 */}
        {meaning && (
          <p
            style={{
              fontSize: 24,
              color: '#e2e8f0',
              margin: 0,
              marginBottom: 40,
              textAlign: 'center',
              maxWidth: 780,
              lineHeight: 1.6,
              fontWeight: 400,
            }}
          >
            {definition}
            <br></br>
            {definitionZh}
          </p>
        )}

        {/* 内容卡片区域 */}
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* 词源 */}
          {etymology && (
            <ContentCard
              accentColor="#60a5fa"
              gradientFrom="#3b82f6"
              gradientTo="#60a5fa"
              shadowColor="rgba(59, 130, 246, 0.08)"
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    background: 'linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 12h10" />
                    <path d="M9 4v16" />
                    <path d="m3 9 3 3-3 3" />
                    <path d="M14 8V4h8v4" />
                    <path d="M14 12h8" />
                    <path d="M18 16v4" />
                  </svg>
                </div>
                <div style={{ flex: 1 }}>
                  <Badge color="#60a5fa">词源分析</Badge>
                  <p style={{ fontSize: 24, color: '#cbd5e1', lineHeight: 1.7, margin: '12px 0 0 0' }}>
                    {etymology}
                    <br></br>
                    {etymologyZh}
                  </p>
                </div>
              </div>
            </ContentCard>
          )}

          {/* 词缀 */}
          {affixes && (
            <ContentCard
              accentColor="#a78bfa"
              gradientFrom="#8b5cf6"
              gradientTo="#a78bfa"
              shadowColor="rgba(139, 92, 246, 0.08)"
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    background: 'linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72" />
                    <path d="m14 7 3 3" />
                    <path d="M5 6v4" />
                    <path d="M19 14v4" />
                  </svg>
                </div>
                <div style={{ flex: 1 }}>
                  <Badge color="#a78bfa">词缀分析</Badge>
                  <p style={{ fontSize: 24, color: '#cbd5e1', lineHeight: 1.7, margin: '12px 0 0 0' }}>
                    {affixes}
                    <br></br>
                    {affixesZh}
                  </p>
                </div>
              </div>
            </ContentCard>
          )}

          {/* 例句 */}
          {examples && examples.length > 0 && (
            <ContentCard
              accentColor="#34d399"
              gradientFrom="#10b981"
              gradientTo="#34d399"
              shadowColor="rgba(16, 185, 129, 0.08)"
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    background: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z" />
                    <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z" />
                  </svg>
                </div>
                <div style={{ flex: 1 }}>
                  <Badge color="#34d399">例句</Badge>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
                    {examples.slice(0, 3).map((example, i) => (
                      <div
                        key={i}
                        style={{
                          position: 'relative',
                          paddingLeft: 18,
                          fontSize: 24,
                          color: '#cbd5e1',
                          lineHeight: 1.7,
                        }}
                      >
                        <div
                          style={{
                            position: 'absolute',
                            left: 0,
                            top: 9,
                            width: 5,
                            height: 5,
                            borderRadius: '50%',
                            background: '#34d399',
                            opacity: 0.5,
                          }}
                        />
                        {example}
                        <br></br>
                        {examplesZh && examplesZh[i]}
                      </div>
                    ))}               
                  </div>
                </div>
              </div>
            </ContentCard>
          )}
        </div>

        {/* 底部品牌 */}
        <div style={{ marginTop: 'auto', paddingTop: 48, width: '100%', textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 12 }}>
            <div style={{ width: 28, height: 1, background: 'linear-gradient(to right, transparent, #475569)' }} />
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 14,
                fontWeight: 800,
                color: 'white',
              }}
            >
              W
            </div>
            <div style={{ width: 28, height: 1, background: 'linear-gradient(to left, transparent, #475569)' }} />
          </div>
          <p style={{ fontSize: 18, color: '#475569', letterSpacing: 2, fontWeight: 500 }}>
            背单词，最重要的是坚持
          </p>
        </div>
      </div>
    </div>
  );
};

export default ShareCard;