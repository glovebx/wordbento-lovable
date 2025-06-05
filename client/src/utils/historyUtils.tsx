
import { Badge } from "@/components/ui/badge";

export const truncateContent = (content: string, maxLength: number = 50) => {
  if (content.length <= maxLength) return content;
  return content.substring(0, maxLength) + '...';
};

export const getStatusBadge = (status: string) => {
  const variants = {
    pending: 'secondary',
    processing: 'default',
    completed: 'default',
    failed: 'destructive'
  } as const;
  
  return (
    <Badge variant={variants[status as keyof typeof variants] || 'secondary'}>
      {status}
    </Badge>
  );
};

export const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleString('zh-CN');
};
