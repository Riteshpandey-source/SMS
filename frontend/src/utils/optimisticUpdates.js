// Optimistic Updates Utility
// Provides utilities for implementing optimistic UI updates

export class OptimisticUpdateManager {
  constructor() {
    this.pendingUpdates = new Map();
    this.rollbackCallbacks = new Map();
  }

  // Execute an optimistic update
  async executeOptimistic(
    id,
    optimisticUpdate,
    apiCall,
    rollbackUpdate,
    options = {}
  ) {
    const {
      timeout = 10000,
      onSuccess,
      onError,
      onRollback
    } = options;

    // Apply optimistic update immediately
    try {
      optimisticUpdate();
      this.pendingUpdates.set(id, true);
      this.rollbackCallbacks.set(id, rollbackUpdate);
    } catch (error) {
      console.error('Optimistic update failed:', error);
      if (onError) onError(error);
      return;
    }

    // Execute API call
    try {
      const result = await Promise.race([
        apiCall(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), timeout)
        )
      ]);

      // Success - remove pending update
      this.pendingUpdates.delete(id);
      this.rollbackCallbacks.delete(id);
      
      if (onSuccess) onSuccess(result);
      return result;
    } catch (error) {
      // Failure - rollback optimistic update
      this.rollback(id);
      
      if (onError) onError(error);
      throw error;
    }
  }

  // Rollback a specific update
  rollback(id) {
    if (this.pendingUpdates.has(id)) {
      const rollbackCallback = this.rollbackCallbacks.get(id);
      if (rollbackCallback) {
        try {
          rollbackCallback();
        } catch (error) {
          console.error('Rollback failed:', error);
        }
      }
      
      this.pendingUpdates.delete(id);
      this.rollbackCallbacks.delete(id);
    }
  }

  // Rollback all pending updates
  rollbackAll() {
    for (const id of this.pendingUpdates.keys()) {
      this.rollback(id);
    }
  }

  // Check if update is pending
  isPending(id) {
    return this.pendingUpdates.has(id);
  }

  // Get all pending update IDs
  getPendingIds() {
    return Array.from(this.pendingUpdates.keys());
  }

  // Clear all updates (without rollback)
  clear() {
    this.pendingUpdates.clear();
    this.rollbackCallbacks.clear();
  }
}

// React hook for optimistic updates
export const useOptimisticUpdates = () => {
  const manager = React.useMemo(() => new OptimisticUpdateManager(), []);
  
  React.useEffect(() => {
    return () => {
      // Cleanup on unmount
      manager.rollbackAll();
    };
  }, [manager]);

  return manager;
};

// Optimistic CRUD operations
export const createOptimisticCRUD = (
  items,
  setItems,
  apiService,
  options = {}
) => {
  const manager = new OptimisticUpdateManager();
  const { 
    generateTempId = () => `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    onSuccess,
    onError
  } = options;

  return {
    // Optimistic create
    create: async (newItem) => {
      const tempId = generateTempId();
      const optimisticItem = { ...newItem, id: tempId, _isOptimistic: true };

      return manager.executeOptimistic(
        `create_${tempId}`,
        // Optimistic update
        () => {
          setItems(prev => [...prev, optimisticItem]);
        },
        // API call
        async () => {
          const result = await apiService.create(newItem);
          // Update with real data
          setItems(prev => prev.map(item => 
            item.id === tempId ? { ...result, _isOptimistic: false } : item
          ));
          return result;
        },
        // Rollback
        () => {
          setItems(prev => prev.filter(item => item.id !== tempId));
        },
        { onSuccess, onError }
      );
    },

    // Optimistic update
    update: async (id, updates) => {
      const originalItem = items.find(item => item.id === id);
      if (!originalItem) throw new Error('Item not found');

      return manager.executeOptimistic(
        `update_${id}`,
        // Optimistic update
        () => {
          setItems(prev => prev.map(item => 
            item.id === id 
              ? { ...item, ...updates, _isOptimistic: true }
              : item
          ));
        },
        // API call
        async () => {
          const result = await apiService.update(id, updates);
          // Update with real data
          setItems(prev => prev.map(item => 
            item.id === id ? { ...result, _isOptimistic: false } : item
          ));
          return result;
        },
        // Rollback
        () => {
          setItems(prev => prev.map(item => 
            item.id === id ? originalItem : item
          ));
        },
        { onSuccess, onError }
      );
    },

    // Optimistic delete
    delete: async (id) => {
      const originalItem = items.find(item => item.id === id);
      if (!originalItem) throw new Error('Item not found');

      return manager.executeOptimistic(
        `delete_${id}`,
        // Optimistic update
        () => {
          setItems(prev => prev.filter(item => item.id !== id));
        },
        // API call
        async () => {
          const result = await apiService.delete(id);
          return result;
        },
        // Rollback
        () => {
          setItems(prev => [...prev, originalItem]);
        },
        { onSuccess, onError }
      );
    },

    // Bulk operations
    bulkUpdate: async (ids, updates) => {
      const originalItems = items.filter(item => ids.includes(item.id));
      
      return manager.executeOptimistic(
        `bulk_update_${ids.join('_')}`,
        // Optimistic update
        () => {
          setItems(prev => prev.map(item => 
            ids.includes(item.id)
              ? { ...item, ...updates, _isOptimistic: true }
              : item
          ));
        },
        // API call
        async () => {
          const results = await apiService.bulkUpdate(ids, updates);
          // Update with real data
          setItems(prev => prev.map(item => {
            const updated = results.find(r => r.id === item.id);
            return updated ? { ...updated, _isOptimistic: false } : item;
          }));
          return results;
        },
        // Rollback
        () => {
          setItems(prev => prev.map(item => {
            const original = originalItems.find(o => o.id === item.id);
            return original || item;
          }));
        },
        { onSuccess, onError }
      );
    },

    bulkDelete: async (ids) => {
      const originalItems = items.filter(item => ids.includes(item.id));
      
      return manager.executeOptimistic(
        `bulk_delete_${ids.join('_')}`,
        // Optimistic update
        () => {
          setItems(prev => prev.filter(item => !ids.includes(item.id)));
        },
        // API call
        async () => {
          const result = await apiService.bulkDelete(ids);
          return result;
        },
        // Rollback
        () => {
          setItems(prev => [...prev, ...originalItems]);
        },
        { onSuccess, onError }
      );
    },

    // Utility methods
    isPending: (id) => manager.isPending(`create_${id}`) || 
                     manager.isPending(`update_${id}`) || 
                     manager.isPending(`delete_${id}`),
    
    rollback: (id) => {
      manager.rollback(`create_${id}`);
      manager.rollback(`update_${id}`);
      manager.rollback(`delete_${id}`);
    },

    rollbackAll: () => manager.rollbackAll(),
    
    getPendingOperations: () => manager.getPendingIds()
  };
};

// Optimistic list operations
export const useOptimisticList = (initialItems = [], apiService, options = {}) => {
  const [items, setItems] = React.useState(initialItems);
  const crud = React.useMemo(
    () => createOptimisticCRUD(items, setItems, apiService, options),
    [items, apiService, options]
  );

  // Update items when initialItems change
  React.useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  return {
    items,
    setItems,
    ...crud
  };
};

// Optimistic form submission
export const useOptimisticForm = (onSubmit, options = {}) => {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [optimisticData, setOptimisticData] = React.useState(null);
  const manager = useOptimisticUpdates();

  const submit = React.useCallback(async (formData) => {
    const id = `form_${Date.now()}`;
    setIsSubmitting(true);

    try {
      await manager.executeOptimistic(
        id,
        // Optimistic update
        () => {
          setOptimisticData(formData);
        },
        // API call
        async () => {
          const result = await onSubmit(formData);
          setOptimisticData(null);
          return result;
        },
        // Rollback
        () => {
          setOptimisticData(null);
        },
        options
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [onSubmit, manager, options]);

  return {
    submit,
    isSubmitting,
    optimisticData,
    isPending: (id) => manager.isPending(id),
    rollback: (id) => manager.rollback(id)
  };
};

// Utility functions
export const optimisticUtils = {
  // Create optimistic item with temporary ID
  createOptimisticItem: (item, tempId = null) => ({
    ...item,
    id: tempId || `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    _isOptimistic: true,
    _createdAt: new Date().toISOString()
  }),

  // Check if item is optimistic
  isOptimistic: (item) => item._isOptimistic === true,

  // Remove optimistic flags
  cleanOptimisticItem: (item) => {
    const { _isOptimistic, _createdAt, ...cleanItem } = item;
    return cleanItem;
  },

  // Sort items with optimistic items first
  sortWithOptimistic: (items, sortFn = null) => {
    const optimistic = items.filter(item => item._isOptimistic);
    const regular = items.filter(item => !item._isOptimistic);
    
    if (sortFn) {
      regular.sort(sortFn);
    }
    
    return [...optimistic, ...regular];
  }
};

export default {
  OptimisticUpdateManager,
  useOptimisticUpdates,
  createOptimisticCRUD,
  useOptimisticList,
  useOptimisticForm,
  optimisticUtils
};