// components/profile/profile-page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Edit, Package, Calendar, MapPin, User, Building, Shield } from 'lucide-react';
import { format } from 'date-fns';
import { getUserAssignedAssets, getUserProfile } from '@/lib/actions/profile-actions';
import type { UserProfile, AssignedAsset } from '@/types/profile-types';
import type { Session } from 'next-auth';
import { toast } from 'sonner';

interface ProfilePageProps {
  businessUnitId: string;
  user: Session['user'];
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function ProfilePage({ businessUnitId, user }: ProfilePageProps) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [assignedAssets, setAssignedAssets] = useState<AssignedAsset[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadProfileData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);

  const loadProfileData = async () => {
    try {
      setIsLoading(true);
      const [profileData, assetsData] = await Promise.all([
        getUserProfile(user.id),
        getUserAssignedAssets(user.id)
      ]);
      
      setProfile(profileData);
      setAssignedAssets(assetsData);
    } catch (error) {
      toast.error(`Error loading profile data: ${error}`)
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DEPLOYED':
        return 'bg-green-100 text-green-800';
      case 'PENDING_ACCOUNTING_APPROVAL':
        return 'bg-yellow-100 text-yellow-800';
      case 'RETURNED':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getUserInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-sm text-muted-foreground mt-2">Loading profile...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={user.image || ''} alt={user.name || ''} />
            <AvatarFallback className="text-lg">
              {getUserInitials(user.firstName, user.lastName)}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-bold">{user.firstName} {user.lastName}</h1>
            <p className="text-muted-foreground">{user.position || 'Employee'}</p>
          </div>
        </div>
        <Button variant="outline" size="sm">
          <Edit className="h-4 w-4 mr-2" />
          Edit Profile
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <User className="h-5 w-5 mr-2" />
              Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Employee ID</Label>
                <p className="mt-1 font-mono">{user.employeeId}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Email</Label>
                <p className="mt-1">{user.email || 'N/A'}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">First Name</Label>
                <p className="mt-1">{user.firstName}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Last Name</Label>
                <p className="mt-1">{user.lastName}</p>
              </div>
              {user.middleName && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Middle Name</Label>
                  <p className="mt-1">{user.middleName}</p>
                </div>
              )}
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Position</Label>
                <p className="mt-1">{user.position || 'N/A'}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Hire Date</Label>
                <p className="mt-1">
                  {user.hireDate 
                    ? format(new Date(user.hireDate), 'PPP')
                    : 'N/A'
                  }
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                <div className="mt-1">
                  <Badge className={user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                    {user.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Organization Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Building className="h-5 w-5 mr-2" />
              Organization Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Business Unit</Label>
                <p className="mt-1">{user.businessUnit.name}</p>
                <p className="text-sm text-muted-foreground">{user.businessUnit.code}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Department</Label>
                <p className="mt-1">{user.department.name}</p>
                <p className="text-sm text-muted-foreground">{user.department.code}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Role</Label>
                <div className="flex items-center space-x-2 mt-1">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <span>{user.role.name}</span>
                  <Badge variant="outline">{user.role.code}</Badge>
                </div>
                {user.role.description && (
                  <p className="text-sm text-muted-foreground mt-1">{user.role.description}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Account Statistics */}
        <Card>
          <CardHeader>
            <CardTitle>Account Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{assignedAssets.length}</div>
                <p className="text-sm text-muted-foreground">Assigned Assets</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {assignedAssets.filter(asset => asset.status === 'DEPLOYED').length}
                </div>
                <p className="text-sm text-muted-foreground">Active Deployments</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Button variant="outline" className="w-full justify-start">
                <Package className="h-4 w-4 mr-2" />
                View All Assets
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Calendar className="h-4 w-4 mr-2" />
                Asset History
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Edit className="h-4 w-4 mr-2" />
                Update Profile
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Assigned Assets */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Package className="h-5 w-5 mr-2" />
            Assigned Assets ({assignedAssets.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {assignedAssets.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No assets assigned</p>
              <p className="text-sm">You currently have no assets assigned to you</p>
            </div>
          ) : (
            <div className="space-y-4">
              {assignedAssets.map((asset) => (
                <div key={asset.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <h3 className="font-medium">{asset.description}</h3>
                        <Badge className={getStatusColor(asset.status)}>
                          {asset.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p className="flex items-center">
                          <Package className="h-3 w-3 mr-1" />
                          {asset.itemCode} • {asset.categoryName}
                        </p>
                        {asset.serialNumber && (
                          <p>Serial: {asset.serialNumber}</p>
                        )}
                        {asset.brand && (
                          <p>Brand: {asset.brand}</p>
                        )}
                        {asset.deployedDate && (
                          <p className="flex items-center">
                            <Calendar className="h-3 w-3 mr-1" />
                            Deployed: {format(new Date(asset.deployedDate), 'PPP')}
                          </p>
                        )}
                        {asset.expectedReturnDate && (
                          <p className="flex items-center">
                            <Calendar className="h-3 w-3 mr-1" />
                            Expected Return: {format(new Date(asset.expectedReturnDate), 'PPP')}
                          </p>
                        )}
                        {asset.location && (
                          <p className="flex items-center">
                            <MapPin className="h-3 w-3 mr-1" />
                            Location: {asset.location}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                      {asset.purchasePrice && (
                        <p className="font-medium">₱{asset.purchasePrice.toLocaleString()}</p>
                      )}
                      {asset.currentBookValue && (
                        <p className="text-xs">
                          Book Value: ₱{asset.currentBookValue.toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {asset.deploymentNotes && (
                    <div className="mt-3 p-2 bg-muted rounded">
                      <Label className="text-xs font-medium text-muted-foreground">Deployment Notes:</Label>
                      <p className="text-sm">{asset.deploymentNotes}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return <label className={className}>{children}</label>;
}