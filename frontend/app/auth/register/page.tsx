'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Mail, User, Building2, ChevronLeft, ArrowRight, Phone, Calendar, MapPin, Loader2 } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State matching your Backend expectations
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    dob: '',
    storeName: '',
    storeAddress: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('http://localhost:5000/api/Auth/Register/Manager', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        alert("Registration successful! Please log in.");
        router.push('/auth/login');
      } else {
        setError(data.error || "Registration failed");
      }
    } catch (err) {
      setError("Cannot connect to server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 flex flex-col justify-center py-12 px-6 lg:px-8 relative overflow-hidden font-sans">
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-indigo-600/10 blur-[120px] rounded-full -z-10" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <a href="/" className="flex items-center text-sm text-slate-400 hover:text-blue-400 transition-colors mb-8 w-fit mx-auto">
          <ChevronLeft className="w-4 h-4 mr-1" /> Back to home
        </a>
        <h2 className="text-3xl font-bold tracking-tight text-white">Get started</h2>
        <p className="mt-2 text-slate-400">Set up your organization's asset hub.</p>
      </div>

      <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-xl">
        <div className="bg-slate-900/50 border border-slate-800 py-8 px-6 shadow-2xl rounded-2xl sm:px-10 backdrop-blur-sm">
          
          {error && (
            <div className="mb-6 p-3 bg-red-500/10 border border-red-500/50 text-red-400 rounded-lg text-sm">
              {error}
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Personal Info */}
              <div className="space-y-5">
                <InputGroup label="Full Name" icon={<User size={18}/>} name="name" type="text" placeholder="John Doe" value={formData.name} onChange={handleChange} />
                <InputGroup label="Work Email" icon={<Mail size={18}/>} name="email" type="email" placeholder="john@company.com" value={formData.email} onChange={handleChange} />
                <InputGroup label="Phone Number" icon={<Phone size={18}/>} name="phone" type="tel" placeholder="+36 30 123 4567" value={formData.phone} onChange={handleChange} />
              </div>

              {/* Store & Security Info */}
              <div className="space-y-5">
                <InputGroup label="Company Name" icon={<Building2 size={18}/>} name="storeName" type="text" placeholder="Acme Corp" value={formData.storeName} onChange={handleChange} />
                <InputGroup label="Store Address" icon={<MapPin size={18}/>} name="storeAddress" type="text" placeholder="123 Main St, City" value={formData.storeAddress} onChange={handleChange} />
                <InputGroup label="Date of Birth" icon={<Calendar size={18}/>} name="dob" type="date" placeholder="" value={formData.dob} onChange={handleChange} />
              </div>
            </div>

            <InputGroup label="Password" icon={<Lock size={18}/>} name="password" type="password" placeholder="••••••••" value={formData.password} onChange={handleChange} />

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center py-3 px-4 mt-4 rounded-xl text-white font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-90 transition-all shadow-lg shadow-blue-500/20 group disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin" /> : <>Register Account <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-all" /></>}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-sm text-slate-400">
              Already have an account? <a href="/login" className="font-medium text-blue-400 hover:text-blue-300">Log in</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper component for cleaner code
function InputGroup({ label, icon, ...props }: any) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-300">{label}</label>
      <div className="mt-1 relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
          {icon}
        </div>
        <input
          {...props}
          required
          className="block w-full pl-10 bg-slate-950 border border-slate-800 text-white rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
        />
      </div>
    </div>
  );
}