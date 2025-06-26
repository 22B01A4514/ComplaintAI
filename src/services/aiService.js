import Sentiment from 'sentiment';

export class AIService {
  constructor() {
    this.sentiment = new Sentiment();
    
    this.urgencyKeywords = [
      'urgent', 'emergency', 'critical', 'immediate', 'fire', 'flood', 'gas leak',
      'water leak', 'electrical', 'dangerous', 'hazard', 'unsafe', 'broken',
      'major', 'severe', 'threatening', 'damage', 'injury', 'blocked', 'collapsed',
      'explosion', 'accident', 'bleeding', 'trapped', 'poisoning', 'overdose'
    ];

    this.departmentKeywords = {
      'Public Works': ['road', 'street', 'pothole', 'water', 'sewer', 'utility', 'infrastructure', 'maintenance', 'pipe', 'drain'],
      'Police Department': ['crime', 'theft', 'assault', 'noise', 'disturbance', 'traffic', 'parking', 'safety', 'violence', 'robbery'],
      'Parks Department': ['park', 'playground', 'recreation', 'green space', 'trees', 'sports field', 'garden', 'bench', 'trail'],
      'Code Enforcement': ['building', 'construction', 'permit', 'zoning', 'violation', 'compliance', 'illegal', 'unauthorized'],
      'Sanitation': ['garbage', 'trash', 'recycling', 'pickup', 'waste', 'cleaning', 'littering', 'dumping', 'smell'],
      'Fire Department': ['fire', 'smoke', 'gas', 'hazard', 'emergency', 'alarm', 'burning', 'explosion', 'carbon monoxide']
    };

    this.priorityWeights = {
      urgencyKeywords: 3,
      sentimentScore: 2,
      categoryImportance: 1
    };
  }

  analyzePriority(title, description) {
    const text = `${title} ${description}`.toLowerCase();
    const urgencyMatches = this.urgencyKeywords.filter(keyword => text.includes(keyword));
    
    // Calculate sentiment score
    const sentimentResult = this.sentiment.analyze(text);
    const sentimentScore = Math.abs(sentimentResult.score);
    
    // Calculate priority score
    let priorityScore = 0;
    priorityScore += urgencyMatches.length * this.priorityWeights.urgencyKeywords;
    priorityScore += (sentimentScore / 5) * this.priorityWeights.sentimentScore;
    
    // Determine priority level
    if (priorityScore >= 8 || urgencyMatches.length >= 3) return 'Critical';
    if (priorityScore >= 5 || urgencyMatches.length >= 2) return 'High';
    if (priorityScore >= 2 || urgencyMatches.length >= 1) return 'Medium';
    return 'Low';
  }

  analyzeSentiment(title, description) {
    const text = `${title} ${description}`;
    const result = this.sentiment.analyze(text);
    
    if (result.score > 2) return 'Positive';
    if (result.score < -2) return 'Negative';
    return 'Neutral';
  }

  extractUrgencyKeywords(title, description) {
    const text = `${title} ${description}`.toLowerCase();
    return this.urgencyKeywords.filter(keyword => text.includes(keyword));
  }

  classifyDepartment(title, description) {
    const text = `${title} ${description}`.toLowerCase();
    
    let bestMatch = 'Public Works';
    let maxMatches = 0;
    
    Object.entries(this.departmentKeywords).forEach(([department, keywords]) => {
      const matches = keywords.filter(keyword => text.includes(keyword)).length;
      if (matches > maxMatches) {
        maxMatches = matches;
        bestMatch = department;
      }
    });
    
    return bestMatch;
  }

  extractTags(title, description) {
    const text = `${title} ${description}`.toLowerCase();
    const tags = [];
    
    // Extract keywords from all categories
    Object.values(this.departmentKeywords).flat().forEach(keyword => {
      if (text.includes(keyword) && !tags.includes(keyword)) {
        tags.push(keyword);
      }
    });
    
    // Add urgency keywords
    this.urgencyKeywords.forEach(keyword => {
      if (text.includes(keyword) && !tags.includes(keyword)) {
        tags.push(keyword);
      }
    });
    
    return tags.slice(0, 8); // Limit to 8 tags
  }

  generateInsights(complaints) {
    const insights = {
      totalComplaints: complaints.length,
      criticalCount: complaints.filter(c => c.priority === 'Critical').length,
      avgResponseTime: this.calculateAvgResponseTime(complaints),
      topCategories: this.getTopCategories(complaints),
      sentimentDistribution: this.getSentimentDistribution(complaints),
      urgencyTrends: this.getUrgencyTrends(complaints)
    };
    
    return insights;
  }

  calculateAvgResponseTime(complaints) {
    const resolvedComplaints = complaints.filter(c => c.status === 'Resolved');
    if (resolvedComplaints.length === 0) return 0;
    
    const totalTime = resolvedComplaints.reduce((sum, complaint) => {
      const submitTime = new Date(complaint.submittedAt);
      const resolveTime = new Date(complaint.lastUpdated);
      return sum + (resolveTime - submitTime);
    }, 0);
    
    return Math.round(totalTime / resolvedComplaints.length / (1000 * 60 * 60 * 24)); // Days
  }

  getTopCategories(complaints) {
    const categoryCount = {};
    complaints.forEach(complaint => {
      categoryCount[complaint.category] = (categoryCount[complaint.category] || 0) + 1;
    });
    
    return Object.entries(categoryCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([category, count]) => ({ category, count }));
  }

  getSentimentDistribution(complaints) {
    const distribution = { Positive: 0, Neutral: 0, Negative: 0 };
    complaints.forEach(complaint => {
      distribution[complaint.sentiment]++;
    });
    return distribution;
  }

  getUrgencyTrends(complaints) {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return date.toISOString().split('T')[0];
    }).reverse();
    
    return last7Days.map(date => {
      const dayComplaints = complaints.filter(c => 
        c.submittedAt.toISOString().split('T')[0] === date
      );
      return {
        date,
        critical: dayComplaints.filter(c => c.priority === 'Critical').length,
        high: dayComplaints.filter(c => c.priority === 'High').length,
        total: dayComplaints.length
      };
    });
  }
}

export const aiService = new AIService();