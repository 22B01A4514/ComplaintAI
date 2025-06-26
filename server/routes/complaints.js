import express from 'express';
import { pool } from '../config/database.js';
import authMiddleware from '../middleware/auth.js';
import { aiService } from '../services/aiAnalysis.js';

const router = express.Router();

// Get all complaints with filtering and pagination
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      priority,
      category,
      department_id,
      search,
      sort_by = 'submitted_at',
      sort_order = 'DESC'
    } = req.query;

    const offset = (page - 1) * limit;
    let whereConditions = [];
    let queryParams = [];

    // Build WHERE conditions
    if (status && status !== 'all') {
      whereConditions.push('c.status = ?');
      queryParams.push(status);
    }

    if (priority && priority !== 'all') {
      whereConditions.push('c.priority = ?');
      queryParams.push(priority);
    }

    if (category && category !== 'all') {
      whereConditions.push('c.category = ?');
      queryParams.push(category);
    }

    if (department_id) {
      whereConditions.push('c.department_id = ?');
      queryParams.push(department_id);
    }

    if (search) {
      whereConditions.push('(c.title LIKE ? OR c.description LIKE ? OR c.location_address LIKE ?)');
      const searchTerm = `%${search}%`;
      queryParams.push(searchTerm, searchTerm, searchTerm);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Main query
    const query = `
      SELECT 
        c.*,
        d.name as department_name,
        u.name as user_name,
        (SELECT COUNT(*) FROM complaint_votes cv WHERE cv.complaint_id = c.id) as votes
      FROM complaints c
      LEFT JOIN departments d ON c.department_id = d.id
      LEFT JOIN users u ON c.user_id = u.id
      ${whereClause}
      ORDER BY c.${sort_by} ${sort_order}
      LIMIT ? OFFSET ?
    `;

    queryParams.push(parseInt(limit), parseInt(offset));

    const [complaints] = await pool.execute(query, queryParams);

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM complaints c
      ${whereClause}
    `;

    const [countResult] = await pool.execute(countQuery, queryParams.slice(0, -2));
    const total = countResult[0].total;

    // Format complaints data
    const formattedComplaints = complaints.map(complaint => ({
      ...complaint,
      tags: complaint.tags ? JSON.parse(complaint.tags) : [],
      attachments: complaint.attachments ? JSON.parse(complaint.attachments) : [],
      urgency_keywords: complaint.urgency_keywords ? JSON.parse(complaint.urgency_keywords) : [],
      location: {
        address: complaint.location_address,
        coordinates: complaint.location_lat && complaint.location_lng ? {
          lat: parseFloat(complaint.location_lat),
          lng: parseFloat(complaint.location_lng)
        } : null
      }
    }));

    res.json({
      complaints: formattedComplaints,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get complaints error:', error);
    res.status(500).json({ message: 'Failed to fetch complaints' });
  }
});

// Get single complaint by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [complaints] = await pool.execute(`
      SELECT 
        c.*,
        d.name as department_name,
        u.name as user_name,
        (SELECT COUNT(*) FROM complaint_votes cv WHERE cv.complaint_id = c.id) as votes
      FROM complaints c
      LEFT JOIN departments d ON c.department_id = d.id
      LEFT JOIN users u ON c.user_id = u.id
      WHERE c.id = ?
    `, [id]);

    if (complaints.length === 0) {
      return res.status(404).json({ message: 'Complaint not found' });
    }

    const complaint = complaints[0];

    // Get complaint updates
    const [updates] = await pool.execute(`
      SELECT 
        cu.*,
        u.name as updated_by_name
      FROM complaint_updates cu
      LEFT JOIN users u ON cu.updated_by = u.id
      WHERE cu.complaint_id = ?
      ORDER BY cu.created_at DESC
    `, [id]);

    // Format response
    const formattedComplaint = {
      ...complaint,
      tags: complaint.tags ? JSON.parse(complaint.tags) : [],
      attachments: complaint.attachments ? JSON.parse(complaint.attachments) : [],
      urgency_keywords: complaint.urgency_keywords ? JSON.parse(complaint.urgency_keywords) : [],
      location: {
        address: complaint.location_address,
        coordinates: complaint.location_lat && complaint.location_lng ? {
          lat: parseFloat(complaint.location_lat),
          lng: parseFloat(complaint.location_lng)
        } : null
      },
      updates
    };

    res.json(formattedComplaint);
  } catch (error) {
    console.error('Get complaint error:', error);
    res.status(500).json({ message: 'Failed to fetch complaint' });
  }
});

// Create new complaint
router.post('/', authMiddleware, async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      location_address,
      location_lat,
      location_lng,
      attachments = [],
      is_anonymous = false
    } = req.body;

    // Validation
    if (!title || !description || !category || !location_address) {
      return res.status(400).json({ 
        message: 'Title, description, category, and location are required' 
      });
    }

    // AI Analysis
    const aiAnalysis = aiService.analyzeComplaint(title, description);

    // Get department ID based on AI classification
    const [departments] = await pool.execute(
      'SELECT id FROM departments WHERE name = ?',
      [aiAnalysis.department]
    );

    const departmentId = departments.length > 0 ? departments[0].id : null;

    // Insert complaint
    const [result] = await pool.execute(`
      INSERT INTO complaints (
        title, description, category, department_id, priority, status,
        user_id, is_anonymous, location_address, location_lat, location_lng,
        attachments, tags, sentiment, urgency_keywords, ai_confidence,
        submitted_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `, [
      title,
      description,
      category,
      departmentId,
      aiAnalysis.priority,
      'Submitted',
      req.user.isAnonymous ? null : req.user.userId,
      is_anonymous || req.user.isAnonymous,
      location_address,
      location_lat || null,
      location_lng || null,
      JSON.stringify(attachments),
      JSON.stringify(aiAnalysis.tags),
      aiAnalysis.sentiment,
      JSON.stringify(aiAnalysis.urgencyKeywords),
      aiAnalysis.confidence
    ]);

    // Add initial status update
    await pool.execute(`
      INSERT INTO complaint_updates (complaint_id, status, message, updated_by)
      VALUES (?, ?, ?, ?)
    `, [
      result.insertId,
      'Submitted',
      'Complaint submitted and under initial review',
      req.user.isAnonymous ? null : req.user.userId
    ]);

    // Emit real-time update
    const io = req.app.get('io');
    if (io) {
      io.emit('new-complaint', {
        id: result.insertId,
        title,
        priority: aiAnalysis.priority,
        department: aiAnalysis.department,
        location: location_address
      });
    }

    res.status(201).json({
      message: 'Complaint submitted successfully',
      complaint: {
        id: result.insertId,
        title,
        priority: aiAnalysis.priority,
        department: aiAnalysis.department,
        status: 'Submitted',
        ai_analysis: aiAnalysis
      }
    });
  } catch (error) {
    console.error('Create complaint error:', error);
    res.status(500).json({ message: 'Failed to submit complaint' });
  }
});

// Update complaint status (admin/department heads only)
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, message } = req.body;

    // Check if user has permission to update
    if (req.user.role !== 'admin' && req.user.role !== 'department_head') {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    // Update complaint status
    await pool.execute(
      'UPDATE complaints SET status = ?, updated_at = NOW() WHERE id = ?',
      [status, id]
    );

    // Add status update record
    await pool.execute(`
      INSERT INTO complaint_updates (complaint_id, status, message, updated_by)
      VALUES (?, ?, ?, ?)
    `, [id, status, message || `Status updated to ${status}`, req.user.userId]);

    // Emit real-time update
    const io = req.app.get('io');
    if (io) {
      io.to(`complaint-${id}`).emit('status-update', {
        complaint_id: id,
        status,
        message,
        updated_at: new Date()
      });
    }

    res.json({ message: 'Complaint updated successfully' });
  } catch (error) {
    console.error('Update complaint error:', error);
    res.status(500).json({ message: 'Failed to update complaint' });
  }
});

// Vote on complaint
router.post('/:id/vote', async (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body; // 'upvote' or 'downvote'
    
    // For anonymous users, use device ID or IP
    const userId = req.user?.userId || null;
    const deviceId = req.headers['x-device-id'] || req.ip;

    // Check if already voted
    const [existingVotes] = await pool.execute(
      'SELECT id FROM complaint_votes WHERE complaint_id = ? AND (user_id = ? OR device_id = ?)',
      [id, userId, deviceId]
    );

    if (existingVotes.length > 0) {
      return res.status(400).json({ message: 'You have already voted on this complaint' });
    }

    // Add vote
    await pool.execute(
      'INSERT INTO complaint_votes (complaint_id, user_id, device_id) VALUES (?, ?, ?)',
      [id, userId, deviceId]
    );

    // Get updated vote count
    const [voteCount] = await pool.execute(
      'SELECT COUNT(*) as votes FROM complaint_votes WHERE complaint_id = ?',
      [id]
    );

    const votes = voteCount[0].votes;

    // Check if complaint should be escalated (e.g., 50+ votes)
    if (votes >= 50) {
      await pool.execute(
        'UPDATE complaints SET priority = ? WHERE id = ? AND priority != ?',
        ['High', id, 'Critical']
      );
    }

    res.json({ 
      message: 'Vote recorded successfully',
      votes 
    });
  } catch (error) {
    console.error('Vote complaint error:', error);
    res.status(500).json({ message: 'Failed to record vote' });
  }
});

// Get complaint updates
router.get('/:id/updates', async (req, res) => {
  try {
    const { id } = req.params;

    const [updates] = await pool.execute(`
      SELECT 
        cu.*,
        u.name as updated_by_name
      FROM complaint_updates cu
      LEFT JOIN users u ON cu.updated_by = u.id
      WHERE cu.complaint_id = ?
      ORDER BY cu.created_at DESC
    `, [id]);

    res.json(updates);
  } catch (error) {
    console.error('Get complaint updates error:', error);
    res.status(500).json({ message: 'Failed to fetch complaint updates' });
  }
});

// Add complaint update
router.post('/:id/updates', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { message, status } = req.body;

    // Check permissions
    if (req.user.role !== 'admin' && req.user.role !== 'department_head') {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    // Add update
    await pool.execute(`
      INSERT INTO complaint_updates (complaint_id, status, message, updated_by)
      VALUES (?, ?, ?, ?)
    `, [id, status, message, req.user.userId]);

    // Update complaint if status provided
    if (status) {
      await pool.execute(
        'UPDATE complaints SET status = ?, updated_at = NOW() WHERE id = ?',
        [status, id]
      );
    }

    // Emit real-time update
    const io = req.app.get('io');
    if (io) {
      io.to(`complaint-${id}`).emit('new-update', {
        complaint_id: id,
        status,
        message,
        updated_at: new Date()
      });
    }

    res.json({ message: 'Update added successfully' });
  } catch (error) {
    console.error('Add complaint update error:', error);
    res.status(500).json({ message: 'Failed to add update' });
  }
});

export default router;