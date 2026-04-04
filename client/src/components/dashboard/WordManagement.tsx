import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAdmin } from '@/hooks/use-admin';
import { useAuth } from '@/contexts/AuthContext';
import { useDebounce } from '@/hooks/use-debounce';
import { WordManagementTable } from './WordManagementTable';
import { Pagination } from '@/components/Pagination';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Home, Loader2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const WordManagement: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const { words, isLoading, error, pagination, fetchAllWords, deleteWord } = useAdmin(isAuthenticated);
  const [isDeleting, setIsDeleting] = useState(false);
  const [wordToDelete, setWordToDelete] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  useEffect(() => {
    if (isAuthenticated) {
      fetchAllWords(1, debouncedSearchTerm);
    }
  }, [isAuthenticated, fetchAllWords, debouncedSearchTerm]);

  const handlePageChange = (page: number) => {
    fetchAllWords(page, debouncedSearchTerm);
  };

  const handleDeleteRequest = (wordId: number) => {
    setWordToDelete(wordId);
  };

  const handleConfirmDelete = async () => {
    if (wordToDelete === null) return;

    setIsDeleting(true);
    await deleteWord(wordToDelete);
    setIsDeleting(false);
    setWordToDelete(null);
  };

  if (error) {
    return <div className="text-center text-red-500 py-10">Error: {error}</div>;
  }

  return (
    <div className="p-6 relative">
       <div className="absolute top-4 right-4 z-30">
        <Button variant="outline" asChild>
          <Link to="/" className="flex items-center gap-2">
            <Home className="h-4 w-4" />
            Back to Home
          </Link>
        </Button>
      </div>

      <div className="mt-12">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle>Word Management</CardTitle>
            <div className="w-full max-w-sm">
              <Input
                type="search"
                placeholder="Search words..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading && words.length === 0 ? (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="ml-2">Loading words...</span>
              </div>
            ) : words.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No words found.
              </div>
            ) : (
              <>
                <WordManagementTable words={words} onDelete={handleDeleteRequest} />
                <Pagination 
                  currentPage={pagination.currentPage} 
                  totalPages={pagination.totalPages} 
                  onPageChange={handlePageChange} 
                />
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={wordToDelete !== null} onOpenChange={(open) => !open && setWordToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the word and all associated images from the servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} disabled={isDeleting}>
              {isDeleting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting...</> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default WordManagement;
