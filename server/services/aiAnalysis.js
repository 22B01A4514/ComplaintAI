import Sentiment from 'sentiment';
import natural from 'natural';

class AIAnalysisService {
  constructor() {
    this.sentiment = new Sentiment();
    this.stemmer = natural.PorterStemmer;
    
    // Enhanced keyword dictionaries
    this.urgencyKeywords = [
      // Emergency keywords
      'urgent', 'emergency', 'critical', 'immediate', 'asap', 'now',
      'fire', 'flood', 'gas leak', 'water leak', 'electrical', 'power outage',
      'dangerous', 'hazard', 'unsafe', 'risk', 'threat', 'threatening',
      
      // Damage keywords
      'broken', 'damaged', 'collapsed', 'cracked', 'leaking', 'flooding',
      'blocked', 'clogged', 'overflowing', 'burst', 'explosion',
      
      // Safety keywords
      'injury', 'injured', 'hurt', 'bleeding', 'trapped', 'stuck',
      'poisoning', 'toxic', 'contaminated', 'exposed',
      
      // Severity keywords
      'major', 'severe', 'serious', 'massive', 'huge', 'extensive',
      'widespread', 'multiple', 'numerous', 'many'
    ];

    this.departmentKeywords = {
      'Public Works': [
        'road', 'street', 'pothole', 'pavement', 'sidewalk', 'curb',
        'water', 'sewer', 'drain', 'pipe', 'utility', 'infrastructure',
        'maintenance', 'repair', 'construction', 'bridge', 'tunnel'
      ],
      'Police Department': [
        'crime', 'theft', 'robbery', 'assault', 'violence', 'fight',
        'noise', 'disturbance', 'loud', 'party', 'music', 'shouting',
        'traffic', 'parking', 'speeding', 'accident', 'collision',
        'safety', 'security', 'suspicious', 'trespassing', 'vandalism'
      ],
      'Parks Department': [
        'park', 'playground', 'recreation', 'green space', 'garden',
        'trees', 'grass', 'landscaping', 'sports field', 'court',
        'bench', 'trail', 'path', 'fountain', 'pond', 'lake'
      ],
      'Code Enforcement': [
        'building', 'construction', 'permit', 'zoning', 'violation',
        'compliance', 'illegal', 'unauthorized', 'code', 'regulation',
        'property', 'structure', 'renovation', 'demolition'
      ],
      'Sanitation': [
        'garbage', 'trash', 'recycling', 'pickup', 'collection',
        'waste', 'cleaning', 'littering', 'dumping', 'smell',
        'odor', 'bins', 'containers', 'disposal'
      ],
      'Fire Department': [
        'fire', 'smoke', 'burning', 'flames', 'gas', 'propane',
        'hazard', 'alarm', 'detector', 'sprinkler', 'hydrant',
        'carbon monoxide', 'explosion', 'chemical', 'rescue'
      ]
    };

    // Priority scoring weights
    this.priorityWeights = {
      urgencyKeywords: 4,
      sentimentScore: 2,
      keywordDensity: 1,
      lengthFactor: 0.5
    };

    // Category importance levels
    this.categoryImportance = {
      'Safety': 4,
      'Infrastructure': 3,
      'Public Works': 3,
      'Fire Department': 4,
      'Police Department': 4,
      'Code Enforcement': 2,
      'Parks Department': 2,
      'Sanitation': 2
    };
  }

  analyzeComplaint(title, description) {
    const text = `${title} ${description}`.toLowerCase();
    
    try {
      // Perform all analyses
      const priority = this.analyzePriority(title, description);
      const sentiment = this.analyzeSentiment(title, description);
      const department = this.classifyDepartment(title, description);
      const urgencyKeywords = this.extractUrgencyKeywords(title, description);
      const tags = this.extractTags(title, description);
      const confidence = this.calculateConfidence(text, urgencyKeywords, department);
      
      return {
        priority,
        sentiment,
        department,
        urgencyKeywords,
        tags,
        confidence,
        analysis: {
          textLength: text.length,
          wordCount: text.split(' ').length,
          urgencyScore: urgencyKeywords.length,
          sentimentScore: this.sentiment.analyze(text).score
        }
      };
    } catch (error) {
      console.error('AI Analysis error:', error);
      
      // Return default analysis if error occurs
      return {
        priority: 'Medium',
        sentiment: 'Neutral',
        department: 'Public Works',
        urgencyKeywords: [],
        tags: [],
        confidence: 0.5,
        analysis: {
          error: 'Analysis failed, using defaults'
        }
      };
    }
  }

  analyzePriority(title, description) {
    const text = `${title} ${description}`.toLowerCase();
    const words = text.split(/\s+/);
    
    // Count urgency keywords
    const urgencyMatches = this.urgencyKeywords.filter(keyword => 
      text.includes(keyword.toLowerCase())
    );
    
    // Analyze sentiment intensity
    const sentimentResult = this.sentiment.analyze(text);
    const sentimentIntensity = Math.abs(sentimentResult.score);
    
    // Calculate keyword density
    const keywordDensity = urgencyMatches.length / words.length;
    
    // Calculate priority score
    let priorityScore = 0;
    priorityScore += urgencyMatches.length * this.priorityWeights.urgencyKeywords;
    priorityScore += (sentimentIntensity / 10) * this.priorityWeights.sentimentScore;
    priorityScore += keywordDensity * 100 * this.priorityWeights.keywordDensity;
    
    // Text length factor (longer descriptions might indicate more serious issues)
    const lengthFactor = Math.min(text.length / 500, 1);
    priorityScore += lengthFactor * this.priorityWeights.lengthFactor;
    
    // Determine priority level with more nuanced thresholds
    if (priorityScore >= 12 || urgencyMatches.length >= 4) return 'Critical';
    if (priorityScore >= 8 || urgencyMatches.length >= 3) return 'High';
    if (priorityScore >= 4 || urgencyMatches.length >= 1) return 'Medium';
    return 'Low';
  }

  analyzeSentiment(title, description) {
    const text = `${title} ${description}`;
    const result = this.sentiment.analyze(text);
    
    // Enhanced sentiment classification
    if (result.score > 3) return 'Positive';
    if (result.score < -3) return 'Negative';
    if (result.score < -1) return 'Negative';
    if (result.score > 1) return 'Positive';
    return 'Neutral';
  }

  classifyDepartment(title, description) {
    const text = `${title} ${description}`.toLowerCase();
    
    let bestMatch = 'Public Works';
    let maxScore = 0;
    
    Object.entries(this.departmentKeywords).forEach(([department, keywords]) => {
      let score = 0;
      
      keywords.forEach(keyword => {
        const keywordLower = keyword.toLowerCase();
        
        // Exact match gets higher score
        if (text.includes(keywordLower)) {
          score += 2;
        }
        
        // Stemmed match gets lower score
        const stemmedKeyword = this.stemmer.stem(keywordLower);
        const stemmedText = text.split(' ').map(word => this.stemmer.stem(word)).join(' ');
        if (stemmedText.includes(stemmedKeyword)) {
          score += 1;
        }
      });
      
      // Apply category importance multiplier
      const importance = this.categoryImportance[department] || 1;
      score *= importance;
      
      if (score > maxScore) {
        maxScore = score;
        bestMatch = department;
      }
    });
    
    return bestMatch;
  }

  extractUrgencyKeywords(title, description) {
    const text = `${title} ${description}`.toLowerCase();
    
    return this.urgencyKeywords.filter(keyword => 
      text.includes(keyword.toLowerCase())
    ).slice(0, 10); // Limit to top 10 keywords
  }

  extractTags(title, description) {
    const text = `${title} ${description}`.toLowerCase();
    const tags = new Set();
    
    // Extract keywords from all department categories
    Object.values(this.departmentKeywords).flat().forEach(keyword => {
      if (text.includes(keyword.toLowerCase())) {
        tags.add(keyword);
      }
    });
    
    // Add urgency keywords as tags
    this.urgencyKeywords.forEach(keyword => {
      if (text.includes(keyword.toLowerCase())) {
        tags.add(keyword);
      }
    });
    
    // Extract potential location-based tags
    const locationKeywords = [
      'downtown', 'uptown', 'residential', 'commercial', 'industrial',
      'school', 'hospital', 'mall', 'intersection', 'highway', 'bridge'
    ];
    
    locationKeywords.forEach(keyword => {
      if (text.includes(keyword)) {
        tags.add(keyword);
      }
    });
    
    return Array.from(tags).slice(0, 12); // Limit to 12 tags
  }

  calculateConfidence(text, urgencyKeywords, department) {
    let confidence = 0.5; // Base confidence
    
    // Increase confidence based on keyword matches
    const departmentKeywords = this.departmentKeywords[department] || [];
    const matchedKeywords = departmentKeywords.filter(keyword => 
      text.includes(keyword.toLowerCase())
    );
    
    // Keyword match confidence
    const keywordConfidence = Math.min(matchedKeywords.length / 3, 1) * 0.3;
    confidence += keywordConfidence;
    
    // Urgency keyword confidence
    const urgencyConfidence = Math.min(urgencyKeywords.length / 2, 1) * 0.2;
    confidence += urgencyConfidence;
    
    // Text length confidence (more detailed descriptions are more reliable)
    const lengthConfidence = Math.min(text.length / 200, 1) * 0.1;
    confidence += lengthConfidence;
    
    return Math.min(confidence, 1.0);
  }

  // Batch analysis for multiple complaints
  analyzeMultipleComplaints(complaints) {
    return complaints.map(complaint => ({
      id: complaint.id,
      analysis: this.analyzeComplaint(complaint.title, complaint.description)
    }));
  }

  // Generate insights from complaint data
  generateInsights(complaints) {
    const insights = {
      totalComplaints: complaints.length,
      criticalCount: 0,
      highPriorityCount: 0,
      sentimentDistribution: { Positive: 0, Neutral: 0, Negative: 0 },
      topUrgencyKeywords: {},
      departmentDistribution: {},
      avgConfidence: 0,
      recommendations: []
    };

    let totalConfidence = 0;

    complaints.forEach(complaint => {
      // Priority counts
      if (complaint.priority === 'Critical') insights.criticalCount++;
      if (complaint.priority === 'High') insights.highPriorityCount++;

      // Sentiment distribution
      if (complaint.sentiment) {
        insights.sentimentDistribution[complaint.sentiment]++;
      }

      // Department distribution
      if (complaint.department) {
        insights.departmentDistribution[complaint.department] = 
          (insights.departmentDistribution[complaint.department] || 0) + 1;
      }

      // Urgency keywords
      if (complaint.urgency_keywords) {
        const keywords = Array.isArray(complaint.urgency_keywords) 
          ? complaint.urgency_keywords 
          : JSON.parse(complaint.urgency_keywords || '[]');
        
        keywords.forEach(keyword => {
          insights.topUrgencyKeywords[keyword] = 
            (insights.topUrgencyKeywords[keyword] || 0) + 1;
        });
      }

      // Confidence tracking
      if (complaint.ai_confidence) {
        totalConfidence += complaint.ai_confidence;
      }
    });

    insights.avgConfidence = complaints.length > 0 ? totalConfidence / complaints.length : 0;

    // Generate recommendations
    if (insights.criticalCount > insights.totalComplaints * 0.1) {
      insights.recommendations.push('High number of critical complaints detected. Consider increasing response team capacity.');
    }

    if (insights.sentimentDistribution.Negative > insights.totalComplaints * 0.6) {
      insights.recommendations.push('Majority of complaints show negative sentiment. Review communication and response strategies.');
    }

    if (insights.avgConfidence < 0.7) {
      insights.recommendations.push('AI classification confidence is low. Consider improving keyword dictionaries and training data.');
    }

    return insights;
  }
}

export const aiService = new AIAnalysisService();