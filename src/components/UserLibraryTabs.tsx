import { useState, useEffect } from 'react';
import { Shelf, UserPaper, Paper } from '@/types';
import { dataClient } from '@/lib/dataClient';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PaperCard } from './PaperCard';
import { Button } from '@/components/ui/button';
import { BookOpen, Eye, CheckCircle2, Plus, Sparkles, Download, Edit, CheckSquare, Square, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { GuestStorage } from '@/lib/guestStorage';
import { toast } from '@/hooks/use-toast';
import { UpgradeGuard, ProBadge } from '@/components/UpgradeGuard';
import { type Tier } from '@/lib/tier';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

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
  
  // Bulk edit state
  const [isBulkEditMode, setIsBulkEditMode] = useState(false);
  const [selectedPapers, setSelectedPapers] = useState<Set<string>>(new Set());
  const [bulkEditModalOpen, setBulkEditModalOpen] = useState(false);
  const [bulkShelf, setBulkShelf] = useState<Shelf>('WANT');
  const [bulkRating, setBulkRating] = useState<number | null>(null);
  const [exportModalOpen, setExportModalOpen] = useState(false);

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
      console.log('Loading user library for userId:', userId);
      
      // Load user papers for each shelf
      const [wantPapers, readingPapers, readPapers] = await Promise.all([
        dataClient.listUserPapers(userId, 'WANT'),
        dataClient.listUserPapers(userId, 'READING'),
        dataClient.listUserPapers(userId, 'READ')
      ]);

      console.log('Loaded papers:', { wantPapers, readingPapers, readPapers });

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
      console.log('User papers state updated:', { WANT: wantPapers, READING: readingPapers, READ: readPapers });
      
    } catch (error) {
      console.error('Error loading user library:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Bulk edit functions
  const toggleBulkEditMode = () => {
    setIsBulkEditMode(!isBulkEditMode);
    setSelectedPapers(new Set());
  };

  const togglePaperSelection = (paperId: string) => {
    const newSelected = new Set(selectedPapers);
    if (newSelected.has(paperId)) {
      newSelected.delete(paperId);
    } else {
      newSelected.add(paperId);
    }
    setSelectedPapers(newSelected);
  };

  const selectAllPapers = () => {
    const currentShelfPapers = userPapers[activeTab];
    const allPaperIds = currentShelfPapers.map(up => up.paper_id);
    setSelectedPapers(new Set(allPaperIds));
  };

  const clearSelection = () => {
    setSelectedPapers(new Set());
  };

  const applyBulkEdit = async () => {
    if (selectedPapers.size === 0) {
      toast({
        title: "No papers selected",
        description: "Please select at least one paper to edit.",
        variant: "destructive"
      });
      return;
    }

    try {
      const updates = [];
      
      for (const paperId of selectedPapers) {
        const userPaper = userPapers[activeTab].find(up => up.paper_id === paperId);
        if (userPaper) {
          const hasShelfChange = bulkShelf !== userPaper.shelf;
          const hasRatingChange = bulkRating !== null && bulkRating !== userPaper.rating;
          
          if (hasShelfChange || hasRatingChange) {
            updates.push({
              userPaperId: userPaper.id,
              paperId: userPaper.paper_id,
              shelf: hasShelfChange ? bulkShelf : userPaper.shelf,
              rating: hasRatingChange ? bulkRating : userPaper.rating
            });
          }
        }
      }

      if (updates.length === 0) {
        toast({
          title: "No changes to apply",
          description: "The selected changes are already applied to all selected papers.",
        });
        return;
      }

      // Apply updates
      for (const update of updates) {
        if (isGuest) {
          GuestStorage.upsertUserPaper(update.userPaperId, {
            shelf: update.shelf,
            rating: update.rating
          });
        } else {
          // Use the supabase helpers for authenticated users
          const { upsertUserPaper } = await import('@/lib/supabaseHelpers');
          await upsertUserPaper({
            paper_id: update.paperId,
            shelf: update.shelf,
            rating: update.rating
          }, userId);
        }
      }

      toast({
        title: "Bulk edit applied",
        description: `Updated ${updates.length} paper${updates.length === 1 ? '' : 's'}.`,
      });

      // Always reload fresh data from database after bulk edit
      console.log('Reloading library data after bulk edit...');
      await loadUserLibrary();
      console.log('Library data reloaded successfully');

      // Reset bulk edit state
      setSelectedPapers(new Set());
      setBulkEditModalOpen(false);
      setBulkShelf('WANT');
      setBulkRating(null);

    } catch (error) {
      console.error('Error applying bulk edit:', error);
      toast({
        title: "Error",
        description: "Failed to apply bulk edit. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Export functions
  const exportToCSV = () => {
    const allPapers = Object.values(userPapers).flat();
    if (allPapers.length === 0) {
      toast({
        title: "No papers to export",
        description: "Add some papers to your library first.",
        variant: "destructive"
      });
      return;
    }

    const csvData = allPapers.map(userPaper => {
      const paper = papers[userPaper.paper_id];
      return {
        Title: paper?.title || '',
        Authors: paper?.authors?.join('; ') || '',
        DOI: paper?.doi || '',
        Year: paper?.year || '',
        Journal: paper?.journal || '',
        Shelf: userPaper.shelf,
        Rating: userPaper.rating || '',
        Review: userPaper.review || '',
        Date_Added: userPaper.created_at || ''
      };
    });

    const csvString = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => 
        Object.values(row).map(value => 
          typeof value === 'string' && value.includes(',') 
            ? `"${value.replace(/"/g, '""')}"` 
            : value
        ).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvString], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `peerly-library-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Export complete",
      description: `Exported ${allPapers.length} papers to CSV.`,
    });
  };

  const exportToJSON = () => {
    const allPapers = Object.values(userPapers).flat();
    if (allPapers.length === 0) {
      toast({
        title: "No papers to export",
        description: "Add some papers to your library first.",
        variant: "destructive"
      });
      return;
    }

    const exportData = {
      exportDate: new Date().toISOString(),
      totalPapers: allPapers.length,
      papers: allPapers.map(userPaper => {
        const paper = papers[userPaper.paper_id];
        return {
          ...paper,
          userData: {
            shelf: userPaper.shelf,
            rating: userPaper.rating,
            review: userPaper.review,
            dateAdded: userPaper.created_at,
            dateUpdated: userPaper.updated_at
          }
        };
      })
    };

    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `peerly-library-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Export complete",
      description: `Exported ${allPapers.length} papers to JSON.`,
    });
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
              {isBulkEditMode && (
                <div className="flex justify-between items-center p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-medium">
                      {selectedPapers.size} of {userPapers[shelf].length} selected
                    </span>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={selectAllPapers}>
                        Select All
                      </Button>
                      <Button variant="outline" size="sm" onClick={clearSelection}>
                        Clear
                      </Button>
                    </div>
                  </div>
                  <Button 
                    onClick={() => setBulkEditModalOpen(true)}
                    disabled={selectedPapers.size === 0}
                  >
                    Apply Changes ({selectedPapers.size})
                  </Button>
                </div>
              )}
              <div className="flex justify-between items-center">
                <div></div>
                <div className="flex gap-2">
                  <UpgradeGuard tier={tier} feature="bulk edit">
                    <Button 
                      variant="outline" 
                      className="gap-2"
                      onClick={toggleBulkEditMode}
                    >
                      <Edit className="w-4 h-4" />
                      {isBulkEditMode ? 'Cancel Bulk Edit' : 'Bulk Edit'}
                      <ProBadge />
                    </Button>
                  </UpgradeGuard>
                  <UpgradeGuard tier={tier} feature="unlimited exports">
                    <Dialog open={exportModalOpen} onOpenChange={setExportModalOpen}>
                      <DialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          className="gap-2"
                        >
                          <Download className="w-4 h-4" />
                          Export All
                          <ProBadge />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Export Your Library</DialogTitle>
                          <DialogDescription>
                            Choose your preferred export format for all papers in your library.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="flex gap-2">
                          <Button onClick={() => { exportToCSV(); setExportModalOpen(false); }} className="flex-1">
                            Export as CSV
                          </Button>
                          <Button onClick={() => { exportToJSON(); setExportModalOpen(false); }} variant="outline" className="flex-1">
                            Export as JSON
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </UpgradeGuard>
                </div>
              </div>

              {/* Bulk Edit Modal */}
              <Dialog open={bulkEditModalOpen} onOpenChange={setBulkEditModalOpen}>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Bulk Edit Papers</DialogTitle>
                    <DialogDescription>
                      Apply changes to {selectedPapers.size} selected paper{selectedPapers.size === 1 ? '' : 's'}.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="bulk-shelf">Move to Shelf</Label>
                      <Select value={bulkShelf} onValueChange={(value) => setBulkShelf(value as Shelf)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="WANT">Want to Read</SelectItem>
                          <SelectItem value="READING">Currently Reading</SelectItem>
                          <SelectItem value="READ">Read</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bulk-rating">Set Rating</Label>
                      <Select value={bulkRating?.toString() || 'none'} onValueChange={(value) => setBulkRating(value === 'none' ? null : parseInt(value))}>
                        <SelectTrigger>
                          <SelectValue placeholder="No rating" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No rating</SelectItem>
                          <SelectItem value="1">1 star</SelectItem>
                          <SelectItem value="2">2 stars</SelectItem>
                          <SelectItem value="3">3 stars</SelectItem>
                          <SelectItem value="4">4 stars</SelectItem>
                          <SelectItem value="5">5 stars</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setBulkEditModalOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={applyBulkEdit}>
                      Apply Changes
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {userPapers[shelf].map((userPaper) => {
                  const paper = papers[userPaper.paper_id];
                  if (!paper) return null;
                  
                  return (
                    <div key={userPaper.id} className="relative">
                      {isBulkEditMode && (
                        <div className="absolute top-2 left-2 z-10">
                          <input
                            type="checkbox"
                            checked={selectedPapers.has(userPaper.paper_id)}
                            onChange={() => togglePaperSelection(userPaper.paper_id)}
                            className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                          />
                        </div>
                      )}
                      <PaperCard
                        paper={paper}
                        showAbstract
                        tier={tier}
                      />
                    </div>
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