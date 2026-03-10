// My List and Likes management with database support
// Uses database for authenticated users, localStorage for guests

export interface MyListItem {
  id: number;
  type: 'movie' | 'series';
  title: string;
  posterPath?: string;
  year?: string;
  rating?: number;
  addedAt: number; // timestamp
}

export interface LikedItem {
  id: number;
  type: 'movie' | 'series';
  likedAt: number; // timestamp
}

const MY_LIST_KEY = 'czystyplayer_my_list';
const LIKED_KEY = 'czystyplayer_liked';

// Helper to get auth token from zustand persist storage
function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const authStore = localStorage.getItem('auth-storage');
    if (authStore) {
      const parsed = JSON.parse(authStore);
      // Zustand persist stores data in state.tokens.accessToken
      return parsed?.state?.tokens?.accessToken || null;
    }
  } catch {
    return null;
  }
  return null;
}

// Helper to check if user is authenticated
function isAuthenticated(): boolean {
  return !!getAuthToken();
}

// ============================================================================
// MY LIST FUNCTIONS
// ============================================================================

// Get user's list (from DB if authenticated, localStorage if guest)
export async function getMyListAsync(): Promise<MyListItem[]> {
  const token = getAuthToken();
  
  if (token) {
    try {
      const res = await fetch('/api/user/my-list', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success && data.items) {
        return data.items.map((item: any) => ({
          id: item.content_id,
          type: item.content_type,
          title: item.title,
          posterPath: item.poster_path,
          year: item.year,
          rating: item.rating,
          addedAt: new Date(item.added_at).getTime(),
        }));
      }
    } catch (error) {
      console.error('Error fetching my list from DB:', error);
    }
  }
  
  // Fallback to localStorage
  return getMyListLocal();
}

// Synchronous local storage getter (for backwards compatibility)
export function getMyList(): MyListItem[] {
  return getMyListLocal();
}

function getMyListLocal(): MyListItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(MY_LIST_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

// Add to list
export async function addToMyListAsync(item: Omit<MyListItem, 'addedAt'>): Promise<boolean> {
  const token = getAuthToken();
  
  if (token) {
    try {
      const res = await fetch('/api/user/my-list', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          contentId: item.id,
          contentType: item.type,
          title: item.title,
          posterPath: item.posterPath,
          year: item.year,
          rating: item.rating,
        }),
      });
      const data = await res.json();
      return data.success;
    } catch (error) {
      console.error('Error adding to my list:', error);
      return false;
    }
  }
  
  // Fallback to localStorage
  addToMyListLocal(item);
  return true;
}

export function addToMyList(item: Omit<MyListItem, 'addedAt'>): void {
  if (isAuthenticated()) {
    addToMyListAsync(item);
  }
  addToMyListLocal(item);
}

function addToMyListLocal(item: Omit<MyListItem, 'addedAt'>): void {
  if (typeof window === 'undefined') return;
  const list = getMyListLocal();
  const exists = list.some(i => i.id === item.id && i.type === item.type);
  if (!exists) {
    list.unshift({ ...item, addedAt: Date.now() });
    localStorage.setItem(MY_LIST_KEY, JSON.stringify(list));
  }
}

// Remove from list
export async function removeFromMyListAsync(id: number, type: 'movie' | 'series'): Promise<boolean> {
  const token = getAuthToken();
  
  if (token) {
    try {
      const res = await fetch(`/api/user/my-list?contentId=${id}&contentType=${type}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      return data.success;
    } catch (error) {
      console.error('Error removing from my list:', error);
      return false;
    }
  }
  
  removeFromMyListLocal(id, type);
  return true;
}

export function removeFromMyList(id: number, type: 'movie' | 'series'): void {
  if (isAuthenticated()) {
    removeFromMyListAsync(id, type);
  }
  removeFromMyListLocal(id, type);
}

function removeFromMyListLocal(id: number, type: 'movie' | 'series'): void {
  if (typeof window === 'undefined') return;
  const list = getMyListLocal();
  const filtered = list.filter(i => !(i.id === id && i.type === type));
  localStorage.setItem(MY_LIST_KEY, JSON.stringify(filtered));
}

// Check if in list
export async function isInMyListAsync(id: number, type: 'movie' | 'series'): Promise<boolean> {
  const token = getAuthToken();
  
  if (token) {
    try {
      const res = await fetch(`/api/user/my-list/toggle?contentId=${id}&contentType=${type}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      return data.inList || false;
    } catch (error) {
      console.error('Error checking my list:', error);
    }
  }
  
  return isInMyListLocal(id, type);
}

export function isInMyList(id: number, type: 'movie' | 'series'): boolean {
  return isInMyListLocal(id, type);
}

function isInMyListLocal(id: number, type: 'movie' | 'series'): boolean {
  const list = getMyListLocal();
  return list.some(i => i.id === id && i.type === type);
}

// Toggle list
export async function toggleMyListAsync(item: Omit<MyListItem, 'addedAt'>): Promise<boolean> {
  const token = getAuthToken();
  
  if (token) {
    try {
      const res = await fetch('/api/user/my-list/toggle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          contentId: item.id,
          contentType: item.type,
          title: item.title,
          posterPath: item.posterPath,
          year: item.year,
          rating: item.rating,
        }),
      });
      const data = await res.json();
      // Update local storage to match DB state
      if (data.inList) {
        addToMyListLocal(item);
      } else {
        removeFromMyListLocal(item.id, item.type);
      }
      return data.inList;
    } catch (error) {
      console.error('Error toggling my list:', error);
    }
  }
  
  // Fallback to localStorage only
  return toggleMyListLocal(item);
}

export function toggleMyList(item: Omit<MyListItem, 'addedAt'>): boolean {
  if (isAuthenticated()) {
    toggleMyListAsync(item);
  }
  return toggleMyListLocal(item);
}

function toggleMyListLocal(item: Omit<MyListItem, 'addedAt'>): boolean {
  if (isInMyListLocal(item.id, item.type)) {
    removeFromMyListLocal(item.id, item.type);
    return false;
  } else {
    addToMyListLocal(item);
    return true;
  }
}

// ============================================================================
// LIKED ITEMS FUNCTIONS
// ============================================================================

export async function getLikedItemsAsync(): Promise<LikedItem[]> {
  const token = getAuthToken();
  
  if (token) {
    try {
      const res = await fetch('/api/user/likes', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success && data.items) {
        return data.items.map((item: any) => ({
          id: item.content_id,
          type: item.content_type,
          likedAt: new Date(item.liked_at).getTime(),
        }));
      }
    } catch (error) {
      console.error('Error fetching likes from DB:', error);
    }
  }
  
  return getLikedItemsLocal();
}

export function getLikedItems(): LikedItem[] {
  return getLikedItemsLocal();
}

function getLikedItemsLocal(): LikedItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(LIKED_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export async function toggleLikeAsync(id: number, type: 'movie' | 'series'): Promise<boolean> {
  const token = getAuthToken();
  
  if (token) {
    try {
      const res = await fetch('/api/user/likes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ contentId: id, contentType: type }),
      });
      const data = await res.json();
      // Update local storage to match
      if (data.liked) {
        addLikeLocal(id, type);
      } else {
        removeLikeLocal(id, type);
      }
      return data.liked;
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  }
  
  return toggleLikeLocal(id, type);
}

export function addLike(id: number, type: 'movie' | 'series'): void {
  if (isAuthenticated()) {
    toggleLikeAsync(id, type);
  }
  addLikeLocal(id, type);
}

function addLikeLocal(id: number, type: 'movie' | 'series'): void {
  if (typeof window === 'undefined') return;
  const list = getLikedItemsLocal();
  const exists = list.some(i => i.id === id && i.type === type);
  if (!exists) {
    list.unshift({ id, type, likedAt: Date.now() });
    localStorage.setItem(LIKED_KEY, JSON.stringify(list));
  }
}

export function removeLike(id: number, type: 'movie' | 'series'): void {
  if (isAuthenticated()) {
    toggleLikeAsync(id, type);
  }
  removeLikeLocal(id, type);
}

function removeLikeLocal(id: number, type: 'movie' | 'series'): void {
  if (typeof window === 'undefined') return;
  const list = getLikedItemsLocal();
  const filtered = list.filter(i => !(i.id === id && i.type === type));
  localStorage.setItem(LIKED_KEY, JSON.stringify(filtered));
}

export function isLiked(id: number, type: 'movie' | 'series'): boolean {
  return isLikedLocal(id, type);
}

function isLikedLocal(id: number, type: 'movie' | 'series'): boolean {
  const list = getLikedItemsLocal();
  return list.some(i => i.id === id && i.type === type);
}

export function toggleLike(id: number, type: 'movie' | 'series'): boolean {
  if (isAuthenticated()) {
    toggleLikeAsync(id, type);
  }
  return toggleLikeLocal(id, type);
}

function toggleLikeLocal(id: number, type: 'movie' | 'series'): boolean {
  if (isLikedLocal(id, type)) {
    removeLikeLocal(id, type);
    return false;
  } else {
    addLikeLocal(id, type);
    return true;
  }
}

// ============================================================================
// MIGRATION: Sync localStorage to database when user logs in
// ============================================================================

export async function syncLocalStorageToDatabase(): Promise<void> {
  const token = getAuthToken();
  if (!token) return;
  
  // Sync My List
  const localList = getMyListLocal();
  for (const item of localList) {
    try {
      await fetch('/api/user/my-list', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          contentId: item.id,
          contentType: item.type,
          title: item.title,
          posterPath: item.posterPath,
          year: item.year,
          rating: item.rating,
        }),
      });
    } catch (error) {
      console.error('Error syncing my list item:', error);
    }
  }
  
  // Sync Likes
  const localLikes = getLikedItemsLocal();
  for (const like of localLikes) {
    try {
      await fetch('/api/user/likes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          contentId: like.id,
          contentType: like.type,
        }),
      });
    } catch (error) {
      console.error('Error syncing like:', error);
    }
  }
  
  console.log('Local storage synced to database');
}
