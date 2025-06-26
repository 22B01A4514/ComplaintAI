import express from 'express';
import { pool } from '../config/database.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

// Get analytics overview
router.get('/overview', async (req, res) => {
  try {
    // Get basic statistics
    const [basicStats] = await pool.execute(`
      SELECT 
        COUNT(*) as total_complaints,
        COUNT(CASE WHEN status = 'Resolved' THEN 1 END) as resolved_complaints,
        COUNT(CASE WHEN status = 'In Progress' THEN 1 END) as in_progress_complaints,
        COUNT(CASE WHEN priority = 'Critical' THEN 1 END) as critical_complaints,
        AVG(CASE 
          WHEN status = 'Resolved' 
          THEN DATEDIFF(updated_at, submitted_at) 
        END) as avg_resolution_time
      FROM complaints
    `);

    // Get complaints by status
    const [statusBreakdown] = await pool.execute(`
      SELECT status, COUNT(*) as count
      FROM complaints
      GROUP BY status
      ORDER BY count DESC
    `);

    // Get complaints by priority
    const [priorityBreakdown] = await pool.execute(`
      SELECT priority, COUNT(*) as count
      FROM complaints
      GROUP BY priority
      ORDER BY 
        CASE priority
          WHEN 'Critical' THEN 1
          WHEN 'High' THEN 2
          WHEN 'Medium' THEN 3
          WHEN 'Low' THEN 4
        END
    `);

    // Get complaints by category
    const [categoryBreakdown] = await pool.execute(`
      SELECT category, COUNT(*) as count
      FROM complaints
      GROUP BY category
      ORDER BY count DESC
      LIMIT 10
    `);

    // Get recent trends (last 30 days)
    const [trends] = await pool.execute(`
      SELECT 
        DATE(submitted_at) as date,
        COUNT(*) as complaints
      FROM complaints
      WHERE submitted_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      GROUP BY DATE(submitted_at)
      ORDER BY date ASC
    `);

    res.json({
      overview: basicStats[0],
      statusBreakdown,
      priorityBreakdown,
      categoryBreakdown,
      trends
    });
  } catch (error) {
    console.error('Get analytics overview error:', error);
    res.status(500).json({ message: 'Failed to fetch analytics overview' });
  }
});

// Get department performance analytics
router.get('/departments', async (req, res) => {
  try {
    const [departmentStats] = await pool.execute(`
      SELECT 
        d.id,
        d.name,
        d.performance_score,
        COUNT(c.id) as total_complaints,
        COUNT(CASE WHEN c.status = 'Resolved' THEN 1 END) as resolved_complaints,
        COUNT(CASE WHEN c.status = 'In Progress' THEN 1 END) as in_progress_complaints,
        AVG(CASE 
          WHEN c.status = 'Resolved' 
          THEN DATEDIFF(c.updated_at, c.submitted_at) 
        END) as avg_resolution_days,
        COUNT(CASE WHEN c.priority = 'Critical' THEN 1 END) as critical_complaints
      FROM departments d
      LEFT JOIN complaints c ON d.id = c.department_id
      GROUP BY d.id, d.name, d.performance_score
      ORDER BY d.performance_score DESC
    `);

    const formattedStats = departmentStats.map(dept => ({
      ...dept,
      resolution_rate: dept.total_complaints > 0 
        ? Math.round((dept.resolved_complaints / dept.total_complaints) * 100)
        : 0,
      avg_resolution_days: parseFloat(dept.avg_resolution_days) || 0
    }));

    res.json(formattedStats);
  } catch (error) {
    console.error('Get department analytics error:', error);
    res.status(500).json({ message: 'Failed to fetch department analytics' });
  }
});

// Get location-based analytics
router.get('/locations', async (req, res) => {
  try {
    // Get complaints by location (top areas)
    const [locationStats] = await pool.execute(`
      SELECT 
        location_address,
        COUNT(*) as complaint_count,
        COUNT(CASE WHEN priority = 'Critical' THEN 1 END) as critical_count,
        COUNT(CASE WHEN status = 'Resolved' THEN 1 END) as resolved_count
      FROM complaints
      WHERE location_address IS NOT NULL
      GROUP BY location_address
      HAVING complaint_count > 1
      ORDER BY complaint_count DESC
      LIMIT 20
    `);

    // Get geographic clusters (if coordinates available)
    const [geoStats] = await pool.execute(`
      SELECT 
        location_lat,
        location_lng,
        COUNT(*) as complaint_count,
        priority,
        status
      FROM complaints
      WHERE location_lat IS NOT NULL AND location_lng IS NOT NULL
      GROUP BY location_lat, location_lng, priority, status
      ORDER BY complaint_count DESC
    `);

    res.json({
      locationStats,
      geoStats
    });
  } catch (error) {
    console.error('Get location analytics error:', error);
    res.status(500).json({ message: 'Failed to fetch location analytics' });
  }
});

// Get time-based trends
router.get('/trends', async (req, res) => {
  try {
    const { period = '30d', granularity = 'day' } = req.query;

    let dateFilter = '';
    let dateFormat = '%Y-%m-%d';
    let groupBy = 'DATE(submitted_at)';

    switch (period) {
      case '7d':
        dateFilter = 'WHERE submitted_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
        break;
      case '30d':
        dateFilter = 'WHERE submitted_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)';
        break;
      case '90d':
        dateFilter = 'WHERE submitted_at >= DATE_SUB(NOW(), INTERVAL 90 DAY)';
        break;
      case '1y':
        dateFilter = 'WHERE submitted_at >= DATE_SUB(NOW(), INTERVAL 1 YEAR)';
        if (granularity === 'month') {
          dateFormat = '%Y-%m';
          groupBy = 'DATE_FORMAT(submitted_at, "%Y-%m")';
        }
        break;
    }

    const [trends] = await pool.execute(`
      SELECT 
        ${groupBy} as period,
        COUNT(*) as total_complaints,
        COUNT(CASE WHEN status = 'Resolved' THEN 1 END) as resolved_complaints,
        COUNT(CASE WHEN priority = 'Critical' THEN 1 END) as critical_complaints,
        COUNT(CASE WHEN priority = 'High' THEN 1 END) as high_complaints,
        AVG(CASE 
          WHEN status = 'Resolved' 
          THEN DATEDIFF(updated_at, submitted_at) 
        END) as avg_resolution_days
      FROM complaints
      ${dateFilter}
      GROUP BY ${groupBy}
      ORDER BY period ASC
    `);

    // Get sentiment trends
    const [sentimentTrends] = await pool.execute(`
      SELECT 
        ${groupBy} as period,
        sentiment,
        COUNT(*) as count
      FROM complaints
      ${dateFilter}
      GROUP BY ${groupBy}, sentiment
      ORDER BY period ASC, sentiment
    `);

    res.json({
      trends,
      sentimentTrends
    });
  } catch (error) {
    console.error('Get trends analytics error:', error);
    res.status(500).json({ message: 'Failed to fetch trends analytics' });
  }
});

// Get AI insights and patterns
router.get('/ai-insights', async (req, res) => {
  try {
    // Get urgency keyword analysis
    const [urgencyAnalysis] = await pool.execute(`
      SELECT 
        urgency_keywords,
        priority,
        COUNT(*) as count,
        AVG(CASE 
          WHEN status = 'Resolved' 
          THEN DATEDIFF(updated_at, submitted_at) 
        END) as avg_resolution_days
      FROM complaints
      WHERE urgency_keywords IS NOT NULL AND urgency_keywords != '[]'
      GROUP BY urgency_keywords, priority
      ORDER BY count DESC
      LIMIT 20
    `);

    // Get sentiment analysis
    const [sentimentAnalysis] = await pool.execute(`
      SELECT 
        sentiment,
        priority,
        COUNT(*) as count,
        AVG(CASE 
          WHEN status = 'Resolved' 
          THEN DATEDIFF(updated_at, submitted_at) 
        END) as avg_resolution_days
      FROM complaints
      GROUP BY sentiment, priority
      ORDER BY count DESC
    `);

    // Get tag analysis
    const [tagAnalysis] = await pool.execute(`
      SELECT 
        tags,
        category,
        COUNT(*) as count
      FROM complaints
      WHERE tags IS NOT NULL AND tags != '[]'
      GROUP BY tags, category
      ORDER BY count DESC
      LIMIT 30
    `);

    // Get AI confidence analysis
    const [confidenceAnalysis] = await pool.execute(`
      SELECT 
        CASE 
          WHEN ai_confidence >= 0.8 THEN 'High'
          WHEN ai_confidence >= 0.6 THEN 'Medium'
          ELSE 'Low'
        END as confidence_level,
        COUNT(*) as count,
        AVG(CASE 
          WHEN status = 'Resolved' 
          THEN DATEDIFF(updated_at, submitted_at) 
        END) as avg_resolution_days
      FROM complaints
      WHERE ai_confidence IS NOT NULL
      GROUP BY confidence_level
      ORDER BY count DESC
    `);

    res.json({
      urgencyAnalysis,
      sentimentAnalysis,
      tagAnalysis,
      confidenceAnalysis
    });
  } catch (error) {
    console.error('Get AI insights error:', error);
    res.status(500).json({ message: 'Failed to fetch AI insights' });
  }
});

// Get performance metrics (admin only)
router.get('/performance', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    // Get system performance metrics
    const [systemMetrics] = await pool.execute(`
      SELECT 
        COUNT(*) as total_complaints,
        COUNT(CASE WHEN submitted_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR) THEN 1 END) as complaints_24h,
        COUNT(CASE WHEN submitted_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 END) as complaints_7d,
        COUNT(CASE WHEN status = 'Resolved' THEN 1 END) as total_resolved,
        AVG(ai_confidence) as avg_ai_confidence,
        COUNT(CASE WHEN is_anonymous = 1 THEN 1 END) as anonymous_complaints
      FROM complaints
    `);

    // Get user engagement metrics
    const [userMetrics] = await pool.execute(`
      SELECT 
        COUNT(DISTINCT user_id) as active_users,
        COUNT(*) as total_votes,
        AVG(votes_per_complaint) as avg_votes_per_complaint
      FROM (
        SELECT 
          user_id,
          complaint_id,
          COUNT(*) as votes_per_complaint
        FROM complaint_votes
        GROUP BY user_id, complaint_id
      ) as vote_stats
    `);

    // Get response time metrics by department
    const [responseMetrics] = await pool.execute(`
      SELECT 
        d.name as department,
        COUNT(c.id) as total_complaints,
        AVG(CASE 
          WHEN c.status = 'Resolved' 
          THEN DATEDIFF(c.updated_at, c.submitted_at) 
        END) as avg_resolution_days,
        COUNT(CASE WHEN c.status = 'Resolved' THEN 1 END) as resolved_count
      FROM departments d
      LEFT JOIN complaints c ON d.id = c.department_id
      GROUP BY d.id, d.name
      ORDER BY avg_resolution_days ASC
    `);

    res.json({
      systemMetrics: systemMetrics[0],
      userMetrics: userMetrics[0],
      responseMetrics
    });
  } catch (error) {
    console.error('Get performance metrics error:', error);
    res.status(500).json({ message: 'Failed to fetch performance metrics' });
  }
});

export default router;