
import React from 'react';

const UserCard = ({ user, onLike, onDislike }) => (
  <div className="p-4 border rounded shadow-md text-center bg-white">
    <img
      src={user.avatar || '/default-avatar.png'}
      alt={user.name || 'User'}
      className="w-32 h-32 mx-auto rounded-full mb-2 object-cover"
    />
    <h3 className="text-xl font-semibold">{user.name}</h3>
    <p>{user.bio}</p>
    <div className="flex justify-around mt-2">
      <button
        onClick={() => onDislike(user._id)}
        className="bg-red-500 text-white px-4 py-1 rounded hover:bg-red-600"
      >
        Dislike
      </button>
      <button
        onClick={() => onLike(user._id)}
        className="bg-green-500 text-white px-4 py-1 rounded hover:bg-green-600"
      >
        Like
      </button>
    </div>
  </div>
);
export default UserCard;
