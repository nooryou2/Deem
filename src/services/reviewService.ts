// src/services/reviewService.ts
import {
  collection,
  doc,
  addDoc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { Review, ReviewSource, ProviderRating } from '@/types';

const REVIEWS = 'reviews';
const PROVIDERS = 'providers';

export interface CreateReviewInput {
  providerId: string;
  providerName: string;
  homeownerId: string;
  homeownerName: string;
  jobId: string;
  jobType: ReviewSource;
  serviceName: string;
  stars: number;
  comment?: string;
  servicedDate?: string;
}

/**
 * Saves a review and refreshes the provider's aggregate rating.
 *
 * The aggregate is stored on the provider's public profile so lists can sort
 * by rating without reading every review — important once a provider has
 * hundreds of them.
 */
export async function submitReview(input: CreateReviewInput): Promise<void> {
  await addDoc(collection(db, REVIEWS), {
    ...input,
    comment: input.comment ?? '',
    createdAt: serverTimestamp(),
  });
  // Self-logged visits have no provider, so there's no public rating to update.
  if (input.providerId) {
    await recalculateProviderRating(input.providerId);
  }
}

/**
 * Recomputes a provider's average rating from all their reviews and writes it
 * onto their public profile.
 */
export async function recalculateProviderRating(providerId: string): Promise<void> {
  const reviews = await fetchProviderReviews(providerId);
  if (reviews.length === 0) return;

  const totalStars = reviews.reduce((sum, r) => sum + r.stars, 0);
  const avgStars = totalStars / reviews.length;

  const rating: ProviderRating = {
    averageStars: Number(avgStars.toFixed(2)),
    // Out-of-10 is simply the star average doubled — no separate input needed.
    averageScore: Number((avgStars * 2).toFixed(1)),
    count: reviews.length,
  };

  await setDoc(doc(db, PROVIDERS, providerId), { rating }, { merge: true });
}

export async function fetchProviderReviews(providerId: string): Promise<Review[]> {
  if (!providerId) return [];
  const q = query(collection(db, REVIEWS), where('providerId', '==', providerId));
  const snap = await getDocs(q);
  const list = snap.docs.map((d) => mapReview(d.id, d.data()));
  // Newest first (sorted in JS to avoid needing a composite index).
  list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return list;
}

/**
 * Returns the ids of jobs this homeowner has already reviewed, so the UI can
 * hide the "Rate service" button on jobs that are already done.
 */
export async function fetchReviewedJobIds(homeownerId: string): Promise<string[]> {
  try {
    const q = query(collection(db, REVIEWS), where('homeownerId', '==', homeownerId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data().jobId as string);
  } catch (e) {
    console.log('fetchReviewedJobIds failed:', e);
    return [];
  }
}

/** Reads a provider's aggregate rating, or null when they have no reviews. */
export async function getProviderRating(providerId: string): Promise<ProviderRating | null> {
  try {
    const snap = await getDoc(doc(db, PROVIDERS, providerId));
    if (!snap.exists()) return null;
    return (snap.data().rating as ProviderRating) ?? null;
  } catch {
    return null;
  }
}

function mapReview(id: string, data: any): Review {
  return {
    id,
    providerId: data.providerId,
    providerName: data.providerName ?? 'Provider',
    homeownerId: data.homeownerId,
    homeownerName: data.homeownerName ?? 'Customer',
    jobId: data.jobId,
    jobType: data.jobType ?? 'request',
    serviceName: data.serviceName ?? 'Service',
    stars: data.stars ?? 0,
    comment: data.comment ?? '',
    servicedDate: data.servicedDate ?? '',
    createdAt:
      data.createdAt instanceof Timestamp
        ? data.createdAt.toDate().toISOString()
        : new Date().toISOString(),
  };
}
