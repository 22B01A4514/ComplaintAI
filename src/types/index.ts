export interface Complaint {
  id: string;
  title: string;
  description: string;
  category: string;
  department: string;
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  status: 'Submitted' | 'In Review' | 'Assigned' | 'In Progress' | 'Resolved' | 'Closed';
  submittedAt: Date;
  lastUpdated: Date;
  estimatedResolution?: Date;
  votes: number;
  isAnonymous: boolean;
  location: {
    address: string;
    coordinates?: { lat: number; lng: number };
  };
  attachments?: string[];
  tags: string[];
  sentiment: 'Positive' | 'Neutral' | 'Negative';
  urgencyKeywords: string[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'citizen' | 'admin' | 'department_head';
  department?: string;
  avatar?: string;
}

export interface Department {
  id: string;
  name: string;
  description: string;
  performance: {
    score: number;
    avgResolutionTime: number;
    totalResolved: number;
    badges: string[];
  };
  head: string;
  members: number;
}

export interface AnalyticsData {
  totalComplaints: number;
  resolvedComplaints: number;
  avgResolutionTime: number;
  categoryBreakdown: { category: string; count: number }[];
  priorityDistribution: { priority: string; count: number }[];
  trendsOverTime: { date: string; complaints: number }[];
  departmentPerformance: { department: string; score: number; resolved: number }[];
}