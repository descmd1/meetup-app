import React, { useEffect, useState } from 'react';
import API from '../utils/api';

const Profile = () => {
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    API.get('/user/me').then((res) => setProfile(res.data));
  }, []);

  if (!profile) return <p>Loading...</p>;

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold">My Profile</h2>
      <p><strong>Name:</strong> {profile.name}</p>
      <p><strong>Email:</strong> {profile.email}</p>
      <p><strong>Gender:</strong> {profile.gender}</p>
      <p><strong>Preference:</strong> {profile.preference}</p>
      <p><strong>Bio:</strong> {profile.bio}</p>
    </div>
  );
};

export default Profile;