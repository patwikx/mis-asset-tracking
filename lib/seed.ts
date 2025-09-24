import { PrismaClient, AssetStatus, DeploymentStatus, Prisma } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

// Type definitions for seed data
interface SeedBusinessUnit {
  name: string;
  code: string;
  description: string;
}

interface SeedDepartment {
  name: string;
  code: string;
  description: string;
  businessUnitCode: string;
}

interface SeedRole {
  name: string;
  code: string;
  description: string;
  permissions: Prisma.InputJsonValue;
}

interface SeedEmployee {
  employeeId: string;
  email: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  position: string;
  businessUnitCode: string;
  departmentCode: string;
  roleCode: string;
  password: string;
  hireDate: Date;
}

interface SeedAssetCategory {
  name: string;
  code: string;
  description: string;
}

interface SeedAsset {
  itemCode: string;
  description: string;
  serialNumber?: string;
  modelNumber?: string;
  brand?: string;
  specifications?: Prisma.InputJsonValue;
  purchaseDate?: Date;
  purchasePrice?: number;
  warrantyExpiry?: Date;
  categoryCode: string;
  businessUnitCode: string;
  quantity: number;
  status: AssetStatus;
  location?: string;
  notes?: string;
}

interface SeedSystemSetting {
  key: string;
  value: string;
  description: string;
  category: string;
}

// Seed data
const businessUnits: SeedBusinessUnit[] = [
  {
    name: 'Corporate Headquarters',
    code: 'HQ',
    description: 'Main corporate office and administration'
  },
  {
    name: 'Information Technology',
    code: 'IT',
    description: 'Technology and systems department'
  },
  {
    name: 'Human Resources',
    code: 'HR',
    description: 'Human resources and people operations'
  },
  {
    name: 'Finance & Accounting',
    code: 'FIN',
    description: 'Financial operations and accounting'
  },
  {
    name: 'Operations',
    code: 'OPS',
    description: 'Day-to-day business operations'
  },
  {
    name: 'Sales & Marketing',
    code: 'SALES',
    description: 'Sales and marketing operations'
  },
  {
    name: 'Research & Development',
    code: 'RND',
    description: 'Research and product development'
  },
  {
    name: 'Manufacturing',
    code: 'MFG',
    description: 'Production and manufacturing operations'
  },
  {
    name: 'Logistics & Supply Chain',
    code: 'LOG',
    description: 'Supply chain and logistics management'
  },
  {
    name: 'Customer Support',
    code: 'SUPPORT',
    description: 'Customer service and technical support'
  }
];

const departments: SeedDepartment[] = [
  // IT Department
  { name: 'Software Development', code: 'DEV', description: 'Application development team', businessUnitCode: 'IT' },
  { name: 'Network Administration', code: 'NET', description: 'Network and infrastructure management', businessUnitCode: 'IT' },
  { name: 'Help Desk', code: 'HELP', description: 'Technical support and user assistance', businessUnitCode: 'IT' },
  { name: 'Database Administration', code: 'DBA', description: 'Database management and optimization', businessUnitCode: 'IT' },
  { name: 'Cybersecurity', code: 'SEC', description: 'Information security and compliance', businessUnitCode: 'IT' },
  { name: 'DevOps', code: 'DEVOPS', description: 'Development operations and CI/CD', businessUnitCode: 'IT' },
  { name: 'System Administration', code: 'SYSADMIN', description: 'Server and system management', businessUnitCode: 'IT' },
  
  // HR Department
  { name: 'Recruitment', code: 'REC', description: 'Talent acquisition and recruitment', businessUnitCode: 'HR' },
  { name: 'Employee Relations', code: 'EMP', description: 'Employee relations and engagement', businessUnitCode: 'HR' },
  { name: 'Training & Development', code: 'TRAIN', description: 'Employee training and development programs', businessUnitCode: 'HR' },
  { name: 'Compensation & Benefits', code: 'COMP', description: 'Salary and benefits administration', businessUnitCode: 'HR' },
  { name: 'HR Analytics', code: 'HRANA', description: 'HR data analysis and reporting', businessUnitCode: 'HR' },
  
  // Finance Department
  { name: 'Accounting', code: 'ACC', description: 'Financial accounting and reporting', businessUnitCode: 'FIN' },
  { name: 'Accounts Payable', code: 'AP', description: 'Vendor payments and payables', businessUnitCode: 'FIN' },
  { name: 'Accounts Receivable', code: 'AR', description: 'Customer billing and receivables', businessUnitCode: 'FIN' },
  { name: 'Financial Planning', code: 'FP', description: 'Financial planning and analysis', businessUnitCode: 'FIN' },
  { name: 'Treasury', code: 'TREAS', description: 'Cash management and treasury operations', businessUnitCode: 'FIN' },
  { name: 'Tax', code: 'TAX', description: 'Tax compliance and planning', businessUnitCode: 'FIN' },
  { name: 'Audit', code: 'AUDIT', description: 'Internal audit and compliance', businessUnitCode: 'FIN' },
  
  // Operations
  { name: 'Customer Service', code: 'CS', description: 'Customer support and service', businessUnitCode: 'OPS' },
  { name: 'Quality Assurance', code: 'QA', description: 'Quality control and assurance', businessUnitCode: 'OPS' },
  { name: 'Process Improvement', code: 'PROC', description: 'Business process optimization', businessUnitCode: 'OPS' },
  { name: 'Facilities Management', code: 'FAC', description: 'Building and facilities management', businessUnitCode: 'OPS' },
  { name: 'Vendor Management', code: 'VENDOR', description: 'Supplier and vendor relations', businessUnitCode: 'OPS' },
  
  // Corporate
  { name: 'Executive', code: 'EXEC', description: 'Executive management', businessUnitCode: 'HQ' },
  { name: 'Legal', code: 'LEG', description: 'Legal affairs and compliance', businessUnitCode: 'HQ' },
  { name: 'Corporate Communications', code: 'COMM', description: 'Internal and external communications', businessUnitCode: 'HQ' },
  { name: 'Strategic Planning', code: 'STRAT', description: 'Corporate strategy and planning', businessUnitCode: 'HQ' },
  
  // Sales & Marketing
  { name: 'Sales', code: 'SALES_DEPT', description: 'Direct sales operations', businessUnitCode: 'SALES' },
  { name: 'Marketing', code: 'MKT', description: 'Marketing and brand management', businessUnitCode: 'SALES' },
  { name: 'Business Development', code: 'BIZ_DEV', description: 'New business development', businessUnitCode: 'SALES' },
  { name: 'Digital Marketing', code: 'DIGITAL', description: 'Online marketing and social media', businessUnitCode: 'SALES' },
  { name: 'Product Marketing', code: 'PROD_MKT', description: 'Product marketing and positioning', businessUnitCode: 'SALES' },
  
  // Research & Development
  { name: 'Product Development', code: 'PROD_DEV', description: 'New product development', businessUnitCode: 'RND' },
  { name: 'Research', code: 'RESEARCH', description: 'Research and innovation', businessUnitCode: 'RND' },
  { name: 'Engineering', code: 'ENG', description: 'Engineering and design', businessUnitCode: 'RND' },
  { name: 'Testing', code: 'TEST', description: 'Product testing and validation', businessUnitCode: 'RND' },
  
  // Manufacturing
  { name: 'Production', code: 'PROD', description: 'Manufacturing production', businessUnitCode: 'MFG' },
  { name: 'Quality Control', code: 'QC', description: 'Manufacturing quality control', businessUnitCode: 'MFG' },
  { name: 'Maintenance', code: 'MAINT', description: 'Equipment maintenance', businessUnitCode: 'MFG' },
  { name: 'Planning', code: 'PLAN', description: 'Production planning and scheduling', businessUnitCode: 'MFG' },
  
  // Logistics & Supply Chain
  { name: 'Procurement', code: 'PROC_DEPT', description: 'Purchasing and procurement', businessUnitCode: 'LOG' },
  { name: 'Warehouse', code: 'WAREHOUSE', description: 'Warehouse operations', businessUnitCode: 'LOG' },
  { name: 'Shipping', code: 'SHIP', description: 'Shipping and distribution', businessUnitCode: 'LOG' },
  { name: 'Inventory', code: 'INV', description: 'Inventory management', businessUnitCode: 'LOG' },
  
  // Customer Support
  { name: 'Technical Support', code: 'TECH_SUP', description: 'Technical customer support', businessUnitCode: 'SUPPORT' },
  { name: 'Customer Success', code: 'CUST_SUC', description: 'Customer success and retention', businessUnitCode: 'SUPPORT' },
  { name: 'Training Services', code: 'TRAIN_SVC', description: 'Customer training services', businessUnitCode: 'SUPPORT' }
];

const roles: SeedRole[] = [
  {
    name: 'Super Administrator',
    code: 'SUPER_ADMIN',
    description: 'Full system access and administration rights',
    permissions: {
      assets: { create: true, read: true, update: true, delete: true, approve: true },
      employees: { create: true, read: true, update: true, delete: true },
      departments: { create: true, read: true, update: true, delete: true },
      roles: { create: true, read: true, update: true, delete: true },
      system: { settings: true, audit: true, reports: true }
    } as Prisma.InputJsonValue
  },
  {
    name: 'Asset Manager',
    code: 'ASSET_MGR',
    description: 'Manages asset inventory and deployments',
    permissions: {
      assets: { create: true, read: true, update: true, delete: false, approve: false },
      deployments: { create: true, read: true, update: true, cancel: true },
      reports: { assets: true, deployments: true }
    } as Prisma.InputJsonValue
  },
  {
    name: 'Accounting Approver',
    code: 'ACC_APPROVER',
    description: 'Approves asset deployments and financial matters',
    permissions: {
      assets: { read: true, update: false },
      deployments: { read: true, approve: true },
      financial: { approve: true, reports: true }
    } as Prisma.InputJsonValue
  },
  {
    name: 'Department Head',
    code: 'DEPT_HEAD',
    description: 'Manages department employees and asset requests',
    permissions: {
      assets: { read: true, request: true },
      employees: { read: true, update: false },
      deployments: { read: true, request: true },
      reports: { department: true }
    } as Prisma.InputJsonValue
  },
  {
    name: 'Employee',
    code: 'EMPLOYEE',
    description: 'Basic employee access rights',
    permissions: {
      assets: { read: false },
      profile: { read: true, update: true },
      deployments: { read: true }
    } as Prisma.InputJsonValue
  }
];

const employees: SeedEmployee[] = [
  {
    employeeId: 'EMP001',
    email: 'admin@company.com',
    firstName: 'System',
    lastName: 'Administrator',
    position: 'System Administrator',
    businessUnitCode: 'IT',
    departmentCode: 'NET',
    roleCode: 'SUPER_ADMIN',
    password: 'asdasd123',
    hireDate: new Date('2024-01-01')
  },
  {
    employeeId: 'EMP002',
    email: 'accounting@company.com',
    firstName: 'Jane',
    lastName: 'Smith',
    middleName: 'Marie',
    position: 'Accounting Manager',
    businessUnitCode: 'FIN',
    departmentCode: 'ACC',
    roleCode: 'ACC_APPROVER',
    password: 'password123',
    hireDate: new Date('2024-01-15')
  },
  {
    employeeId: 'EMP003',
    email: 'john.doe@company.com',
    firstName: 'John',
    lastName: 'Doe',
    position: 'Software Developer',
    businessUnitCode: 'IT',
    departmentCode: 'DEV',
    roleCode: 'EMPLOYEE',
    password: 'password123',
    hireDate: new Date('2024-02-01')
  },
  {
    employeeId: 'EMP004',
    email: 'sarah.wilson@company.com',
    firstName: 'Sarah',
    lastName: 'Wilson',
    position: 'HR Manager',
    businessUnitCode: 'HR',
    departmentCode: 'EMP',
    roleCode: 'DEPT_HEAD',
    password: 'password123',
    hireDate: new Date('2024-01-20')
  },
  {
    employeeId: 'EMP005',
    email: 'mike.johnson@company.com',
    firstName: 'Mike',
    lastName: 'Johnson',
    position: 'Asset Coordinator',
    businessUnitCode: 'IT',
    departmentCode: 'HELP',
    roleCode: 'ASSET_MGR',
    password: 'password123',
    hireDate: new Date('2024-02-15')
  },
  {
    employeeId: 'EMP006',
    email: 'emily.chen@company.com',
    firstName: 'Emily',
    lastName: 'Chen',
    position: 'Senior Developer',
    businessUnitCode: 'IT',
    departmentCode: 'DEV',
    roleCode: 'EMPLOYEE',
    password: 'password123',
    hireDate: new Date('2023-11-10')
  },
  {
    employeeId: 'EMP007',
    email: 'robert.garcia@company.com',
    firstName: 'Robert',
    lastName: 'Garcia',
    middleName: 'Luis',
    position: 'Sales Manager',
    businessUnitCode: 'SALES',
    departmentCode: 'SALES_DEPT',
    roleCode: 'DEPT_HEAD',
    password: 'password123',
    hireDate: new Date('2023-09-05')
  },
  {
    employeeId: 'EMP008',
    email: 'lisa.brown@company.com',
    firstName: 'Lisa',
    lastName: 'Brown',
    position: 'Marketing Specialist',
    businessUnitCode: 'SALES',
    departmentCode: 'MKT',
    roleCode: 'EMPLOYEE',
    password: 'password123',
    hireDate: new Date('2024-03-12')
  },
  {
    employeeId: 'EMP009',
    email: 'david.miller@company.com',
    firstName: 'David',
    lastName: 'Miller',
    position: 'DevOps Engineer',
    businessUnitCode: 'IT',
    departmentCode: 'DEVOPS',
    roleCode: 'EMPLOYEE',
    password: 'password123',
    hireDate: new Date('2024-01-08')
  },
  {
    employeeId: 'EMP010',
    email: 'amanda.taylor@company.com',
    firstName: 'Amanda',
    lastName: 'Taylor',
    position: 'Financial Analyst',
    businessUnitCode: 'FIN',
    departmentCode: 'FP',
    roleCode: 'EMPLOYEE',
    password: 'password123',
    hireDate: new Date('2024-02-20')
  },
  {
    employeeId: 'EMP011',
    email: 'carlos.rodriguez@company.com',
    firstName: 'Carlos',
    lastName: 'Rodriguez',
    position: 'Production Manager',
    businessUnitCode: 'MFG',
    departmentCode: 'PROD',
    roleCode: 'DEPT_HEAD',
    password: 'password123',
    hireDate: new Date('2023-08-15')
  },
  {
    employeeId: 'EMP012',
    email: 'jennifer.lee@company.com',
    firstName: 'Jennifer',
    lastName: 'Lee',
    position: 'Quality Assurance Specialist',
    businessUnitCode: 'OPS',
    departmentCode: 'QA',
    roleCode: 'EMPLOYEE',
    password: 'password123',
    hireDate: new Date('2024-01-25')
  },
  {
    employeeId: 'EMP013',
    email: 'thomas.anderson@company.com',
    firstName: 'Thomas',
    lastName: 'Anderson',
    middleName: 'Neo',
    position: 'Cybersecurity Analyst',
    businessUnitCode: 'IT',
    departmentCode: 'SEC',
    roleCode: 'EMPLOYEE',
    password: 'password123',
    hireDate: new Date('2023-12-01')
  },
  {
    employeeId: 'EMP014',
    email: 'maria.gonzalez@company.com',
    firstName: 'Maria',
    lastName: 'Gonzalez',
    position: 'Customer Success Manager',
    businessUnitCode: 'SUPPORT',
    departmentCode: 'CUST_SUC',
    roleCode: 'DEPT_HEAD',
    password: 'password123',
    hireDate: new Date('2023-10-18')
  },
  {
    employeeId: 'EMP015',
    email: 'kevin.white@company.com',
    firstName: 'Kevin',
    lastName: 'White',
    position: 'Research Engineer',
    businessUnitCode: 'RND',
    departmentCode: 'RESEARCH',
    roleCode: 'EMPLOYEE',
    password: 'password123',
    hireDate: new Date('2024-02-28')
  },
  {
    employeeId: 'EMP016',
    email: 'rachel.davis@company.com',
    firstName: 'Rachel',
    lastName: 'Davis',
    position: 'Logistics Coordinator',
    businessUnitCode: 'LOG',
    departmentCode: 'WAREHOUSE',
    roleCode: 'EMPLOYEE',
    password: 'password123',
    hireDate: new Date('2024-03-05')
  }
];

const assetCategories: SeedAssetCategory[] = [
  { name: 'Laptops', code: 'LAPTOP', description: 'Portable computers and laptops' },
  { name: 'Desktops', code: 'DESKTOP', description: 'Desktop computers and workstations' },
  { name: 'Monitors', code: 'MONITOR', description: 'Computer monitors and displays' },
  { name: 'Peripherals', code: 'PERIPH', description: 'Keyboards, mice, and other peripherals' },
  { name: 'Networking', code: 'NETWORK', description: 'Network equipment and devices' },
  { name: 'Mobile Devices', code: 'MOBILE', description: 'Smartphones and tablets' },
  { name: 'Printers', code: 'PRINTER', description: 'Printers and printing equipment' },
  { name: 'Software', code: 'SOFTWARE', description: 'Software licenses and applications' },
  { name: 'Furniture', code: 'FURNITURE', description: 'Office furniture and equipment' },
  { name: 'Vehicles', code: 'VEHICLE', description: 'Company vehicles and transportation' },
  { name: 'Servers', code: 'SERVER', description: 'Server hardware and equipment' },
  { name: 'Storage', code: 'STORAGE', description: 'Data storage devices and systems' },
  { name: 'Audio Visual', code: 'AV', description: 'Audio and video equipment' },
  { name: 'Security', code: 'SECURITY', description: 'Security systems and equipment' },
  { name: 'Telecommunications', code: 'TELECOM', description: 'Phone systems and communication devices' },
  { name: 'Manufacturing Equipment', code: 'MFG_EQUIP', description: 'Production and manufacturing machinery' },
  { name: 'Testing Equipment', code: 'TEST_EQUIP', description: 'Testing and measurement instruments' },
  { name: 'Office Supplies', code: 'SUPPLIES', description: 'General office supplies and consumables' },
  { name: 'Medical Equipment', code: 'MEDICAL', description: 'Medical and health-related equipment' },
  { name: 'Safety Equipment', code: 'SAFETY', description: 'Safety and protective equipment' },
  { name: 'Tools', code: 'TOOLS', description: 'Hand tools and power tools' },
  { name: 'Laboratory Equipment', code: 'LAB', description: 'Scientific and laboratory instruments' },
  { name: 'HVAC', code: 'HVAC', description: 'Heating, ventilation, and air conditioning' },
  { name: 'Electrical', code: 'ELECTRICAL', description: 'Electrical equipment and components' },
  { name: 'Cleaning Equipment', code: 'CLEANING', description: 'Cleaning and maintenance equipment' },
  { name: 'Kitchen Appliances', code: 'KITCHEN', description: 'Kitchen and food service equipment' },
  { name: 'Fitness Equipment', code: 'FITNESS', description: 'Exercise and fitness equipment' },
  { name: 'Books & Publications', code: 'BOOKS', description: 'Books, manuals, and publications' },
  { name: 'Artwork & Decor', code: 'ARTWORK', description: 'Artwork, decorations, and displays' },
  { name: 'Uniforms & Clothing', code: 'CLOTHING', description: 'Uniforms and work clothing' },
  { name: 'Gaming & Entertainment', code: 'GAMING', description: 'Gaming consoles and entertainment systems' },
  { name: 'Drones & Robotics', code: 'DRONES', description: 'Drones, robots, and automated systems' },
  { name: 'Renewable Energy', code: 'RENEWABLE', description: 'Solar panels, batteries, and green technology' },
  { name: 'Packaging Equipment', code: 'PACKAGING', description: 'Packaging and shipping equipment' },
  { name: 'Surveillance', code: 'SURVEILLANCE', description: 'Cameras and monitoring systems' }
];

const assets: SeedAsset[] = [
  // Laptops
  {
    itemCode: 'LAP001',
    description: 'MacBook Pro 16-inch M2',
    serialNumber: 'MBP16M2001',
    modelNumber: 'A2485',
    brand: 'Apple',
    specifications: {
      processor: 'Apple M2 Pro',
      memory: '16GB',
      storage: '512GB SSD',
      display: '16-inch Liquid Retina XDR',
      graphics: 'Apple M2 Pro GPU',
      ports: ['3x Thunderbolt 4', 'HDMI', 'MagSafe 3']
    } as Prisma.InputJsonValue,
    purchaseDate: new Date('2024-01-15'),
    purchasePrice: 2499.99,
    warrantyExpiry: new Date('2027-01-15'),
    categoryCode: 'LAPTOP',
    businessUnitCode: 'IT',
    quantity: 1,
    status: AssetStatus.AVAILABLE,
    location: 'IT Storage Room',
    notes: 'High-performance laptop for development work'
  },
  {
    itemCode: 'LAP002',
    description: 'Dell XPS 13 Plus',
    serialNumber: 'DXP13P002',
    modelNumber: '9320',
    brand: 'Dell',
    specifications: {
      processor: 'Intel Core i7-1260P',
      memory: '16GB LPDDR5',
      storage: '512GB NVMe SSD',
      display: '13.4-inch OLED Touch',
      graphics: 'Intel Iris Xe',
      weight: '2.73 lbs'
    } as Prisma.InputJsonValue,
    purchaseDate: new Date('2024-02-10'),
    purchasePrice: 1899.99,
    warrantyExpiry: new Date('2027-02-10'),
    categoryCode: 'LAPTOP',
    businessUnitCode: 'SALES',
    quantity: 1,
    status: AssetStatus.AVAILABLE,
    location: 'Sales Office'
  },
  {
    itemCode: 'LAP003',
    description: 'Lenovo ThinkPad X1 Carbon',
    serialNumber: 'LTP1C003',
    modelNumber: '20XW',
    brand: 'Lenovo',
    specifications: {
      processor: 'Intel Core i5-1135G7',
      memory: '8GB LPDDR4X',
      storage: '256GB NVMe SSD',
      display: '14-inch FHD IPS',
      graphics: 'Intel Iris Xe',
      weight: '2.49 lbs'
    } as Prisma.InputJsonValue,
    purchaseDate: new Date('2024-01-25'),
    purchasePrice: 1399.99,
    warrantyExpiry: new Date('2027-01-25'),
    categoryCode: 'LAPTOP',
    businessUnitCode: 'HR',
    quantity: 1,
    status: AssetStatus.DEPLOYED,
    location: 'HR Department'
  },

  // Desktops
  {
    itemCode: 'DES001',
    description: 'Dell OptiPlex 7090 Desktop',
    serialNumber: 'DOP7090001',
    modelNumber: '7090MT',
    brand: 'Dell',
    specifications: {
      processor: 'Intel Core i7-11700',
      memory: '32GB DDR4',
      storage: '1TB NVMe SSD',
      graphics: 'Intel UHD Graphics 750',
      ports: ['USB 3.2', 'USB-C', 'DisplayPort', 'HDMI']
    } as Prisma.InputJsonValue,
    purchaseDate: new Date('2024-02-01'),
    purchasePrice: 1299.99,
    warrantyExpiry: new Date('2027-02-01'),
    categoryCode: 'DESKTOP',
    businessUnitCode: 'IT',
    quantity: 1,
    status: AssetStatus.DEPLOYED,
    location: 'Office Floor 2',
    notes: 'Standard desktop for office work'
  },
  {
    itemCode: 'DES002',
    description: 'HP EliteDesk 800 G9',
    serialNumber: 'HPE800G9002',
    modelNumber: '800G9SFF',
    brand: 'HP',
    specifications: {
      processor: 'Intel Core i5-12500',
      memory: '16GB DDR4',
      storage: '512GB NVMe SSD',
      graphics: 'Intel UHD Graphics 770',
      form_factor: 'Small Form Factor'
    } as Prisma.InputJsonValue,
    purchaseDate: new Date('2024-02-15'),
    purchasePrice: 899.99,
    warrantyExpiry: new Date('2027-02-15'),
    categoryCode: 'DESKTOP',
    businessUnitCode: 'FIN',
    quantity: 1,
    status: AssetStatus.AVAILABLE,
    location: 'Finance Department'
  },

  // Monitors
  {
    itemCode: 'MON001',
    description: 'LG UltraWide 34-inch Monitor',
    serialNumber: 'LG34WK001',
    modelNumber: '34WK95U',
    brand: 'LG',
    specifications: {
      size: '34-inch',
      resolution: '5120 x 2160',
      panel: 'IPS',
      refresh_rate: '60Hz',
      connectivity: ['USB-C', 'HDMI', 'DisplayPort']
    } as Prisma.InputJsonValue,
    purchaseDate: new Date('2024-01-20'),
    purchasePrice: 899.99,
    warrantyExpiry: new Date('2027-01-20'),
    categoryCode: 'MONITOR',
    businessUnitCode: 'IT',
    quantity: 1,
    status: AssetStatus.AVAILABLE,
    location: 'IT Storage Room'
  },
  {
    itemCode: 'MON002',
    description: 'Dell UltraSharp 27-inch 4K',
    serialNumber: 'DUS27K002',
    modelNumber: 'U2723QE',
    brand: 'Dell',
    specifications: {
      size: '27-inch',
      resolution: '3840 x 2160',
      panel: 'IPS Black',
      refresh_rate: '60Hz',
      color_accuracy: '99% sRGB'
    } as Prisma.InputJsonValue,
    purchaseDate: new Date('2024-02-05'),
    purchasePrice: 649.99,
    warrantyExpiry: new Date('2027-02-05'),
    categoryCode: 'MONITOR',
    businessUnitCode: 'RND',
    quantity: 1,
    status: AssetStatus.DEPLOYED,
    location: 'R&D Lab'
  },

  // Networking Equipment
  {
    itemCode: 'NET001',
    description: 'Cisco Catalyst 2960-X Switch',
    serialNumber: 'C2960X001',
    modelNumber: 'WS-C2960X-48FPD-L',
    brand: 'Cisco',
    specifications: {
      ports: '48 x 10/100/1000',
      uplinks: '2 x 10G SFP+',
      poe: '740W PoE+',
      switching_capacity: '176 Gbps'
    } as Prisma.InputJsonValue,
    purchaseDate: new Date('2024-01-10'),
    purchasePrice: 3499.99,
    warrantyExpiry: new Date('2029-01-10'),
    categoryCode: 'NETWORK',
    businessUnitCode: 'IT',
    quantity: 1,
    status: AssetStatus.DEPLOYED,
    location: 'Server Room A',
    notes: 'Main distribution switch for floor 2'
  },
  {
    itemCode: 'NET002',
    description: 'Ubiquiti UniFi Dream Machine Pro',
    serialNumber: 'UUDMP002',
    modelNumber: 'UDM-Pro',
    brand: 'Ubiquiti',
    specifications: {
      ports: '8 x Gigabit RJ45',
      sfp_plus: '2 x 10G SFP+',
      throughput: '3.5 Gbps',
      features: ['IDS/IPS', 'DPI', 'VPN Server']
    } as Prisma.InputJsonValue,
    purchaseDate: new Date('2024-01-18'),
    purchasePrice: 899.99,
    warrantyExpiry: new Date('2026-01-18'),
    categoryCode: 'NETWORK',
    businessUnitCode: 'IT',
    quantity: 1,
    status: AssetStatus.AVAILABLE,
    location: 'Network Closet B'
  },

  // Mobile Devices
  {
    itemCode: 'MOB001',
    description: 'iPhone 15 Pro',
    serialNumber: 'IP15P001',
    modelNumber: 'A3108',
    brand: 'Apple',
    specifications: {
      storage: '256GB',
      color: 'Space Black',
      display: '6.1-inch Super Retina XDR',
      camera: '48MP Main, 12MP Ultra Wide, 12MP Telephoto',
      connectivity: '5G, Wi-Fi 6E, Bluetooth 5.3'
    } as Prisma.InputJsonValue,
    purchaseDate: new Date('2024-03-01'),
    purchasePrice: 1199.99,
    warrantyExpiry: new Date('2025-03-01'),
    categoryCode: 'MOBILE',
    businessUnitCode: 'HQ',
    quantity: 1,
    status: AssetStatus.AVAILABLE,
    location: 'HR Office'
  },
  {
    itemCode: 'MOB002',
    description: 'Samsung Galaxy S24 Ultra',
    serialNumber: 'SGS24U002',
    modelNumber: 'SM-S928U',
    brand: 'Samsung',
    specifications: {
      storage: '512GB',
      color: 'Titanium Gray',
      display: '6.8-inch Dynamic AMOLED 2X',
      camera: '200MP Main, 50MP Periscope Telephoto',
      s_pen: 'Included'
    } as Prisma.InputJsonValue,
    purchaseDate: new Date('2024-03-05'),
    purchasePrice: 1399.99,
    warrantyExpiry: new Date('2025-03-05'),
    categoryCode: 'MOBILE',
    businessUnitCode: 'SALES',
    quantity: 1,
    status: AssetStatus.DEPLOYED,
    location: 'Sales Manager Office'
  },

  // Servers
  {
    itemCode: 'SRV001',
    description: 'Dell PowerEdge R750',
    serialNumber: 'DPE750001',
    modelNumber: 'R750',
    brand: 'Dell',
    specifications: {
      processor: '2x Intel Xeon Silver 4314',
      memory: '128GB DDR4 ECC',
      storage: '4x 2TB NVMe SSD',
      network: '4x 1GbE, 2x 25GbE SFP28',
      form_factor: '2U Rack'
    } as Prisma.InputJsonValue,
    purchaseDate: new Date('2024-01-05'),
    purchasePrice: 8999.99,
    warrantyExpiry: new Date('2029-01-05'),
    categoryCode: 'SERVER',
    businessUnitCode: 'IT',
    quantity: 1,
    status: AssetStatus.DEPLOYED,
    location: 'Data Center Rack A1',
    notes: 'Primary application server'
  },

  // Printers
  {
    itemCode: 'PRT001',
    description: 'HP LaserJet Enterprise M507dn',
    serialNumber: 'HPLJ507001',
    modelNumber: 'M507dn',
    brand: 'HP',
    specifications: {
      type: 'Monochrome Laser',
      speed: '45 ppm',
      resolution: '1200 x 1200 dpi',
      connectivity: ['Ethernet', 'USB 2.0'],
      duplex: 'Automatic'
    } as Prisma.InputJsonValue,
    purchaseDate: new Date('2024-02-12'),
    purchasePrice: 449.99,
    warrantyExpiry: new Date('2025-02-12'),
    categoryCode: 'PRINTER',
    businessUnitCode: 'OPS',
    quantity: 1,
    status: AssetStatus.DEPLOYED,
    location: 'Operations Floor 3'
  },
  {
    itemCode: 'PRT002',
    description: 'Canon imageCLASS MF445dw',
    serialNumber: 'CIC445002',
    modelNumber: 'MF445dw',
    brand: 'Canon',
    specifications: {
      type: 'Monochrome Laser MFP',
      functions: ['Print', 'Copy', 'Scan', 'Fax'],
      speed: '40 ppm',
      connectivity: ['Wi-Fi', 'Ethernet', 'USB'],
      adf: '50-sheet'
    } as Prisma.InputJsonValue,
    purchaseDate: new Date('2024-02-18'),
    purchasePrice: 399.99,
    warrantyExpiry: new Date('2025-02-18'),
    categoryCode: 'PRINTER',
    businessUnitCode: 'HR',
    quantity: 1,
    status: AssetStatus.AVAILABLE,
    location: 'HR Department'
  },

  // Audio Visual Equipment
  {
    itemCode: 'AV001',
    description: 'Sony FX30 Digital Cinema Camera',
    serialNumber: 'SFX30001',
    modelNumber: 'FX30',
    brand: 'Sony',
    specifications: {
      sensor: 'APS-C CMOS',
      resolution: '4K 120p',
      codec: 'XAVC S-I',
      mount: 'E-mount',
      features: ['S-Log3', 'S-Gamut3.Cine', 'Active SteadyShot']
    } as Prisma.InputJsonValue,
    purchaseDate: new Date('2024-02-22'),
    purchasePrice: 1899.99,
    warrantyExpiry: new Date('2025-02-22'),
    categoryCode: 'AV',
    businessUnitCode: 'SALES',
    quantity: 1,
    status: AssetStatus.AVAILABLE,
    location: 'Marketing Studio'
  },

  // Furniture
  {
    itemCode: 'FUR001',
    description: 'Herman Miller Aeron Chair',
    serialNumber: 'HMA001',
    modelNumber: 'AE113AWBPJG1C7',
    brand: 'Herman Miller',
    specifications: {
      size: 'Size B (Medium)',
      material: 'Pellicle Mesh',
      adjustments: ['Height', 'Tilt', 'Arms', 'Lumbar'],
      color: 'Graphite',
      warranty: '12 years'
    } as Prisma.InputJsonValue,
    purchaseDate: new Date('2024-01-30'),
    purchasePrice: 1395.00,
    warrantyExpiry: new Date('2036-01-30'),
    categoryCode: 'FURNITURE',
    businessUnitCode: 'HQ',
    quantity: 1,
    status: AssetStatus.DEPLOYED,
    location: 'Executive Office 1'
  },
  {
    itemCode: 'FUR002',
    description: 'Steelcase Series 1 Desk',
    serialNumber: 'SCS1D002',
    modelNumber: 'S1D-4830',
    brand: 'Steelcase',
    specifications: {
      dimensions: '48" x 30" x 29"',
      material: 'Laminate Top, Steel Frame',
      color: 'White/Silver',
      features: ['Cable Management', 'Adjustable Feet']
    } as Prisma.InputJsonValue,
    purchaseDate: new Date('2024-02-08'),
    purchasePrice: 649.99,
    warrantyExpiry: new Date('2036-02-08'),
    categoryCode: 'FURNITURE',
    businessUnitCode: 'IT',
    quantity: 1,
    status: AssetStatus.AVAILABLE,
    location: 'Furniture Warehouse'
  },

  // Vehicles
  {
    itemCode: 'VEH001',
    description: 'Toyota Prius Hybrid',
    serialNumber: 'JTDKARFU8N3001',
    modelNumber: 'Prius LE',
    brand: 'Toyota',
    specifications: {
      year: '2024',
      engine: '1.8L Hybrid',
      mpg: '54 city / 50 highway',
      color: 'Magnetic Gray Metallic',
      features: ['Toyota Safety Sense 2.0', 'Apple CarPlay', 'Android Auto']
    } as Prisma.InputJsonValue,
    purchaseDate: new Date('2024-01-12'),
    purchasePrice: 28999.99,
    warrantyExpiry: new Date('2027-01-12'),
    categoryCode: 'VEHICLE',
    businessUnitCode: 'SALES',
    quantity: 1,
    status: AssetStatus.DEPLOYED,
    location: 'Company Parking Lot',
    notes: 'Sales team vehicle for client visits'
  },

  // Security Equipment
  {
    itemCode: 'SEC001',
    description: 'Hikvision 4K Security Camera',
    serialNumber: 'HIK4K001',
    modelNumber: 'DS-2CD2385G1-I',
    brand: 'Hikvision',
    specifications: {
      resolution: '4K (3840 x 2160)',
      lens: '2.8mm fixed',
      night_vision: '30m IR range',
      features: ['H.265+', 'WDR', 'IP67', 'PoE'],
      storage: 'MicroSD up to 256GB'
    } as Prisma.InputJsonValue,
    purchaseDate: new Date('2024-02-25'),
    purchasePrice: 299.99,
    warrantyExpiry: new Date('2027-02-25'),
    categoryCode: 'SECURITY',
    businessUnitCode: 'OPS',
    quantity: 1,
    status: AssetStatus.DEPLOYED,
    location: 'Main Entrance'
  },

  // Manufacturing Equipment
  {
    itemCode: 'MFG001',
    description: '3D Printer - Ultimaker S5',
    serialNumber: 'UMS5001',
    modelNumber: 'S5',
    brand: 'Ultimaker',
    specifications: {
      build_volume: '330 x 240 x 300 mm',
      layer_resolution: '0.25mm - 0.6mm',
      materials: ['PLA', 'ABS', 'PETG', 'TPU', 'Nylon'],
      connectivity: ['Ethernet', 'Wi-Fi', 'USB'],
      features: ['Dual Extrusion', 'Heated Bed', 'Enclosed Chamber']
    } as Prisma.InputJsonValue,
    purchaseDate: new Date('2024-01-28'),
    purchasePrice: 6999.99,
    warrantyExpiry: new Date('2025-01-28'),
    categoryCode: 'MFG_EQUIP',
    businessUnitCode: 'RND',
    quantity: 1,
    status: AssetStatus.AVAILABLE,
    location: 'Prototyping Lab'
  },

  // Testing Equipment
  {
    itemCode: 'TEST001',
    description: 'Fluke 87V Digital Multimeter',
    serialNumber: 'F87V001',
    modelNumber: '87V',
    brand: 'Fluke',
    specifications: {
      display: '4000 count',
      accuracy: '0.05% basic accuracy',
      features: ['True RMS', 'Temperature', 'Frequency', 'Capacitance'],
      safety: 'CAT III 1000V, CAT IV 600V',
      battery_life: '400 hours'
    } as Prisma.InputJsonValue,
    purchaseDate: new Date('2024-02-14'),
    purchasePrice: 449.99,
    warrantyExpiry: new Date('2027-02-14'),
    categoryCode: 'TEST_EQUIP',
    businessUnitCode: 'MFG',
    quantity: 1,
    status: AssetStatus.AVAILABLE,
    location: 'Quality Control Lab'
  },

  // Software Licenses
  {
    itemCode: 'SW001',
    description: 'Microsoft Office 365 Business Premium',
    serialNumber: 'MSO365BP001',
    modelNumber: 'O365BP',
    brand: 'Microsoft',
    specifications: {
      license_type: 'Subscription',
      users: '1 user',
      applications: ['Word', 'Excel', 'PowerPoint', 'Outlook', 'Teams'],
      storage: '1TB OneDrive',
      validity: '1 year'
    } as Prisma.InputJsonValue,
    purchaseDate: new Date('2024-01-01'),
    purchasePrice: 264.00,
    warrantyExpiry: new Date('2025-01-01'),
    categoryCode: 'SOFTWARE',
    businessUnitCode: 'IT',
    quantity: 50,
    status: AssetStatus.AVAILABLE,
    location: 'Digital License Pool'
  },

  // Storage Devices
  {
    itemCode: 'STO001',
    description: 'Synology DiskStation DS920+',
    serialNumber: 'SDS920001',
    modelNumber: 'DS920+',
    brand: 'Synology',
    specifications: {
      bays: '4-bay',
      processor: 'Intel Celeron J4125',
      memory: '4GB DDR4 (expandable to 8GB)',
      connectivity: ['2x Gigabit Ethernet', '2x USB 3.0'],
      features: ['RAID 0/1/5/6/10', 'Hot-swappable', 'Surveillance Station']
    } as Prisma.InputJsonValue,
    purchaseDate: new Date('2024-02-03'),
    purchasePrice: 569.99,
    warrantyExpiry: new Date('2026-02-03'),
    categoryCode: 'STORAGE',
    businessUnitCode: 'IT',
    quantity: 1,
    status: AssetStatus.DEPLOYED,
    location: 'Server Room B'
  },

  // Telecommunications
  {
    itemCode: 'TEL001',
    description: 'Cisco IP Phone 8861',
    serialNumber: 'CIP8861001',
    modelNumber: '8861',
    brand: 'Cisco',
    specifications: {
      display: '5-inch color WVGA',
      lines: '16 lines',
      features: ['HD Voice', 'Bluetooth', 'Wi-Fi', 'USB'],
      power: 'PoE+ or AC adapter',
      codec: 'G.711, G.722, G.729'
    } as Prisma.InputJsonValue,
    purchaseDate: new Date('2024-02-20'),
    purchasePrice: 449.99,
    warrantyExpiry: new Date('2029-02-20'),
    categoryCode: 'TELECOM',
    businessUnitCode: 'HQ',
    quantity: 1,
    status: AssetStatus.AVAILABLE,
    location: 'Telecom Storage'
  },

  // Laboratory Equipment
  {
    itemCode: 'LAB001',
    description: 'Thermo Scientific Centrifuge',
    serialNumber: 'TSC001',
    modelNumber: 'Sorvall ST 8R',
    brand: 'Thermo Scientific',
    specifications: {
      max_speed: '15000 rpm',
      max_rcf: '21382 x g',
      capacity: '4 x 750ml',
      temperature: '-20°C to +40°C',
      features: ['Refrigerated', 'Programmable', 'Imbalance Detection']
    } as Prisma.InputJsonValue,
    purchaseDate: new Date('2024-01-22'),
    purchasePrice: 12999.99,
    warrantyExpiry: new Date('2026-01-22'),
    categoryCode: 'LAB',
    businessUnitCode: 'RND',
    quantity: 1,
    status: AssetStatus.AVAILABLE,
    location: 'Research Lab A'
  },

  // Tools
  {
    itemCode: 'TOOL001',
    description: 'DeWalt 20V MAX Cordless Drill Kit',
    serialNumber: 'DW20V001',
    modelNumber: 'DCD771C2',
    brand: 'DeWalt',
    specifications: {
      voltage: '20V MAX',
      chuck: '1/2 inch',
      torque: '300 UWO',
      speed: '0-450/0-1500 RPM',
      includes: ['2 batteries', 'charger', 'carrying case']
    } as Prisma.InputJsonValue,
    purchaseDate: new Date('2024-02-28'),
    purchasePrice: 149.99,
    warrantyExpiry: new Date('2027-02-28'),
    categoryCode: 'TOOLS',
    businessUnitCode: 'OPS',
    quantity: 1,
    status: AssetStatus.AVAILABLE,
    location: 'Maintenance Shop'
  },

  // Fitness Equipment
  {
    itemCode: 'FIT001',
    description: 'Peloton Bike+',
    serialNumber: 'PB001',
    modelNumber: 'Bike+',
    brand: 'Peloton',
    specifications: {
      resistance: 'Magnetic',
      display: '23.8-inch HD touchscreen',
      connectivity: ['Wi-Fi', 'Bluetooth', 'Ethernet'],
      features: ['Auto-Follow', 'Apple GymKit', 'Heart Rate Monitor'],
      dimensions: '59" L x 23" W x 59" H'
    } as Prisma.InputJsonValue,
    purchaseDate: new Date('2024-03-10'),
    purchasePrice: 2495.00,
    warrantyExpiry: new Date('2025-03-10'),
    categoryCode: 'FITNESS',
    businessUnitCode: 'HR',
    quantity: 1,
    status: AssetStatus.AVAILABLE,
    location: 'Employee Wellness Center'
  },

  // Drones
  {
    itemCode: 'DRONE001',
    description: 'DJI Mavic 3 Enterprise',
    serialNumber: 'DJM3E001',
    modelNumber: 'Mavic 3E',
    brand: 'DJI',
    specifications: {
      camera: '20MP Hasselblad',
      video: '5.1K/50fps',
      flight_time: '45 minutes',
      range: '15km',
      features: ['RTK Positioning', 'Thermal Camera', 'Obstacle Avoidance']
    } as Prisma.InputJsonValue,
    purchaseDate: new Date('2024-03-15'),
    purchasePrice: 4999.99,
    warrantyExpiry: new Date('2025-03-15'),
    categoryCode: 'DRONES',
    businessUnitCode: 'OPS',
    quantity: 1,
    status: AssetStatus.AVAILABLE,
    location: 'Equipment Storage'
  }
];

const systemSettings: SeedSystemSetting[] = [
  {
    key: 'COMPANY_NAME',
    value: 'Your Company Name',
    description: 'Official company name',
    category: 'General'
  },
  {
    key: 'DEFAULT_DEPLOYMENT_DAYS',
    value: '365',
    description: 'Default deployment duration in days',
    category: 'Assets'
  },
  {
    key: 'REQUIRE_ACCOUNTING_APPROVAL',
    value: 'true',
    description: 'Require accounting approval for asset deployments',
    category: 'Assets'
  },
  {
    key: 'AUTO_RETURN_NOTIFICATION_DAYS',
    value: '30',
    description: 'Days before expected return to send notification',
    category: 'Notifications'
  },
  {
    key: 'MAX_ASSET_VALUE_WITHOUT_APPROVAL',
    value: '1000.00',
    description: 'Maximum asset value that can be deployed without approval',
    category: 'Assets'
  },
  {
    key: 'EMAIL_NOTIFICATIONS_ENABLED',
    value: 'true',
    description: 'Enable email notifications for the system',
    category: 'Notifications'
  }
];

async function main(): Promise<void> {
  console.log('🌱 Starting database seeding...');

  try {
    // Clear existing data in correct order (respecting foreign key constraints)
    console.log('🧹 Clearing existing data...');
    await prisma.notification.deleteMany();
    await prisma.systemSetting.deleteMany();
    await prisma.assetDeployment.deleteMany();
    await prisma.asset.deleteMany();
    await prisma.assetCategory.deleteMany();
    await prisma.employee.deleteMany();
    await prisma.role.deleteMany();
    await prisma.department.deleteMany();
    await prisma.businessUnit.deleteMany();
    await prisma.auditLog.deleteMany();

    // Seed Business Units
    console.log('🏢 Seeding business units...');
    const createdBusinessUnits = await Promise.all(
      businessUnits.map(unit =>
        prisma.businessUnit.create({
          data: {
            name: unit.name,
            code: unit.code,
            description: unit.description
          }
        })
      )
    );
    console.log(`✅ Created ${createdBusinessUnits.length} business units`);

    // Seed Departments
    console.log('🏬 Seeding departments...');
    const createdDepartments = await Promise.all(
      departments.map(async dept => {
        const businessUnit = createdBusinessUnits.find(bu => bu.code === dept.businessUnitCode);
        if (!businessUnit) {
          throw new Error(`Business unit not found: ${dept.businessUnitCode}`);
        }
        return prisma.department.create({
          data: {
            name: dept.name,
            code: dept.code,
            description: dept.description,
            businessUnitId: businessUnit.id
          }
        });
      })
    );
    console.log(`✅ Created ${createdDepartments.length} departments`);

    // Seed Roles
    console.log('👥 Seeding roles...');
    const createdRoles = await Promise.all(
      roles.map(role =>
        prisma.role.create({
          data: {
            name: role.name,
            code: role.code,
            description: role.description,
            permissions: role.permissions
          }
        })
      )
    );
    console.log(`✅ Created ${createdRoles.length} roles`);

    // Seed Employees
    console.log('👤 Seeding employees...');
    const createdEmployees = await Promise.all(
      employees.map(async emp => {
        const businessUnit = createdBusinessUnits.find(bu => bu.code === emp.businessUnitCode);
        const department = createdDepartments.find(d => d.code === emp.departmentCode);
        const role = createdRoles.find(r => r.code === emp.roleCode);

        if (!businessUnit || !department || !role) {
          throw new Error(`Missing references for employee ${emp.employeeId}`);
        }

        const hashedPassword = await hash(emp.password, 12);

        return prisma.employee.create({
          data: {
            employeeId: emp.employeeId,
            email: emp.email,
            passwordHash: hashedPassword,
            firstName: emp.firstName,
            lastName: emp.lastName,
            middleName: emp.middleName,
            position: emp.position,
            businessUnitId: businessUnit.id,
            departmentId: department.id,
            roleId: role.id,
            hireDate: emp.hireDate
          }
        });
      })
    );
    console.log(`✅ Created ${createdEmployees.length} employees`);

    // Seed Asset Categories
    console.log('📦 Seeding asset categories...');
    const createdCategories = await Promise.all(
      assetCategories.map(category =>
        prisma.assetCategory.create({
          data: {
            name: category.name,
            code: category.code,
            description: category.description
          }
        })
      )
    );
    console.log(`✅ Created ${createdCategories.length} asset categories`);

    // Seed Assets
    console.log('🖥️  Seeding assets...');
    const adminEmployee = createdEmployees.find(e => e.employeeId === 'EMP001');
    if (!adminEmployee) {
      throw new Error('Admin employee not found');
    }

    const createdAssets = await Promise.all(
      assets.map(async asset => {
        const category = createdCategories.find(c => c.code === asset.categoryCode);
        const businessUnit = createdBusinessUnits.find(bu => bu.code === asset.businessUnitCode);

        if (!category || !businessUnit) {
          throw new Error(`Missing references for asset ${asset.itemCode}`);
        }

        return prisma.asset.create({
          data: {
            itemCode: asset.itemCode,
            description: asset.description,
            serialNumber: asset.serialNumber,
            modelNumber: asset.modelNumber,
            brand: asset.brand,
            specifications: asset.specifications,
            purchaseDate: asset.purchaseDate,
            purchasePrice: asset.purchasePrice,
            warrantyExpiry: asset.warrantyExpiry,
            categoryId: category.id,
            businessUnitId: businessUnit.id,
            quantity: asset.quantity,
            status: asset.status,
            location: asset.location,
            notes: asset.notes,
            createdById: adminEmployee.id
          }
        });
      })
    );
    console.log(`✅ Created ${createdAssets.length} assets`);

    // Seed System Settings
    console.log('⚙️  Seeding system settings...');
    const createdSettings = await Promise.all(
      systemSettings.map(setting =>
        prisma.systemSetting.create({
          data: {
            key: setting.key,
            value: setting.value,
            description: setting.description,
            category: setting.category
          }
        })
      )
    );
    console.log(`✅ Created ${createdSettings.length} system settings`);

    // Create multiple asset deployments
    console.log('📋 Creating sample asset deployments...');
    const accountingApprover = createdEmployees.find(e => e.employeeId === 'EMP002');
    
    // Deployment 1: MacBook Pro to John Doe (Developer)
    const laptopAsset = createdAssets.find(a => a.itemCode === 'LAP001');
    const employeeJohn = createdEmployees.find(e => e.employeeId === 'EMP003');
    const itBusinessUnit = createdBusinessUnits.find(bu => bu.code === 'IT');

    if (laptopAsset && employeeJohn && itBusinessUnit && accountingApprover) {
      await prisma.assetDeployment.create({
        data: {
          assetId: laptopAsset.id,
          employeeId: employeeJohn.id,
          businessUnitId: itBusinessUnit.id,
          deployedDate: new Date('2024-02-01'),
          expectedReturnDate: new Date('2025-02-01'),
          status: DeploymentStatus.APPROVED,
          deploymentNotes: 'MacBook Pro assigned for software development work',
          accountingApproverId: accountingApprover.id,
          accountingApprovedAt: new Date('2024-02-01'),
          accountingNotes: 'Approved for development team member',
          deploymentCondition: 'New - Excellent condition'
        }
      });

      await prisma.asset.update({
        where: { id: laptopAsset.id },
        data: { status: AssetStatus.DEPLOYED }
      });
    }

    // Deployment 2: ThinkPad to Sarah Wilson (HR Manager)
    const thinkpadAsset = createdAssets.find(a => a.itemCode === 'LAP003');
    const employeeSarah = createdEmployees.find(e => e.employeeId === 'EMP004');
    const hrBusinessUnit = createdBusinessUnits.find(bu => bu.code === 'HR');

    if (thinkpadAsset && employeeSarah && hrBusinessUnit && accountingApprover) {
      await prisma.assetDeployment.create({
        data: {
          assetId: thinkpadAsset.id,
          employeeId: employeeSarah.id,
          businessUnitId: hrBusinessUnit.id,
          deployedDate: new Date('2024-01-25'),
          expectedReturnDate: new Date('2025-01-25'),
          status: DeploymentStatus.APPROVED,
          deploymentNotes: 'ThinkPad for HR management tasks',
          accountingApproverId: accountingApprover.id,
          accountingApprovedAt: new Date('2024-01-25'),
          accountingNotes: 'Approved for HR department head',
          deploymentCondition: 'New - Excellent condition'
        }
      });
    }

    // Deployment 3: Dell Desktop to Emily Chen (Senior Developer)
    const desktopAsset = createdAssets.find(a => a.itemCode === 'DES001');
    const employeeEmily = createdEmployees.find(e => e.employeeId === 'EMP006');

    if (desktopAsset && employeeEmily && itBusinessUnit && accountingApprover) {
      await prisma.assetDeployment.create({
        data: {
          assetId: desktopAsset.id,
          employeeId: employeeEmily.id,
          businessUnitId: itBusinessUnit.id,
          deployedDate: new Date('2024-02-01'),
          expectedReturnDate: new Date('2025-02-01'),
          status: DeploymentStatus.APPROVED,
          deploymentNotes: 'Desktop workstation for senior development work',
          accountingApproverId: accountingApprover.id,
          accountingApprovedAt: new Date('2024-02-01'),
          accountingNotes: 'Approved for senior developer',
          deploymentCondition: 'New - Excellent condition'
        }
      });
    }

    // Deployment 4: Samsung Galaxy to Robert Garcia (Sales Manager)
    const galaxyAsset = createdAssets.find(a => a.itemCode === 'MOB002');
    const employeeRobert = createdEmployees.find(e => e.employeeId === 'EMP007');
    const salesBusinessUnit = createdBusinessUnits.find(bu => bu.code === 'SALES');

    if (galaxyAsset && employeeRobert && salesBusinessUnit && accountingApprover) {
      await prisma.assetDeployment.create({
        data: {
          assetId: galaxyAsset.id,
          employeeId: employeeRobert.id,
          businessUnitId: salesBusinessUnit.id,
          deployedDate: new Date('2024-03-05'),
          expectedReturnDate: new Date('2025-03-05'),
          status: DeploymentStatus.APPROVED,
          deploymentNotes: 'Mobile device for sales activities and client communication',
          accountingApproverId: accountingApprover.id,
          accountingApprovedAt: new Date('2024-03-05'),
          accountingNotes: 'Approved for sales manager',
          deploymentCondition: 'New - Excellent condition'
        }
      });
    }

    // Deployment 5: Dell Monitor to Kevin White (Research Engineer)
    const monitorAsset = createdAssets.find(a => a.itemCode === 'MON002');
    const employeeKevin = createdEmployees.find(e => e.employeeId === 'EMP015');
    const rndBusinessUnit = createdBusinessUnits.find(bu => bu.code === 'RND');

    if (monitorAsset && employeeKevin && rndBusinessUnit && accountingApprover) {
      await prisma.assetDeployment.create({
        data: {
          assetId: monitorAsset.id,
          employeeId: employeeKevin.id,
          businessUnitId: rndBusinessUnit.id,
          deployedDate: new Date('2024-02-28'),
          expectedReturnDate: new Date('2025-02-28'),
          status: DeploymentStatus.APPROVED,
          deploymentNotes: '4K monitor for research and development work',
          accountingApproverId: accountingApprover.id,
          accountingApprovedAt: new Date('2024-02-28'),
          accountingNotes: 'Approved for R&D team member',
          deploymentCondition: 'New - Excellent condition'
        }
      });
    }

    // Deployment 6: Herman Miller Chair to Maria Gonzalez (Customer Success Manager)
    const chairAsset = createdAssets.find(a => a.itemCode === 'FUR001');
    const employeeMaria = createdEmployees.find(e => e.employeeId === 'EMP014');
    const supportBusinessUnit = createdBusinessUnits.find(bu => bu.code === 'SUPPORT');

    if (chairAsset && employeeMaria && supportBusinessUnit && accountingApprover) {
      await prisma.assetDeployment.create({
        data: {
          assetId: chairAsset.id,
          employeeId: employeeMaria.id,
          businessUnitId: supportBusinessUnit.id,
          deployedDate: new Date('2024-01-30'),
          expectedReturnDate: new Date('2025-01-30'),
          status: DeploymentStatus.APPROVED,
          deploymentNotes: 'Ergonomic chair for customer success manager',
          accountingApproverId: accountingApprover.id,
          accountingApprovedAt: new Date('2024-01-30'),
          accountingNotes: 'Approved for department head',
          deploymentCondition: 'New - Excellent condition'
        }
      });
    }

    // Deployment 7: Toyota Prius to Robert Garcia (Sales Manager)
    const vehicleAsset = createdAssets.find(a => a.itemCode === 'VEH001');

    if (vehicleAsset && employeeRobert && salesBusinessUnit && accountingApprover) {
      await prisma.assetDeployment.create({
        data: {
          assetId: vehicleAsset.id,
          employeeId: employeeRobert.id,
          businessUnitId: salesBusinessUnit.id,
          deployedDate: new Date('2024-01-15'),
          expectedReturnDate: new Date('2025-01-15'),
          status: DeploymentStatus.APPROVED,
          deploymentNotes: 'Company vehicle for client visits and sales activities',
          accountingApproverId: accountingApprover.id,
          accountingApprovedAt: new Date('2024-01-15'),
          accountingNotes: 'Approved for sales team vehicle',
          deploymentCondition: 'New - Excellent condition'
        }
      });
    }

    console.log('✅ Created 7 sample asset deployments');

    // Create sample notifications
    console.log('🔔 Creating sample notifications...');
    await prisma.notification.create({
      data: {
        recipientId: adminEmployee.id,
        title: 'Welcome to Asset Management System',
        message: 'Your asset management system has been successfully set up with sample data.',
        type: 'SYSTEM_INFO'
      }
    });

    if (accountingApprover) {
      await prisma.notification.create({
        data: {
          recipientId: accountingApprover.id,
          title: 'Pending Approvals',
          message: 'You have new asset deployment requests pending your approval.',
          type: 'APPROVAL_PENDING'
        }
      });
    }

    console.log('🎉 Database seeding completed successfully!');
    console.log('\n📝 Summary:');
    console.log(`   • ${createdBusinessUnits.length} Business Units`);
    console.log(`   • ${createdDepartments.length} Departments`);
    console.log(`   • ${createdRoles.length} Roles`);
    console.log(`   • ${createdEmployees.length} Employees`);
    console.log(`   • ${createdCategories.length} Asset Categories`);
    console.log(`   • ${createdAssets.length} Assets`);
    console.log(`   • ${createdSettings.length} System Settings`);
    console.log(`   • 7 Sample Deployments`);
    console.log(`   • 2 Sample Notifications`);
    console.log('\n🔐 Admin Credentials:');
    console.log('   Email: admin@company.com');
    console.log('   Password: asdasd123');

  } catch (error) {
    console.error('❌ Error during seeding:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error('💥 Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

  