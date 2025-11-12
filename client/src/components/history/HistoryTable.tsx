import React from "react";
import { Badge } from "@/components/ui/badge";
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
import { truncateContent, formatDate, getStatusBadge } from "@/utils/historyUtils";
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
  totalCount: number;
  currentPage: number;
  onPageChange: (page: number) => void;
  itemsPerPage?: number;
}

export const HistoryTable: React.FC<HistoryTableProps> = ({
  resources,
  onEditResource,
  onDeleteResource,
  totalCount,
  currentPage,
  onPageChange,
  itemsPerPage = 20,
}) => {
  const totalPages = Math.ceil(totalCount / itemsPerPage);

  const getPaginationItems = () => {
    const items = [];
    const maxPagesToShow = 5; // 最多显示5个页码按钮

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
      // Always show first page
      items.push(
        <PaginationItem key={1}>
          <PaginationLink isActive={1 === currentPage} onClick={() => onPageChange(1)}>
            1
          </PaginationLink>
        </PaginationItem>
      );

      // Ellipsis if current page is far from start
      if (currentPage > 2 && currentPage <= totalPages - 2) {
        items.push(<PaginationEllipsis key="ellipsis-start" />);
      }

      // Pages around current page
      let startPage = Math.max(2, currentPage - 1);
      let endPage = Math.min(totalPages - 1, currentPage + 1);

      if (currentPage === 1) { // If on first page, show 1, 2, 3...
        startPage = 2;
        endPage = Math.min(totalPages - 1, 3);
      } else if (currentPage === totalPages) { // If on last page, show ...total-2, total-1, total
        startPage = Math.max(2, totalPages - 2);
        endPage = totalPages - 1;
      }

      for (let i = startPage; i <= endPage; i++) {
        items.push(
          <PaginationItem key={i}>
            <PaginationLink isActive={i === currentPage} onClick={() => onPageChange(i)}>
              {i}
            </PaginationLink>
          </PaginationItem>
        );
      }

      // Ellipsis if current page is far from end
      if (currentPage < totalPages - 1 && currentPage >= 3) {
        items.push(<PaginationEllipsis key="ellipsis-end" />);
      }

      // Always show last page
      if (totalPages > 1) {
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


  return (
    <div className="overflow-x-auto">
      <Table className="min-w-full divide-y divide-gray-200">
        <TableHeader>
          <TableRow>
            <TableHead className="hidden md:table-cell w-1/6 md:w-auto">类型</TableHead>
            <TableHead className="w-2/6 md:w-auto">内容</TableHead>
            <TableHead className="hidden sm:table-cell w-1/6 md:w-auto">考试类型</TableHead>
            <TableHead className="w-1/6 md:w-auto">状态</TableHead>
            <TableHead className="hidden md:table-cell w-1/6 md:w-auto">错误</TableHead>
            <TableHead className="hidden md:table-cell w-1/6 md:w-auto">创建时间</TableHead>
            <TableHead className="w-1/6 md:w-auto text-right">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {resources.map((resource) => (
            <TableRow key={resource.uuid}>
              <TableCell className="hidden sm:table-cell align-top py-2 px-2 sm:px-4"> 
                <Badge variant="outline" className="text-xs sm:text-sm">
                  {resource.sourceType}
                </Badge>
              </TableCell>
              <TableCell className="max-w-[120px] sm:max-w-xs truncate align-top py-2 px-2 sm:px-4">
                <div className="truncate" title={resource.content}>
                  {truncateContent(resource.content)}
                </div>
              </TableCell>
              <TableCell className="hidden sm:table-cell align-top py-2 px-2 sm:px-4">{resource.examType}</TableCell>
              <TableCell className="align-top py-2 px-2 sm:px-4">{getStatusBadge(resource.status)}</TableCell>
              <TableCell className="hidden md:table-cell align-top py-2 px-2 sm:px-4">{resource.error || ""}</TableCell>
              <TableCell className="hidden md:table-cell align-top py-2 px-2 sm:px-4">{formatDate(resource.createdAt)}</TableCell>
              <TableCell className="align-top py-2 px-2 sm:px-4 text-right">
                <HistoryActions
                  resource={resource}
                  onEditResource={onEditResource}
                  onDeleteResource={onDeleteResource}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

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
