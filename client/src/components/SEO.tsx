import React from 'react';
import { Helmet } from 'react-helmet-async';

import { WordDataType } from '@/types/wordTypes';

interface SEOProps {
  title?: string;
  description?: string;
  wordData?: WordDataType | null; // Add wordData to props
}

const SEO: React.FC<SEOProps> = ({ 
    title = 'WordBento - 智能英语单词学习', 
    description = '通过 AI 生成的图片和真实语境，让英语单词学习变得直观、有趣且高效。你的私人单词便当。',
    wordData,
}) => {

  // --- JSON-LD Structured Data ---
  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    'url': 'https://word.metaerp.ai/',
    'name': 'WordBento',
    'description': '一个通过 AI 生成图片和真实语境来帮助用户学习英语单词的网站。',
  };

  let learningResourceSchema = null;
  if (wordData) {
    learningResourceSchema = {
      '@context': 'https://schema.org',
      '@type': 'LearningResource',
      'name': wordData.word_text,
      'description': wordData.meaning,
      'learningResourceType': '单词卡片 (Flashcard)',
      'inLanguage': 'en', // The language of the word being learned
      'educationalUse': '学习新单词',
      'provider': {
        '@type': 'Organization',
        'name': 'WordBento',
        'sameAs': 'https://word.metaerp.ai/'
      }
    };
  }

  return (
    <Helmet>
      <title>{title}</title>
      <meta name='description' content={description} />

      {/* JSON-LD for the website */}
      <script type='application/ld+json'>
        {JSON.stringify(websiteSchema)}
      </script>

      {/* JSON-LD for the specific learning resource (word) if available */}
      {learningResourceSchema && (
        <script type='application/ld+json'>
          {JSON.stringify(learningResourceSchema)}
        </script>
      )}
    </Helmet>
  );
}

export default SEO;
