import React, { useRef, useState } from 'react';
import { User } from '../types';
import { Settings as SettingsIcon, ShieldCheck, Link, MapPin, Camera, Sparkles, Check, CheckCircle2 } from 'lucide-react';

interface SettingsProps {
  currentUser: User;
  setCurrentUser: React.Dispatch<React.SetStateAction<User | null>>;
  onProfileUpdated: (updatedUser: User) => void;
}

export default function Settings({
  currentUser,
  setCurrentUser,
  onProfileUpdated,
}: SettingsProps) {
  const [bio, setBio] = useState(currentUser.bio || '');
  const [website, setWebsite] = useState(currentUser.website || '');
  const [location, setLocation] = useState(currentUser.location || '');
  const [avatar, setAvatar] = useState(currentUser.avatar || '');
  const [cover, setCover] = useState(currentUser.cover || '');
  const [saving, setSaving] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // Helper to convert avatar or cover uploads to base64
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, field: 'avatar' | 'cover') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (field === 'avatar') {
          setAvatar(reader.result as string);
        } else {
          setCover(reader.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg('');

    try {
      const res = await fetch('/api/users/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          bio,
          website,
          location,
          avatar,
          cover,
        }),
      });

      if (res.ok) {
        const updatedUser = await res.json();
        setCurrentUser(updatedUser);
        onProfileUpdated(updatedUser);
        setSuccessMsg('Profile updated successfully!');
        setTimeout(() => setSuccessMsg(''), 3000);
      } else {
        throw new Error('Update failed');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleRequestVerification = async () => {
    setVerifyLoading(true);
    setSuccessMsg('');
    try {
      const res = await fetch(`/api/users/${currentUser.id}/request-verification`, {
        method: 'POST',
      });

      if (res.ok) {
        const updatedUser = await res.json();
        setCurrentUser(updatedUser);
        onProfileUpdated(updatedUser);
        setSuccessMsg('Congratulations! Your account is now officially verified.');
        setTimeout(() => setSuccessMsg(''), 4000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setVerifyLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center space-x-2">
          <SettingsIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <span>Account Settings</span>
        </h2>
        <p className="text-xs text-gray-400 mt-0.5">Customize your profile metadata, header banners, and request official status badges.</p>
      </div>

      {successMsg && (
        <div className="flex items-center space-x-2 rounded-xl bg-emerald-50 p-3.5 text-xs font-bold text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30">
          <CheckCircle2 className="h-4.5 w-4.5 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      <form onSubmit={handleSaveProfile} className="space-y-6">
        {/* Banner Images Block */}
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900 overflow-hidden">
          <div className="relative h-32 bg-gray-100 dark:bg-gray-950">
            {cover && <img src={cover} alt="Cover preview" className="h-full w-full object-cover" />}
            <button
              type="button"
              onClick={() => coverInputRef.current?.click()}
              className="absolute top-3 right-3 rounded-full bg-black/60 p-2 text-white hover:bg-black/80 transition flex items-center space-x-1 text-xs font-semibold"
            >
              <Camera className="h-3.5 w-3.5" />
              <span>Change Banner</span>
            </button>
            <input
              type="file"
              accept="image/*"
              ref={coverInputRef}
              onChange={(e) => handleImageUpload(e, 'cover')}
              className="hidden"
            />
          </div>

          <div className="px-6 pb-6 relative flex flex-col sm:flex-row sm:items-end sm:justify-between">
            {/* Avatar block with camera trigger */}
            <div className="relative -mt-10 h-20 w-20 rounded-full border-4 border-white dark:border-gray-900 bg-gray-50 overflow-hidden shrink-0 group">
              <img src={avatar} alt="Avatar preview" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white"
                title="Change Avatar image"
              >
                <Camera className="h-5 w-5" />
              </button>
              <input
                type="file"
                accept="image/*"
                ref={avatarInputRef}
                onChange={(e) => handleImageUpload(e, 'avatar')}
                className="hidden"
              />
            </div>

            {/* Account Details Brief */}
            <div className="mt-3 sm:mt-0 sm:ml-4 flex-1">
              <div className="flex items-center space-x-1.5">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">@{currentUser.username}</h3>
                {currentUser.verified && (
                  <span className="bg-blue-500 text-white rounded-full h-3.5 w-3.5 flex items-center justify-center text-[8px] font-bold">✓</span>
                )}
              </div>
              <p className="text-[10px] text-gray-400">Registered member profile</p>
            </div>

            {/* Verification Button Row */}
            <div className="mt-4 sm:mt-0">
              {currentUser.verified ? (
                <div className="flex items-center space-x-1 rounded-xl bg-blue-50 px-3.5 py-1.5 text-xs font-bold text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-100 dark:border-blue-900/20">
                  <ShieldCheck className="h-4.5 w-4.5 text-blue-500" />
                  <span>Profile Verified</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleRequestVerification}
                  disabled={verifyLoading}
                  className="flex items-center space-x-1.5 rounded-xl bg-blue-50 px-3.5 py-1.5 text-xs font-bold text-blue-600 hover:bg-blue-100 dark:bg-blue-950/30 dark:text-blue-400 dark:hover:bg-blue-950/50 transition border border-blue-100 dark:border-blue-900/30"
                >
                  <ShieldCheck className="h-4 w-4" />
                  <span>{verifyLoading ? 'Verifying...' : 'Request Verification Badge'}</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Edit Fields Panel */}
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900 space-y-4">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white border-b border-gray-50 pb-2 dark:border-gray-800">Biography & Links</h3>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Short Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              placeholder="Tell other wizard coders about yourself..."
              className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 px-4 text-xs text-gray-900 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Website URL</label>
              <div className="relative">
                <Link className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                <input
                  type="text"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="www.myportfolio.com"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 pl-9 pr-4 py-2.5 text-xs text-gray-900 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Location</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="San Francisco, CA"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 pl-9 pr-4 py-2.5 text-xs text-gray-900 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Submit profile edits form */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-blue-600 px-6 py-2.5 text-xs font-bold text-white transition hover:bg-blue-700 disabled:opacity-40"
          >
            {saving ? 'Saving changes...' : 'Save Profile Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
