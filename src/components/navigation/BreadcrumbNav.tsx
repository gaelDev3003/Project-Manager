'use client';

import Link from 'next/link';
import { ChevronRight, Home, FolderOpen } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbNavProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function BreadcrumbNav({ items, className = '' }: BreadcrumbNavProps) {
  return (
    <nav
      className={`flex items-center space-x-1 text-sm text-gray-500 ${className}`}
      aria-label="Breadcrumb"
    >
      <Link
        href="/dashboard"
        className="flex items-center hover:text-gray-700 transition-colors"
        title="대시보드로 이동"
      >
        <Home className="h-4 w-4" />
        <span className="sr-only">홈</span>
      </Link>

      {items.map((item, index) => (
        <div key={index} className="flex items-center space-x-1">
          <ChevronRight className="h-4 w-4 text-gray-400" />
          {item.href ? (
            <Link
              href={item.href}
              className="hover:text-gray-700 transition-colors flex items-center"
            >
              {index === 0 && <FolderOpen className="h-4 w-4 mr-1" />}
              {item.label}
            </Link>
          ) : (
            <span className="text-gray-900 font-medium flex items-center">
              {index === 0 && <FolderOpen className="h-4 w-4 mr-1" />}
              {item.label}
            </span>
          )}
        </div>
      ))}
    </nav>
  );
}
