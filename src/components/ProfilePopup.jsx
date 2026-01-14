import { useState, useCallback } from "react";

const ProfilePopup = ({ profiles, createProfile, selectProfile, getProfileStats }) => {
  const [newProfileName, setNewProfileName] = useState("");
  const [error, setError] = useState("");

  const handleCreateProfile = useCallback(() => {
    const trimmed = newProfileName.trim();
    if (trimmed.length < 3 || trimmed.length > 15) {
      setError("Profile name must be 3-15 characters long");
      return;
    }

    createProfile(trimmed);
    setNewProfileName("");
    setError("");
  }, [newProfileName, createProfile]);

  return (
    <div className="profile-popup-overlay">
      <div className="profile-popup glass fade-in">
        <h2>Welcome to Coin Collectors!</h2>
        <p>Select an existing profile or create a new one</p>

        {profiles.length > 0 && (
          <div className="existing-profiles">
            <h3>Your Profiles</h3>
            {profiles.map(profile => {
              const stats = getProfileStats ? getProfileStats(profile.id) : { cnp: 0, collectors: 0 };
              return (
                <div key={profile.id} className="profile-item">
                  <button
                    className="profile-select-btn"
                    onClick={() => selectProfile(profile.id)}
                  >
                    <span className="profile-name">{profile.name}</span>
                  </button>
                  <div className="profile-stats">
                    <span className="profile-cnp">{stats.cnp.toLocaleString()} CNP</span>
                    <span className="profile-collectors">{stats.collectors} collectors</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="create-profile-section">
          <h3>Create New Profile</h3>
          <input
            type="text"
            className="profile-name-input"
            value={newProfileName}
            onChange={(e) => setNewProfileName(e.target.value)}
            placeholder="Enter profile name..."
            maxLength={15}
            onKeyPress={(e) => e.key === 'Enter' && handleCreateProfile()}
          />
          {error && <p className="error-text">{error}</p>}
          <button
            onClick={handleCreateProfile}
            disabled={!newProfileName.trim() || profiles.length >= 5}
          >
            {profiles.length >= 5 ? "Max Profiles Reached" : "Create Profile"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfilePopup;
