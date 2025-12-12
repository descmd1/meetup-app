// import React, { useEffect, useState } from 'react';
// import API from '../utils/api';
// import UserCard from '../components/UserCard';

// const Match = () => {
//   const [users, setUsers] = useState([]);

//   useEffect(() => {
//     API.get('/user/match-candidates').then((res) => setUsers(res.data));
//   }, []);

//   const handleLike = (id) => API.post(`/match/like/${id}`);
//   const handleDislike = (id) => API.post(`/match/dislike/${id}`);

//   return (
//     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
//       {users.map((user) => (
//         <UserCard key={user._id} user={user} onLike={handleLike} onDislike={handleDislike} />
//       ))}
//     </div>
//   );
// };

// export default Match;


// import React, { useEffect, useState } from 'react';
// import API from '../utils/api';
// import UserCard from '../components/UserCard';

// const Match = () => {
//   const [users, setUsers] = useState([]);

//   useEffect(() => {
//     const fetchUsers = async () => {
//       try {
//         const res = await API.get('/user/match-candidates', {
//           headers: {
//             Authorization: `Bearer ${localStorage.getItem('token')}`,
//           },
//         });
//         setUsers(res.data);
//       } catch (err) {
//         console.error('Error fetching candidates:', err);
//       }
//     };
//     fetchUsers();
//   }, []);

//   const handleLike = async (id) => {
//     try {
//       await API.post(`/match/like/${id}`, {}, {
//         headers: {
//           Authorization: `Bearer ${localStorage.getItem('token')}`,
//         },
//       });
//       setUsers(users.filter((user) => user._id !== id));
//     } catch (err) {
//       console.error('Like error:', err);
//     }
//   };

//   const handleDislike = async (id) => {
//     try {
//       await API.post(`/match/dislike/${id}`, {}, {
//         headers: {
//           Authorization: `Bearer ${localStorage.getItem('token')}`,
//         },
//       });
//       setUsers(users.filter((user) => user._id !== id));
//     } catch (err) {
//       console.error('Dislike error:', err);
//     }
//   };

//   return (
//     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
//       {users.map((user) => (
//         <UserCard key={user._id} user={user} onLike={handleLike} onDislike={handleDislike} />
//       ))}
//     </div>
//   );
// };

// export default Match;


// src/pages/Match.jsx
import React, { useEffect, useState } from 'react';
import API from '../utils/api';
import UserCard from '../components/UserCard';

const Match = () => {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const token = localStorage.getItem('token');
        console.log('Token:', token);

        const res = await API.get('/user/match-candidates', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        console.log('Fetched users:', res.data);

        if (res.data && Array.isArray(res.data) && res.data.length > 0) {
          setUsers(res.data);
        } else {
          console.warn('No users found, falling back to mock data');
          // Optional: fallback mock data for testing
          setUsers([
            {
              _id: 'mock1',
              name: 'Test User',
              bio: 'This is a mock user for testing.',
              avatar: 'https://i.pravatar.cc/150?img=3',
            },
          ]);
        }
      } catch (err) {
        console.error('Error fetching candidates:', err);
        setError('Failed to load users');
      }
    };

    fetchUsers();
  }, []);

  const handleLike = async (id) => {
    try {
      await API.post(`/match/like/${id}`, {}, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      setUsers(users.filter((user) => user._id !== id));
    } catch (err) {
      console.error('Like error:', err);
    }
  };

  const handleDislike = async (id) => {
    try {
      await API.post(`/match/dislike/${id}`, {}, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      setUsers(users.filter((user) => user._id !== id));
    } catch (err) {
      console.error('Dislike error:', err);
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Match Candidates</h1>
      
      {error && <p className="text-red-500">{error}</p>}
      {users.length === 0 && !error && (
        <p className="text-gray-500">No users available.</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {users.map((user) => {
          console.log('Rendering user:', user);
          return (
            <UserCard
              key={user._id}
              user={user}
              onLike={handleLike}
              onDislike={handleDislike}
            />
          );
        })}
      </div>
    </div>
  );
};

export default Match;
