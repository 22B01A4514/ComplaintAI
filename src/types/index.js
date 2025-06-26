// Type definitions as constants for better code organization
export const ComplaintStatus = {
  SUBMITTED: 'Submitted',
  IN_REVIEW: 'In Review',
  ASSIGNED: 'Assigned',
  IN_PROGRESS: 'In Progress',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed'
};

export const ComplaintPriority = {
  CRITICAL: 'Critical',
  HIGH: 'High',
  MEDIUM: 'Medium',
  LOW: 'Low'
};

export const UserRole = {
  CITIZEN: 'citizen',
  ADMIN: 'admin',
  DEPARTMENT_HEAD: 'department_head'
};

export const Sentiment = {
  POSITIVE: 'Positive',
  NEUTRAL: 'Neutral',
  NEGATIVE: 'Negative'
};