"use client";
import ChatWidget from '@/components/ChatWidget';
import { useParams } from 'next/navigation';

export default function WidgetPage() {
  const params = useParams();
  const workspaceId = params.workspaceId as string;

  return (
    <div className="min-h-screen bg-transparent flex items-end justify-end p-6">
      <ChatWidget workspaceId={workspaceId} />
    </div>
  );
}
