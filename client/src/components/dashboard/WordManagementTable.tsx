import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { WordDataType } from '@/types/wordTypes';

interface WordManagementTableProps {
  words: WordDataType[];
  onDelete: (wordId: number) => void;
}

export const WordManagementTable: React.FC<WordManagementTableProps> = ({ words, onDelete }) => {
  return (
    <div className="mb-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>Word</TableHead>
            <TableHead>Meaning</TableHead>
            <TableHead>Phonetic</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {words.map((word) => (
            <TableRow key={word.id}>
              <TableCell>{word.id}</TableCell>
              <TableCell className="font-medium">{word.word_text}</TableCell>
              <TableCell>{word.meaning}</TableCell>
              <TableCell>{word.phonetic}</TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="icon" onClick={() => onDelete(word.id)}>
                  <Trash2 className="h-4 w-4 text-red-500" />
                  <span className="sr-only">Delete</span>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
