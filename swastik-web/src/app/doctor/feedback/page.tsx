'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { doctorApi } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, List, Send, Plus, AlertCircle, CheckCircle } from 'lucide-react';

const FEEDBACK_TYPES = [
  'Report a Problem',
  'Suggest an Improvement',
  'Request a Feature',
  'Positive Feedback',
  'Security / Privacy Concern',
  'Other'
];

const CATEGORIES = [
  'Website / UI', 'Dashboard', 'Appointments', 'Patients', 'Consultations',
  'Prescriptions', 'Vitals', 'Health Alerts', 'Schedule / Leaves',
  'Hospitals / Invites', 'Community Q&A', 'Reviews', 'Earnings',
  'Analytics', 'AI Insights', 'Notifications', 'Profile / Settings',
  'Performance', 'Mobile Experience', 'Security / Privacy', 'Other'
];

export default function DoctorFeedbackPage() {
  const searchParams = useSearchParams();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<'give' | 'my'>('give');
  
  // Form State
  const [type, setType] = useState('Suggest an Improvement');
  const [category, setCategory] = useState('Website / UI');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [rating, setRating] = useState<number>(0);
  
  // API State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [myFeedbacks, setMyFeedbacks] = useState<any[]>([]);
  const [isLoadingFeedbacks, setIsLoadingFeedbacks] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState<any | null>(null);

  // Technical context extraction
  const [techContext, setTechContext] = useState<any>({});

  useEffect(() => {
    // Collect tech context on mount
    const ua = navigator.userAgent;
    let browser = 'Unknown';
    if (ua.indexOf('Chrome') > -1) browser = 'Chrome';
    else if (ua.indexOf('Firefox') > -1) browser = 'Firefox';
    else if (ua.indexOf('Safari') > -1) browser = 'Safari';
    
    let os = 'Unknown OS';
    if (ua.indexOf('Win') > -1) os = 'Windows';
    else if (ua.indexOf('Mac') > -1) os = 'MacOS';
    else if (ua.indexOf('Linux') > -1) os = 'Linux';
    else if (ua.indexOf('Android') > -1) os = 'Android';
    else if (ua.indexOf('like Mac') > -1) os = 'iOS';

    setTechContext({
      browser,
      os,
      device: /Mobi|Android/i.test(navigator.userAgent) ? 'Mobile' : 'Desktop',
      pageName: searchParams?.get('page') || 'Direct Feedback',
      route: searchParams?.get('route') || '/doctor/feedback',
      appVersion: '1.0.0'
    });
  }, [searchParams]);

  useEffect(() => {
    if (activeTab === 'my') {
      fetchMyFeedbacks();
    }
  }, [activeTab]);

  const fetchMyFeedbacks = async () => {
    setIsLoadingFeedbacks(true);
    try {
      const res = await doctorApi.getMyFeedback();
      if (res.success) {
        setMyFeedbacks((res.data as any[]) || []);
      }
    } catch (error) {
      toast.error('Failed to load your feedback history');
    } finally {
      setIsLoadingFeedbacks(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description) return toast.error('Title and description are required.');
    
    setIsSubmitting(true);
    try {
      const res = await doctorApi.submitFeedback({
        type,
        category,
        title,
        description,
        rating,
        ...techContext
      });
      if (res.success) {
        toast.success('Feedback submitted successfully! Thank you.');
        setTitle('');
        setDescription('');
        setRating(0);
        setActiveTab('my');
      } else {
        toast.error(res.message || 'Failed to submit feedback');
      }
    } catch (err) {
      toast.error('An error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Submitted': return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
      case 'Under Review': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'Planned': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
      case 'In Progress': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'Resolved': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'Closed': return 'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  return (
    <div className="w-full h-full">
      <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <MessageSquare className="text-primary-500" />
            Doctor Feedback Center
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Help us improve the Vaididea portal. Your feedback goes directly to our product and engineering teams.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-800 mb-8">
          <button
            onClick={() => setActiveTab('give')}
            className={`flex items-center gap-2 py-4 px-6 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'give'
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            <Plus />
            Give Feedback
          </button>
          <button
            onClick={() => {
                setActiveTab('my');
                setSelectedFeedback(null);
            }}
            className={`flex items-center gap-2 py-4 px-6 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'my'
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            <List />
            My Feedback
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Main Content Area */}
          <div className="lg:col-span-8">
            <AnimatePresence mode="wait">
              {activeTab === 'give' ? (
                <motion.div
                  key="give"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-white dark:bg-[#0f1929] rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6 sm:p-8"
                >
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Feedback Type
                        </label>
                        <select
                          value={type}
                          onChange={(e) => setType(e.target.value)}
                          className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#1a2332] px-4 py-3 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                        >
                          {FEEDBACK_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Category
                        </label>
                        <select
                          value={category}
                          onChange={(e) => setCategory(e.target.value)}
                          className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#1a2332] px-4 py-3 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                        >
                          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Title
                      </label>
                      <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Brief summary of the issue or feature"
                        className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#1a2332] px-4 py-3 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex justify-between">
                        <span>Description</span>
                      </label>
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Tell us what happened or what you'd like us to improve. What were you trying to do? What happened instead?"
                        rows={6}
                        className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#1a2332] px-4 py-3 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all resize-none"
                        required
                      />
                    </div>

                    <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
                      >
                        {isSubmitting ? (
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <>
                            <Send />
                            Submit Feedback
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </motion.div>
              ) : (
                <motion.div
                  key="my"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4"
                >
                  {isLoadingFeedbacks ? (
                    <div className="flex justify-center items-center py-20">
                      <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : myFeedbacks.length === 0 ? (
                    <div className="bg-white dark:bg-[#0f1929] rounded-2xl p-12 text-center border border-gray-100 dark:border-gray-800">
                      <MessageSquare className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No feedback submitted yet</h3>
                      <p className="text-gray-500 dark:text-gray-400 mb-6">Your feedback helps us build a better platform for you.</p>
                      <button
                        onClick={() => setActiveTab('give')}
                        className="text-primary-600 dark:text-primary-400 font-medium hover:underline"
                      >
                        Give Feedback Now
                      </button>
                    </div>
                  ) : (
                    myFeedbacks.map((fb) => (
                      <div 
                        key={fb._id}
                        onClick={() => setSelectedFeedback(fb)}
                        className={`bg-white dark:bg-[#0f1929] rounded-2xl p-5 border cursor-pointer transition-all ${
                            selectedFeedback?._id === fb._id 
                                ? 'border-primary-500 shadow-md ring-1 ring-primary-500' 
                                : 'border-gray-100 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-3">
                          <h3 className="font-semibold text-gray-900 dark:text-white">{fb.title}</h3>
                          <span className={`px-2.5 py-1 text-xs font-medium rounded-full whitespace-nowrap ${getStatusColor(fb.status)}`}>
                            {fb.status}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mb-3">
                          <span className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">{fb.type}</span>
                          <span>•</span>
                          <span>{fb.category}</span>
                          <span>•</span>
                          <span>{new Date(fb.createdAt).toLocaleDateString()}</span>
                        </div>
                        {fb.adminResponse && (
                          <div className="mt-3 bg-primary-50 dark:bg-primary-900/10 border border-primary-100 dark:border-primary-900/30 rounded-lg p-3">
                            <p className="text-xs font-semibold text-primary-700 dark:text-primary-400 mb-1 flex items-center gap-1">
                              <CheckCircle className="w-4 h-4" /> Admin Response
                            </p>
                            <p className="text-sm text-gray-700 dark:text-gray-300">{fb.adminResponse}</p>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Sidebar Area */}
          <div className="lg:col-span-4 space-y-6">
            
            {activeTab === 'give' && (
              <div className="bg-blue-50 dark:bg-blue-900/10 rounded-2xl p-6 border border-blue-100 dark:border-blue-900/30">
                <h3 className="font-semibold text-blue-800 dark:text-blue-400 mb-3 flex items-center gap-2">
                  <AlertCircle /> Automatic Context
                </h3>
                <p className="text-sm text-blue-700 dark:text-blue-300 mb-4">
                  To help us debug faster, we will securely attach your current environment details to this feedback:
                </p>
                <ul className="space-y-2 text-xs text-blue-600/80 dark:text-blue-400/80">
                  <li className="flex justify-between"><span>Browser:</span> <strong>{techContext.browser}</strong></li>
                  <li className="flex justify-between"><span>OS:</span> <strong>{techContext.os}</strong></li>
                  <li className="flex justify-between"><span>Device:</span> <strong>{techContext.device}</strong></li>
                  <li className="flex justify-between"><span>Route:</span> <strong>{techContext.route}</strong></li>
                </ul>
              </div>
            )}

            {activeTab === 'my' && selectedFeedback && (
              <div className="bg-white dark:bg-[#0f1929] rounded-2xl p-6 border border-gray-100 dark:border-gray-800 sticky top-24">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Feedback Details</h3>
                
                <div className="space-y-4">
                    <div>
                        <p className="text-xs text-gray-500 mb-1">Title</p>
                        <p className="text-sm text-gray-900 dark:text-white font-medium">{selectedFeedback.title}</p>
                    </div>
                    
                    <div>
                        <p className="text-xs text-gray-500 mb-1">Description</p>
                        <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{selectedFeedback.description}</p>
                    </div>

                    <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
                        <p className="text-xs text-gray-500 mb-2">Timeline</p>
                        <div className="space-y-3 relative before:absolute before:inset-0 before:ml-2 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent">
                            <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                <div className="flex items-center justify-center w-4 h-4 rounded-full border-2 border-white bg-green-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10"></div>
                                <div className="w-[calc(100%-2rem)] md:w-[calc(50%-1.5rem)] text-xs text-gray-700 dark:text-gray-300">
                                    Submitted ({new Date(selectedFeedback.createdAt).toLocaleDateString()})
                                </div>
                            </div>
                            
                            {selectedFeedback.status !== 'Submitted' && (
                                <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                    <div className="flex items-center justify-center w-4 h-4 rounded-full border-2 border-white bg-blue-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10"></div>
                                    <div className="w-[calc(100%-2rem)] md:w-[calc(50%-1.5rem)] text-xs text-gray-700 dark:text-gray-300">
                                        {selectedFeedback.status} 
                                        {selectedFeedback.updatedAt && ` (${new Date(selectedFeedback.updatedAt).toLocaleDateString()})`}
                                    </div>
                                </div>
                            )}

                            {selectedFeedback.resolvedAt && (
                                <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                    <div className="flex items-center justify-center w-4 h-4 rounded-full border-2 border-white bg-primary-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10"></div>
                                    <div className="w-[calc(100%-2rem)] md:w-[calc(50%-1.5rem)] text-xs text-gray-700 dark:text-gray-300">
                                        Resolved ({new Date(selectedFeedback.resolvedAt).toLocaleDateString()})
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
              </div>
            )}
            
          </div>
        </div>
      </div>
    </div>
  );
}
