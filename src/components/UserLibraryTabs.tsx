import { useState, useEffect } from 'react';
import { Shelf, UserPaper, Paper } from '@/types';
import { dataClient } from '@/lib/dataClient';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PaperCard } from './PaperCard';
import { Button } from '@/components/ui/button';
import { BookOpen, Eye, CheckCircle2, Plus, Sparkles, Download, Edit } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { GuestStorage } from '@/lib/guestStorage';
import { toast } from '@/hooks/use-toast';
import { UpgradeGuard, ProBadge } from '@/components/UpgradeGuard';
import { type Tier } from '@/lib/tier';

interface UserLibraryTabsProps {
  userId: string;
  userPapers?: UserPaper[];
  tier?: Tier;
}

const shelfConfig = {
  WANT: { label: 'Want to Read', icon: Eye, color: 'text-blue-600', bgColor: 'bg-blue-50', borderColor: 'border-blue-200' },
  READING: { label: 'Reading', icon: BookOpen, color: 'text-orange-600', bgColor: 'bg-orange-50', borderColor: 'border-orange-200' },
  READ: { label: 'Read', icon: CheckCircle2, color: 'text-green-600', bgColor: 'bg-green-50', borderColor: 'border-green-200' }
} as const;

export function UserLibraryTabs({ userId, userPapers: passedUserPapers, tier = 'free' }: UserLibraryTabsProps) {
  const { isGuest } = useAuth();
  const [userPapers, setUserPapers] = useState<Record<Shelf, UserPaper[]>>({
    WANT: [],
    READING: [],
    READ: []
  });
  const [papers, setPapers] = useState<Record<string, Paper>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Shelf>('WANT');

  const addSamplePapers = async () => {
    if (!isGuest) return;

    try {
      GuestStorage.addSamplePapers();
      toast({
        title: "Sample papers added!",
        description: "We've added some interesting papers to get you started."
      });
      // Reload the library to show the new papers
      await loadUserLibraryFromData(GuestStorage.getUserPapers());
    } catch (error) {
      console.error('Error adding sample papers:', error);
      toast({
        title: "Error",
        description: "Failed to add sample papers. Please try again.",
        variant: "destructive"
      });
    }
  };

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
                className={`flex items-center gap-2 data-[state=active]:${config.color} data-[state=active]:${config.bgColor} data-[state=active]:${config.borderColor} hover:${config.bgColor} transition-colors`}
              >
                <Icon className={`w-4 h-4 ${activeTab === shelf ? config.color : 'text-muted-foreground'}`} />
                <span className={`hidden sm:inline ${activeTab === shelf ? config.color : ''}`}>{config.label}</span>
                <span className={`sm:hidden ${activeTab === shelf ? config.color : ''}`}>{shelf.toLowerCase()}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeTab === shelf ? `${config.bgColor} ${config.color}` : 'bg-muted'}`}>
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
            <div className="text-center py-12 space-y-6">
              <div className="space-y-3">
                {(() => {
                  const Icon = shelfConfig[shelf].icon;
                  return <Icon className={`w-12 h-12 mx-auto ${shelfConfig[shelf].color}`} />;
                })()}
                <div className="text-muted-foreground">
                  <p className="text-lg mb-2">No papers in {shelfConfig[shelf].label.toLowerCase()} yet</p>
                  <p className="text-sm">
                    {isGuest 
                      ? "Start building your academic library by adding papers from the search above, or try our sample collection!"
                      : "Start building your academic library by searching for papers above!"
                    }
                  </p>
                </div>
              </div>
              
              {isGuest && (
                <div className="space-y-4">
                  <Button onClick={addSamplePapers} className="gap-2">
                    <Sparkles className="w-4 h-4" />
                    Add Sample Papers
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Try Peerly with some interesting papers to get started
                  </p>
                </div>
              )}
              
              {!isGuest && (
                <div className="space-y-4">
                  <Button variant="outline" asChild className="gap-2">
                    <a href="/">
                      <Plus className="w-4 h-4" />
                      Browse Papers
                    </a>
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div></div>
                <div className="flex gap-2">
                  <UpgradeGuard tier={tier} feature="bulk edit">
                    <Button variant="outline" disabled className="gap-2">
                      <Edit className="w-4 h-4" />
                      Bulk Edit
                      <ProBadge />
                    </Button>
                  </UpgradeGuard>
                  <UpgradeGuard tier={tier} feature="unlimited exports">
                    <Button variant="outline" disabled className="gap-2">
                      <Download className="w-4 h-4" />
                      Export All
                      <ProBadge />
                    </Button>
                  </UpgradeGuard>
                </div>
              </div>
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
            </div>
          )}
        </TabsContent>
      ))}
    </Tabs>
  );
}