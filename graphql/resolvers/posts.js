const { UserInputError } = require('apollo-server')

const Post = require('../../models/Post')
const checkAuth = require('../../util/check-auth');

module.exports = {
  Query: {
    async getPosts() {
      console.log("getPosts")
      try {
        const posts = await Post.find().sort({ createdAt: -1 });
        return posts;
      } catch (err) {
        throw new Error(err);
      }
    },
    async getPost(_, { postId }) {
      console.log("getPostId")
      try {
        const post = await Post.findById(postId);
        if (post) {
          return post;
        } else {
          throw new Error('Mensaje no encontrado');
        }
      } catch (err) {
        throw new Error(err);
      }
    }
  },
  Mutation: {
    async createPost(_, { body }, context) {
      console.log("creacion de post")
      const user = checkAuth(context);

      if (body.trim()==='') {     
        throw new Error('Post debe contener al meno un caracter')
      }


      const newPost = new Post({
        body,
        user: user.id,
        username: user.username,
        createdAt: new Date().toISOString()
      });

      const post = await newPost.save();

      // subscription
      context.pubsub.publish('NEW_POST',{
        newPost:post
      })

      return post;
    },
    async deletePost(_, { postId }, context) {
      const user = checkAuth(context);

      try {
        const post = await Post.findById(postId);
        if (user.username === post.username) {
          await post.delete();
          return 'Post deleted successfully';
        } else {
          throw new AuthenticationError('Acción no permitida');
        }
      } catch (err) {
        throw new Error(err);
      }
    },
    likePost: async (_, { postId }, context) => {
      const { username } = checkAuth(context);
      const post = await Post.findById(postId);
      if (post) {
        if (post.likes.find(like => like.username === username)) {
          post.likes = post.likes.filter(like => like.username !== username);
          await post.save();
        } else {
          post.likes.push({
            username,
            createdAt: new Date().toISOString()
          })
        }
        await post.save();
        return post;
      } else {
        throw new UserInputError('Post no encontrado')
      }

    }
  },
  Subscription: {
    newPost: {
      subscribe: (_, __, { pubsub }) => pubsub.asyncIterator('NEW_POST')
    }
  }
};