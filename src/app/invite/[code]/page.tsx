"use client";

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion } from 'framer-motion';

export default function InvitePage() {
  const router = useRouter();
  const params = useParams();
  const code = params?.code as string;
  const [status, setStatus] = useState('Joining server...');
  const [error, setError] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('arise_token');
    if (!token) {
      router.push('/login');
      return;
    }

    if (!code) return;

    fetch('/api/servers/join', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ inviteCode: code }),
    })
      .then(async res => {
        if (res.ok) {
          const server = await res.json();
          setStatus(`Joined ${server.name}! Redirecting...`);
          setTimeout(() => {
            router.push('/app');
          }, 1000);
        } else {
          const err = await res.json();
          setStatus(err.error || 'Invalid invite link.');
          setError(true);
        }
      })
      .catch(() => {
        setStatus('Failed to join server.');
        setError(true);
      });
  }, [code, router]);

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontFamily: 'Inter, sans-serif' }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        style={{ background: '#111118', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: 32, textAlign: 'center', maxWidth: 400 }}
      >
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: error ? 'rgba(237,66,69,0.15)' : 'rgba(35,165,89,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', margin: '0 auto 16px' }}>
          {error ? '❌' : '🎉'}
        </div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 8 }}>{status}</h2>
        {error && (
          <button
            onClick={() => router.push('/app')}
            style={{ marginTop: 16, padding: '10px 20px', background: '#5865f2', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}
          >
            Go to App
          </button>
        )}
      </motion.div>
    </div>
  );
}
