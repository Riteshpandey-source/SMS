import React, { createContext, useContext, useState, useEffect } from 'react';

const TenantContext = createContext(null);

export const TenantProvider = ({ children }) => {
  const [tenant, setTenant] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Try to load tenant from localStorage on initial load
    const storedTenant = localStorage.getItem('tenant');
    if (storedTenant) {
      try {
        setTenant(JSON.parse(storedTenant));
      } catch (e) {
        console.error('Failed to parse stored tenant data', e);
        localStorage.removeItem('tenant');
      }
    }
    
    // Check URL subdomain for implicit tenant identification
    const hostname = window.location.hostname;
    const parts = hostname.split('.');
    // Assuming format: tenant.campusbuddy.com
    if (parts.length > 2 && parts[0] !== 'www') {
      const subdomain = parts[0];
      // In a real app, we might call the API here to identify the tenant by subdomain
      // if it's not already in localStorage, but for now we'll rely on explicit login.
    }
    
    setIsLoading(false);
  }, []);

  const updateTenant = (tenantData) => {
    if (tenantData) {
      setTenant(tenantData);
      localStorage.setItem('tenant', JSON.stringify(tenantData));
      
      // Update theme colors if provided
      if (tenantData.primaryColor) {
        document.documentElement.style.setProperty('--primary', tenantData.primaryColor);
        document.documentElement.style.setProperty('--sidebar-bg', tenantData.primaryColor);
      }
    } else {
      setTenant(null);
      localStorage.removeItem('tenant');
      
      // Reset theme colors
      document.documentElement.style.removeProperty('--primary');
      document.documentElement.style.removeProperty('--sidebar-bg');
    }
  };

  const getTenantId = () => tenant?.tenantId || null;
  const getTenantName = () => tenant?.name || 'CampusBuddy';

  return (
    <TenantContext.Provider 
      value={{ 
        tenant, 
        setTenant: updateTenant, 
        isLoading,
        getTenantId,
        getTenantName,
        isPlatformAdmin: tenant?.tenantId === 'platform'
      }}
    >
      {children}
    </TenantContext.Provider>
  );
};

export const useTenant = () => {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
};
