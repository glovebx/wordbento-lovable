
import React from 'react';
import { cn } from '@/lib/utils';
// import { Bookmark } from 'lucide-react';
// import { useAuth } from '@/contexts/AuthContext';
// import AuthModal from './AuthModal';

interface GridCardProps {
  id: string;
  title: {
    en: string;
    zh: string;
  };
  content: {
    en: string | React.ReactNode;
    zh: string | React.ReactNode;
  };
  icon: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const GridCard: React.FC<GridCardProps> = ({
  id,
  title,
  content,
  icon,
  className,
  size = 'md',
}) => {
  // const { isAuthenticated, bookmarks, toggleBookmark } = useAuth();
  // const [showAuthModal, setShowAuthModal] = useState(false);
  
  // const isBookmarked = bookmarks.includes(id);
  
  // const handleBookmarkClick = () => {
  //   if (!isAuthenticated) {
  //     setShowAuthModal(true);
  //     return;
  //   }
    
  //   toggleBookmark(id);
  // };

  const sizeClasses = {
    sm: 'col-span-1',
    md: 'col-span-1 lg:col-span-1',
    lg: 'col-span-1 md:col-span-2 lg:col-span-2',
  };

  return (
    <>
      <div 
        className={cn(
          'bento-card bg-card text-card-foreground relative group',
          sizeClasses[size],
          className
        )}
      >
        {/* <div className="absolute top-3 right-3 z-10">
          <button
            onClick={handleBookmarkClick}
            className="p-1.5 rounded-full hover:bg-accent transition-colors"
            title={isBookmarked ? "取消收藏" : "收藏"}
          >
            <Bookmark 
              className={cn(
                "h-5 w-5 transition-colors", 
                isBookmarked ? "fill-primary text-primary" : "text-muted-foreground group-hover:text-foreground"
              )}
            />
          </button>
        </div> */}
        
        <div className="p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-muted">
              {icon}
            </div>
            <div>
              <h3 className="font-medium text-lg">{title.en}</h3>
              <p className="text-muted-foreground text-sm">{title.zh}</p>
            </div>
          </div>
          
          {/* <div className="space-y-3">
            {typeof content.en === 'string' ? (
              <>
                <p className="text-sm text-foreground">{content.en}</p>
                <p className="text-sm text-muted-foreground">{content.zh}</p>
              </>
            ) : (
              <>
                <div className="text-sm text-foreground">{content.en}</div>
                <div className="text-sm text-muted-foreground">{content.zh}</div>
              </>
            )}
          </div> */}
          <div className="space-y-3">
            {/* Check if content.en exists and is a string */}
            {typeof content.en === 'string' ? (
              <>
                {/* Process and render English content with line breaks */}
                <p className="text-sm text-foreground">
                  {content.en.split('\n').map((line, index, array) => (
                    <React.Fragment key={index}>
                      {line}
                      {/* Add <br /> after each line except the last one */}
                      {index < array.length - 1 && <br />}
                    </React.Fragment>
                  ))}
                </p>
                {/* Process and render Chinese content with line breaks */}
                <p className="text-sm text-muted-foreground">
                   {typeof content.zh === 'string' ? ( // Also check if zh is a string
                     content.zh.split('\n').map((line, index, array) => (
                       <React.Fragment key={index}>
                         {line}
                         {/* Add <br /> after each line except the last one */}
                         {index < array.length - 1 && <br />}
                       </React.Fragment>
                     ))
                   ) : (
                     // Handle case where zh is not a string (e.g., null or undefined)
                     content.zh // Render as is, or provide a fallback
                   )}
                </p>
              </>
            ) : (
               /*
                 Handle the case where content.en is NOT a string.
                 Based on your WordContentMap, it could be string[] or null.
                 If it's string[], you might want to map over the array items.
                 If it's null, you might want to show a fallback.
                 The original code just rendered it directly, which works for null/undefined but not string[].
                 Let's assume if it's not a string, it's handled by the parent component
                 or should be rendered as a simple block if it's an array of strings.
                 Rendering array of strings directly in React within a div usually works,
                 but won't add breaks between items unless they are mapped to elements.
                 Let's refine this part based on the likely structure if not a string.
               */
              <>
                {/* Assuming if content.en is not a string, it might be an array of strings */}
                {/* If it's an array, you might want to map over it */}
                {Array.isArray(content.en) ? (
                   <div className="text-sm text-foreground">
                      {content.en.map((item, index) => (
                          <React.Fragment key={index}>
                              {item}
                              {index < content.en.length - 1 && <br />} {/* Add break between array items */}
                          </React.Fragment>
                      ))}
                   </div>
                ) : (
                   // If content.en is null or something unexpected, render as is or fallback
                   <div className="text-sm text-foreground">{content.en}</div>
                )}

                {/* Apply similar logic for content.zh if it's not a string */}
                 {Array.isArray(content.zh) ? (
                   <div className="text-sm text-muted-foreground">
                      {content.zh.map((item, index) => (
                          <React.Fragment key={index}>
                              {item}
                              {index < content.zh.length - 1 && <br />} {/* Add break between array items */}
                          </React.Fragment>
                      ))}
                   </div>
                ) : (
                   // If content.zh is null or something unexpected, render as is or fallback
                   <div className="text-sm text-muted-foreground">{content.zh}</div>
                )}
              </>
            )}
          </div>          
        </div>
      </div>

      {/* <AuthModal 
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={() => toggleBookmark(id)}
      /> */}
    </>
  );
};

export default GridCard;