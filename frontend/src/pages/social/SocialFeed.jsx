import React, { useState, useEffect, useContext, useRef } from 'react';
import { 
  Heart, 
  MessageCircle, 
  Share2, 
  MoreVertical, 
  Image as ImageIcon, 
  Camera, 
  Send, 
  Trash2, 
  Flag, 
  X, 
  Plus, 
  Sparkles, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle,
  Clock
} from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';
import { getFileUrl } from '../../services/api';
import socialApi from '../../services/socialApi';
import './SocialFeed.css';

const POST_TYPES = [
  { id: 'standard', label: 'General', emoji: '💬', badgeClass: 'badge-standard' },
  { id: 'milestone', label: 'Milestone', emoji: '🎯', badgeClass: 'badge-milestone' },
  { id: 'celebration', label: 'Celebration', emoji: '🎂', badgeClass: 'badge-celebration' },
  { id: 'achievement', label: 'Achievement', emoji: '🏆', badgeClass: 'badge-achievement' },
  { id: 'announcement', label: 'Announcement', emoji: '📢', badgeClass: 'badge-announcement' },
];

const SocialFeed = () => {
  const { user } = useContext(AuthContext);

  // Feed State
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [activeMenuPostId, setActiveMenuPostId] = useState(null);

  // Active Comments Drawer State (postId -> array of comments)
  const [openCommentPostId, setOpenCommentPostId] = useState(null);
  const [commentsMap, setCommentsMap] = useState({});
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentInput, setCommentInput] = useState('');

  // Create Post Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [postContent, setPostContent] = useState('');
  const [selectedType, setSelectedType] = useState('standard');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [filePreviews, setFilePreviews] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Report Modal State
  const [reportPostId, setReportPostId] = useState(null);
  const [reportReason, setReportReason] = useState('');
  const [isReporting, setIsReporting] = useState(false);

  // Lightbox Modal State
  const [lightboxImg, setLightboxImg] = useState(null);

  // Toast Notification State
  const [toastMessage, setToastMessage] = useState(null);

  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3200);
  };

  const isModerator = user?.roles && user.roles.some(r => ['SUPER_ADMIN', 'ORG_ADMIN', 'HR_ADMIN'].includes(r));

  // ── Load Feed ──────────────────────────────────────────────────────────────
  const loadPosts = async (pageNum = 1, isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else if (pageNum === 1) setLoading(true);

      const res = await socialApi.getPosts(pageNum, 10);
      if (res.success) {
        if (pageNum === 1) {
          setPosts(res.data);
        } else {
          setPosts(prev => [...prev, ...res.data]);
        }
        setPage(res.pagination.page);
        setHasMore(res.pagination.page < res.pagination.totalPages);
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to load social feed');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadPosts(1);
  }, []);

  // Close menus when clicking outside
  useEffect(() => {
    const handleWindowClick = () => setActiveMenuPostId(null);
    window.addEventListener('click', handleWindowClick);
    return () => window.removeEventListener('click', handleWindowClick);
  }, []);

  // ── Like / Unlike ──────────────────────────────────────────────────────────
  const handleToggleLike = async (postId, currentIsLiked) => {
    // Optimistic Update
    setPosts(prev => prev.map(p => {
      if (p.id === postId) {
        return {
          ...p,
          is_liked: !currentIsLiked,
          likes_count: currentIsLiked ? Math.max(0, p.likes_count - 1) : p.likes_count + 1
        };
      }
      return p;
    }));

    try {
      if (currentIsLiked) {
        const res = await socialApi.unlikePost(postId);
        if (res.success) {
          setPosts(prev => prev.map(p => p.id === postId ? { ...p, likes_count: res.data.likes_count, is_liked: false } : p));
        }
      } else {
        const res = await socialApi.likePost(postId);
        if (res.success) {
          setPosts(prev => prev.map(p => p.id === postId ? { ...p, likes_count: res.data.likes_count, is_liked: true } : p));
        }
      }
    } catch (err) {
      // Revert on error
      setPosts(prev => prev.map(p => {
        if (p.id === postId) {
          return {
            ...p,
            is_liked: currentIsLiked,
            likes_count: currentIsLiked ? p.likes_count + 1 : Math.max(0, p.likes_count - 1)
          };
        }
        return p;
      }));
      showToast('Could not update like. Please try again.');
    }
  };

  // ── Comments ───────────────────────────────────────────────────────────────
  const handleToggleComments = async (postId) => {
    if (openCommentPostId === postId) {
      setOpenCommentPostId(null);
      return;
    }

    setOpenCommentPostId(postId);
    if (!commentsMap[postId]) {
      setLoadingComments(true);
      try {
        const res = await socialApi.getComments(postId);
        if (res.success) {
          setCommentsMap(prev => ({ ...prev, [postId]: res.data }));
        }
      } catch (err) {
        showToast('Failed to load comments');
      } finally {
        setLoadingComments(false);
      }
    }
  };

  const handleAddComment = async (postId) => {
    if (!commentInput.trim()) return;

    const content = commentInput.trim();
    setCommentInput('');

    try {
      const res = await socialApi.addComment(postId, content);
      if (res.success) {
        setCommentsMap(prev => ({
          ...prev,
          [postId]: [...(prev[postId] || []), res.data]
        }));
        // Update comments count on post
        setPosts(prev => prev.map(p => p.id === postId ? { ...p, comments_count: p.comments_count + 1 } : p));
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to post comment');
    }
  };

  const handleDeleteComment = async (postId, commentId) => {
    try {
      const res = await socialApi.deleteComment(commentId);
      if (res.success) {
        setCommentsMap(prev => ({
          ...prev,
          [postId]: (prev[postId] || []).filter(c => c.id !== commentId)
        }));
        setPosts(prev => prev.map(p => p.id === postId ? { ...p, comments_count: Math.max(0, p.comments_count - 1) } : p));
        showToast('Comment deleted');
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to delete comment');
    }
  };

  // ── Share Internal Link ───────────────────────────────────────────────────
  const handleShare = (postId) => {
    const shareUrl = `${window.location.origin}/app/social?post=${postId}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      showToast('Post link copied to clipboard!');
    }).catch(() => {
      showToast('Could not copy link to clipboard');
    });
  };

  // ── Delete Post ────────────────────────────────────────────────────────────
  const handleDeletePost = async (postId) => {
    if (!window.confirm('Are you sure you want to delete this post?')) return;

    try {
      const res = await socialApi.deletePost(postId);
      if (res.success) {
        setPosts(prev => prev.filter(p => p.id !== postId));
        showToast('Post deleted successfully');
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to delete post');
    }
  };

  // ── Report Post ────────────────────────────────────────────────────────────
  const handleOpenReport = (postId) => {
    setReportPostId(postId);
    setReportReason('');
  };

  const handleSubmitReport = async () => {
    if (!reportReason.trim()) {
      showToast('Please state a reason for reporting');
      return;
    }

    setIsReporting(true);
    try {
      const res = await socialApi.reportPost(reportPostId, reportReason.trim());
      if (res.success) {
        showToast('Post reported to administrators');
        setReportPostId(null);
        setReportReason('');
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to submit report');
    } finally {
      setIsReporting(false);
    }
  };

  // ── File Upload & Camera Handling ──────────────────────────────────────────
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const currentCount = selectedFiles.length;
    const remainingSlots = 5 - currentCount;

    if (remainingSlots <= 0) {
      showToast('Maximum 5 images allowed per post');
      return;
    }

    const validFiles = [];
    const validPreviews = [];

    for (const file of files.slice(0, remainingSlots)) {
      if (file.size > 10 * 1024 * 1024) {
        showToast(`"${file.name}" exceeds 10MB limit`);
        continue;
      }
      validFiles.push(file);
      validPreviews.push(URL.createObjectURL(file));
    }

    setSelectedFiles(prev => [...prev, ...validFiles]);
    setFilePreviews(prev => [...prev, ...validPreviews]);
    e.target.value = null; // reset input
  };

  const handleRemovePreview = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setFilePreviews(prev => {
      const updated = [...prev];
      URL.revokeObjectURL(updated[index]);
      return updated.filter((_, i) => i !== index);
    });
  };

  // ── Create Post Submit ─────────────────────────────────────────────────────
  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!postContent.trim()) {
      showToast('Please write something before posting');
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('content', postContent.trim());
      formData.append('post_type', selectedType);

      selectedFiles.forEach(file => {
        formData.append('media', file);
      });

      const res = await socialApi.createPost(formData);
      if (res.success) {
        // Prepend new post to top of feed
        setPosts(prev => [res.data, ...prev]);
        showToast('Your post has been published to JMK Social!');
        
        // Reset modal state
        setPostContent('');
        setSelectedType('standard');
        setSelectedFiles([]);
        setFilePreviews([]);
        setShowCreateModal(false);
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to create post');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper for humanized timestamps
  const formatTimeAgo = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);

    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="social-feed-container">
      {/* ── Feed Header ───────────────────────────────────────────── */}
      <div className="social-header-card">
        <div className="social-title-area">
          <div className="social-logo-badge">
            <Sparkles size={22} />
          </div>
          <div>
            <h1>JMK Social</h1>
            <p>Share company moments, celebrate wins, and connect with your team</p>
          </div>
        </div>

        <div className="social-header-actions">
          <button 
            className="btn-icon-soft" 
            title="Refresh Feed"
            onClick={() => loadPosts(1, true)}
            disabled={refreshing}
          >
            <RefreshCw size={17} className={refreshing ? 'spin' : ''} />
          </button>

          <button 
            className="btn-social-create" 
            onClick={() => setShowCreateModal(true)}
          >
            <Plus size={18} />
            <span>Create Post</span>
          </button>
        </div>
      </div>

      {/* ── Quick Compose Prompt Trigger ───────────────────────────── */}
      <div className="social-compose-trigger" onClick={() => setShowCreateModal(true)}>
        {user?.profile_image_url ? (
          <img 
            src={getFileUrl(user.profile_image_url)} 
            alt={user.first_name} 
            className="social-avatar" 
          />
        ) : (
          <div className="social-avatar-fallback">
            {user?.first_name ? user.first_name[0].toUpperCase() : 'U'}
          </div>
        )}
        <div className="social-compose-prompt">
          Share an update, celebrate a teammate, or announce a win...
        </div>
        <button className="btn-icon-soft" title="Attach Photo">
          <ImageIcon size={18} color="#2563eb" />
        </button>
      </div>

      {/* ── Posts Stream ─────────────────────────────────────────── */}
      {loading ? (
        <>
          <div className="social-skeleton-card">
            <div style={{ display: 'flex', gap: '12px', marginBottom: '14px' }}>
              <div className="skeleton-shimmer" style={{ width: 44, height: 44, borderRadius: '50%' }} />
              <div style={{ flex: 1 }}>
                <div className="skeleton-shimmer" style={{ width: '35%', height: 14, marginBottom: 6 }} />
                <div className="skeleton-shimmer" style={{ width: '20%', height: 11 }} />
              </div>
            </div>
            <div className="skeleton-shimmer" style={{ width: '90%', height: 16, marginBottom: 8 }} />
            <div className="skeleton-shimmer" style={{ width: '70%', height: 16 }} />
          </div>
          <div className="social-skeleton-card">
            <div style={{ display: 'flex', gap: '12px', marginBottom: '14px' }}>
              <div className="skeleton-shimmer" style={{ width: 44, height: 44, borderRadius: '50%' }} />
              <div style={{ flex: 1 }}>
                <div className="skeleton-shimmer" style={{ width: '30%', height: 14, marginBottom: 6 }} />
                <div className="skeleton-shimmer" style={{ width: '18%', height: 11 }} />
              </div>
            </div>
            <div className="skeleton-shimmer" style={{ width: '100%', height: 180, borderRadius: 12 }} />
          </div>
        </>
      ) : posts.length === 0 ? (
        <div className="social-empty-state">
          <div className="social-empty-icon">
            <Sparkles size={32} />
          </div>
          <h3>Welcome to the JMK Company Feed!</h3>
          <p>No posts published yet. Be the first to share an accomplishment, team photo, or celebration with everyone.</p>
          <button className="btn-social-create" onClick={() => setShowCreateModal(true)}>
            <Plus size={18} />
            <span>Create the First Post</span>
          </button>
        </div>
      ) : (
        posts.map(post => {
          const typeConfig = POST_TYPES.find(t => t.id === post.post_type) || POST_TYPES[0];
          const canDelete = post.author_id === user?.id || isModerator;
          const isMenuOpen = activeMenuPostId === post.id;
          const isCommentsOpen = openCommentPostId === post.id;
          const comments = commentsMap[post.id] || [];

          return (
            <article key={post.id} className="social-post-card">
              {/* Post Header */}
              <div className="social-post-header">
                <div className="social-author-group">
                  {post.profile_image_url ? (
                    <img 
                      src={getFileUrl(post.profile_image_url)} 
                      alt={post.first_name} 
                      className="social-avatar" 
                    />
                  ) : (
                    <div className="social-avatar-fallback">
                      {post.first_name ? post.first_name[0].toUpperCase() : 'U'}
                    </div>
                  )}

                  <div className="social-author-meta">
                    <div className="social-author-name-row">
                      <span className="social-author-name">{post.first_name} {post.last_name}</span>
                      <span className={`social-type-badge ${typeConfig.badgeClass}`}>
                        <span>{typeConfig.emoji}</span>
                        <span>{typeConfig.label}</span>
                      </span>
                    </div>

                    <div className="social-author-sub">
                      {post.designation_name && <span>{post.designation_name}</span>}
                      {post.designation_name && post.department_name && <span>•</span>}
                      {post.department_name && <span>{post.department_name}</span>}
                      <span>•</span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                        <Clock size={11} />
                        {formatTimeAgo(post.created_at)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* More Menu */}
                <div className="social-menu-wrapper" onClick={e => e.stopPropagation()}>
                  <button 
                    className="btn-icon-soft" 
                    style={{ width: 32, height: 32 }}
                    onClick={() => setActiveMenuPostId(isMenuOpen ? null : post.id)}
                  >
                    <MoreVertical size={16} />
                  </button>

                  {isMenuOpen && (
                    <div className="social-dropdown-menu">
                      {canDelete && (
                        <button 
                          className="social-dropdown-item danger"
                          onClick={() => {
                            setActiveMenuPostId(null);
                            handleDeletePost(post.id);
                          }}
                        >
                          <Trash2 size={15} />
                          <span>Delete Post</span>
                        </button>
                      )}
                      {post.author_id !== user?.id && (
                        <button 
                          className="social-dropdown-item"
                          onClick={() => {
                            setActiveMenuPostId(null);
                            handleOpenReport(post.id);
                          }}
                        >
                          <Flag size={15} />
                          <span>Report Post</span>
                        </button>
                      )}
                      <button 
                        className="social-dropdown-item"
                        onClick={() => {
                          setActiveMenuPostId(null);
                          handleShare(post.id);
                        }}
                      >
                        <Share2 size={15} />
                        <span>Copy Link</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Post Content */}
              <div className="social-post-content">
                {post.content}
              </div>

              {/* Post Media Gallery */}
              {post.media && post.media.length > 0 && (
                <div className="social-media-container">
                  {post.media.length === 1 ? (
                    <img 
                      src={getFileUrl(post.media[0].media_url)} 
                      alt="Post media" 
                      className="social-media-single"
                      onClick={() => setLightboxImg(getFileUrl(post.media[0].media_url))}
                    />
                  ) : (
                    <div className={`social-media-grid grid-${Math.min(post.media.length, 4)}`}>
                      {post.media.slice(0, 4).map((m, idx) => {
                        const isFourthWithMore = idx === 3 && post.media.length > 4;
                        return (
                          <div 
                            key={m.id} 
                            className={`grid-item-${idx} ${isFourthWithMore ? 'social-media-more-overlay' : ''}`}
                            onClick={() => setLightboxImg(getFileUrl(m.media_url))}
                          >
                            <img 
                              src={getFileUrl(m.media_url)} 
                              alt="Post media thumbnail" 
                              className="social-media-thumb" 
                            />
                            {isFourthWithMore && (
                              <div className="social-media-overlay-tag">
                                +{post.media.length - 3}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Action Bar */}
              <div className="social-actions-bar">
                <div className="social-action-buttons">
                  <button 
                    className={`btn-social-action ${post.is_liked ? 'liked' : ''}`}
                    onClick={() => handleToggleLike(post.id, post.is_liked)}
                  >
                    <Heart 
                      size={18} 
                      fill={post.is_liked ? '#e11d48' : 'none'} 
                      color={post.is_liked ? '#e11d48' : 'currentColor'}
                      className={post.is_liked ? 'heart-pop' : ''}
                    />
                    <span>{post.likes_count}</span>
                  </button>

                  <button 
                    className="btn-social-action"
                    onClick={() => handleToggleComments(post.id)}
                  >
                    <MessageCircle size={18} />
                    <span>{post.comments_count}</span>
                  </button>
                </div>

                <button 
                  className="btn-social-action" 
                  title="Share Internally"
                  onClick={() => handleShare(post.id)}
                >
                  <Share2 size={17} />
                  <span>Share</span>
                </button>
              </div>

              {/* Comments Accordion */}
              {isCommentsOpen && (
                <div className="social-comments-section">
                  {loadingComments && comments.length === 0 ? (
                    <div style={{ padding: '12px 0', fontSize: '13px', color: '#64748b' }}>
                      Loading comments...
                    </div>
                  ) : (
                    <div className="social-comments-list">
                      {comments.length === 0 ? (
                        <div style={{ fontSize: '13px', color: '#94a3b8', padding: '6px 0' }}>
                          No comments yet. Start the conversation!
                        </div>
                      ) : (
                        comments.map(c => {
                          const canDelComment = c.user_id === user?.id || isModerator;
                          return (
                            <div key={c.id} className="social-comment-bubble">
                              {c.profile_image_url ? (
                                <img 
                                  src={getFileUrl(c.profile_image_url)} 
                                  alt={c.first_name} 
                                  className="social-comment-avatar" 
                                />
                              ) : (
                                <div className="social-comment-avatar-fallback">
                                  {c.first_name ? c.first_name[0].toUpperCase() : 'U'}
                                </div>
                              )}

                              <div className="social-comment-body">
                                <div className="social-comment-header">
                                  <span className="social-comment-name">{c.first_name} {c.last_name}</span>
                                  <div style={{ display: 'flex', alignItems: 'center' }}>
                                    <span className="social-comment-time">{formatTimeAgo(c.created_at)}</span>
                                    {canDelComment && (
                                      <button 
                                        className="social-comment-del"
                                        title="Delete comment"
                                        onClick={() => handleDeleteComment(post.id, c.id)}
                                      >
                                        <Trash2 size={12} />
                                      </button>
                                    )}
                                  </div>
                                </div>
                                <div className="social-comment-text">{c.content}</div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}

                  {/* Comment Input */}
                  <form 
                    className="social-comment-form" 
                    onSubmit={e => {
                      e.preventDefault();
                      handleAddComment(post.id);
                    }}
                  >
                    <input 
                      type="text" 
                      className="social-comment-input" 
                      placeholder="Write a supportive comment..."
                      value={commentInput}
                      onChange={e => setCommentInput(e.target.value)}
                    />
                    <button 
                      type="submit" 
                      className="btn-comment-send" 
                      disabled={!commentInput.trim()}
                      title="Post comment"
                    >
                      <Send size={15} />
                    </button>
                  </form>
                </div>
              )}
            </article>
          );
        })
      )}

      {/* Load More Button */}
      {hasMore && !loading && (
        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <button 
            className="btn-social-create" 
            style={{ background: '#f1f5f9', color: '#0f172a', border: '1px solid #cbd5e1' }}
            onClick={() => loadPosts(page + 1)}
          >
            Load Older Moments
          </button>
        </div>
      )}

      {/* ── Create Post Modal ──────────────────────────────────────── */}
      {showCreateModal && (
        <div className="social-modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="social-modal-card" onClick={e => e.stopPropagation()}>
            <div className="social-modal-header">
              <span className="social-modal-title">Create Post</span>
              <button className="btn-icon-soft" onClick={() => setShowCreateModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreatePost}>
              <div className="social-modal-body">
                {/* Author row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                  {user?.profile_image_url ? (
                    <img 
                      src={getFileUrl(user.profile_image_url)} 
                      alt={user.first_name} 
                      className="social-avatar" 
                    />
                  ) : (
                    <div className="social-avatar-fallback">
                      {user?.first_name ? user.first_name[0].toUpperCase() : 'U'}
                    </div>
                  )}
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14.5, color: '#0f172a' }}>
                      {user?.first_name} {user?.last_name}
                    </div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>
                      Publishing to JMK Company Feed
                    </div>
                  </div>
                </div>

                {/* Category Selection Pills */}
                <div className="social-pill-group">
                  {POST_TYPES.map(type => (
                    <button
                      key={type.id}
                      type="button"
                      className={`social-type-pill ${selectedType === type.id ? 'active' : ''}`}
                      onClick={() => setSelectedType(type.id)}
                    >
                      <span>{type.emoji}</span>
                      <span>{type.label}</span>
                    </button>
                  ))}
                </div>

                {/* Text Area */}
                <textarea 
                  className="social-textarea"
                  placeholder="What's on your mind? Share a workplace milestone, shout-out, or update..."
                  value={postContent}
                  onChange={e => setPostContent(e.target.value)}
                  maxLength={5000}
                  autoFocus
                />

                {/* Preview thumbnails */}
                {filePreviews.length > 0 && (
                  <div className="social-preview-strip">
                    {filePreviews.map((previewUrl, idx) => (
                      <div key={idx} className="social-preview-thumb-box">
                        <img src={previewUrl} alt="Upload thumbnail" />
                        <button 
                          type="button" 
                          className="social-preview-del"
                          onClick={() => handleRemovePreview(idx)}
                        >
                          <X size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="social-modal-footer">
                <div className="social-upload-triggers">
                  {/* Hidden inputs */}
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    style={{ display: 'none' }} 
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    multiple
                    onChange={handleFileSelect}
                  />
                  <input 
                    type="file" 
                    ref={cameraInputRef} 
                    style={{ display: 'none' }} 
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileSelect}
                  />

                  <button 
                    type="button" 
                    className="btn-upload-trigger"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={selectedFiles.length >= 5}
                    title="Attach images from computer/device"
                  >
                    <ImageIcon size={16} color="#2563eb" />
                    <span>Photo</span>
                  </button>

                  <button 
                    type="button" 
                    className="btn-upload-trigger"
                    onClick={() => cameraInputRef.current?.click()}
                    disabled={selectedFiles.length >= 5}
                    title="Take photo directly from camera"
                  >
                    <Camera size={16} color="#059669" />
                    <span>Camera</span>
                  </button>

                  {selectedFiles.length > 0 && (
                    <span style={{ fontSize: 12, color: '#64748b' }}>
                      {selectedFiles.length}/5 images
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 11.5, color: '#94a3b8' }}>
                    {postContent.length}/5000
                  </span>
                  <button 
                    type="submit" 
                    className="btn-social-create" 
                    disabled={isSubmitting || !postContent.trim()}
                  >
                    {isSubmitting ? 'Publishing...' : 'Publish'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Report Modal ───────────────────────────────────────────── */}
      {reportPostId && (
        <div className="social-modal-overlay" onClick={() => setReportPostId(null)}>
          <div className="social-modal-card" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
            <div className="social-modal-header">
              <span className="social-modal-title">Report Post</span>
              <button className="btn-icon-soft" onClick={() => setReportPostId(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="social-modal-body">
              <p style={{ fontSize: 13.5, color: '#64748b', marginTop: 0 }}>
                Please provide a brief reason why this post violates company policies or workspace guidelines:
              </p>
              <textarea 
                className="social-textarea"
                style={{ minHeight: 90 }}
                placeholder="Reason (e.g. inappropriate language, confidentiality concern)..."
                value={reportReason}
                onChange={e => setReportReason(e.target.value)}
              />
            </div>
            <div className="social-modal-footer" style={{ justifyContent: 'flex-end', gap: 10 }}>
              <button 
                className="btn-upload-trigger" 
                onClick={() => setReportPostId(null)}
              >
                Cancel
              </button>
              <button 
                className="btn-social-create" 
                style={{ background: '#e11d48' }}
                disabled={isReporting || !reportReason.trim()}
                onClick={handleSubmitReport}
              >
                {isReporting ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Lightbox Modal ─────────────────────────────────────────── */}
      {lightboxImg && (
        <div className="social-lightbox-overlay" onClick={() => setLightboxImg(null)}>
          <button className="social-lightbox-close" onClick={() => setLightboxImg(null)}>
            <X size={24} />
          </button>
          <img 
            src={lightboxImg} 
            alt="Full size media preview" 
            className="social-lightbox-img" 
            onClick={e => e.stopPropagation()} 
          />
        </div>
      )}

      {/* ── Toast Notification ─────────────────────────────────────── */}
      {toastMessage && (
        <div className="social-toast">
          <CheckCircle2 size={18} color="#10b981" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};

export default SocialFeed;
