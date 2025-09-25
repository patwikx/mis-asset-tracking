// lib/types/permissions.ts

// Define available permissions structure
export interface PermissionModule {
  name: string;
  label: string;
  permissions: Permission[];
}

export interface Permission {
  key: string;
  label: string;
  description: string;
}

export interface EmployeePermissions {
  employeeId: string;
  roleId: string;
  roleName: string;
  roleCode: string;
  permissions: Record<string, boolean>;
  customPermissions?: Record<string, boolean>; // Individual overrides
}

export interface UpdateEmployeePermissionsData {
  employeeId: string;
  permissions: Record<string, boolean>;
  customPermissions?: Record<string, boolean>;
}

// Define the complete permission structure
export const PERMISSION_MODULES: PermissionModule[] = [
  {
    name: 'assets',
    label: 'Asset Management',
    permissions: [
      { key: 'assets:create', label: 'Create Assets', description: 'Create new assets in the system' },
      { key: 'assets:read', label: 'View Assets', description: 'View asset information and details' },
      { key: 'assets:update', label: 'Update Assets', description: 'Edit asset information' },
      { key: 'assets:delete', label: 'Delete Assets', description: 'Delete or deactivate assets' },
      { key: 'assets:deploy', label: 'Deploy Assets', description: 'Create asset deployments' },
      { key: 'assets:return', label: 'Return Assets', description: 'Process asset returns' },
      { key: 'assets:approve', label: 'Approve Deployments', description: 'Approve asset deployments' },
      { key: 'assets:maintenance', label: 'Asset Maintenance', description: 'Manage asset maintenance records' }
    ]
  },
  {
    name: 'employees',
    label: 'Employee Management',
    permissions: [
      { key: 'employees:create', label: 'Create Employees', description: 'Add new employees to the system' },
      { key: 'employees:read', label: 'View Employees', description: 'View employee information' },
      { key: 'employees:update', label: 'Update Employees', description: 'Edit employee information' },
      { key: 'employees:delete', label: 'Delete Employees', description: 'Delete or deactivate employees' },
      { key: 'employees:permissions', label: 'Manage Permissions', description: 'Manage employee permissions' }
    ]
  },
  {
    name: 'departments',
    label: 'Department Management',
    permissions: [
      { key: 'departments:create', label: 'Create Departments', description: 'Create new departments' },
      { key: 'departments:read', label: 'View Departments', description: 'View department information' },
      { key: 'departments:update', label: 'Update Departments', description: 'Edit department information' },
      { key: 'departments:delete', label: 'Delete Departments', description: 'Delete departments' }
    ]
  },
  {
    name: 'roles',
    label: 'Role Management',
    permissions: [
      { key: 'roles:create', label: 'Create Roles', description: 'Create new user roles' },
      { key: 'roles:read', label: 'View Roles', description: 'View role information' },
      { key: 'roles:update', label: 'Update Roles', description: 'Edit role information and permissions' },
      { key: 'roles:delete', label: 'Delete Roles', description: 'Delete roles' }
    ]
  },
  {
    name: 'deployments',
    label: 'Deployment Management',
    permissions: [
      { key: 'deployments:create', label: 'Create Deployments', description: 'Create asset deployments' },
      { key: 'deployments:read', label: 'View Deployments', description: 'View deployment information' },
      { key: 'deployments:update', label: 'Update Deployments', description: 'Edit deployment information' },
      { key: 'deployments:delete', label: 'Delete Deployments', description: 'Cancel deployments' },
      { key: 'deployments:approve', label: 'Approve Deployments', description: 'Approve pending deployments' },
      { key: 'deployments:bulk_approve', label: 'Bulk Approve', description: 'Approve multiple deployments at once' }
    ]
  },
  {
    name: 'reports',
    label: 'Reports & Analytics',
    permissions: [
      { key: 'reports:create', label: 'Generate Reports', description: 'Generate system reports' },
      { key: 'reports:read', label: 'View Reports', description: 'View generated reports' },
      { key: 'reports:export', label: 'Export Reports', description: 'Export reports to various formats' },
      { key: 'reports:delete', label: 'Delete Reports', description: 'Delete generated reports' },
      { key: 'analytics:view', label: 'View Analytics', description: 'Access analytics dashboard' }
    ]
  },
  {
    name: 'business_units',
    label: 'Business Unit Management',
    permissions: [
      { key: 'business_units:create', label: 'Create Business Units', description: 'Create new business units' },
      { key: 'business_units:read', label: 'View Business Units', description: 'View business unit information' },
      { key: 'business_units:update', label: 'Update Business Units', description: 'Edit business unit information' },
      { key: 'business_units:delete', label: 'Delete Business Units', description: 'Delete business units' }
    ]
  },
  {
    name: 'system',
    label: 'System Administration',
    permissions: [
      { key: 'system:settings', label: 'System Settings', description: 'Manage system configuration' },
      { key: 'system:audit_logs', label: 'Audit Logs', description: 'View system audit logs' },
      { key: 'system:backup', label: 'System Backup', description: 'Perform system backups' },
      { key: 'admin:full_access', label: 'Full Admin Access', description: 'Complete system administration access' }
    ]
  }
];