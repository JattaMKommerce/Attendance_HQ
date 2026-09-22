import api from './api';

export const socialApi = {
  // Get paginated posts
  getPosts: async (page = 1, limit = 10) => {
    const response = await api.get('/social/posts', {
      params: { page, limit }
    });
    return response.data;
  },

  // Get post by ID
  getPostById: async (postId) => {
    const response = await api.get(`/social/posts/${postId}`);
    return response.data;
  },

  // Create post (multipart form data for text + media files)
  createPost: async (formData) => {
    const response = await api.post('/social/posts', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },

  // Delete post
  deletePost: async (postId) => {
    const response = await api.delete(`/social/posts/${postId}`);
    return response.data;
  },

  // Like post
  likePost: async (postId) => {
    const response = await api.post(`/social/posts/${postId}/like`);
    return response.data;
  },

  // Unlike post
  unlikePost: async (postId) => {
    const response = await api.delete(`/social/posts/${postId}/like`);
    return response.data;
  },

  // Get comments
  getComments: async (postId) => {
    const response = await api.get(`/social/posts/${postId}/comments`);
    return response.data;
  },

  // Add comment
  addComment: async (postId, content) => {
    const response = await api.post(`/social/posts/${postId}/comments`, { content });
    return response.data;
  },

  // Delete comment
  deleteComment: async (commentId) => {
    const response = await api.delete(`/social/comments/${commentId}`);
    return response.data;
  },

  // Report post
  reportPost: async (postId, reason) => {
    const response = await api.post(`/social/posts/${postId}/report`, { reason });
    return response.data;
  }
};

export default socialApi;
