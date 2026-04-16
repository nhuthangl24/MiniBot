'use client';
import { signIn } from 'next-auth/react';

export function LoginButton({ className, text = "Đăng nhập với Discord" }: { className?: string, text?: string }) {
  return (
    <button 
      onClick={() => signIn('discord', { callbackUrl: '/dashboard' })} 
      className={className}
    >
      {text}
    </button>
  );
}
