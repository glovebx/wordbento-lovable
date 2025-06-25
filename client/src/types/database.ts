export interface Resource {
  id: number;
  // user_id: number;
  title: string;
  sourceType: 'url' | 'article' | 'pdf' | 'image';
  content: string;
  examType: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result: any; // JSON result
  error?: string;
  uuid: string;
  createdAt: string;
  updatedAt: string;
}

export interface Attachment {
  id: number;
  resourceId: number;
  audioKey?: string | null;
  videoKey?: string | null;
  captionTxt?: string | null;
  captionSrt?: string | null;
}

export interface ResourceWithAttachments extends Resource {  
  attachments: Attachment[];
}

export interface UiResourceWithAttachment extends Attachment {  
  title: string;
  sourceType: 'url' | 'article' | 'pdf' | 'image';
  content: string;
  examType: string;
}