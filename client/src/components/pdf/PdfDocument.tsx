import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image } from '@react-pdf/renderer';
import { WordDataType } from '@/types/wordTypes';

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 11,
    lineHeight: 1.5,
    color: '#333333',
    backgroundColor: '#FFFFFF',
  },
  headerSection: {
    marginBottom: 20,
    textAlign: 'center',
  },
  wordText: {
    fontSize: 42,
    fontWeight: 'bold',
    fontFamily: 'Helvetica-Bold',
    color: '#1a202c',
  },
  phonetic: {
    fontSize: 18,
    color: '#718096',
    marginTop: 5,
  },
  definition: {
    fontSize: 12,
    color: '#4a5568',
    marginTop: 15,
    textAlign: 'center',
    paddingHorizontal: 30,
  },
  mainContent: {
    flexDirection: 'row',
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 20,
  },
  column: {
    width: '50%',
    paddingHorizontal: 15,
  },
  contentBlock: {
    marginBottom: 20,
  },
  contentBlockHeader: {
    backgroundColor: '#2d3748',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  contentBlockTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: 'Helvetica-Bold',
    color: '#FFFFFF',
  },
  listItem: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  bullet: {
    width: 10,
    fontSize: 10,
  },
  listItemText: {
    flex: 1,
    fontFamily: 'Helvetica',
  },
  imageSection: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 'auto',
    paddingTop: 20,
  },
  imageWrapper: {
    width: '50%',
  },
  image: {
    width: '100%',
    height: 'auto',
  },
});

const ContentBlock: React.FC<{ title: string; content: any }> = ({ title, content }) => {
  if (!content) return null;

  let contentItems: string[] = [];
  if (typeof content === 'string') {
    contentItems = [content];
  } else if (Array.isArray(content.en)) {
    contentItems = content.en;
  } else if (typeof content.en === 'string') {
    contentItems = [content.en];
  }

  if (contentItems.length === 0) return null;

  return (
    <View style={styles.contentBlock}>
      <View style={styles.contentBlockHeader}>
        <Text style={styles.contentBlockTitle}>{title}</Text>
      </View>
      <View>
        {contentItems.map((item, index) => (
          <View key={index} style={styles.listItem}>
            <Text style={styles.bullet}>▪</Text>
            <Text style={styles.listItemText}>{item}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const WordPage: React.FC<{ word: WordDataType }> = ({ word }) => {
  const images = (word.imageUrls || []).slice(0, 2);

  return (
    <Page size="A4" style={styles.page}>
      <View style={{ flex: 1, flexDirection: 'column' }}>
        {/* Top Text Content */}
        <View>
          <View style={styles.headerSection}>
            <Text style={styles.wordText}>{word.word_text}</Text>
            {word.phonetic && <Text style={styles.phonetic}>[{word.phonetic}]</Text>}
            {word.meaning && <Text style={styles.definition}>{word.meaning}</Text>}
          </View>

          <View style={styles.mainContent}>
            <View style={styles.column}>
              <ContentBlock title="Definition" content={word.content.definition} />              
              <ContentBlock title="Etymology" content={word.content.etymology} />
            </View>
            <View style={styles.column}>
              <ContentBlock title="Examples" content={word.content.examples} />
              <ContentBlock title="Story" content={word.content.trending_story} />                            
              {/* <ContentBlock title="Memory Aids" content={word.content.memory_aid} /> */}
            </View>
          </View>

          <View style={styles.mainContent}>
            <View style={styles.column}>
              <ContentBlock title="Affixes" content={word.content.affixes} />              
            </View>
            <View style={styles.column}>
              <ContentBlock title="Forms" content={word.content.forms} />
              {/* <ContentBlock title="History" content={word.content.history} /> */}
              {/* <ContentBlock title="Story" content={word.content.trending_story} />               */}
            </View>
          </View>
        </View>

        {/* Bottom Image Content */}
        {images.length > 0 && (
          <View style={styles.imageSection}>
            {images.map((url) => (
              <View key={url} style={styles.imageWrapper}>
                <Image style={styles.image} src={{ uri: url, method: 'GET', headers: { 'Cache-Control': 'no-cache' } }} />
              </View>
            ))}
          </View>
        )}
      </View>
    </Page>
  );
};

interface PdfDocumentProps {
  words: WordDataType[];
}

export const PdfDocument: React.FC<PdfDocumentProps> = ({ words }) => (
  <Document>
    {words.map((word, index) => (
      <WordPage key={index} word={word} />
    ))}
  </Document>
);
