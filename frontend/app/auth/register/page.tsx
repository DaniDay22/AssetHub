'use client';
import React, { useState } from 'react';
import { Lock, Mail, User, Building2, ChevronLeft, ArrowRight } from 'lucide-react';

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 flex flex-col justify-center py-12 px-6 lg:px-8 relative overflow-hidden font-sans">
      {/* Background Glow */}
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-indigo-600/10 blur-[120px] rounded-full -z-10" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <a href="/" className="flex items-center text-sm text-slate-400 hover:text-blue-400 transition-colors mb-8 w-fit mx-auto">
          <ChevronLeft className="w-4 h-4 mr-1" /> Back to home
        </a>
        <h2 className="text-3xl font-bold tracking-tight text-white">
          Get started
        </h2>
        <p className="mt-2 text-slate-400">
          Set up your organization's asset hub.
        </p>
      </div>

      <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-slate-900/50 border border-slate-800 py-8 px-6 shadow-2xl rounded-2xl sm:px-10 backdrop-blur-sm">
          <form className="space-y-5" onSubmit={(e) => e.preventDefault()}>
            <div>
              <label className="block text-sm font-medium text-slate-300">Full Name</label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-4 w-4 text-slate-500" />
                </div>
                <input
                  type="text"
                  required
                  className="block w-full pl-10 bg-slate-950 border border-slate-800 text-white rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                  placeholder="John Doe"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300">Work Email</label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-slate-500" />
                </div>
                <input
                  type="email"
                  required
                  className="block w-full pl-10 bg-slate-950 border border-slate-800 text-white rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                  placeholder="john@company.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300">Company Name</label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Building2 className="h-4 w-4 text-slate-500" />
                </div>
                <input
                  type="text"
                  required
                  className="block w-full pl-10 bg-slate-950 border border-slate-800 text-white rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                  placeholder="Acme Corp"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300">Password</label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-slate-500" />
                </div>
                <input
                  type="password"
                  required
                  className="block w-full pl-10 bg-slate-950 border border-slate-800 text-white rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full flex justify-center items-center py-3 px-4 mt-4 rounded-xl text-white font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-90 transition-all shadow-lg shadow-blue-500/20 group"
            >
              Register Account
              <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-sm text-slate-400">
              Already have an account?{' '}
              <a href="/login" className="font-medium text-blue-400 hover:text-blue-300 transition-colors">
                Log in
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}