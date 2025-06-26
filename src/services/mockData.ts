import { Complaint, Department, AnalyticsData } from '../types';

export const mockComplaints: Complaint[] = [
  {
    id: '1',
    title: 'Urgent Water Leak on Main Street',
    description: 'There is a major water leak on Main Street causing flooding. This needs immediate attention as it\'s affecting traffic and nearby businesses.',
    category: 'Infrastructure',
    department: 'Public Works',
    priority: 'Critical',
    status: 'In Progress',
    submittedAt: new Date('2024-01-15T08:30:00'),
    lastUpdated: new Date('2024-01-15T14:20:00'),
    estimatedResolution: new Date('2024-01-16T18:00:00'),
    votes: 47,
    isAnonymous: false,
    location: {
      address: '1234 Main Street, Downtown',
      coordinates: { lat: 40.7128, lng: -74.0060 }
    },
    tags: ['water', 'emergency', 'flooding', 'traffic'],
    sentiment: 'Negative',
    urgencyKeywords: ['urgent', 'major', 'immediate', 'flooding']
  },
  {
    id: '2',
    title: 'Streetlight Not Working - Safety Concern',
    description: 'The streetlight at the intersection of Oak and Pine has been out for a week. It\'s a safety hazard for pedestrians at night.',
    category: 'Safety',
    department: 'Public Works',
    priority: 'High',
    status: 'Assigned',
    submittedAt: new Date('2024-01-14T19:45:00'),
    lastUpdated: new Date('2024-01-15T09:15:00'),
    estimatedResolution: new Date('2024-01-17T16:00:00'),
    votes: 23,
    isAnonymous: true,
    location: {
      address: 'Oak & Pine Street Intersection',
    },
    tags: ['streetlight', 'safety', 'pedestrian', 'night'],
    sentiment: 'Negative',
    urgencyKeywords: ['safety', 'hazard']
  },
  {
    id: '3',
    title: 'Noise Complaint - Construction at Night',
    description: 'Construction work is happening late at night (after 10 PM) disturbing residents. This violates city noise ordinances.',
    category: 'Noise',
    department: 'Code Enforcement',
    priority: 'Medium',
    status: 'In Review',
    submittedAt: new Date('2024-01-13T22:15:00'),
    lastUpdated: new Date('2024-01-14T08:30:00'),
    votes: 31,
    isAnonymous: false,
    location: {
      address: '5678 Residential Ave',
    },
    tags: ['noise', 'construction', 'late-night', 'ordinance'],
    sentiment: 'Negative',
    urgencyKeywords: ['disturbing', 'violates']
  },
  {
    id: '4',
    title: 'Pothole Repair Request',
    description: 'Large pothole on Elm Street causing vehicle damage. Multiple cars have been affected.',
    category: 'Infrastructure',
    department: 'Public Works',
    priority: 'High',
    status: 'Resolved',
    submittedAt: new Date('2024-01-10T14:20:00'),
    lastUpdated: new Date('2024-01-14T16:45:00'),
    votes: 15,
    isAnonymous: false,
    location: {
      address: '2100 Block of Elm Street',
    },
    tags: ['pothole', 'vehicle-damage', 'road'],
    sentiment: 'Neutral',
    urgencyKeywords: ['damage', 'large']
  },
  {
    id: '5',
    title: 'Park Maintenance - Playground Equipment',
    description: 'Playground equipment at Central Park needs maintenance. Some swings are broken and unsafe for children.',
    category: 'Parks & Recreation',
    department: 'Parks Department',
    priority: 'Medium',
    status: 'Submitted',
    submittedAt: new Date('2024-01-15T11:30:00'),
    lastUpdated: new Date('2024-01-15T11:30:00'),
    votes: 8,
    isAnonymous: false,
    location: {
      address: 'Central Park, Playground Area',
    },
    tags: ['playground', 'maintenance', 'children', 'safety'],
    sentiment: 'Neutral',
    urgencyKeywords: ['broken', 'unsafe']
  }
];

export const mockDepartments: Department[] = [
  {
    id: '1',
    name: 'Public Works',
    description: 'Infrastructure, utilities, roads, and general maintenance',
    performance: {
      score: 87,
      avgResolutionTime: 4.2,
      totalResolved: 156,
      badges: ['Fast Responder', 'Community Hero', 'Quality Champion']
    },
    head: 'John Mitchell',
    members: 24
  },
  {
    id: '2',
    name: 'Code Enforcement',
    description: 'Building codes, zoning, permits, and compliance',
    performance: {
      score: 92,
      avgResolutionTime: 3.8,
      totalResolved: 89,
      badges: ['Excellence Award', 'Fast Responder', 'Problem Solver']
    },
    head: 'Sarah Johnson',
    members: 12
  },
  {
    id: '3',
    name: 'Parks Department',
    description: 'Parks, recreation facilities, and green spaces',
    performance: {
      score: 95,
      avgResolutionTime: 2.9,
      totalResolved: 203,
      badges: ['Top Performer', 'Community Hero', 'Green Champion', 'Excellence Award']
    },
    head: 'Michael Rodriguez',
    members: 18
  },
  {
    id: '4',
    name: 'Police Department',
    description: 'Public safety, law enforcement, and emergency response',
    performance: {
      score: 94,
      avgResolutionTime: 1.2,
      totalResolved: 312,
      badges: ['Rapid Response', 'Community Hero', 'Safety Guardian']
    },
    head: 'Chief Amanda Davis',
    members: 45
  }
];

export const mockAnalytics: AnalyticsData = {
  totalComplaints: 1247,
  resolvedComplaints: 1089,
  avgResolutionTime: 3.2,
  categoryBreakdown: [
    { category: 'Infrastructure', count: 385 },
    { category: 'Safety', count: 298 },
    { category: 'Noise', count: 186 },
    { category: 'Parks & Recreation', count: 142 },
    { category: 'Sanitation', count: 119 },
    { category: 'Traffic', count: 117 }
  ],
  priorityDistribution: [
    { priority: 'Critical', count: 89 },
    { priority: 'High', count: 298 },
    { priority: 'Medium', count: 567 },
    { priority: 'Low', count: 293 }
  ],
  trendsOverTime: [
    { date: '2024-01-01', complaints: 45 },
    { date: '2024-01-02', complaints: 52 },
    { date: '2024-01-03', complaints: 38 },
    { date: '2024-01-04', complaints: 67 },
    { date: '2024-01-05', complaints: 71 },
    { date: '2024-01-06', complaints: 43 },
    { date: '2024-01-07', complaints: 59 },
    { date: '2024-01-08', complaints: 84 },
    { date: '2024-01-09', complaints: 76 },
    { date: '2024-01-10', complaints: 92 },
    { date: '2024-01-11', complaints: 67 },
    { date: '2024-01-12', complaints: 58 },
    { date: '2024-01-13', complaints: 73 },
    { date: '2024-01-14', complaints: 89 },
    { date: '2024-01-15', complaints: 95 }
  ],
  departmentPerformance: [
    { department: 'Parks Department', score: 95, resolved: 203 },
    { department: 'Police Department', score: 94, resolved: 312 },
    { department: 'Code Enforcement', score: 92, resolved: 89 },
    { department: 'Public Works', score: 87, resolved: 156 }
  ]
};