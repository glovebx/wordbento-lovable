import React, { useState } from 'react';
import {
  Table,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { WordDataType } from '@/types/wordTypes';
import useIsTouchDevice from '@/hooks/use-is-touch-device';
import WordImages from './WordImages'; // Import the new component

interface HistoryRecord extends WordDataType {
  viewedAt: string;
}

interface WordHistoryTableProps {
  history: HistoryRecord[];
}

export const WordHistoryTable: React.FC<WordHistoryTableProps> = ({ history }) => {
  const isTouch = useIsTouchDevice();
  const [openRowId, setOpenRowId] = useState<number | null>(null);

  const handleRowToggle = (recordId: number) => {
    setOpenRowId(prevId => prevId === recordId ? null : recordId);
  };

  return (
    <div className="mb-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="font-medium">单词</TableHead>
            {!isTouch && <TableHead className="font-medium">音标</TableHead>}
            <TableHead className="font-medium text-right">查看时间</TableHead>
          </TableRow>
        </TableHeader>
        {history.map((record) => (
          <Collapsible asChild key={record.id} open={openRowId === record.id} onOpenChange={() => handleRowToggle(record.id)}>
            <tbody>
              <CollapsibleTrigger asChild>
                <TableRow className="cursor-pointer hover:bg-muted/50">
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{record.word_text}</span>
                      <span className="text-sm text-muted-foreground">{record.meaning}</span>
                    </div>
                  </TableCell>
                  {!isTouch && (
                    <TableCell>
                      {record.phonetic && <Badge variant="outline">/{record.phonetic}/</Badge>}
                    </TableCell>
                  )}
                  <TableCell className="text-right">
                    {formatDistanceToNow(new Date(record.viewedAt), { addSuffix: true, locale: zhCN })}
                  </TableCell>
                </TableRow>
              </CollapsibleTrigger>
              <CollapsibleContent asChild>
                <TableRow>
                  <TableCell colSpan={isTouch ? 2 : 3}>
                    <WordImages wordText={record.word_text} />
                  </TableCell>
                </TableRow>
              </CollapsibleContent>
            </tbody>
          </Collapsible>
        ))}
      </Table>
    </div>
  );
};