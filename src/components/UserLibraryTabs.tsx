import { useState, useEffect } from 'react';
import { Shelf, UserPaper, Paper } from '@/types';
import { dataClient } from '@/lib/dataClient';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PaperCard } from './PaperCard';
import { BookOpen, Eye, CheckCircle2 } from 'lucide-react';

interface UserLibraryTabsProps {
  userId: string;
  userPapers?: UserPaper[];
}

const shelfConfig = {
  WANT: { label: 'Want to Read', icon: Eye },
  READING: { label: 'Reading', icon: BookOpen },
  READ: { label: 'Read', icon: CheckCircle2 }
} as const;

export function UserLibraryTabs({ userId, userPapers: passedUserPapers }: UserLibraryTabsProps) {
  const [userPapers, setUserPapers] = useState<Record<Shelf, UserPaper[]>>({
    WANT: [],
    READING: [],
    READ: []
  });
  const [papers, setPapers] = useState<Record<string, Paper>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Shelf>('WANT');

  useEffect(() => {
    if (passedUserPapers) {
      // Use passed user papers data
      loadUserLibraryFromData(passedUserPapers);
    } else {
      // Fallback to fetching from dataClient
      loadUserLibrary();
    }
  }, [userId, passedUserPapers]);

  const loadUserLibraryFromData = async (papersData: UserPaper[]) => {
    try {
      setIsLoading(true);
      
      // Group papers by shelf
      const groupedPapers = papersData.reduce((acc, userPaper) => {
        if (!acc[userPaper.shelf]) {
          acc[userPaper.shelf] = [];
        }
        acc[userPaper.shelf].push(userPaper);
        return acc;
      }, {} as Record<Shelf, UserPaper[]>);

      const allUserPapers = papersData;
      const paperIds = [...new Set(allUserPapers.map(up => up.paper_id))];

      // Load paper details
      const paperData: Record<string, Paper> = {};
      await Promise.all(
        paperIds.map(async (paperId) => {
          const paper = await dataClient.getPaperById(paperId);
          if (paper) {
            paperData[paperId] = paper;
          }
        })
      );

      setUserPapers({
        WANT: groupedPapers.WANT || [],
        READING: groupedPapers.READING || [],
        READ: groupedPapers.READ || []
      });
      setPapers(paperData);
      
    } catch (error) {
      console.error('Error loading user library:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadUserLibrary = async () => {
    try {
      setIsLoading(true);
      
      // Load user papers for each shelf
      const [wantPapers, readingPapers, readPapers] = await Promise.all([
        dataClient.listUserPapers(userId, 'WANT'),
        dataClient.listUserPapers(userId, 'READING'),
        dataClient.listUserPapers(userId, 'READ')
      ]);

      const allUserPapers = [...wantPapers, ...readingPapers, ...readPapers];
      const paperIds = [...new Set(allUserPapers.map(up => up.paper_id))];

      // Load paper details
      const paperData: Record<string, Paper> = {};
      await Promise.all(
        paperIds.map(async (paperId) => {
          const paper = await dataClient.getPaperById(paperId);
          if (paper) {
            paperData[paperId] = paper;
          }
        })
      );

      setUserPapers({
        WANT: wantPapers,
        READING: readingPapers,
        READ: readPapers
      });
      setPapers(paperData);
      
    } catch (error) {
      console.error('Error loading user library:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-12 bg-muted rounded w-full"></div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="academic-card p-6 animate-pulse">
              <div className="space-y-4">
                <div className="h-6 bg-muted rounded"></div>
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-4 bg-muted rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as Shelf)} className="w-full">
      <div className="library-tabs py-4">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:grid-cols-3">
          {(Object.keys(shelfConfig) as Shelf[]).map((shelf) => {
            const config = shelfConfig[shelf];
            const Icon = config.icon;
            const count = userPapers[shelf].length;
            
            return (
              <TabsTrigger 
                key={shelf} 
                value={shelf}
                className="flex items-center gap-2"
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{config.label}</span>
                <span className="sm:hidden">{shelf.toLowerCase()}</span>
                <span className="text-xs bg-muted px-1.5 py-0.5 rounded-full">
                  {count}
                </span>
              </TabsTrigger>
            );
          })}
        </TabsList>
      </div>

      {(Object.keys(shelfConfig) as Shelf[]).map((shelf) => (
        <TabsContent key={shelf} value={shelf} className="mt-6">
          {userPapers[shelf].length === 0 ? (
            <div className="text-center py-12">
              <div className="text-muted-foreground">
                <p className="text-lg mb-2">No papers in {shelfConfig[shelf].label.toLowerCase()} yet</p>
                <p className="text-sm">Start building your academic library!</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {userPapers[shelf].map((userPaper) => {
                const paper = papers[userPaper.paper_id];
                if (!paper) return null;
                
                return (
                  <PaperCard
                    key={userPaper.id}
                    paper={paper}
                    showAbstract
                  />
                );
              })}
            </div>
          )}
        </TabsContent>
      ))}
    </Tabs>
  );
}