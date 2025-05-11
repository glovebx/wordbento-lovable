/**
 * Utility functions for managing Open Graph tags and SEO
 */

interface OgTags {
    title: string;
    description: string;
    image?: string;
    url?: string;
    type?: string;
    siteName?: string;
    locale?: string;
    keywords?: string[];
  }
  
  /**
   * Updates the Open Graph meta tags in the document head for improved SEO
   */
  export const updateOgTags = ({
    title,
    description,
    image,
    url = window.location.href,
    type = 'website',
    siteName = 'Word Learning Platform',
    locale = 'en_US',
    keywords = [],
  }: OgTags): void => {
    // Update document title
    document.title = title;
    
    // Create base meta tags map
    const metaTags = {
      // Basic meta tags
      'description': description,
      'keywords': '',
      
      // Open Graph tags
      'og:title': title,
      'og:description': description,
      'og:type': type,
      'og:url': url,
      'og:site_name': siteName,
      'og:locale': locale,
      'og:image': '',
      
      // Twitter card tags
      'twitter:card': 'summary_large_image',
      'twitter:title': title,
      'twitter:description': description,
      'twitter:image': ''
    };
    
    // Add keywords if provided
    if (keywords.length > 0) {
      metaTags['keywords'] = keywords.join(', ');
    }
    
    // Add image tags if provided
    if (image) {
      metaTags['og:image'] = image;
      metaTags['twitter:image'] = image;
      
      // Add image dimensions if available (uncomment and use if image dimensions are known)
      // metaTags['og:image:width'] = '1200';
      // metaTags['og:image:height'] = '630';
    }
    
    // Apply updates to document
    Object.entries(metaTags).forEach(([name, content]) => {
      let meta = document.querySelector(`meta[property="${name}"]`) || 
                 document.querySelector(`meta[name="${name}"]`);
      
      if (!meta) {
        meta = document.createElement('meta');
        if (name.startsWith('og:')) {
          meta.setAttribute('property', name);
        } else {
          meta.setAttribute('name', name);
        }
        document.head.appendChild(meta);
      }
      
      meta.setAttribute('content', content);
    });
    
    // Add canonical link
    let canonicalLink = document.querySelector('link[rel="canonical"]');
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.setAttribute('href', url);
  };
  
  /**
   * Generates schema.org structured data for the current word
   */
  export const generateWordStructuredData = (word: string, translation: string, description: string): void => {
    // Remove any existing structured data
    const existingScript = document.querySelector('script[type="application/ld+json"]');
    if (existingScript) {
      existingScript.remove();
    }
    
    // Create structured data for the word
    const structuredData = {
      '@context': 'https://schema.org',
      '@type': 'DefinedTerm',
      'name': word,
      'description': description,
      'inDefinedTermSet': {
        '@type': 'DefinedTermSet',
        'name': 'Word Learning Platform Vocabulary'
      },
      'alternateName': translation
    };
    
    // Add structured data to the page
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.text = JSON.stringify(structuredData);
    document.head.appendChild(script);
  };