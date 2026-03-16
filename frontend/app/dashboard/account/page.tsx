'use client';
import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext'; // Adjust path as needed
import { User, Camera, Mail, Lock, Trash2, ChevronLeft, KeyRound, Loader2 } from 'lucide-react';

export default function AccountManagement() {
  const { user } = useAuth(); // Grab the logged-in user from your context
  console.log('Authenticated User:', user); // Debugging line to check user data
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  const [passwords, setPasswords] = useState({
    current: '',
    new: '',
    confirm: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPasswords({ ...passwords, [e.target.name]: e.target.value });
  };

  const handlePasswordChange = async () => {
    setMessage({ text: '', type: '' });

    // 1. Basic Validation
    if (passwords.new !== passwords.confirm) {
      setMessage({ text: "New passwords don't match!", type: 'error' });
      return;
    }
    if (passwords.new.length < 8) {
      setMessage({ text: "Password must be at least 8 characters.", type: 'error' });
      return;
    }

    setLoading(true);

    try {
      // Grab token to prove who is asking to change the password
      const token = localStorage.getItem('token'); 

      const res = await fetch('http://localhost:5000/api/Auth/UpdatePassword', {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` // Securely send the token
        },
        body: JSON.stringify({
          currentPassword: passwords.current,
          newPassword: passwords.new
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setMessage({ text: "Password updated successfully!", type: 'success' });
        setPasswords({ current: '', new: '', confirm: '' }); // Clear the form
      } else {
        setMessage({ text: data.error || "Failed to update password.", type: 'error' });
      }
    } catch (error) {
      setMessage({ text: "Server connection failed.", type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Generate Initials (e.g., "G" from geri@assethub.hu)
  const userInitials = user?.Email ? user.Name.charAt(0).toUpperCase() : 'U';

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 font-sans selection:bg-blue-500/30">
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-blue-600/5 blur-[120px] rounded-full -z-10" />
      
      <div className="max-w-3xl mx-auto pt-16 pb-20 px-6">
        <a href="/dashboard" className="flex items-center text-sm text-slate-400 hover:text-blue-400 transition-colors mb-8 w-fit">
          <ChevronLeft className="w-4 h-4 mr-1" /> Back to dashboard
        </a>

        <div className="mb-10">
          <h1 className="text-4xl font-bold text-white tracking-tight">Account Settings</h1>
          <p className="text-slate-400 mt-2">Update your profile information and security credentials.</p>
        </div>

        <div className="space-y-6">
          
          {/* Section 1: Personal Details */}
          <section className="bg-slate-900/40 border border-slate-800 rounded-2xl backdrop-blur-sm overflow-hidden">
            <div className="p-8">
              <h3 className="text-lg font-semibold text-white mb-6">Personal Details</h3>
              <div className="flex flex-col md:flex-row gap-8 items-start md:items-center">
                <div className="relative">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-3xl font-bold text-white shadow-2xl shadow-blue-500/20 uppercase">
                    {userInitials}
                  </div>
                  <button className="absolute -bottom-2 -right-2 p-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-300 hover:text-white transition-colors shadow-lg">
                    <Camera size={14} />
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6 flex-1">
                  <div>
                    <label className="flex items-center text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">
                      <User size={12} className="mr-1.5" /> Full Name
                    </label>
                    {/* If your JWT payload doesn't have the Name, we just show the Email prefix for now */}
                    <p className="text-slate-200 font-medium">{user?.Name || "User"}</p>
                  </div>
                  <div>
                    <label className="flex items-center text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">
                      <Mail size={12} className="mr-1.5" /> Email Address
                    </label>
                    <p className="text-slate-200 font-medium">{user?.Email || "Loading..."}</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Section 2: Change Password */}
          <section className="bg-slate-900/40 border border-slate-800 rounded-2xl backdrop-blur-sm overflow-hidden">
            <div className="p-8">
              <h3 className="text-lg font-semibold text-white mb-6 flex items-center">
                <KeyRound size={20} className="mr-2 text-blue-400" /> Change Password
              </h3>

              {/* Status Message */}
              {message.text && (
                <div className={`mb-4 p-3 rounded-lg text-sm border ${message.type === 'error' ? 'bg-red-500/10 text-red-400 border-red-500/50' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/50'}`}>
                  {message.text}
                </div>
              )}
              
              <div className="space-y-4 max-w-md">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1.5">Current Password</label>
                  <input
                    type="password"
                    name="current"
                    value={passwords.current}
                    onChange={handleChange}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-slate-700"
                    placeholder="••••••••"
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1.5">New Password</label>
                    <input
                      type="password"
                      name="new"
                      value={passwords.new}
                      onChange={handleChange}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-slate-700"
                      placeholder="••••••••"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1.5">Confirm New</label>
                    <input
                      type="password"
                      name="confirm"
                      value={passwords.confirm}
                      onChange={handleChange}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-slate-700"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <button 
                  onClick={handlePasswordChange}
                  disabled={loading || !passwords.current || !passwords.new || !passwords.confirm}
                  className="mt-2 px-6 py-2.5 flex items-center justify-center bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold text-sm transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Update Password
                </button>
              </div>
            </div>
          </section>

          {/* Section 3: Danger Zone */}
          <section className="p-8 border border-red-500/10 bg-red-500/[0.02] rounded-2xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <h3 className="text-red-400 font-semibold flex items-center text-sm uppercase tracking-wider">
                  <Trash2 size={16} className="mr-2" /> Danger Zone
                </h3>
                <p className="text-slate-500 text-sm mt-1">
                  Permanently delete your account and all associated data.
                </p>
              </div>
              <button className="px-5 py-2.5 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-400/10 transition-all font-medium text-sm">
                Delete Account
              </button>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}