import React from "react";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Hourglass, Loader2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { ResourceWithAttachments } from "@/types/database";
import { HistoryActions } from "./HistoryActions";
import { useMediaQuery } from '../../hooks/use-media-query'; // Use relative path

// Mock utility functions since the file doesn't exist
const truncateContent = (content: string, length: number = 100) => {
  if (!content) return '';
  return content.length > length ? `${content.substring(0, length)}...` : content;
};

const formatDate = (dateString: string) => {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString();
};
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";

interface HistoryTableProps {
  resources: ResourceWithAttachments[];
  onEditResource: (resourceId: number) => void;
  onDeleteResource: (resourceId: number) => void;
  onEditPlaylist: (resourceId: number) => void; // New prop
  totalCount: number;
  currentPage: number;
  onPageChange: (page: number) => void;
  itemsPerPage?: number;
}

export const HistoryTable: React.FC<HistoryTableProps> = ({
  resources,
  onEditResource,
  onDeleteResource,
  onEditPlaylist, // New prop
  totalCount,
  currentPage,
  onPageChange,
  itemsPerPage = 20,
}) => {
  const totalPages = Math.ceil(totalCount / itemsPerPage);
  const isMobile = useMediaQuery("(max-width: 640px)");

  const getPaginationItems = () => {
    const items = [];
    if (totalPages <= 1) return [];

    if (isMobile) {
      // Mobile view: Previous 1 ... 4 ... 10 Next
      if (totalPages <= 5) {
        // If 5 or fewer pages, show all
        for (let i = 1; i <= totalPages; i++) {
          items.push(
            <PaginationItem key={i}>
              <PaginationLink isActive={i === currentPage} onClick={() => onPageChange(i)}>
                {i}
              </PaginationLink>
            </PaginationItem>
          );
        }
      } else {
        // Always show first page
        items.push(
          <PaginationItem key={1}>
            <PaginationLink isActive={1 === currentPage} onClick={() => onPageChange(1)}>
              1
            </PaginationLink>
          </PaginationItem>
        );

        // Ellipsis after first page
        if (currentPage > 3) {
          items.push(<PaginationEllipsis key="ellipsis-start" />);
        }

        // Pages around current page
        if (currentPage > 2 && currentPage < totalPages - 1) {
            items.push(
                <PaginationItem key={currentPage}>
                    <PaginationLink isActive={true} onClick={() => onPageChange(currentPage)}>
                        {currentPage}
                    </PaginationLink>
                </PaginationItem>
            );
        }

        // Ellipsis before last page
        if (currentPage < totalPages - 2) {
          items.push(<PaginationEllipsis key="ellipsis-end" />);
        }
        
        // Always show last page
        items.push(
          <PaginationItem key={totalPages}>
            <PaginationLink isActive={totalPages === currentPage} onClick={() => onPageChange(totalPages)}>
              {totalPages}
            </PaginationLink>
          </PaginationItem>
        );
      }
    } else {
      // Desktop view (existing logic)
      const maxPagesToShow = 5;
      if (totalPages <= maxPagesToShow) {
        for (let i = 1; i <= totalPages; i++) {
          items.push(
            <PaginationItem key={i}>
              <PaginationLink isActive={i === currentPage} onClick={() => onPageChange(i)}>
                {i}
              </PaginationLink>
            </PaginationItem>
          );
        }
      } else {
        items.push(
          <PaginationItem key={1}>
            <PaginationLink isActive={1 === currentPage} onClick={() => onPageChange(1)}>
              1
            </PaginationLink>
          </PaginationItem>
        );
        if (currentPage > 3) {
          items.push(<PaginationEllipsis key="ellipsis-start" />);
        }
        let startPage = Math.max(2, currentPage - 1);
        let endPage = Math.min(totalPages - 1, currentPage + 1);
        for (let i = startPage; i <= endPage; i++) {
          items.push(
            <PaginationItem key={i}>
              <PaginationLink isActive={i === currentPage} onClick={() => onPageChange(i)}>
                {i}
              </PaginationLink>
            </PaginationItem>
          );
        }
        if (currentPage < totalPages - 2) {
          items.push(<PaginationEllipsis key="ellipsis-end" />);
        }
        items.push(
          <PaginationItem key={totalPages}>
            <PaginationLink isActive={totalPages === currentPage} onClick={() => onPageChange(totalPages)}>
              {totalPages}
            </PaginationLink>
          </PaginationItem>
        );
      }
    }
    return items;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'processing':
        return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'pending':
        return <Hourglass className="h-5 w-5 text-gray-500" />;
      default:
        return null;
    }
  };

  return (
    <div>
      {isMobile ? (
        <div className="space-y-2">
          {resources.map((resource) => (
            <div key={resource.id} className="bg-card p-2 rounded-lg shadow-sm">
              <table className="w-full table-fixed">
                <tbody>
                  <tr>
                    <td className="w-16 align-middle">
                      {resource.thumbnail ? (
                        <img src={resource.thumbnail} alt="Thumbnail" className="w-16 h-16 object-cover rounded-md" />
                      ) : (
                        <div className="w-16 h-16 bg-muted rounded-md"></div>
                      )}
                    </td>
                    <td className="align-middle px-2">
                      <div className="font-medium text-sm mb-1 whitespace-normal break-words" title={resource.content}>
                        {truncateContent(resource.content || '', 80)}
                      </div>
                      <div>{getStatusIcon(resource.status)}</div>
                    </td>
                    <td className="w-20 align-middle text-right">
                      <HistoryActions
                        resource={resource}
                        onEditResource={onEditResource}
                        onDeleteResource={onDeleteResource}
                        onEditPlaylist={onEditPlaylist}
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          ))}
        </div>
      ) : (
        <TooltipProvider>
          <Table className="min-w-full divide-y divide-gray-200">
            {/* Desktop Table Header */}
            <TableHeader>
                <TableRow>
                    <TableHead className="w-[120px]">缩略图</TableHead>
                    <TableHead className="hidden md:table-cell whitespace-nowrap">类型</TableHead>
                    <TableHead>内容</TableHead>
                    <TableHead className="hidden sm:table-cell whitespace-nowrap">考试类型</TableHead>
                    <TableHead className="whitespace-nowrap">状态</TableHead>
                    <TableHead className="hidden md:table-cell whitespace-nowrap">错误</TableHead>
                    <TableHead className="hidden lg:table-cell whitespace-nowrap">创建时间</TableHead>
                    <TableHead className="text-center whitespace-nowrap">操作</TableHead>
                </TableRow>
            </TableHeader>
            {/* Desktop Table Body */}
            <TableBody>
                {resources.map((resource) => (
                    <TableRow key={resource.id}>
                        <TableCell className="w-[120px] align-top py-2 px-2 sm:px-4">
                            {resource.thumbnail ? (
                                <img src={resource.thumbnail} alt="Thumbnail" className="w-full aspect-video object-cover rounded-md" />
                            ) : (
                                <div className="w-full aspect-video bg-muted rounded-md flex items-center justify-center text-xs text-muted-foreground">无图</div>
                            )}
                        </TableCell>
                        <TableCell className="hidden md:table-cell align-top py-2 px-2 sm:px-4"> 
                            <Badge variant="outline" className="text-xs sm:text-sm">
                                {resource.source_type || resource.sourceType}
                            </Badge>
                        </TableCell>
                        <TableCell className="sm:max-w-xs truncate align-top py-2 px-2 sm:px-4">
                            <div className="truncate" title={resource.content}>
                                {truncateContent(resource.content || '')}
                            </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell align-top py-2 px-2 sm:px-4">{resource.examType}</TableCell>
                        <TableCell className="align-top py-2 px-2 sm:px-4">
                            <Tooltip>
                                <TooltipTrigger>{getStatusIcon(resource.status)}</TooltipTrigger>
                                <TooltipContent>
                                    <p>{resource.status}</p>
                                </TooltipContent>
                            </Tooltip>
                        </TableCell>
                        <TableCell className="hidden md:table-cell align-top py-2 px-2 sm:px-4">{resource.error || ""}</TableCell>
                        <TableCell className="hidden lg:table-cell align-top py-2 px-2 sm:px-4">{formatDate(resource.created_at || resource.createdAt)}</TableCell>
                        <TableCell className="align-top py-2 px-2 sm:px-4 text-right">
                            <HistoryActions
                                resource={resource}
                                onEditResource={onEditResource}
                                onDeleteResource={onDeleteResource}
                                onEditPlaylist={onEditPlaylist}
                            />
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
          </Table>
        </TooltipProvider>
      )}
      {totalPages > 1 && (
        <Pagination className="mt-4 flex flex-wrap justify-center sm:justify-end">
          <PaginationContent className="flex flex-wrap gap-1">
            <PaginationItem>
              <PaginationPrevious onClick={() => onPageChange(Math.max(1, currentPage - 1))} />
            </PaginationItem>
            {getPaginationItems()}
            <PaginationItem>
              <PaginationNext onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))} />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
};
