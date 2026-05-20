"use client";
import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import ChatWidget from '@/components/ChatWidget';

function ChatFrameContent() {
  const searchParams = useSearchParams();
  const workspaceId = searchParams.get('workspaceId');

  if (!workspaceId) return null;

  return (
    <div className="fixed inset-0 bg-transparent overflow-hidden">
      <ChatWidget workspaceId={workspaceId} fullMode={true} />
    </div>
  );
}

export default function ChatFramePage() {
  return (
    <Suspense fallback={null}>
      <ChatFrameContent />
    </Suspense>
  );
}
