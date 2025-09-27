import { PrismaClient, AssetStatus, DeploymentStatus, AssetHistoryAction, DepreciationMethod } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

// --- TYPE DEFINITIONS (NO 'any') ---

interface DepartmentData {
  name: string;
  code: string;
}

interface RoleData {
  name: string;
  code: string;
  description: string;
  permissions: Record<string, boolean>;
}

interface EmployeeSeedData {
  employeeId: string;
  email: string;
  firstName: string;
  lastName: string;
  position: string;
  departmentCode: string;
}

interface CategoryData {
  name: string;
  code: string;
}

interface AssetSeedData {
  itemCode: string;
  description: string;
  serialNumber: string;
  brand: string;
  purchasePrice: number;
  purchaseDate: Date;
  usefulLifeYears: number;
  salvageValue: number;
  categoryCode: string;
}

// --- HELPER FUNCTION ---

/**
 * Generates a random date within the last N years.
 * @param yearsAgo - The maximum number of years in the past.
 * @returns A Date object.
 */
function getRandomPastDate(yearsAgo: number): Date {
  const now = new Date();
  const past = new Date();
  past.setFullYear(now.getFullYear() - Math.floor(Math.random() * yearsAgo));
  past.setMonth(Math.floor(Math.random() * 12));
  past.setDate(Math.floor(Math.random() * 28) + 1);
  return past;
}

// --- MAIN SEEDING FUNCTION ---

async function main(): Promise<void> {
  console.log('🌱 Starting comprehensive database seeding...');

  try {
    // 1. --- CLEANUP OLD DATA ---
    console.log('🗑️  Cleaning up old data...');
    await prisma.assetHistory.deleteMany();
    await prisma.assetDeployment.deleteMany();
    await prisma.asset.deleteMany();
    await prisma.assetCategory.deleteMany();
    await prisma.employee.deleteMany();
    await prisma.role.deleteMany();
    await prisma.department.deleteMany();
    await prisma.businessUnit.deleteMany();
    console.log('✅ Cleanup complete.');

    // 2. --- CREATE BUSINESS UNIT ---
    console.log('🏢 Creating Business Unit: Sarangani Highlands...');
    const saranganiHighlands = await prisma.businessUnit.create({
      data: {
        name: 'Sarangani Highlands Garden and Restaurant',
        code: 'SHGR',
        description: 'A premier garden resort and restaurant offering scenic views and fine dining.',
        isActive: true,
      },
    });
    console.log(`✅ Business Unit created with ID: ${saranganiHighlands.id}`);

    // 3. --- CREATE DEPARTMENTS ---
    console.log('📋 Creating Departments...');
    const departmentsData: DepartmentData[] = [
      { name: 'Administration', code: 'ADMIN' },
      { name: 'IT Support', code: 'IT' },
      { name: 'Operations', code: 'OPS' },
      { name: 'Kitchen', code: 'KITCHEN' },
      { name: 'Landscaping & Garden', code: 'GARDEN' },
      { name: 'Finance', code: 'FINANCE' },
    ];
    const departments = await prisma.$transaction(
      departmentsData.map(dept =>
        prisma.department.create({
          data: {
            ...dept,
            businessUnitId: saranganiHighlands.id,
          },
        })
      )
    );
    const departmentMap = new Map(departments.map(d => [d.code, d]));
    console.log(`✅ Created ${departments.length} departments.`);

    // 4. --- CREATE ROLES ---
    console.log('🔐 Creating Roles...');
    const adminPermissions: Record<string, boolean> = { 'admin:full_access': true }; 
    const rolesData: RoleData[] = [
      {
        name: 'Super Administrator',
        code: 'SUPER_ADMIN',
        description: 'Full system access',
        permissions: adminPermissions,
      },
      {
        name: 'Standard Employee',
        code: 'EMPLOYEE',
        description: 'Standard access for non-admin staff',
        permissions: { 'assets:read': true },
      },
    ];
    const roles = await prisma.$transaction(rolesData.map(role => prisma.role.create({ data: role })));
    const adminRole = roles.find(r => r.code === 'SUPER_ADMIN')!;
    const employeeRole = roles.find(r => r.code === 'EMPLOYEE')!;
    console.log(`✅ Created ${roles.length} roles.`);

    // 5. --- CREATE EMPLOYEES ---
    console.log('👥 Creating Employees...');
    const passwordHash = await bcrypt.hash('asdasd123', 12);

    const adminEmployee = await prisma.employee.create({
      data: {
        employeeId: 'admin',
        email: 'admin@saranganihighlands.com',
        passwordHash,
        firstName: 'System',
        lastName: 'Admin',
        position: 'System Administrator',
        businessUnitId: saranganiHighlands.id,
        departmentId: departmentMap.get('ADMIN')!.id,
        roleId: adminRole.id,
        hireDate: new Date(),
        emailVerified: new Date(),
      },
    });

    const employeesData: EmployeeSeedData[] = [
      { employeeId: '1001', email: 'john.d@saranganihighlands.com', firstName: 'John', lastName: 'Doe', position: 'IT Specialist', departmentCode: 'IT' },
      { employeeId: '1002', email: 'jane.s@saranganihighlands.com', firstName: 'Jane', lastName: 'Smith', position: 'Operations Manager', departmentCode: 'OPS' },
      { employeeId: '1003', email: 'peter.j@saranganihighlands.com', firstName: 'Peter', lastName: 'Jones', position: 'Head Chef', departmentCode: 'KITCHEN' },
      { employeeId: '1004', email: 'mary.g@saranganihighlands.com', firstName: 'Mary', lastName: 'Garcia', position: 'Lead Gardener', departmentCode: 'GARDEN' },
    ];

    const otherEmployees = await prisma.$transaction(
      employeesData.map(emp => {
        // Destructure to remove the invalid `departmentCode` field
        const { departmentCode, ...employeeInfo } = emp;
        return prisma.employee.create({
          data: {
            ...employeeInfo, // Use the rest of the employee info
            passwordHash,
            businessUnitId: saranganiHighlands.id,
            // Look up the correct departmentId using the code
            departmentId: departmentMap.get(departmentCode)!.id, 
            roleId: employeeRole.id,
            hireDate: getRandomPastDate(5),
            emailVerified: new Date(),
          },
        });
      })
    );
    const allEmployees = [adminEmployee, ...otherEmployees];
    console.log(`✅ Created ${allEmployees.length} employees.`);

    // 6. --- CREATE ASSET CATEGORIES ---
    console.log('📂 Creating Asset Categories...');
    const categoriesData: CategoryData[] = [
        { name: 'Laptops & Computers', code: 'COMP' },
        { name: 'Networking Equipment', code: 'NET' },
        { name: 'Kitchen Appliances', code: 'KAPL' },
        { name: 'Furniture & Fixtures', code: 'FURN' },
        { name: 'Landscaping Tools', code: 'LST' },
        { name: 'Office Equipment', code: 'OFEQ' },
        { name: 'Point of Sale Systems', code: 'POS' },
        { name: 'Audio/Visual Equipment', code: 'AV' },
        { name: 'Vehicles', code: 'VEH' },
        { name: 'Power Tools', code: 'TOOLS' },
    ];
    const categories = await prisma.$transaction(
      categoriesData.map(cat => prisma.assetCategory.create({ data: cat }))
    );
    const categoryMap = new Map(categories.map(c => [c.code, c]));
    console.log(`✅ Created ${categories.length} categories.`);

    // 7. --- CREATE ASSETS ---
    console.log('💻 Creating 50 Assets with depreciation data...');
    const assetsData: AssetSeedData[] = [
      // Laptops & Computers (5)
      { itemCode: 'SH-COMP-001', description: 'Dell Latitude 5420 Laptop', serialNumber: 'SN-DL5420-001', brand: 'Dell', purchasePrice: 75000, purchaseDate: getRandomPastDate(2), usefulLifeYears: 3, salvageValue: 7500, categoryCode: 'COMP' },
      { itemCode: 'SH-COMP-002', description: 'Apple MacBook Pro 14"', serialNumber: 'SN-MBP14-001', brand: 'Apple', purchasePrice: 120000, purchaseDate: getRandomPastDate(1), usefulLifeYears: 4, salvageValue: 20000, categoryCode: 'COMP' },
      { itemCode: 'SH-COMP-003', description: 'HP EliteDesk 800 G6', serialNumber: 'SN-HPED800-001', brand: 'HP', purchasePrice: 55000, purchaseDate: getRandomPastDate(3), usefulLifeYears: 5, salvageValue: 5000, categoryCode: 'COMP' },
      { itemCode: 'SH-COMP-004', description: 'Lenovo ThinkCentre M70q', serialNumber: 'SN-LTC70Q-001', brand: 'Lenovo', purchasePrice: 45000, purchaseDate: getRandomPastDate(1), usefulLifeYears: 5, salvageValue: 4500, categoryCode: 'COMP' },
      { itemCode: 'SH-COMP-005', description: 'Dell Latitude 5420 Laptop', serialNumber: 'SN-DL5420-002', brand: 'Dell', purchasePrice: 75000, purchaseDate: getRandomPastDate(2), usefulLifeYears: 3, salvageValue: 7500, categoryCode: 'COMP' },
      // Landscaping Tools (10)
      { itemCode: 'SH-LST-001', description: 'Stihl FS 55 R Trimmer', serialNumber: 'SN-SFS55R-001', brand: 'Stihl', purchasePrice: 15000, purchaseDate: getRandomPastDate(4), usefulLifeYears: 5, salvageValue: 1000, categoryCode: 'LST' },
      { itemCode: 'SH-LST-002', description: 'Honda HRX217VKA Lawn Mower', serialNumber: 'SN-HHRX217-001', brand: 'Honda', purchasePrice: 45000, purchaseDate: getRandomPastDate(3), usefulLifeYears: 7, salvageValue: 4000, categoryCode: 'LST' },
      { itemCode: 'SH-LST-003', description: 'Echo PB-580T Backpack Blower', serialNumber: 'SN-EPB580T-001', brand: 'Echo', purchasePrice: 22000, purchaseDate: getRandomPastDate(2), usefulLifeYears: 5, salvageValue: 2000, categoryCode: 'LST' },
      { itemCode: 'SH-LST-004', description: 'Fiskars PowerGear2 Lopper', serialNumber: 'SN-FPGL-001', brand: 'Fiskars', purchasePrice: 2500, purchaseDate: getRandomPastDate(1), usefulLifeYears: 10, salvageValue: 100, categoryCode: 'LST' },
      { itemCode: 'SH-LST-005', description: 'Stihl MS 250 Chainsaw', serialNumber: 'SN-SMS250-001', brand: 'Stihl', purchasePrice: 25000, purchaseDate: getRandomPastDate(5), usefulLifeYears: 8, salvageValue: 2500, categoryCode: 'LST' },
      { itemCode: 'SH-LST-006', description: 'Stihl FS 55 R Trimmer', serialNumber: 'SN-SFS55R-002', brand: 'Stihl', purchasePrice: 15000, purchaseDate: getRandomPastDate(4), usefulLifeYears: 5, salvageValue: 1000, categoryCode: 'LST' },
      { itemCode: 'SH-LST-007', description: 'Stihl FS 55 R Trimmer', serialNumber: 'SN-SFS55R-003', brand: 'Stihl', purchasePrice: 15000, purchaseDate: getRandomPastDate(4), usefulLifeYears: 5, salvageValue: 1000, categoryCode: 'LST' },
      { itemCode: 'SH-LST-008', description: 'Wheelbarrow, 6 cu ft', serialNumber: 'SN-WB-001', brand: 'Generic', purchasePrice: 4000, purchaseDate: getRandomPastDate(2), usefulLifeYears: 5, salvageValue: 0, categoryCode: 'LST' },
      { itemCode: 'SH-LST-009', description: 'Shovel, Round Point', serialNumber: 'SN-SHVL-001', brand: 'Generic', purchasePrice: 1200, purchaseDate: getRandomPastDate(1), usefulLifeYears: 10, salvageValue: 0, categoryCode: 'LST' },
      { itemCode: 'SH-LST-010', description: 'Rake, Leaf', serialNumber: 'SN-RAKE-001', brand: 'Generic', purchasePrice: 800, purchaseDate: getRandomPastDate(1), usefulLifeYears: 5, salvageValue: 0, categoryCode: 'LST' },
      // Kitchen Appliances (10)
      { itemCode: 'SH-KAPL-001', description: 'Rational Combi Oven', serialNumber: 'SN-RCO-001', brand: 'Rational', purchasePrice: 550000, purchaseDate: getRandomPastDate(3), usefulLifeYears: 10, salvageValue: 50000, categoryCode: 'KAPL' },
      { itemCode: 'SH-KAPL-002', description: 'Hobart Commercial Mixer', serialNumber: 'SN-HCM-001', brand: 'Hobart', purchasePrice: 180000, purchaseDate: getRandomPastDate(5), usefulLifeYears: 15, salvageValue: 15000, categoryCode: 'KAPL' },
      { itemCode: 'SH-KAPL-003', description: 'Vitamix Commercial Blender', serialNumber: 'SN-VCB-001', brand: 'Vitamix', purchasePrice: 40000, purchaseDate: getRandomPastDate(2), usefulLifeYears: 5, salvageValue: 4000, categoryCode: 'KAPL' },
      { itemCode: 'SH-KAPL-004', description: 'True Reach-In Refrigerator', serialNumber: 'SN-TRIR-001', brand: 'True', purchasePrice: 150000, purchaseDate: getRandomPastDate(4), usefulLifeYears: 12, salvageValue: 10000, categoryCode: 'KAPL' },
      { itemCode: 'SH-KAPL-005', description: 'Breville Espresso Machine', serialNumber: 'SN-BEM-001', brand: 'Breville', purchasePrice: 85000, purchaseDate: getRandomPastDate(1), usefulLifeYears: 7, salvageValue: 8000, categoryCode: 'KAPL' },
      ...Array.from({ length: 5 }, (_, i) => ({
        itemCode: `SH-KAPL-00${6 + i}`, description: 'Stainless Steel Prep Table', serialNumber: `SN-SSPT-00${1+i}`, brand: 'Generic', purchasePrice: 12000, purchaseDate: getRandomPastDate(3), usefulLifeYears: 20, salvageValue: 500, categoryCode: 'KAPL'
      })),
      // Furniture (10)
      ...Array.from({ length: 10 }, (_, i) => ({
        itemCode: `SH-FURN-00${1 + i}`, description: `Mahogany Dining Chair`, serialNumber: `SN-MDC-00${1+i}`, brand: 'Local Craft', purchasePrice: 3500, purchaseDate: getRandomPastDate(2), usefulLifeYears: 10, salvageValue: 300, categoryCode: 'FURN'
      })),
      // Office Equipment (5)
      { itemCode: 'SH-OFEQ-001', description: 'Epson L3210 Printer', serialNumber: 'SN-EL3210-001', brand: 'Epson', purchasePrice: 9000, purchaseDate: getRandomPastDate(1), usefulLifeYears: 3, salvageValue: 500, categoryCode: 'OFEQ' },
      { itemCode: 'SH-OFEQ-002', description: 'Fellowes Paper Shredder', serialNumber: 'SN-FPS-001', brand: 'Fellowes', purchasePrice: 15000, purchaseDate: getRandomPastDate(3), usefulLifeYears: 5, salvageValue: 1000, categoryCode: 'OFEQ' },
      ...Array.from({ length: 3 }, (_, i) => ({
        itemCode: `SH-OFEQ-00${3 + i}`, description: 'Executive Office Chair', serialNumber: `SN-EOC-00${1+i}`, brand: 'ErgoHome', purchasePrice: 8000, purchaseDate: getRandomPastDate(2), usefulLifeYears: 7, salvageValue: 500, categoryCode: 'OFEQ'
      })),
      // POS Systems (5)
      ...Array.from({ length: 5 }, (_, i) => ({
        itemCode: `SH-POS-00${1 + i}`, description: 'BIR-Ready POS Terminal', serialNumber: `SN-POS-00${1+i}`, brand: 'ByteForce', purchasePrice: 60000, purchaseDate: getRandomPastDate(2), usefulLifeYears: 5, salvageValue: 5000, categoryCode: 'POS'
      })),
      // Vehicles (2)
      { itemCode: 'SH-VEH-001', description: 'Toyota HiAce Commuter Van', serialNumber: 'SN-THCV-001', brand: 'Toyota', purchasePrice: 1800000, purchaseDate: getRandomPastDate(3), usefulLifeYears: 10, salvageValue: 300000, categoryCode: 'VEH' },
      { itemCode: 'SH-VEH-002', description: 'Multicab Utility Vehicle', serialNumber: 'SN-MUV-001', brand: 'Suzuki', purchasePrice: 250000, purchaseDate: getRandomPastDate(5), usefulLifeYears: 8, salvageValue: 20000, categoryCode: 'VEH' },
      // Power Tools (3)
      { itemCode: 'SH-TOOLS-001', description: 'Bosch Cordless Drill', serialNumber: 'SN-BCD-001', brand: 'Bosch', purchasePrice: 8000, purchaseDate: getRandomPastDate(2), usefulLifeYears: 5, salvageValue: 500, categoryCode: 'TOOLS' },
      { itemCode: 'SH-TOOLS-002', description: 'Makita Angle Grinder', serialNumber: 'SN-MAG-001', brand: 'Makita', purchasePrice: 5000, purchaseDate: getRandomPastDate(3), usefulLifeYears: 7, salvageValue: 300, categoryCode: 'TOOLS' },
      { itemCode: 'SH-TOOLS-003', description: 'Dewalt Circular Saw', serialNumber: 'SN-DCS-001', brand: 'Dewalt', purchasePrice: 12000, purchaseDate: getRandomPastDate(1), usefulLifeYears: 8, salvageValue: 1000, categoryCode: 'TOOLS' },
    ];
    
    const createdAssets = [];
    for (const assetData of assetsData) {
      const { categoryCode, ...rest } = assetData;
      const purchasePrice = new Decimal(assetData.purchasePrice);
      const salvageValue = new Decimal(assetData.salvageValue);
      const usefulLifeMonths = assetData.usefulLifeYears * 12;
      const monthlyDepreciation = (purchasePrice.minus(salvageValue)).dividedBy(usefulLifeMonths);
      const nextDepreciationDate = new Date(assetData.purchaseDate);
      nextDepreciationDate.setMonth(nextDepreciationDate.getMonth() + 1);

      const asset = await prisma.asset.create({
        data: {
          ...rest,
          purchasePrice,
          salvageValue,
          categoryId: categoryMap.get(categoryCode)!.id,
          businessUnitId: saranganiHighlands.id,
          createdById: adminEmployee.id,
          status: AssetStatus.AVAILABLE,
          depreciationMethod: DepreciationMethod.STRAIGHT_LINE,
          usefulLifeYears: assetData.usefulLifeYears,
          usefulLifeMonths: usefulLifeMonths,
          currentBookValue: purchasePrice,
          depreciationStartDate: assetData.purchaseDate,
          nextDepreciationDate: nextDepreciationDate,
          monthlyDepreciation: monthlyDepreciation,
        },
      });
      await prisma.assetHistory.create({
        data: {
          assetId: asset.id,
          action: AssetHistoryAction.CREATED,
          newStatus: AssetStatus.AVAILABLE,
          performedById: adminEmployee.id,
          notes: 'Asset created during database seed.',
          businessUnitId: saranganiHighlands.id,
        }
      });
      createdAssets.push(asset);
    }
    console.log(`✅ Created ${createdAssets.length} assets.`);

    // 8. --- CREATE TRANSACTIONS (DEPLOYMENTS) ---
    console.log('🚚 Creating Asset Deployments (Transactions)...');

    const itSpecialist = allEmployees.find(e => e.employeeId === '1001')!;
    const opsManager = allEmployees.find(e => e.employeeId === '1002')!;
    const headChef = allEmployees.find(e => e.employeeId === '1003')!;
    const leadGardener = allEmployees.find(e => e.employeeId === '1004')!;

    // -- Transaction 1: DEPLOYED - IT Specialist gets a laptop
    const laptopToDeploy = createdAssets.find(a => a.itemCode === 'SH-COMP-001')!;
    const deployment1 = await prisma.assetDeployment.create({
      data: {
        transmittalNumber: `TRN-2025-001`,
        assetId: laptopToDeploy.id,
        employeeId: itSpecialist.id,
        businessUnitId: saranganiHighlands.id,
        status: DeploymentStatus.DEPLOYED,
        deployedDate: new Date(),
        deploymentNotes: 'Standard issue laptop for new IT Specialist.',
        deploymentCondition: 'Brand New',
      }
    });
    await prisma.asset.update({
      where: { id: laptopToDeploy.id },
      data: { status: AssetStatus.DEPLOYED, currentlyAssignedTo: itSpecialist.employeeId, currentDeploymentId: deployment1.id }
    });
    await prisma.assetHistory.create({
      data: {
        assetId: laptopToDeploy.id,
        action: AssetHistoryAction.DEPLOYED,
        employeeId: itSpecialist.id,
        previousStatus: AssetStatus.AVAILABLE,
        newStatus: AssetStatus.DEPLOYED,
        performedById: adminEmployee.id,
        deploymentId: deployment1.id,
        notes: `Deployed to ${itSpecialist.firstName} ${itSpecialist.lastName}`
      }
    });
    console.log(`  -> 1. Deployed ${laptopToDeploy.description} to IT Specialist.`);

    // -- Transaction 2: DEPLOYED - Gardener gets a trimmer
    const trimmerToDeploy = createdAssets.find(a => a.itemCode === 'SH-LST-001')!;
    const deployment2 = await prisma.assetDeployment.create({
      data: {
        transmittalNumber: `TRN-2025-002`,
        assetId: trimmerToDeploy.id,
        employeeId: leadGardener.id,
        businessUnitId: saranganiHighlands.id,
        status: DeploymentStatus.DEPLOYED,
        deployedDate: new Date(),
        deploymentNotes: 'Standard landscaping tool.',
        deploymentCondition: 'Used - Good',
      }
    });
    await prisma.asset.update({
      where: { id: trimmerToDeploy.id },
      data: { status: AssetStatus.DEPLOYED, currentlyAssignedTo: leadGardener.employeeId, currentDeploymentId: deployment2.id }
    });
    await prisma.assetHistory.create({
      data: {
        assetId: trimmerToDeploy.id,
        action: AssetHistoryAction.DEPLOYED,
        employeeId: leadGardener.id,
        previousStatus: AssetStatus.AVAILABLE,
        newStatus: AssetStatus.DEPLOYED,
        performedById: adminEmployee.id,
        deploymentId: deployment2.id,
        notes: `Deployed to ${leadGardener.firstName} ${leadGardener.lastName}`
      }
    });
    console.log(`  -> 2. Deployed ${trimmerToDeploy.description} to Lead Gardener.`);

    // -- Transaction 3: RETURNED - A previously deployed asset
    const returnedLaptop = createdAssets.find(a => a.itemCode === 'SH-COMP-005')!;
    const deployedDate = new Date();
    deployedDate.setMonth(deployedDate.getMonth() - 6);
    const returnedDate = new Date();
    const deployment3 = await prisma.assetDeployment.create({
      data: {
        transmittalNumber: `TRN-2025-003`,
        assetId: returnedLaptop.id,
        employeeId: opsManager.id,
        businessUnitId: saranganiHighlands.id,
        status: DeploymentStatus.RETURNED,
        deployedDate: deployedDate,
        returnedDate: returnedDate,
        deploymentNotes: 'Temporary laptop for project.',
        deploymentCondition: 'Brand New',
        returnCondition: 'Used - Minor scratches',
        returnNotes: 'Project completed, employee returned the unit.'
      }
    });
    await prisma.assetHistory.create({
        data: {
          assetId: returnedLaptop.id,
          action: AssetHistoryAction.DEPLOYED,
          employeeId: opsManager.id,
          newStatus: AssetStatus.DEPLOYED,
          performedById: adminEmployee.id,
          deploymentId: deployment3.id,
          startDate: deployedDate,
          endDate: returnedDate,
        }
    });
    await prisma.assetHistory.create({
        data: {
          assetId: returnedLaptop.id,
          action: AssetHistoryAction.RETURNED,
          employeeId: opsManager.id,
          previousStatus: AssetStatus.DEPLOYED,
          newStatus: AssetStatus.AVAILABLE,
          performedById: adminEmployee.id,
          deploymentId: deployment3.id,
        }
    });
    console.log(`  -> 3. Processed return for ${returnedLaptop.description} from Operations Manager.`);

    // -- Transaction 4: PENDING_ACCOUNTING_APPROVAL - Chef requests an expensive oven
    const ovenToDeploy = createdAssets.find(a => a.itemCode === 'SH-KAPL-001')!;
    await prisma.assetDeployment.create({
      data: {
        transmittalNumber: `TRN-2025-004`,
        assetId: ovenToDeploy.id,
        employeeId: headChef.id,
        businessUnitId: saranganiHighlands.id,
        status: DeploymentStatus.PENDING_ACCOUNTING_APPROVAL,
        deploymentNotes: 'New primary combi oven for main kitchen. Requires Finance approval due to high value.',
      }
    });
    console.log(`  -> 4. Created PENDING deployment for ${ovenToDeploy.description} for Head Chef.`);

    // -- Transaction 5: DEPLOYED - A POS system for the front desk
    const posToDeploy = createdAssets.find(a => a.itemCode === 'SH-POS-001')!;
    const deployment5 = await prisma.assetDeployment.create({
      data: {
        transmittalNumber: `TRN-2025-005`,
        assetId: posToDeploy.id,
        employeeId: opsManager.id,
        businessUnitId: saranganiHighlands.id,
        status: DeploymentStatus.DEPLOYED,
        deployedDate: new Date(),
        deploymentNotes: 'POS for the main restaurant counter.',
        deploymentCondition: 'Used - Good',
      }
    });
    await prisma.asset.update({
      where: { id: posToDeploy.id },
      data: { status: AssetStatus.DEPLOYED, currentlyAssignedTo: opsManager.employeeId, currentDeploymentId: deployment5.id }
    });
    await prisma.assetHistory.create({
      data: {
        assetId: posToDeploy.id,
        action: AssetHistoryAction.DEPLOYED,
        employeeId: opsManager.id,
        previousStatus: AssetStatus.AVAILABLE,
        newStatus: AssetStatus.DEPLOYED,
        performedById: adminEmployee.id,
        deploymentId: deployment5.id,
        notes: `Deployed to ${opsManager.firstName} ${opsManager.lastName}`
      }
    });
    console.log(`  -> 5. Deployed ${posToDeploy.description} to Operations.`);


    // --- FINAL LOGS ---
    console.log('\n🎉 Database seeding completed successfully!');
    console.log('\n📋 Admin Credentials:');
    console.log(`   🏢 Company: ${saranganiHighlands.name}`);
    console.log(`   👤 Employee ID: ${adminEmployee.employeeId}`);
    console.log(`   ✉️  Email: ${adminEmployee.email}`);
    console.log(`   🔑 Password: asdasd123`);

  } catch (error) {
    console.error('❌ Error during seeding:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('❌ Seeding failed:', error);
  process.exit(1);
});