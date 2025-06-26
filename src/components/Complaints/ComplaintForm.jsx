import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  AlertTriangle, 
  MapPin, 
  Camera, 
  FileText, 
  Send, 
  X,
  Upload,
  Tag,
  Building2,
  Zap
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { aiService } from '../../services/aiService';
import toast from 'react-hot-toast';

const ComplaintForm = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'Infrastructure',
    address: '',
    isAnonymous: user?.isAnonymous || false
  });
  
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAiInsights, setShowAiInsights] = useState(false);

  const categories = [
    'Infrastructure',
    'Safety',
    'Noise',
    'Parks & Recreation',
    'Sanitation',
    'Traffic',
    'Public Works',
    'Code Enforcement'
  ];

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));

    // Trigger AI analysis when title or description changes
    if ((name === 'title' || name === 'description') && value.length > 10) {
      performAiAnalysis(
        name === 'title' ? value : formData.title,
        name === 'description' ? value : formData.description
      );
    }
  };

  const performAiAnalysis = (title, description) => {
    if (!title || !description) return;

    const analysis = {
      priority: aiService.analyzePriority(title, description),
      sentiment: aiService.analyzeSentiment(title, description),
      suggestedDepartment: aiService.classifyDepartment(title, description),
      urgencyKeywords: aiService.extractUrgencyKeywords(title, description),
      suggestedTags: aiService.extractTags(title, description)
    };

    setAiAnalysis(analysis);
    setShowAiInsights(true);
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    
    files.forEach(file => {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast.error(`File ${file.name} is too large. Maximum size is 5MB.`);
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        setAttachments(prev => [...prev, {
          id: Date.now() + Math.random(),
          name: file.name,
          type: file.type,
          size: file.size,
          data: event.target.result
        }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeAttachment = (attachmentId) => {
    setAttachments(prev => prev.filter(att => att.id !== attachmentId));
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Create complaint object
      const complaint = {
        ...formData,
        priority: aiAnalysis?.priority || 'Medium',
        sentiment: aiAnalysis?.sentiment || 'Neutral',
        urgencyKeywords: aiAnalysis?.urgencyKeywords || [],
        tags: aiAnalysis?.suggestedTags || [],
        department: aiAnalysis?.suggestedDepartment || formData.category,
        attachments: attachments.map(att => ({
          name: att.name,
          type: att.type,
          size: att.size
        })),
        submittedAt: new Date(),
        status: 'Submitted',
        votes: 0
      };

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));

      toast.success('Complaint submitted successfully!');
      navigate('/complaints');
    } catch (error) {
      toast.error('Failed to submit complaint. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const applyAiSuggestion = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    toast.success('AI suggestion applied!');
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Submit a Complaint</h1>
        <p className="text-gray-600">
          Help improve your community by reporting issues. Our AI will analyze your complaint for faster resolution.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 space-y-6">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Complaint Title *
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
                placeholder="Brief description of the issue"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category *
              </label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  required
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                >
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Detailed Description *
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                required
                rows={6}
                placeholder="Provide detailed information about the issue, including when it occurred, its impact, and any relevant context..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              />
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Location *
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  required
                  placeholder="Street address or nearby landmark"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                />
              </div>
            </div>

            {/* File Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Attachments (Optional)
              </label>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors cursor-pointer"
              >
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600 mb-1">Click to upload photos or documents</p>
                <p className="text-sm text-gray-500">PNG, JPG, PDF up to 5MB each</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,.pdf"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>

            {/* Attachments List */}
            {attachments.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-700">Uploaded Files:</h4>
                {attachments.map(attachment => (
                  <div key={attachment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <FileText className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{attachment.name}</p>
                        <p className="text-xs text-gray-500">{formatFileSize(attachment.size)}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeAttachment(attachment.id)}
                      className="text-red-500 hover:text-red-700 p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Anonymous Option */}
            {!user?.isAnonymous && (
              <div className="flex items-center space-x-3 p-4 bg-purple-50 rounded-lg border border-purple-200">
                <input
                  type="checkbox"
                  id="isAnonymous"
                  name="isAnonymous"
                  checked={formData.isAnonymous}
                  onChange={handleChange}
                  className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                />
                <label htmlFor="isAnonymous" className="text-sm text-purple-900">
                  Submit this complaint anonymously
                </label>
              </div>
            )}

            {/* Submit Button */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-teal-600 text-white py-3 px-6 rounded-lg font-medium hover:from-blue-700 hover:to-teal-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  <span>Submit Complaint</span>
                </>
              )}
            </motion.button>
          </form>
        </div>

        {/* AI Insights Sidebar */}
        <div className="space-y-6">
          {showAiInsights && aiAnalysis && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-2xl border border-purple-200 p-6"
            >
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
                  <Zap className="w-4 h-4 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">AI Analysis</h3>
              </div>

              <div className="space-y-4">
                {/* Priority Analysis */}
                <div className="bg-white rounded-lg p-4 border border-gray-100">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-gray-900">Detected Priority</h4>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      aiAnalysis.priority === 'Critical' ? 'bg-red-100 text-red-800' :
                      aiAnalysis.priority === 'High' ? 'bg-orange-100 text-orange-800' :
                      aiAnalysis.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {aiAnalysis.priority}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600">
                    Based on urgency keywords and content analysis
                  </p>
                </div>

                {/* Department Suggestion */}
                <div className="bg-white rounded-lg p-4 border border-gray-100">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-gray-900">Suggested Department</h4>
                    <button
                      type="button"
                      onClick={() => applyAiSuggestion('category', aiAnalysis.suggestedDepartment)}
                      className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full hover:bg-blue-200 transition-colors"
                    >
                      Apply
                    </button>
                  </div>
                  <p className="text-sm font-medium text-blue-600">{aiAnalysis.suggestedDepartment}</p>
                </div>

                {/* Sentiment Analysis */}
                <div className="bg-white rounded-lg p-4 border border-gray-100">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Sentiment</h4>
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${
                      aiAnalysis.sentiment === 'Positive' ? 'bg-green-500' :
                      aiAnalysis.sentiment === 'Negative' ? 'bg-red-500' :
                      'bg-gray-400'
                    }`} />
                    <span className="text-sm text-gray-700">{aiAnalysis.sentiment}</span>
                  </div>
                </div>

                {/* Urgency Keywords */}
                {aiAnalysis.urgencyKeywords.length > 0 && (
                  <div className="bg-white rounded-lg p-4 border border-gray-100">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Urgency Indicators</h4>
                    <div className="flex flex-wrap gap-1">
                      {aiAnalysis.urgencyKeywords.slice(0, 4).map((keyword, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full"
                        >
                          {keyword}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Suggested Tags */}
                {aiAnalysis.suggestedTags.length > 0 && (
                  <div className="bg-white rounded-lg p-4 border border-gray-100">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Suggested Tags</h4>
                    <div className="flex flex-wrap gap-1">
                      {aiAnalysis.suggestedTags.slice(0, 6).map((tag, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center space-x-1 px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
                        >
                          <Tag className="w-3 h-3" />
                          <span>{tag}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Help Tips */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Tips for Better Results</h3>
            <div className="space-y-3 text-sm text-gray-600">
              <div className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                <p>Be specific about the location and time of the issue</p>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                <p>Include photos or documents when possible</p>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                <p>Describe the impact on the community</p>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                <p>Use clear, descriptive language</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComplaintForm;