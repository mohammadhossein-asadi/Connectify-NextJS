export interface User {
  id: string;
  email: string;
  username: string;
  bio: string;
  avatar: string;
  cover: string;
  followers: string[]; // user IDs
  following: string[]; // user IDs
  verified: boolean;
  website?: string;
  location?: string;
  bookmarks: string[]; // post IDs
  createdAt: string;
}

export interface Comment {
  id: string;
  postId: string;
  userId: string;
  username: string;
  userAvatar: string;
  content: string;
  likes: string[]; // user IDs
  createdAt: string;
}

export interface Post {
  id: string;
  userId: string;
  username: string;
  userAvatar: string;
  userVerified: boolean;
  content: string;
  image?: string;
  video?: string;
  images?: string[];
  media?: { url: string; type: 'image' | 'video' }[];
  likes: string[]; // user IDs
  comments: Comment[];
  shares: number;
  hashtags: string[];
  createdAt: string;
}

export interface Story {
  id: string;
  userId: string;
  username: string;
  userAvatar: string;
  image: string;
  createdAt: string;
  expiresAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'like' | 'comment' | 'follow' | 'message' | 'system' | 'verify' | 'mention';
  relatedUserId?: string;
  relatedUsername?: string;
  relatedUserAvatar?: string;
  relatedPostId?: string;
  content: string;
  read: boolean;
  createdAt: string;
}

export interface Message {
  id: string;
  senderId: string;
  recipientId: string;
  content: string;
  read: boolean;
  createdAt: string;
}

export interface HashtagTrend {
  tag: string;
  count: number;
}
