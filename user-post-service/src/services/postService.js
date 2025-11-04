// services/postService.js
const { default: axios } = require('axios');
const { uploadPostImage } = require('../middleware/uploadPostImage');
const  Post  = require('../models/Post');
const   SeenPost  = require('../models/PostSeen');
const fs = require("fs")

const store  = require('../store/store'); // Redis or in-memory store
const AppError = require('../utils/error.utils');

/**
 * Create a new post
 */
async function createPost(userId, content, files, username) {
  try {
    // verification of the auth service 
    const userResponse = await axios.get(`http://localhost:3000/users/profile/${userId}`);

    if (!userResponse.data) {
      throw new AppError("Token Unauthorized", 400);
    }

    const user = userResponse.data.user;


    let results = [];
          console.log("UPLOADING")
    if (files && files.length > 0) {
      const uploadPromises = files.map(file =>
        uploadPostImage(file.path, "ImpactLogProfile/Posts")
      );

      results = await Promise.all(uploadPromises);

      console.log(results)
      // cleanup local files
      files.forEach(file => {
        if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      });
    }

    const post = await Post.create({
      authorId: userId || user.id,
      content,
      mediaUrls: results.map(r => r.secure_url),
      authorName: user.name || username,
      authorProfileUrl: user.avatarUrl
    });

    if (store.isRedis && store.client) {
      await store.client.lPush("latest_posts", JSON.stringify(post));
      await store.client.lTrim("latest_posts", 0, 49);
    }

    return post;
  } catch (error) {
    // console.error("Error creating post:", error);
    console.log(error.message)
    throw new AppError(error.message || "Failed to create post", 500);
  }
}

/**
 * Get latest posts (from Redis if available, else DB)
 */




async function getLatestPosts(userId) {
  let posts = [];

  // 1️⃣ Try Redis cache
  // if (store.isRedis && store.client) {
  //   const cachedPosts = await store.client.lRange("latest_posts", 0, 9);
  //   if (cachedPosts.length) {
  //     posts = cachedPosts.map((p) => JSON.parse(p));
  //   }
  // }

  // 2️⃣ Fallback to DB
  if (!posts.length) {
    posts = await Post.findAll({
      order: [["createdAt", "DESC"]],
      limit: 10,
    });
  }

  // 3️⃣ Mark seen posts
  const seen = await SeenPost.findAll({
    where: { userId },
    attributes: ["postId"],
  });
  const seenIds = seen.map((s) => s.postId);

  const postsWithSeen = posts.map((post) => ({
    ...(post.dataValues || post),
    seen: seenIds.includes(post.id),
  }));

  // 4️⃣ Fetch engagement details asynchronously (from engagement-service)
  // Assume engagement service exposes POST /engagement/bulk
  const postIds = postsWithSeen.map((p) => p.id);

  const engagementResponse = await axios.post(
    "http://localhost:4200/counts",
    { postIds }
  );

  const engagementData = engagementResponse.data || {}; // structure like { postId: {likes, comments, shares, users...} }

  // 5️⃣ Merge engagement data into posts
  const enrichedPosts = postsWithSeen.map((post) => ({
    ...post,
    engagement: engagementData[post.id] || {
      likes: [],
      comments: [],
      shares: [],
    },
  }));

  return enrichedPosts;
}

/**
 * Mark a post as seen by a user
 */
async function markPostAsSeen(userId, postId) {
  const alreadySeen = await SeenPost.findOne({ where: { userId, postId } });
  if (!alreadySeen) {
    await SeenPost.create({ userId, postId });
  }
  return { userId, postId, seen: true };
}

async function getUserPostByIdFromDb(userId) {
  // 1️⃣ Fetch posts by this user
  const posts = await Post.findAll({
    where: { authorId: userId },
    order: [["createdAt", "DESC"]],
  });

  // 2️⃣ Prepare post IDs
  const postIds = posts.map((p) => p.id);

  // 3️⃣ Fetch engagement details from engagement-service
  let engagementData = {};
  try {
    const resp = await axios.post("http://localhost:4200/counts", { postIds });
    engagementData = resp.data || {};
  } catch (err) {
    console.error("⚠️ Engagement service unavailable:", err.message);
    // stick with empty engagement objects below
  }

  // 4️⃣ Merge engagement data into posts
  const enrichedPosts = posts.map((post) => ({
    ...(post.dataValues || post),
    engagement: engagementData[post.id] || {
      likes: [],
      comments: [],
      shares: [],
    },
  }));

  return enrichedPosts;
}

module.exports = {
  createPost,
  getLatestPosts,
  markPostAsSeen,
  getUserPostByIdFromDb
};
