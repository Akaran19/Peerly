// Guest storage system for Peerly - allows users to try the app without signing in

import { UserPaper, Shelf } from '@/types';

const GUEST_STORAGE_KEY = 'peerly_guest_data';
const GUEST_USER_ID = 'guest-user';

interface GuestData {
  userPapers: UserPaper[];
  lastUpdated: string;
}

export class GuestStorage {
  private static getGuestData(): GuestData {
    try {
      const stored = localStorage.getItem(GUEST_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error reading guest data:', error);
    }
    return { userPapers: [], lastUpdated: new Date().toISOString() };
  }

  private static saveGuestData(data: GuestData): void {
    try {
      localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Error saving guest data:', error);
    }
  }

  static getUserPapers(): UserPaper[] {
    return this.getGuestData().userPapers;
  }

  static getUserPapersByShelf(shelf: Shelf): UserPaper[] {
    return this.getUserPapers().filter(paper => paper.shelf === shelf);
  }

  static getUserPaper(paperId: string): UserPaper | null {
    return this.getUserPapers().find(paper => paper.paper_id === paperId) || null;
  }

  static upsertUserPaper(paperId: string, updates: Partial<UserPaper>): UserPaper {
    const data = this.getGuestData();
    const existingIndex = data.userPapers.findIndex(p => p.paper_id === paperId);

    const userPaper: UserPaper = {
      id: existingIndex >= 0 ? data.userPapers[existingIndex].id : `guest-${Date.now()}`,
      user_id: GUEST_USER_ID,
      paper_id: paperId,
      shelf: updates.shelf || 'WANT',
      rating: updates.rating || null,
      review: updates.review || null,
      created_at: existingIndex >= 0 ? data.userPapers[existingIndex].created_at : new Date().toISOString(),
      updated_at: new Date().toISOString(),
      upvotes: 0,
      ...updates
    };

    if (existingIndex >= 0) {
      data.userPapers[existingIndex] = userPaper;
    } else {
      data.userPapers.push(userPaper);
    }

    data.lastUpdated = new Date().toISOString();
    this.saveGuestData(data);

    return userPaper;
  }

  static deleteUserPaper(paperId: string): boolean {
    const data = this.getGuestData();
    const initialLength = data.userPapers.length;
    data.userPapers = data.userPapers.filter(p => p.paper_id !== paperId);

    if (data.userPapers.length !== initialLength) {
      data.lastUpdated = new Date().toISOString();
      this.saveGuestData(data);
      return true;
    }
    return false;
  }

  static addSamplePapers(): void {
    const samplePapers = [
      { paperId: '1', shelf: 'READ' as Shelf, rating: 5, review: 'Excellent overview of LLMs in scientific writing!' },
      { paperId: '2', shelf: 'READING' as Shelf, rating: 4, review: 'Very comprehensive review of CRISPR applications.' },
      { paperId: '3', shelf: 'WANT' as Shelf },
      { paperId: '4', shelf: 'READ' as Shelf, rating: 5, review: 'Groundbreaking work in single-cell sequencing.' },
      { paperId: '5', shelf: 'READING' as Shelf, rating: 3 },
    ];

    const data = this.getGuestData();
    samplePapers.forEach(sample => {
      const existingIndex = data.userPapers.findIndex(p => p.paper_id === sample.paperId);
      if (existingIndex === -1) {
        const userPaper: UserPaper = {
          id: `guest-sample-${sample.paperId}`,
          user_id: GUEST_USER_ID,
          paper_id: sample.paperId,
          shelf: sample.shelf,
          rating: sample.rating || null,
          review: sample.review || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          upvotes: 0
        };
        data.userPapers.push(userPaper);
      }
    });

    data.lastUpdated = new Date().toISOString();
    this.saveGuestData(data);
  }

  static clearAllData(): void {
    localStorage.removeItem(GUEST_STORAGE_KEY);
  }

  static hasData(): boolean {
    return this.getUserPapers().length > 0;
  }

  static migrateToUser(userId: string): UserPaper[] {
    const guestPapers = this.getUserPapers();
    // Update user_id for all papers
    const migratedPapers = guestPapers.map(paper => ({
      ...paper,
      user_id: userId,
      id: paper.id.replace('guest-', `user-${userId}-`)
    }));

    // Clear guest data
    this.clearAllData();

    return migratedPapers;
  }
}
