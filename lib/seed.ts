import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

interface BusinessUnitData {
  name: string;
  code: string;
  description: string;
}

interface DepartmentData {
  name: string;
  code: string;
  description: string;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface RoleData {
  name: string;
  code: string;
  description: string;
  permissions: Record<string, boolean>;
}

interface EmployeeData {
  employeeId: string;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  position: string;
}

async function main(): Promise<void> {
  console.log('🌱 Starting database seeding...');

  try {
    // Create Business Units
    console.log('Creating business units...');
    const businessUnits: BusinessUnitData[] = [
      {
        name: 'RD Realty Development Corporation',
        code: 'RDRDC',
        description: 'Real estate development and property management'
      },
      {
        name: 'RD Hardware & Fishing Supply, Inc.',
        code: 'RDHFSI',
        description: 'Hardware store and fishing equipment supplier'
      },
      {
        name: 'Dolores Farm Resort',
        code: 'DFR',
        description: 'Agricultural tourism and farm resort operations'
      },
      {
        name: 'Dolores Lake Resort',
        code: 'DLR',
        description: 'Lake resort and recreational activities'
      },
      {
        name: 'Dolores Tropicana Resort',
        code: 'DTR',
        description: 'Tropical resort and hospitality services'
      },
      {
        name: 'Anchor Hotel',
        code: 'AH',
        description: 'Hotel and accommodation services'
      }
    ];

    const createdBusinessUnits = await Promise.all(
      businessUnits.map(bu => 
        prisma.businessUnit.create({
          data: {
            name: bu.name,
            code: bu.code,
            description: bu.description,
            isActive: true
          }
        })
      )
    );

    console.log(`✅ Created ${createdBusinessUnits.length} business units`);

    // Create a default department for each business unit
    console.log('Creating default departments...');
    const departments: DepartmentData[] = [
      { name: 'Administration', code: 'ADMIN', description: 'Administrative department' },
      { name: 'Operations', code: 'OPS', description: 'Operations department' },
      { name: 'Finance', code: 'FIN', description: 'Finance and accounting department' },
      { name: 'Human Resources', code: 'HR', description: 'Human resources department' },
      { name: 'IT', code: 'IT', description: 'Information technology department' }
    ];

    // Create departments for the first business unit (RDRDC) where admin will belong
    const rddcBusinessUnit = createdBusinessUnits[0];
    const createdDepartments = await Promise.all(
      departments.map(dept =>
        prisma.department.create({
          data: {
            name: dept.name,
            code: dept.code,
            description: dept.description,
            businessUnitId: rddcBusinessUnit.id,
            isActive: true
          }
        })
      )
    );

    console.log(`✅ Created ${createdDepartments.length} departments`);

    // Create Admin Role with full permissions
    console.log('Creating admin role...');
    const adminPermissions: Record<string, boolean> = {
      // Asset Management
      'assets:create': true,
      'assets:read': true,
      'assets:update': true,
      'assets:delete': true,
      'assets:deploy': true,
      'assets:return': true,
      
      // Employee Management
      'employees:create': true,
      'employees:read': true,
      'employees:update': true,
      'employees:delete': true,
      
      // Business Unit Management
      'business_units:create': true,
      'business_units:read': true,
      'business_units:update': true,
      'business_units:delete': true,
      
      // Department Management
      'departments:create': true,
      'departments:read': true,
      'departments:update': true,
      'departments:delete': true,
      
      // Role Management
      'roles:create': true,
      'roles:read': true,
      'roles:update': true,
      'roles:delete': true,
      
      // Deployment Management
      'deployments:create': true,
      'deployments:read': true,
      'deployments:update': true,
      'deployments:delete': true,
      'deployments:approve': true,
      
      // Reports and Analytics
      'reports:create': true,
      'reports:read': true,
      'reports:export': true,
      
      // System Settings
      'system:settings': true,
      'system:audit_logs': true,
      
      // Full Admin Access
      'admin:full_access': true
    };

    const adminRole = await prisma.role.create({
      data: {
        name: 'Super Administrator',
        code: 'SUPER_ADMIN',
        description: 'Full system access with all permissions',
        permissions: adminPermissions,
        isActive: true
      }
    });

    console.log('✅ Created admin role');

    // Create Admin Employee
    console.log('Creating admin employee...');
    const passwordHash = await bcrypt.hash('asdasd123', 12);
    
    const adminEmployee: EmployeeData = {
      employeeId: 'admin',
      email: 'admin@company.com',
      passwordHash,
      firstName: 'System',
      lastName: 'Administrator',
      position: 'System Administrator'
    };

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const createdAdmin = await prisma.employee.create({
      data: {
        employeeId: adminEmployee.employeeId,
        email: adminEmployee.email,
        passwordHash: adminEmployee.passwordHash,
        firstName: adminEmployee.firstName,
        lastName: adminEmployee.lastName,
        middleName: null,
        position: adminEmployee.position,
        businessUnitId: rddcBusinessUnit.id,
        departmentId: createdDepartments[0].id, // Administration department
        roleId: adminRole.id,
        isActive: true,
        hireDate: new Date(),
        emailVerified: new Date(),
        lastLoginAt: null
      }
    });

    console.log('✅ Created admin employee');

    // Create some basic system settings
    console.log('Creating system settings...');
    const systemSettings = [
      {
        key: 'company_name',
        value: 'RD Group of Companies',
        description: 'Main company name',
        category: 'general'
      },
      {
        key: 'asset_code_prefix',
        value: 'AST',
        description: 'Prefix for asset codes',
        category: 'assets'
      },
      {
        key: 'transmittal_number_prefix',
        value: 'TRN',
        description: 'Prefix for transmittal numbers',
        category: 'deployments'
      },
      {
        key: 'default_warranty_period_months',
        value: '12',
        description: 'Default warranty period in months',
        category: 'assets'
      },
      {
        key: 'require_accounting_approval',
        value: 'true',
        description: 'Require accounting approval for deployments',
        category: 'deployments'
      }
    ];

    await Promise.all(
      systemSettings.map(setting =>
        prisma.systemSetting.create({
          data: {
            key: setting.key,
            value: setting.value,
            description: setting.description,
            category: setting.category,
            isActive: true
          }
        })
      )
    );

    console.log(`✅ Created ${systemSettings.length} system settings`);

    // Log the created admin credentials
    console.log('\n🎉 Database seeding completed successfully!');
    console.log('\n📋 Admin Credentials:');
    console.log(`   Employee ID: ${adminEmployee.employeeId}`);
    console.log(`   Email: ${adminEmployee.email}`);
    console.log(`   Password: asdasd123`);
    console.log('\n🏢 Business Units Created:');
    createdBusinessUnits.forEach(bu => {
      console.log(`   ${bu.code} - ${bu.name}`);
    });

  } catch (error) {
    console.error('❌ Error during seeding:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((error) => {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  });

