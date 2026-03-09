import { useMemo, useEffect, useRef } from 'react';
import { useAuth } from './useAuth';
import { useUserRole } from './useUserRole';
import { ProductionRole, ROLE_CAPABILITIES, ROLE_SIDEBAR_SECTIONS } from '@/types/roles';

const ROLE_CACHE_KEY = 'scenecraft-cached-role';

function getCachedRole(): ProductionRole | null {
  try {
    const cached = sessionStorage.getItem(ROLE_CACHE_KEY);
    if (cached) return cached as ProductionRole;
  } catch {}
  return null;
}

function setCachedRole(role: ProductionRole) {
  try {
    sessionStorage.setItem(ROLE_CACHE_KEY, role);
  } catch {}
}

export function useProductionRole() {
  const { profile, isLoading: authLoading } = useAuth();
  const { isAdmin, isLoading: roleLoading } = useUserRole();
  
  const previousRoleRef = useRef<string | null>(null);
  
  // Combined loading state
  const isLoading = authLoading || roleLoading;
  
  const productionRole = useMemo<ProductionRole | null>(() => {
    if (isLoading) return null;
    
    if (isAdmin) return 'super_user';
    if (!profile?.role) return 'artist';
    return profile.role as ProductionRole;
  }, [profile?.role, isAdmin, isLoading]);

  // Cache resolved role for instant hydration on next navigation
  useEffect(() => {
    if (productionRole && !isLoading) {
      setCachedRole(productionRole);
    }
  }, [productionRole, isLoading]);

  // Clear localStorage when role changes
  useEffect(() => {
    if (isLoading || !productionRole) return;
    
    if (previousRoleRef.current && previousRoleRef.current !== productionRole) {
      localStorage.removeItem('groundzero-visible-menus');
    }
    previousRoleRef.current = productionRole;
  }, [productionRole, isLoading]);

  // Use cached role while loading to prevent menu flash
  const cachedRole = useMemo(() => getCachedRole(), []);
  const safeRole: ProductionRole = productionRole || cachedRole || 'artist';
  
  // If we have a cached role, don't report as loading (menu renders instantly)
  const effectiveLoading = isLoading && !cachedRole;

  const capabilities = useMemo(() => {
    return ROLE_CAPABILITIES[safeRole] || ROLE_CAPABILITIES.artist;
  }, [safeRole]);

  const sidebarSections = useMemo(() => {
    const sections = ROLE_SIDEBAR_SECTIONS[safeRole] || [];
    if (sections.includes('all')) return 'all';
    return sections;
  }, [safeRole]);

  const isSuperUser = safeRole === 'super_user' || isAdmin;
  const isProducer = safeRole === 'producer';
  const isDirector = safeRole === 'director';
  const isProductionManager = safeRole === 'production_manager';
  const isHOD = safeRole === 'hod' || safeRole === 'department_head';
  const isArtist = safeRole === 'artist';
  const isVendor = safeRole === 'vendor';
  const isClient = safeRole === 'client';
  const isWorker = isArtist || isVendor;
  const canApprove = capabilities.canApprove;
  const canAssign = capabilities.canAssign;

  return {
    role: safeRole,
    profile,
    capabilities,
    sidebarSections,
    isLoading: effectiveLoading,
    isSuperUser,
    isProducer,
    isDirector,
    isProductionManager,
    isHOD,
    isArtist,
    isVendor,
    isClient,
    isWorker,
    canApprove,
    canAssign,
    canUpload: capabilities.canUpload,
    canViewBudget: capabilities.canViewBudget,
    canOverride: capabilities.canOverride,
    canManageTeam: capabilities.canManageTeam,
    accessLevel: capabilities.accessLevel,
  };
}
