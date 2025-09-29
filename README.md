# MIS Asset Tracking System

A comprehensive IT Asset Management System built with Next.js, designed for tracking, managing, and depreciating organizational assets with full deployment lifecycle management.

## 🚀 Features

### Core Asset Management
- **Asset Registration**: Complete asset lifecycle tracking from purchase to retirement
- **Category Management**: Organize assets by customizable categories
- **Serial Number Tracking**: Unique identification and tracking
- **Location Management**: Track physical asset locations
- **Status Management**: Available, Deployed, In Maintenance, Retired, etc.

### Advanced Depreciation System
- **Multiple Depreciation Methods**:
  - Straight Line Depreciation
  - Declining Balance Method
  - Units of Production
  - Sum of Years Digits
- **Automated Calculations**: Monthly depreciation processing
- **Batch Processing**: Calculate depreciation for multiple assets simultaneously
- **Depreciation Schedules**: Generate complete depreciation schedules
- **Book Value Tracking**: Real-time asset book value monitoring

### Deployment & Assignment Management
- **Asset Deployments**: Assign assets to employees with full tracking
- **Approval Workflow**: Accounting approval process for deployments
- **Return Processing**: Track asset returns with condition assessment
- **Transmittal Numbers**: Auto-generated tracking numbers
- **Deployment History**: Complete audit trail of asset assignments

### Employee & Organization Management
- **Employee Directory**: Comprehensive employee management
- **Department Structure**: Organize employees by departments
- **Role-Based Access Control**: Granular permission system
- **Business Unit Support**: Multi-location organization support

### Reporting & Analytics
- **Asset Reports**: Comprehensive asset inventory reports
- **Deployment Reports**: Assignment and utilization reports
- **Depreciation Reports**: Financial depreciation analysis
- **Export Capabilities**: PDF, Excel, and CSV export options
- **Dashboard Analytics**: Real-time insights and metrics

### Audit & Compliance
- **Complete Audit Trail**: Track all system changes
- **User Activity Logging**: Monitor user actions
- **Compliance Reporting**: Generate compliance reports
- **Data Integrity**: Maintain data consistency and accuracy

## 🛠️ Technology Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Backend**: Next.js API Routes, Server Actions
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js with credential-based auth
- **UI Components**: Radix UI with Tailwind CSS
- **File Storage**: MinIO for document management
- **PDF Generation**: jsPDF for report generation
- **Charts**: Recharts for data visualization

## 📋 Prerequisites

- Node.js 18+ 
- PostgreSQL database
- MinIO server (for file storage)
- npm or yarn package manager

## 🚀 Getting Started

### 1. Clone and Install

```bash
git clone <repository-url>
cd mis-asset-tracking
npm install
```

### 2. Environment Setup

Create a `.env` file in the root directory:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/asset_tracking"

# NextAuth
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"

# MinIO Configuration
MINIO_ENDPOINT="your-minio-endpoint"
MINIO_PORT="9000"
MINIO_USE_SSL="false"
MINIO_ACCESS_KEY="your-access-key"
MINIO_SECRET_KEY="your-secret-key"
MINIO_DOCUMENTS_BUCKET="asset-documents"
```

### 3. Database Setup

```bash
# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma db push

# Seed the database with sample data
npx prisma db seed
```

### 4. Start Development Server

```bash
npm run dev
```

Visit `http://localhost:3000` to access the application.

## 👤 Default Login Credentials

After seeding, use these credentials to log in:

- **Employee ID**: `admin`
- **Password**: `asdasd123`
- **Company**: Sarangani Highlands Garden and Restaurant

## 📖 User Guide

### Asset Management

#### Creating Assets
1. Navigate to **Assets** → **All Assets**
2. Click **Add New** button
3. Fill in asset details:
   - Select category (auto-generates item code)
   - Enter description, serial number, brand
   - Set purchase price and date
   - Configure depreciation settings
4. Click **Create Asset**

#### Depreciation Configuration
When creating assets, configure depreciation:
- **Method**: Choose from 4 depreciation methods
- **Useful Life**: Set in years or months
- **Salvage Value**: Residual value at end of life
- **Start Immediately**: Begin depreciation from purchase date

#### Monthly Depreciation Process
1. Navigate to **Assets** → **Depreciation**
2. Review assets due for calculation
3. Click **Batch Calculate** to process all due assets
4. Review results and generate reports

### Deployment Management

#### Creating Deployments
1. Navigate to **Assets** → **Deployments**
2. Click **New Deployment**
3. Select employee and assets
4. Add deployment notes and conditions
5. Submit for accounting approval

#### Approval Process
1. Accounting staff review pending deployments
2. Approve or reject with notes
3. Approved deployments automatically update asset status
4. Employees receive deployed assets

#### Processing Returns
1. Navigate to deployed asset
2. Click **Mark as Returned**
3. Assess return condition
4. Add return notes
5. Asset status updates to Available

### Reporting

#### Generate Reports
1. Navigate to **Reports**
2. Select report type:
   - **Asset Reports**: Inventory and valuation
   - **Deployment Reports**: Assignment tracking
   - **Depreciation Reports**: Financial analysis
3. Set date range and parameters
4. Generate and export in preferred format

#### Dashboard Analytics
- Real-time asset utilization metrics
- Deployment trends and patterns
- Category distribution analysis
- Financial depreciation tracking

## 🔧 Administration

### User Management
- Create employee accounts
- Assign roles and permissions
- Manage departments and business units
- Configure system settings

### System Maintenance
- Monitor audit logs
- Review system alerts
- Backup data regularly
- Update depreciation schedules

## 📊 Depreciation Methods Explained

### 1. Straight Line
- **Formula**: (Cost - Salvage Value) ÷ Useful Life
- **Use Case**: Most common, equal depreciation each period
- **Example**: ₱100,000 asset, 5 years, ₱10,000 salvage = ₱18,000/year

### 2. Declining Balance
- **Formula**: Book Value × Depreciation Rate
- **Use Case**: Higher depreciation in early years
- **Example**: 20% rate on ₱100,000 = ₱20,000 first year

### 3. Units of Production
- **Formula**: (Cost - Salvage Value) ÷ Total Units × Units Used
- **Use Case**: Assets depreciated based on usage
- **Example**: Vehicle depreciated by kilometers driven

### 4. Sum of Years Digits
- **Formula**: Accelerated depreciation using sum formula
- **Use Case**: Rapid early depreciation
- **Example**: 5-year asset uses factors 5/15, 4/15, 3/15, 2/15, 1/15

## 🔒 Security Features

- **Role-Based Access Control**: Granular permissions system
- **Audit Logging**: Complete activity tracking
- **Secure Authentication**: Encrypted password storage
- **Data Validation**: Input sanitization and validation
- **Business Unit Isolation**: Data segregation by organization

## 📱 Mobile Responsive

The system is fully responsive and works on:
- Desktop computers
- Tablets
- Mobile phones
- Touch-enabled devices

## 🔄 Workflow Examples

### Monthly Depreciation Workflow
1. **Review Due Assets**: Check depreciation dashboard
2. **Batch Calculate**: Process all due assets
3. **Review Results**: Verify calculations
4. **Generate Reports**: Create monthly depreciation reports
5. **Export Data**: Send to accounting/finance teams

### Asset Deployment Workflow
1. **Request**: Employee requests asset assignment
2. **Create Deployment**: IT creates deployment record
3. **Accounting Review**: Finance approves high-value items
4. **Deploy**: Asset status updates to deployed
5. **Track**: Monitor deployment duration and usage
6. **Return**: Process return when assignment ends

## 🚨 Important Notes

### Depreciation Best Practices
- **Run monthly calculations** for accurate financial reporting
- **Review depreciation schedules** quarterly
- **Backup data** before batch operations
- **Verify calculations** for high-value assets

### Data Integrity
- **Never delete** assets with deployment history
- **Use soft deletes** to maintain audit trails
- **Regular backups** of database and files
- **Monitor audit logs** for unauthorized changes

## 🛠️ Development

### Project Structure
```
├── app/                    # Next.js app directory
├── components/            # React components
├── lib/                   # Utilities and actions
├── types/                 # TypeScript type definitions
├── prisma/               # Database schema and migrations
└── public/               # Static assets
```

### Key Components
- **Asset Management**: `/components/assets/`
- **Depreciation**: `/components/depreciation/`
- **Deployments**: `/components/deployments/`
- **Reports**: `/components/reports/`
- **Authentication**: `/components/auth/`

### Database Schema
The system uses a comprehensive PostgreSQL schema with:
- **Assets**: Core asset information and depreciation data
- **Deployments**: Assignment tracking and approval workflow
- **Employees**: User management and authentication
- **Audit Logs**: Complete change tracking
- **Reports**: Generated report storage

## 📞 Support

For technical support or questions:
1. Check the audit logs for error details
2. Review system settings configuration
3. Verify user permissions and roles
4. Contact system administrator

## 🔄 Updates and Maintenance

### Regular Tasks
- **Monthly**: Run depreciation calculations
- **Quarterly**: Review asset valuations
- **Annually**: Update depreciation schedules
- **As Needed**: Process deployments and returns

### System Health
- Monitor database performance
- Review audit log patterns
- Check file storage usage
- Verify backup procedures

---

**Built with ❤️ for efficient asset management**

*This system provides comprehensive asset tracking with advanced depreciation management, ensuring accurate financial reporting and efficient resource utilization.*