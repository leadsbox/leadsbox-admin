export type SubscriptionStatus =
  | 'ACTIVE'
  | 'PENDING'
  | 'PAST_DUE'
  | 'CANCELED'
  | 'EXPIRED';

export type SubscriberRow = {
  subscriptionId: string;
  organizationId: string;
  organizationName: string;
  organizationCreatedAt: string;
  ownerId: string;
  ownerEmail: string;
  ownerName: string | null;
  ownerUsername: string | null;
  ownerCountry: string | null;
  ownerCity: string | null;
  ownerRegion: string | null;
  ownerLoginCount: number | null;
  ownerCreatedAt: string;
  ownerLastLoginAt: string | null;
  subscriberUserId: string | null;
  subscriberEmail: string | null;
  subscriberFirstName: string | null;
  subscriberLastName: string | null;
  subscriberName: string | null;
  subscriberPhone: string | null;
  subscriberCountry: string | null;
  subscriberCity: string | null;
  subscriberRegion: string | null;
  subscriberLastLoginAt: string | null;
  subscriberSnapshotAt: string | null;
  planId: string;
  planName: string;
  planInterval: 'MONTHLY' | 'QUARTERLY' | 'ANNUALLY' | string;
  status: SubscriptionStatus;
  amountMinor: number;
  amountMajor: number;
  currency: string;
  reference: string | null;
  paystackSubscriptionId: string | null;
  paystackCustomerCode: string | null;
  paystackEmailToken: string | null;
  startedAt: string;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  createdAt: string;
  updatedAt: string;
  metadata: Record<string, unknown> | null;
};

export type SubscribersSummary = {
  totalRows: number;
  latestOnly: boolean;
  byStatus: Record<string, number>;
  mrrEstimate: number;
};

export type SubscribersPayload = {
  summary: SubscribersSummary;
  subscribers: SubscriberRow[];
};

export type AuthUser = {
  id: string;
  email: string;
  username?: string | null;
  firstName?: string | null;
  lastName?: string | null;
};
