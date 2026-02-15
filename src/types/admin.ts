export type AdminOverview = {
  generatedAt: string;
  users: {
    total: number;
    active30d: number;
    suspended: number;
  };
  organizations: {
    total: number;
    active: number;
  };
  subscriptions: {
    active: number;
    pendingOrPastDue: number;
    mrrMajor: number;
  };
};

export type AdminUserRow = {
  id: string;
  userId: string;
  email: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  emailVerified: boolean;
  isSuspended: boolean;
  suspendedAt: string | null;
  suspensionReason: string | null;
  createdAt: string;
  lastLoginAt: string | null;
  loginCount: number;
  signupCountry: string | null;
  signupCity: string | null;
  signupRegion: string | null;
  ownedOrganizationsCount: number;
  memberOrganizationsCount: number;
  hasActiveSubscription: boolean;
};

export type AdminUsersPayload = {
  total: number;
  limit: number;
  offset: number;
  users: AdminUserRow[];
};

export type AdminOrganizationRow = {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  owner: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    isSuspended: boolean;
  };
  _count: {
    members: number;
    subscriptions: number;
    leads: number;
    sales: number;
  };
  subscriptions: Array<{
    id: string;
    status: string;
    amount: number;
    currency: string;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
    createdAt: string;
  }>;
};

export type AdminOrganizationsPayload = {
  total: number;
  limit: number;
  offset: number;
  organizations: AdminOrganizationRow[];
};

export type DailyMetric = {
  date: string;
  count: number;
};

export type AdminAnalytics = {
  dailyUsers: DailyMetric[];
  dailyOrgs: DailyMetric[];
  dailyMessages: DailyMetric[];
};
