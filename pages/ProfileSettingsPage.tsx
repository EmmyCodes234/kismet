import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import * as api from '../services/apiService';
import { UserProfile } from '../types';
import { supabase } from '../services/supabaseClient';

// A curated list of countries
const countries: { code: string; name: string }[] = [
    { code: 'us', name: 'United States' }, { code: 'ca', name: 'Canada' }, { code: 'gb', name: 'United Kingdom' },
    { code: 'au', name: 'Australia' }, { code: 'nz', name: 'New Zealand' }, { code: 'ng', name: 'Nigeria' },
    { code: 'gh', name: 'Ghana' }, { code: 'ke', name: 'Kenya' }, { code: 'za', name: 'South Africa' },
    { code: 'in', name: 'India' }, { code: 'pk', name: 'Pakistan' }, { code: 'my', name: 'Malaysia' },
    { code: 'sg', name: 'Singapore' }, { code: 'th', name: 'Thailand' }, { code: 'jm', name: 'Jamaica' },
    { code: 'tt', name: 'Trinidad and Tobago' }, { code: 'de', name: 'Germany' }, { code: 'fr', name: 'France' },
    { code: 'es', name: 'Spain' }, { code: 'it', name: 'Italy' }, { code: 'nl', name: 'Netherlands' },
    { code: 'se', name: 'Sweden' }, { code: 'no', name: 'Norway' }, { code: 'dk', name: 'Denmark' },
];

const ProfileSettingsPage: React.FC = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProfile = async () => {
        setLoading(true);
        try {
            const userProfile = await api.getUserProfile();
            if (userProfile) {
                setProfile(userProfile);
            } else {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                     setProfile({
                        displayName: user.user_metadata?.display_name || user.email || '',
                        bio: '',
                        countryCode: '',
                        avatarUrl: null,
                    });
                }
            }
        } catch (e: any) {
            console.error("An unexpected error occurred while fetching the profile:", e.message);
        } finally {
            setLoading(false);
        }
    };
    fetchProfile();
  }, []);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const { name, value } = e.target;
      if (profile) {
          setProfile(prev => ({...prev!, [name]: value}));
      }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!profile) return;
      setSaving(true);
      try {
        if (avatarFile) {
            setUploading(true);
            await api.uploadAvatar(avatarFile);
            setUploading(false);
        }
        await api.saveUserProfile(profile);
        setShowSaveSuccess(true);
        setTimeout(() => {
            setShowSaveSuccess(false);
            navigate('/dashboard');
        }, 1500);
      } catch (error) {
          console.error("Error saving profile:", error);
          alert("An error occurred while saving. Please try again.");
      } finally {
          setSaving(false);
          setUploading(false);
      }
  };

  if (loading) {
      return <div className="p-8 text-center text-gray-400">Loading profile...</div>;
  }

  if (!profile) {
      return <div className="p-8 text-center text-red-400">Could not load profile. Please try logging in again.</div>;
  }

  const avatarSrc = avatarPreview || profile.avatarUrl;

  return (
    <div className="min-h-screen bg-slate-900 text-white p-4 md:p-8">
        <div className="max-w-2xl mx-auto">
            <h1 className="text-3xl md:text-4xl font-bold mb-2 text-white">Profile Settings</h1>
            <p className="text-gray-400 mb-8">This information is displayed on your main dashboard.</p>

             <form onSubmit={handleSubmit} className="bg-slate-800 rounded-lg shadow-lg p-8 space-y-6">
                <div className="flex flex-col sm:flex-row items-center gap-6">
                    <div className="w-24 h-24 rounded-full bg-slate-700 flex-shrink-0 flex items-center justify-center overflow-hidden">
                       {avatarSrc ? (
                            <img src={avatarSrc} alt="Avatar Preview" className="w-full h-full object-cover" />
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 text-slate-500" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>
                        )}
                    </div>
                    <div>
                        <label htmlFor="avatarUpload" className="cursor-pointer px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white font-bold rounded-lg transition duration-200">
                            Choose Image
                        </label>
                        <input type="file" id="avatarUpload" className="hidden" accept="image/png, image/jpeg, image/gif" onChange={handleFileChange} />
                        <p className="text-xs text-gray-400 mt-2">PNG, JPG, or GIF. 2MB max.</p>
                    </div>
                </div>

                 <div>
                    <label htmlFor="displayName" className="block text-sm font-bold text-gray-300 mb-2">Display Name</label>
                    <input 
                        type="text" 
                        id="displayName" 
                        name="displayName" 
                        value={profile.displayName} 
                        onChange={handleInputChange} 
                        className="w-full p-3 bg-slate-700 rounded-md"
                        required
                    />
                 </div>
                 <div>
                    <label htmlFor="bio" className="block text-sm font-bold text-gray-300 mb-2">Bio / Tagline</label>
                    <textarea 
                        id="bio" 
                        name="bio" 
                        value={profile.bio} 
                        onChange={handleInputChange} 
                        rows={3}
                        className="w-full p-3 bg-slate-700 rounded-md"
                        placeholder="A short description about yourself"
                    />
                 </div>
                 <div>
                    <label htmlFor="countryCode" className="block text-sm font-bold text-gray-300 mb-2">Country</label>
                    <select
                        id="countryCode"
                        name="countryCode"
                        value={profile.countryCode}
                        onChange={handleInputChange}
                        className="w-full p-3 bg-slate-700 rounded-md appearance-none"
                    >
                        <option value="">Select a country</option>
                        {countries.sort((a,b) => a.name.localeCompare(b.name)).map(c => (
                            <option key={c.code} value={c.code}>{c.name}</option>
                        ))}
                    </select>
                 </div>

                 <div className="pt-4 flex justify-between items-center">
                    <button
                        type="button"
                        onClick={() => navigate('/dashboard')}
                        className="px-6 py-3 bg-slate-600 hover:bg-slate-500 text-white font-bold rounded-lg transition duration-200"
                    >
                        Back to Dashboard
                    </button>
                     <div className="flex items-center gap-4">
                        <div className={`flex items-center gap-2 bg-green-500/20 text-green-300 px-4 py-2 rounded-lg text-sm font-medium transition-opacity duration-300 ${showSaveSuccess ? 'opacity-100' : 'opacity-0'}`}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                            <span>Profile Saved!</span>
                        </div>
                        <button
                            type="submit"
                            disabled={saving}
                            className="px-8 py-3 bg-cool-blue-600 hover:bg-cool-blue-700 disabled:bg-slate-500 disabled:cursor-not-allowed text-white font-bold rounded-lg transition duration-200"
                        >
                            {saving ? (uploading ? 'Uploading Image...' : 'Saving...') : 'Save Profile'}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    </div>
  );
};

export default ProfileSettingsPage;