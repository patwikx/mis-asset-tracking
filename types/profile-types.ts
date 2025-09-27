// types/profile-types.ts
import { DeploymentStatus } from '@prisma/client';

export interface UserProfile {
  id: string;
  employeeId: string;
  email: string | null;
  firstName: string;
  lastName: string;
  middleName: string | null;
  position: string | null;
  hireDate: Date | null;
  lastLoginAt: Date | null;
  isActive: boolean;
  businessUnit: {
    id: string;
    name: string;
    code: string;
    description: string | null;
  };
  department: {
    id: string;
    name: string;
    code: string;
    description: string | null;
  };
  role: {
    id: string;
    name: string;
    code: string;
    description: string | null;
  };
}

export interface AssignedAsset {
  id: string;
  itemCode: string;
  description: string;
  serialNumber: string | null;
  brand: string | null;
  location: string | null;
  purchasePrice: number | null;
  currentBookValue: number | null;
  categoryName: string;
  status: DeploymentStatus;
  deployedDate: Date | null;
  expectedReturnDate: Date | null;
  deploymentNotes: string | null;
  deploymentCondition: string | null;
}

export interface ProfileStats {
  totalAssignedAssets: number;
  activeDeployments: number;
  totalAssetValue: number;
  averageAssetAge: number;
}