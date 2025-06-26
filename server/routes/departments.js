import express from 'express';
import { pool } from '../config/database.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

// Get all departments
router.get('/', async (req, res) => {
  try {
    const [departments] = await pool.execute(`
      SELECT 
        d.*,
        u.name as head_name,
        COUNT(c.id) as total_complaints,
        COUNT(CASE WHEN c.status = 'Resolved' THEN 1 END) as resolved_complaints,
        AVG(CASE 
          WHEN c.status = 'Resolved' 
          THEN DATEDIFF(c.updated_at, c.submitted_at) 
        END) as avg_resolution_days
      FROM departments d
      LEFT JOIN users u ON d.head_id = u.id
      LEFT JOIN complaints c ON d.id = c.department_id
      GROUP BY d.id
      ORDER BY d.performance_score DESC
    `);

    const formattedDepartments = departments.map(dept => ({
      ...dept,
      badges: dept.badges ? JSON.parse(dept.badges) : [],
      performance: {
        score: dept.performance_score || 0,
        avgResolutionTime: parseFloat(dept.avg_resolution_days) || 0,
        totalResolved: dept.resolved_complaints || 0,
        totalComplaints: dept.total_complaints || 0,
        resolutionRate: dept.total_complaints > 0 
          ? Math.round((dept.resolved_complaints / dept.total_complaints) * 100)
          : 0
      }
    }));

    res.json(formattedDepartments);
  } catch (error) {
    console.error('Get departments error:', error);
    res.status(500).json({ message: 'Failed to fetch departments' });
  }
});

// Get single department
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [departments] = await pool.execute(`
      SELECT 
        d.*,
        u.name as head_name,
        u.email as head_email
      FROM departments d
      LEFT JOIN users u ON d.head_id = u.id
      WHERE d.id = ?
    `, [id]);

    if (departments.length === 0) {
      return res.status(404).json({ message: 'Department not found' });
    }

    const department = departments[0];

    // Get department statistics
    const [stats] = await pool.execute(`
      SELECT 
        COUNT(*) as total_complaints,
        COUNT(CASE WHEN status = 'Resolved' THEN 1 END) as resolved_complaints,
        COUNT(CASE WHEN status = 'In Progress' THEN 1 END) as in_progress_complaints,
        COUNT(CASE WHEN priority = 'Critical' THEN 1 END) as critical_complaints,
        AVG(CASE 
          WHEN status = 'Resolved' 
          THEN DATEDIFF(updated_at, submitted_at) 
        END) as avg_resolution_days
      FROM complaints 
      WHERE department_id = ?
    `, [id]);

    // Get recent complaints
    const [recentComplaints] = await pool.execute(`
      SELECT id, title, priority, status, submitted_at
      FROM complaints 
      WHERE department_id = ?
      ORDER BY submitted_at DESC
      LIMIT 10
    `, [id]);

    const formattedDepartment = {
      ...department,
      badges: department.badges ? JSON.parse(department.badges) : [],
      statistics: stats[0],
      recentComplaints
    };

    res.json(formattedDepartment);
  } catch (error) {
    console.error('Get department error:', error);
    res.status(500).json({ message: 'Failed to fetch department' });
  }
});

// Update department performance (admin only)
router.put('/:id/performance', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const { id } = req.params;
    const { performance_score, badges } = req.body;

    await pool.execute(
      'UPDATE departments SET performance_score = ?, badges = ? WHERE id = ?',
      [performance_score, JSON.stringify(badges), id]
    );

    res.json({ message: 'Department performance updated successfully' });
  } catch (error) {
    console.error('Update department performance error:', error);
    res.status(500).json({ message: 'Failed to update department performance' });
  }
});

// Get department performance trends
router.get('/:id/trends', async (req, res) => {
  try {
    const { id } = req.params;
    const { period = '30d' } = req.query;

    let dateFilter = '';
    switch (period) {
      case '7d':
        dateFilter = 'AND submitted_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
        break;
      case '30d':
        dateFilter = 'AND submitted_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)';
        break;
      case '90d':
        dateFilter = 'AND submitted_at >= DATE_SUB(NOW(), INTERVAL 90 DAY)';
        break;
      default:
        dateFilter = 'AND submitted_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)';
    }

    const [trends] = await pool.execute(`
      SELECT 
        DATE(submitted_at) as date,
        COUNT(*) as total_complaints,
        COUNT(CASE WHEN status = 'Resolved' THEN 1 END) as resolved_complaints,
        COUNT(CASE WHEN priority = 'Critical' THEN 1 END) as critical_complaints
      FROM complaints 
      WHERE department_id = ? ${dateFilter}
      GROUP BY DATE(submitted_at)
      ORDER BY date ASC
    `, [id]);

    res.json(trends);
  } catch (error) {
    console.error('Get department trends error:', error);
    res.status(500).json({ message: 'Failed to fetch department trends' });
  }
});

export default router;