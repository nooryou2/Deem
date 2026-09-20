// src/services/reviewService.ts
import { db } from '@/config/firebase';
import { ProviderRating,Review,ReviewSource } from '@/types';
import {
Timestamp,
collection,
doc,
getDocs,
query,
runTransaction,
serverTimestamp,
where,
} from 'firebase/firestore';

const REVIEWS = 'reviews';

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

export async function submitReview(input: CreateReviewInput): Promise<void> {
  if (!Number.isInteger(input.stars) || input.stars < 1 || input.stars > 5)
    throw new Error('INVALID_RATING');
  const id = `${input.homeownerId}_${input.jobType}_${input.jobId}`;
  await runTransaction(db, async (tx) => {
    const reference = doc(db, REVIEWS, id);
    const existing = await tx.get(reference);
    if (existing.exists()) throw new Error('ALREADY_REVIEWED');
    tx.set(reference, {
      ...input,
      servicedDate: input.servicedDate ?? '',
      comment: input.comment ?? '',
      createdAt: serverTimestamp(),
    });
  });
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
  const reviews = await fetchProviderReviews(providerId);
  if (!reviews.length) return null;
  const averageStars = reviews.reduce((sum, review) => sum + review.stars, 0) / reviews.length;
  return { averageStars, averageScore: averageStars * 2, count: reviews.length };
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
