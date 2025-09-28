// components/employees/create-employee-page.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, User, Building, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { createEmployee, getDepartments, getRoles, getBusinessUnits } from '@/lib/actions/employee-actions';

interface CreateEmployeePageProps {
  businessUnitId: string;
}

interface FormData {
  employeeId: string;
  email: string;
  firstName: string;
  lastName: string;
  middleName: string;
  position: string;
  businessUnitId: string;
  departmentId: string;
  roleId: string;
  hireDate: Date | undefined;
  password: string;
}

export function CreateEmployeePage({ businessUnitId }: CreateEmployeePageProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [departments, setDepartments] = useState<Array<{ id: string; name: string; code: string }>>([]);
  const [roles, setRoles] = useState<Array<{ id: string; name: string; code: string }>>([]);
  const [businessUnits, setBusinessUnits] = useState<Array<{ id: string; name: string; code: string }>>([]);
  
  const [formData, setFormData] = useState<FormData>({
    employeeId: '',
    email: '',
    firstName: '',
    lastName: '',
    middleName: '',
    position: '',
    businessUnitId: businessUnitId,
    departmentId: '',
    roleId: '',
    hireDate: undefined,
    password: ''
  });

  const loadFormData = useCallback(async () => {
    try {
      const [departmentsData, rolesData, businessUnitsData] = await Promise.all([
        getDepartments(businessUnitId),
        getRoles(),
        getBusinessUnits()
      ]);
      
      setDepartments(departmentsData);
      setRoles(rolesData);
      setBusinessUnits(businessUnitsData);
    } catch (error) {
      console.error('Error loading form data:', error);
      toast.error('Failed to load form data');
    }
  }, [businessUnitId]);

  useEffect(() => {
    loadFormData();
  }, [loadFormData]);

  const handleBack = () => {
    router.push(`/${businessUnitId}/employees`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const submitData = {
        employeeId: formData.employeeId,
        email: formData.email || undefined,
        firstName: formData.firstName,
        lastName: formData.lastName,
        middleName: formData.middleName || undefined,
        position: formData.position || undefined,
        businessUnitId: formData.businessUnitId,
        departmentId: formData.departmentId,
        roleId: formData.roleId,
        hireDate: formData.hireDate,
        passwordHash: formData.password
      };

      const result = await createEmployee(submitData);

      if (result.success) {
        toast.success(result.message);
        router.push(`/${businessUnitId}/employees`);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error('Error creating employee:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const updateFormData = (field: keyof FormData, value: string | Date | undefined) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Employees
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Create New Employee</h1>
            <p className="text-muted-foreground">Add a new employee to the system</p>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={handleBack}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Creating...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Create Employee
              </>
            )}
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="h-5 w-5 mr-2" />
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="employeeId">Employee ID *</Label>
                  <Input
                    id="employeeId"
                    value={formData.employeeId}
                    onChange={(e) => updateFormData('employeeId', e.target.value)}
                    placeholder="e.g., EMP001"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => updateFormData('email', e.target.value)}
                    placeholder="employee@company.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => updateFormData('firstName', e.target.value)}
                    placeholder="John"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="middleName">Middle Name</Label>
                  <Input
                    id="middleName"
                    value={formData.middleName}
                    onChange={(e) => updateFormData('middleName', e.target.value)}
                    placeholder="Michael"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => updateFormData('lastName', e.target.value)}
                    placeholder="Doe"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="position">Position</Label>
                <Input
                  id="position"
                  value={formData.position}
                  onChange={(e) => updateFormData('position', e.target.value)}
                  placeholder="Software Engineer"
                />
              </div>

              <div className="space-y-2">
                <Label>Hire Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !formData.hireDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.hireDate ? format(formData.hireDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <CalendarComponent
                      mode="single"
                      selected={formData.hireDate}
                      onSelect={(date: Date | undefined) => updateFormData('hireDate', date)}
                    />
                  </PopoverContent>
                </Popover>
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
              <div className="space-y-2">
                <Label htmlFor="businessUnitId">Business Unit *</Label>
                <Select 
                  value={formData.businessUnitId} 
                  onValueChange={(value) => updateFormData('businessUnitId', value)}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select business unit" />
                  </SelectTrigger>
                  <SelectContent>
                    {businessUnits.map((unit) => (
                      <SelectItem key={unit.id} value={unit.id}>
                        {unit.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="departmentId">Department *</Label>
                <Select 
                  value={formData.departmentId} 
                  onValueChange={(value) => updateFormData('departmentId', value)}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((department) => (
                      <SelectItem key={department.id} value={department.id}>
                        {department.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="roleId">Role *</Label>
                <Select 
                  value={formData.roleId} 
                  onValueChange={(value) => updateFormData('roleId', value)}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        {role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Security Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="h-5 w-5 mr-2" />
              Security Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="max-w-md">
              <div className="space-y-2">
                <Label htmlFor="password">Password *</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => updateFormData('password', e.target.value)}
                  placeholder="Enter password"
                  required
                />
                <p className="text-sm text-muted-foreground">
                  Password will be securely hashed and stored
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}