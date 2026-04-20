'use client';

import React, { useEffect, useState } from 'react';
import axiosClient from '@/lib/axios';

type User = {
  id: string;
  name: string;
  email: string;
};

const PLATFORMS = ['instagram', 'facebook', 'linkedin'];

export default function TestingPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<{ [key: string]: boolean }>({});
  const [results, setResults] = useState<{ [key: string]: any }>({});

  useEffect(() => {
    async function fetchUsers() {
      try {
        const response = await axiosClient.get('/api/v1/ai-engine/users');
        setUsers(response.data.data);
      } catch (err) {
        console.error('Failed to fetch users', err);
      } finally {
        setLoading(false);
      }
    }
    fetchUsers();
  }, []);

  const handleGenerate = async (userId: string, platform: string) => {
    const key = `${userId}-${platform}`;
    setGenerating(prev => ({ ...prev, [key]: true }));
    setResults(prev => ({ ...prev, [key]: null }));

    try {
      const response = await axiosClient.post('/api/v1/ai-engine/generate', {
        userId,
        platform,
      });
      setResults(prev => ({ ...prev, [key]: response.data }));
    } catch (err: any) {
      console.error(err);
      setResults(prev => ({
        ...prev,
        [key]: { error: err.response?.data?.message || err.message },
      }));
    } finally {
      setGenerating(prev => ({ ...prev, [key]: false }));
    }
  };

  if (loading) {
    return <div className="p-8">Loading users...</div>;
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-8">AI Engine Testing Dashboard</h1>
      
      {users.length === 0 ? (
        <p>No users found.</p>
      ) : (
        <div className="grid gap-6">
          {users.map(user => (
            <div key={user.id} className="border rounded-lg p-6 bg-card shadow-sm">
              <div className="mb-4">
                <h2 className="text-xl font-semibold">{user.name || 'Unnamed User'}</h2>
                <p className="text-sm text-muted-foreground">{user.email}</p>
                <p className="text-xs text-muted-foreground font-mono mt-1">ID: {user.id}</p>
              </div>

              <div className="space-y-4">
                <h3 className="font-medium">Generate Platform Post:</h3>
                <div className="flex flex-wrap gap-4">
                  {PLATFORMS.map(platform => {
                    const key = `${user.id}-${platform}`;
                    const isGenerating = generating[key];
                    const result = results[key];

                    return (
                      <div key={platform} className="flex flex-col gap-2 min-w-[200px] border p-4 rounded-md">
                        <button
                          onClick={() => handleGenerate(user.id, platform)}
                          disabled={isGenerating}
                          className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 disabled:opacity-50 capitalize"
                        >
                          {isGenerating ? 'Generating...' : `Generate ${platform}`}
                        </button>
                        
                        {result && (
                          <div className="mt-2 text-sm bg-muted p-2 rounded max-h-32 overflow-auto">
                            {result.error ? (
                              <span className="text-destructive font-medium">Error: {result.error}</span>
                            ) : (
                              <span className="text-green-600 font-medium whitespace-pre-wrap">
                                Success!
                                {'\n'}
                                {JSON.stringify(result.data?.results, null, 2)}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}