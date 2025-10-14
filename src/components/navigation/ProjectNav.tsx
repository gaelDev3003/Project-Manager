'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { ChevronDown, FolderOpen, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Project {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

interface ProjectNavProps {
  currentProjectId?: string;
  className?: string;
}

export function ProjectNav({ currentProjectId, className = '' }: ProjectNavProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchProjects();
    }
  }, [user]);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        return;
      }

      const response = await fetch('/api/projects', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch projects');
      }

      const { projects } = await response.json();
      setProjects(projects);
    } catch (err) {
      console.error('Error fetching projects:', err);
    } finally {
      setLoading(false);
    }
  };

  const currentProject = projects.find(p => p.id === currentProjectId);

  if (loading) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className="h-4 w-4 bg-gray-200 rounded animate-pulse"></div>
        <div className="h-4 w-32 bg-gray-200 rounded animate-pulse"></div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <Button
        variant="ghost"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 h-8 px-2"
      >
        <FolderOpen className="h-4 w-4" />
        <span className="text-sm font-medium">
          {currentProject ? currentProject.name : '프로젝트 선택'}
        </span>
        <ChevronDown className="h-4 w-4" />
      </Button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-200 rounded-md shadow-lg z-50">
          <div className="p-2">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-900">프로젝트</h3>
              <Link href="/dashboard">
                <Button variant="ghost" size="sm" className="h-6 px-2">
                  <Plus className="h-3 w-3 mr-1" />
                  새 프로젝트
                </Button>
              </Link>
            </div>
            
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {projects.map((project) => (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  className={`block px-3 py-2 text-sm rounded-md hover:bg-gray-100 transition-colors ${
                    project.id === currentProjectId
                      ? 'bg-indigo-50 text-indigo-700 font-medium'
                      : 'text-gray-700'
                  }`}
                  onClick={() => setIsOpen(false)}
                >
                  <div className="font-medium">{project.name}</div>
                  {project.description && (
                    <div className="text-xs text-gray-500 mt-1 line-clamp-2">
                      {project.description}
                    </div>
                  )}
                </Link>
              ))}
              
              {projects.length === 0 && (
                <div className="text-center py-4 text-sm text-gray-500">
                  프로젝트가 없습니다
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
