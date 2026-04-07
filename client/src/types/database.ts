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
  fee: number;
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

export interface UiResourceWithAttachment {  
  id: number;
  title: string;
  sourceType: 'url' | 'article' | 'pdf' | 'image';
  content: string;
  examType: string;
  fee: number;

  audioKey?: string | null;
  videoKey?: string | null;
  captionTxt?: string | null;
  captionSrt?: string | null;  
}