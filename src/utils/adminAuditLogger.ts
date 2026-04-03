
import { supabase } from '@/integrations/supabase/client';

export interface AdminAuditLogEntry {
  action_type: string;
  target_user_id?: string;
  action_details?: Record<string, any>;
}

export class AdminAuditLogger {
  private static instance: AdminAuditLogger;

  static getInstance(): AdminAuditLogger {
    if (!AdminAuditLogger.instance) {
      AdminAuditLogger.instance = new AdminAuditLogger();
    }
    return AdminAuditLogger.instance;
  }

  async logAction(entry: AdminAuditLogEntry): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.error('Cannot log admin action: No authenticated user');
        return;
      }

      const { error } = await supabase
        .from('admin_audit_log')
        .insert({
          admin_user_id: user.id,
          action_type: entry.action_type,
          target_user_id: entry.target_user_id,
          action_details: entry.action_details || {}
        });

      if (error) {
        console.error('Failed to log admin action:', error);
      }
    } catch (error) {
      console.error('Error logging admin action:', error);
    }
  }

  async logUserUpdate(targetUserId: string, changes: Record<string, any>): Promise<void> {
    await this.logAction({
      action_type: 'user_update',
      target_user_id: targetUserId,
      action_details: { changes }
    });
  }

  async logDataExport(exportType: string, recordCount?: number): Promise<void> {
    await this.logAction({
      action_type: 'data_export',
      action_details: { 
        export_type: exportType,
        record_count: recordCount,
        timestamp: new Date().toISOString()
      }
    });
  }

  async logSystemAction(actionType: string, details?: Record<string, any>): Promise<void> {
    await this.logAction({
      action_type: actionType,
      action_details: details
    });
  }

  async logSecurityEvent(eventType: string, targetUserId?: string, details?: Record<string, any>): Promise<void> {
    await this.logAction({
      action_type: `security_${eventType}`,
      target_user_id: targetUserId,
      action_details: details
    });
  }
}

// Convenience function for easy access
export const auditLogger = AdminAuditLogger.getInstance();
